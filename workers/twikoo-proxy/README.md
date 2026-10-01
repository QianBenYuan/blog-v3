# twikoo-proxy

Cloudflare Worker that makes the Twikoo comment backend reachable from
mainland China.

## Background

Twikoo is a self-hosted comment system. The server half was deployed to
Vercel (`twikoo-nci.vercel.app`), but Vercel is unreachable from China:

| Layer | Symptom |
| --- | --- |
| DNS | `*.vercel.app` resolves into Meta's `face:b00c` / `157.240.x` range |
| TLS | Even with the real IP (`64.29.17.195`) and correct SNI, the handshake is reset (`SSL_connect: Connection reset by peer`) |

Neither is a misconfiguration, so there is nothing to fix on the Vercel
side. Readers could load articles but the comment box stayed stuck on
"评论加载中" and posting a comment was impossible.

## How the proxy fixes it

```
visitor (China)
  -> twikoo.qianbenyuan.dpdns.org      Cloudflare edge, reachable
  -> twikoo-proxy Worker               egress via Cloudflare's network
  -> twikoo-nci.vercel.app             the original, untouched backend
```

The Worker forwards the request from Cloudflare's network, so the SNI
filtering that blocks direct access never applies. The upstream database
and configuration are unchanged, so existing comments keep working.

This also removes the 24/7 constraint: an earlier attempt ran `tkserver`
on the local machine behind a Cloudflare Tunnel, which meant comments died
whenever the PC was off.

## Why a custom domain is required

`*.workers.dev` is blocked in China as well — it resolves to
`157.240.15.8` and resets on connect. Notably `blog.qianbenyuan.dpdns.org`
works from the same machine at the same time, which shows the GFW matches
on the SNI hostname rather than on Cloudflare's IP range.

So the Worker is bound to `twikoo.qianbenyuan.dpdns.org` via
`routes` in `wrangler.toml`, backed by a proxied CNAME DNS record.

## Deployment

```bash
export CLOUDFLARE_API_TOKEN=<token with Workers Scripts:Edit + DNS:Edit>
wrangler deploy
```

The DNS record is not created automatically when `routes` is used, so it
has to exist first:

```
CNAME  twikoo  ->  twikoo-proxy.<workers-subdomain>.workers.dev   (proxied)
```

Check it with:

```bash
curl https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/subdomain
```

## Notes for future edits

- The submit event is **`COMMENT_SUBMIT`**. There is no `COMMENT_ADD`
  event in the client bundle; guessing the wrong name makes the backend
  reply `code 1001 "请更新Twikoo 云函数至最新版"`, which misleadingly
  looks like a version mismatch rather than an unknown event.
- The request body must carry `event`, `accessToken` and `envId`, plus
  the flat `nick/mail/link/ua/url/href/comment/pid/rid` fields.
- `ALLOWED_EVENTS` is a deliberate guard: without it this Worker is an
  open proxy. Rejecting unknown events is also why `GET_CONFIG` had to be
  added explicitly.
- Reading comments and posting comments are independent code paths on the
  backend. Always verify both; a proxy can look fine while `COMMENT_SUBMIT`
  silently fails.

## Expected behaviour that looks like a bug

- `GET https://twikoo.qianbenyuan.dpdns.org/` returns **405**. The Twikoo
  backend is a POST-only JSON API and serves no HTML at all, so a browser
  hitting the root with GET always gets 405. This is correct.
- The admin dashboard is a **client-side** app served by
  `twikoo.all.min.js`; the backend has no `/admin` page. The entry point
  is `https://twikoo.qianbenyuan.dpdns.org/?admin`.
- Logging in to that dashboard does not work on the Vercel deployment.
  `adminLogin` requires `config.CREDENTIALS`, and `isAdmin()` calls
  CloudBase's `auth.getEndUserInfo()`, neither of which exists outside
  CloudBase. `GET_PASSWORD_STATUS` therefore reports
  `credentials: false`. Reading and writing comments work fine; only
  admin operations are unavailable. Delete comments through the Vercel
  dashboard while you still have a way to reach `*.vercel.app`.
