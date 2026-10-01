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

// Events the real Twikoo client sends. Keep this list tight so the Worker
// cannot be abused as an open proxy. Note the submit event is
// COMMENT_SUBMIT — there is no COMMENT_ADD event in the client bundle.
const ALLOWED_EVENTS = new Set([
	'GET_FUNC_VERSION',
	'GET_CONFIG',
	'GET_COMMENTS_COUNT',
	'COMMENT_GET',
	'GET_RECENT_COMMENTS',
	'COMMENT_SUBMIT',
	'COMMENT_DELETE',
	'COMMENT_LIKE',
	'COMMENT_FORWARD',
	'COUNTER_GET',
	'PING',
]);

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400',
};

export default {
	async fetch(request) {
		const url = new URL(request.url);

		// Health check for uptime monitoring.
		if (url.pathname === '/healthz') {
			return new Response('ok', { headers: CORS_HEADERS });
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', {
				status: 405,
				headers: { ...CORS_HEADERS, Allow: 'POST, OPTIONS' },
			});
		}

		let payload;
		try {
			payload = await request.json();
		} catch {
			return json({ code: 400, msg: 'invalid JSON body' }, 400);
		}

		const event = payload?.event;
		if (!ALLOWED_EVENTS.has(event)) {
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