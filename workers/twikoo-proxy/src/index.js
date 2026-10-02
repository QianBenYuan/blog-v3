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

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, X-Twikoo-Setup',
	'Access-Control-Max-Age': '86400',
};

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Health check for uptime monitoring. Deliberately does not touch the
		// upstream, so it distinguishes "Worker is down" from "Vercel is down".
		if (url.pathname === '/healthz') {
			return new Response('ok', { headers: CORS_HEADERS });
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
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
					headers: { ...CORS_HEADERS, Allow: 'POST, OPTIONS' },
				},
			);
		}

		let payload;
		try {
			payload = await request.json();
		} catch {
			return json({ code: 400, msg: 'invalid JSON body' }, 400);
		}

		const event = payload?.event;
		if (!isEventAllowed(event, request, env)) {
			return json({ code: 403, msg: `event not allowed: ${event}` }, 403);
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
					...CORS_HEADERS,
					'Content-Type': 'application/json; charset=utf-8',
					'Cache-Control': 'no-store',
				},
			});
		} catch (err) {
			return json({ code: 502, msg: `upstream unreachable: ${err}` }, 502);
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

function json(obj, status) {
	return new Response(JSON.stringify(obj), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			...CORS_HEADERS,
		},
	});
}