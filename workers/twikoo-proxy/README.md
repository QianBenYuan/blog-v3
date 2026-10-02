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
- `GET /healthz` returns `ok` without touching Vercel. Use it to tell
  "Worker is down" apart from "Vercel is down".
- The admin dashboard is a **client-side** app shipped in
  `twikoo.all.min.js`; the backend has no `/admin` page, and
  `?admin` on the API host just returns the health-check JSON
  (`code 100`). The dashboard has to be opened from a page that already
  embeds the comment widget, via its hidden entry point.

## Admin authentication on the Vercel backend (corrected 2026-10-02)

The Vercel build is **not** CloudBase-based, and admin login does work.
An earlier note in this file claimed otherwise; that was wrong and it cost
a lot of time, so the actual mechanics are written down here.

The relevant dispatcher is `src/server/vercel/api/index.js` in the Twikoo
repo (the CloudBase one lives in `src/server/function/twikoo/index.js` and
behaves differently — do not mix them up).

| Concern | Reality on the Vercel build |
| --- | --- |
| Login event | **`LOGIN`** (`{ event: 'LOGIN', password: md5(plaintext) }`) |
| Password check | `config.ADMIN_PASS === md5(password)` |
| Admin identity | `isAdmin()` is `config.ADMIN_PASS === md5(accessToken)` — the **accessToken is the md5 of the admin password** |
| Set password | **`SET_PASSWORD`** `{ event: 'SET_PASSWORD', password: md5(plaintext) }` |
| Delete comment | `COMMENT_DELETE_FOR_ADMIN` `{ id }` with `accessToken` = md5 of the admin password |
| Delete own comment | `COMMENT_DELETE_FOR_USER` `{ id }` |

So the storage is `ADMIN_PASS = md5(md5(plaintext))`, the client keeps
`md5(plaintext)` in `localStorage['twikoo-access-token']`, and every admin
call sends that value as `accessToken`.

### `credentials: false` is a red herring

`GET_PASSWORD_STATUS` answers:

```json
{ "code": 0, "status": false, "credentials": false, "version": "1.7.14" }
```

`credentials` mirrors `config.CREDENTIALS`, a CloudBase-only field the
Vercel build never writes — it is **always** false and means nothing. The
field that actually matters is `status`, i.e. `!!config.ADMIN_PASS`.

### `code 1001` is EVENT_NOT_EXIST, not a version problem

`RES_CODE.EVENT_NOT_EXIST === 1001` and its message is
`请更新 Twikoo 云函数至最新版`. It fires from the `default:` branch of the
dispatcher, i.e. **the event name was not recognised**. It has nothing to
do with the server being out of date. `COMMENT_ADD`, `ADMIN_LOGIN`,
`ADMIN_CREDENTIALS` and `COUNTER_GET_FOR_ADMIN` all produce it on this
backend.

### Why `SET_PASSWORD` is not publicly allowed here

`setPassword()` upstream is:

```js
if (config.ADMIN_PASS && !isAdminUser) return PASS_EXIST   // 1010
await writeConfig({ ADMIN_PASS: md5(event.password) })
```

While no admin password is configured there is **no authorisation check at
all**. Since this Worker is a public proxy, forwarding `SET_PASSWORD`
unconditionally would let any visitor claim the comment backend. It is
therefore only forwarded when the request also carries the setup secret:

```bash
wrangler secret put TWIKOO_SETUP_TOKEN      # pick a value only you know

curl -X POST https://twikoo.qianbenyuan.dpdns.org/ \
  -H 'Content-Type: application/json' \
  -H 'X-Twikoo-Setup: <TWIKOO_SETUP_TOKEN>' \
  -d '{"event":"SET_PASSWORD","password":"<md5 of your plaintext password>"}'
```

Without the secret the Worker answers `403 event not allowed: SET_PASSWORD`.

### Deleting a comment

```bash
H=$(printf '%s' 'your-plaintext-password' | md5sum | cut -d' ' -f1)   # md5 of plaintext

curl -X POST https://twikoo.qianbenyuan.dpdns.org/ \
  -H 'Content-Type: application/json' \
  -d "{\"event\":\"COMMENT_DELETE_FOR_ADMIN\",\"accessToken\":\"$H\",\"id\":\"<comment-id>\"}"
```

`code 0` with `deleted: 1` means it worked. `code 1024` (`请先登录`) means
the accessToken is not the current admin password.
