// Twikoo comment backend proxy (Cloudflare Worker).
//
// Why this exists
// ---------------
// Twikoo's server lives on Vercel, whose *.vercel.app domains are
// unreachable from mainland China:
//   1. DNS poisoning resolves them into Meta's face:b00c / 157.240.x range.
//   2. Even with the real IP and correct SNI, the TLS handshake is reset.
//
// Neither is fixable from the Vercel side, so visitors in China simply
// cannot post comments. This Worker re-exposes the very same backend on
// our own domain. Worker egress leaves from Cloudflare's network, so the
// SNI filtering never applies, and the whole thing runs 24/7 with no
// server of our own to keep online.
//
// Note: *.workers.dev is blocked in China too, so the Worker must be bound
// to a custom domain. Verified 2026-10-01: workers.dev resolves to
// 157.240.15.8 and resets, while <name>.qianbenyuan.dpdns.org works fine —
// the GFW matches on SNI, not on the Cloudflare IP range.
//
// Configured route: twikoo.qianbenyuan.dpdns.org -> twikoo-proxy
// Upstream:        https://twikoo-nci.vercel.app/  (Twikoo 1.7.14)

const UPSTREAM = 'https://twikoo-nci.vercel.app/';

// Event names below are taken verbatim from the upstream dispatcher in
// twikoo/src/server/vercel/api/index.js (switch on event.event). Earlier
// versions of this file carried the CloudBase-only names ADMIN_LOGIN /
// ADMIN_CREDENTIALS / COUNTER_GET_FOR_ADMIN plus a bogus COMMENT_DELETE;
// none of those exist on the Vercel build, so they all fell through to
// `default:` and returned { code: 1001, message: '请更新 Twikoo 云函数至最新版' }.
// That message is literally EVENT_NOT_EXIST — it means "wrong event name",
// NOT "server needs updating". Keep this list in sync with the switch.
const ALLOWED_EVENTS = new Set([
	// Public reading / interaction
	'GET_FUNC_VERSION',
	'GET_CONFIG',
	'GET_COMMENTS_COUNT',
	'COMMENT_GET',
	'GET_RECENT_COMMENTS',
	'COMMENT_SUBMIT',
	'COMMENT_LIKE',
	'COUNTER_GET',

	// Comment deletion by the comment's own author (checkCommentOwnership
	// inside the backend verifies uid ownership before deleting).
	'COMMENT_DELETE_FOR_USER',

	// Admin dashboard. Twikoo's self-hosted auth model is: accessToken IS
	// the md5 of the admin password, and the backend recomputes
	// `config.ADMIN_PASS === md5(accessToken)` on every *_FOR_ADMIN call.
	// So these events are self-protecting as long as ADMIN_PASS is set.
	'LOGIN',
	'GET_PASSWORD_STATUS',
	'GET_CONFIG_FOR_ADMIN',
	'SET_CONFIG',
	'COMMENT_GET_FOR_ADMIN',
	'COMMENT_SET_FOR_ADMIN',
	'COMMENT_DELETE_FOR_ADMIN',
	'COMMENT_EXPORT_FOR_ADMIN',
	'COMMENT_IMPORT_FOR_ADMIN',
	'EMAIL_TEST',
	'UPLOAD_IMAGE',
]);

// SET_PASSWORD is intentionally absent from ALLOWED_EVENTS.
//
// Upstream setPassword() reads:
//
//   if (config.ADMIN_PASS && !isAdminUser) return PASS_EXIST
//   await writeConfig({ ADMIN_PASS: md5(event.password) })
//
// i.e. while no admin password exists the endpoint performs NO
// authorisation check whatsoever. Exposing it on a public proxy therefore
// lets any anonymous visitor claim the whole comment backend. It is only
// forwarded when the caller also presents the setup secret below.
const SETUP_TOKEN = ''; // replaced from env at build time — see SETUP_TOKEN_ENV

// The comment widget only ever posts from the blog itself, so a CORS
// wildcard is unneeded surface: reflect the Origin only when it is on the
// allowlist below. Non-browser clients send no Origin header at all and are
// unaffected here (they are throttled instead — CORS was never a defence
// against them).
// Override/extend per deployment with a wrangler var:
//   ALLOWED_ORIGINS = "https://mirror1.example,https://mirror2.example"
const DEFAULT_ALLOWED_ORIGINS = [
	'https://blog.qianbenyuan.dpdns.org',
	// Local preview (pnpm dev / pnpm preview) so the comment section still
	// works while writing posts on a laptop.
	'http://localhost:3000',
	'http://localhost:4173',
	'http://127.0.0.1:3000',
	'http://127.0.0.1:4173',
];

function corsHeaders(request, env) {
	const origin = request.headers.get('Origin');
	const allowed = new Set(DEFAULT_ALLOWED_ORIGINS);
	for (const item of (env?.ALLOWED_ORIGINS ?? '').split(',')) {
		const trimmed = item.trim();
		if (trimmed) allowed.add(trimmed);
	}
	if (!origin || !allowed.has(origin))
		return { Vary: 'Origin' };
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, X-Twikoo-Setup',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
}

// Lightweight in-memory rate limiting. Buckets live per Worker isolate and
// reset on deploy/cold start, and separate Cloudflare colos count
// independently — so this is abuse damping (a scripted flood starts getting
// 429s from most requests), NOT a per-IP guarantee. Hard guarantees need
// Cloudflare's Rate Limiting product configured on the route.
const RATE_LIMITS = {
	// The write paths visitors can abuse; reads are cheap and get the default.
	COMMENT_SUBMIT: { windowMs: 60_000, max: 5 },
	COMMENT_LIKE: { windowMs: 60_000, max: 20 },
	default: { windowMs: 60_000, max: 60 },
};
const rateBuckets = new Map();

function rateLimit(event, request) {
	const { windowMs, max } = RATE_LIMITS[event] ?? RATE_LIMITS.default;
	const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
	const now = Date.now();
	const key = `${ip}:${event}`;
	const hits = (rateBuckets.get(key) ?? []).filter(t => now - t < windowMs);
	if (hits.length >= max) {
		rateBuckets.set(key, hits);
		return false;
	}
	hits.push(now);
	rateBuckets.set(key, hits);
	// Drop dead buckets so the Map cannot grow without bound under scanning.
	if (rateBuckets.size > 10_000) {
		for (const [k, v] of rateBuckets) {
			if (v.every(t => now - t >= windowMs))
				rateBuckets.delete(k);
		}
	}
	return true;
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const cors = corsHeaders(request, env);

		// Health check for uptime monitoring. Deliberately does not touch the
		// upstream, so it distinguishes "Worker is down" from "Vercel is down".
		if (url.pathname === '/healthz') {
			return new Response('ok', { headers: cors });
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}

		// The Twikoo backend is a POST-only JSON API — it serves no HTML at
		// all, so there is no dashboard URL to hand out here. The admin panel
		// is a client-side app: load twikoo.all.min.js on a page that already
		// embeds the comment widget, then open it from the panel's hidden
		// entry point.
		if (request.method !== 'POST') {
			return new Response(
				'Twikoo comment API (POST only).\n' +
					'Send POST JSON with an "event" field, e.g. {"event":"GET_FUNC_VERSION"}.\n' +
					'Upstream: ' + UPSTREAM,
				{
					status: 405,
					headers: { ...cors, Allow: 'POST, OPTIONS' },
				},
			);
		}

		let payload;
		try {
			payload = await request.json();
		} catch {
			return json({ code: 400, msg: 'invalid JSON body' }, 400, cors);
		}

		const event = payload?.event;
		if (!isEventAllowed(event, request, env)) {
			return json({ code: 403, msg: `event not allowed: ${event}` }, 403, cors);
		}

		if (!rateLimit(event, request)) {
			return json({ code: 429, msg: 'too many requests, slow down' }, 429, cors);
		}

		// Cache-bust so a cached error page is never replayed.
		try {
			const upstream = await fetch(`${UPSTREAM}?t=${Date.now()}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			// Pass the upstream JSON through untouched so Twikoo's accessToken
			// and data shape reach the client unchanged.
			return new Response(await upstream.text(), {
				status: upstream.status,
				headers: {
					...cors,
					'Content-Type': 'application/json; charset=utf-8',
					'Cache-Control': 'no-store',
				},
			});
		} catch (err) {
			return json({ code: 502, msg: `upstream unreachable: ${err}` }, 502, cors);
		}
	},
};

function isEventAllowed(event, request, env) {
	if (ALLOWED_EVENTS.has(event)) return true;

	if (event !== 'SET_PASSWORD') return false;

	// Password (re)set: require the shared setup secret so that a visitor who
	// finds this endpoint cannot take the backend over. Set it with
	//   wrangler secret put TWIKOO_SETUP_TOKEN
	// and send it as  X-Twikoo-Setup: <value>
	const expected = env?.TWIKOO_SETUP_TOKEN ?? SETUP_TOKEN;
	if (!expected) return false;
	return request.headers.get('X-Twikoo-Setup') === expected;
}

function json(obj, status, cors = {}) {
	return new Response(JSON.stringify(obj), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...cors,
		},
	});
}
