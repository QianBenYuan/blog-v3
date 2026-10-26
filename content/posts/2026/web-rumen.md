---
title: "WEB入门题（文件泄露）"
description: "一些WEB入门题"
image: "/assets/莫弈，电话，侦探.jpg"
date: 2026-10-22
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
  - 信息泄露
type: tech
recommend: 5
---

## WEB入门题（文件泄露）

::link-banner
---

banner: /assets/师徒三人.jpg
title: WEB入门题
description: 题目来源:ctfshow的WEB入门题
link: "https://ctf.show/challenges"
---

::



### web4

![image-20261022081437796](/assets/web-rumen/image-20261022081437796.png)

查看源代码，抓包看响应头等都没有flag，所以我们可以尝试使用

#### 信息收集

##### 法一：使用dirsearch进行扫描（但是扫描时间会比较长）

```
python -m dirsearch -u https://xxx.ctf.show/ -e php -i 200,301,302
```

![image-20261022082925393](/assets/web-rumen/image-20261022082925393.png)

> | 片段                    | 类型        | 作用                                                         |
> | ----------------------- | ----------- | ------------------------------------------------------------ |
> | `python`                | 程序        | 调用 Python 解释器，用来运行 Python 程序                     |
> | `-m`                    | python 参数 | module，把后面的名字当作**已安装的 Python 模块**来运行，不用找脚本文件 |
> | `dirsearch`             | 模块名      | 目录扫描工具本体                                             |
> | `-u`                    | 工具参数    | url，指定**目标网站地址**，后面跟 `https://xxx.ctf.show/`    |
> | `https://xxx.ctf.show/` | 参数值      | 要扫描的站点，必须带 http/https，末尾最好带 `/`              |
> | `-e`                    | 工具参数    | extensions，指定**文件后缀**，`-e php` = 给字典里的路径自动补 `.php` 后缀 |
> | `php`                   | 参数值      | 要尝试的后缀类型（写 `php,phps` 就是同时试两种）             |
> | `-i`                    | 工具参数    | include，**只保留这些状态码**的结果，其他一律不输出          |
> | `200,301,302`           | 参数值      | HTTP 状态码：200 = 正常存在，301 = 永久重定向，302 = 临时重定向 |
>
> 用 python 加载 dirsearch 模块，扫描 `https://xxx.ctf.show/`，路径自动补 `.php` 后缀，结果里**只展示返回 200、301、302 的链接**，把一堆 404、403 过滤掉不显示。

##### 法二：直接使用高频信息泄露的敏感文件

直接使用`<URL>/rotbots.txt`访问

> **Q1：robots.txt 是什么？**
>
> `robots.txt` 是网站根目录下的纯文本文件，基于 Robots Exclusion Protocol（爬虫排除协议），作用是给搜索引擎、网络爬虫提供爬取指引。爬虫访问网站时，会优先请求这个文件，按照里面的规则决定是否抓取对应页面。
>
> **Q2:robots.txt里面是什么样子？**
>
> | 字段             | 含义                                 |
> | ---------------- | ------------------------------------ |
> | `User-agent: *`  | 匹配所有爬虫；`*` 是通配符           |
> | `Disallow: /xxx` | 禁止爬虫访问 `/xxx` 路径             |
> | `Allow: /xxx`    | 允许爬虫访问 `/xxx` 路径（较少使用） |
>
> 示例内容：
>
> ```
> User-agent: *
> Disallow: /admin/
> Disallow: /.git/
> Disallow: /config.php.bak
> ```
>
> 含义：对所有爬虫，不要爬取 `/admin/`、`/.git/`、`config.php.bak`。
>
> **Q3：为什么会产生信息泄露？**
>
> `Disallow` **不是权限限制**。
> 它只是一份给爬虫看的 “建议”，**不会拦截普通用户、渗透者访问该地址**。
> 管理员 / 出题人把敏感路径写在 Disallow 中，相当于把隐藏路径明文公开，攻击者可以直接访问这些地址，获取后台、源码备份、版本仓库等敏感资源，形成信息泄露。

使用robots.txt之后进入，这个页面

![image-20261022084137374](/assets/web-rumen/image-20261022084137374.png)

他都说了Disallow: /flagishere.txt，那我偏要看看是什么

输入/flagishere.txt，然后得到flag

![image-20261022084348697](/assets/web-rumen/image-20261022084348697.png)

### web5

web5已经给提示了，**phps源码泄露有时候能帮上忙**

![image-20261022084519476](/assets/web-rumen/image-20261022084519476.png)

使用`<URL>/index.phps`，然后会浏览器会把源码文件下载到本地文件，打开`index.phps`，就能看到flag

![image-20261022085053425](/assets/web-rumen/image-20261022085053425.png)

> **Q1：为什么优先尝试 `index.phps`？**
> Web 服务默认配置中，访问网站根目录时，服务器会加载 `index.php` 作为首页展示，它是网站的入口文件。在 CTF 简单信息泄露题型里，程序核心代码、flag 校验逻辑大多写在首页文件 `index.php` 中。因此当发现 `.phps` 源码泄露考点时，我们会优先将首页文件名 `index.php` 修改后缀为 `index.phps` 尝试访问；如果返回 404，再继续尝试 `config.phps`、`admin.phps` 等其他文件。

### web6

他已经说了`解压源码到当前目录，测试正常，收工`

![image-20261022085410406](/assets/web-rumen/image-20261022085410406.png)

所以我们尝试使用`<URL>www.zip`

#### 使用`<URL>www.zip`

![image-20261022085851993](/assets/web-rumen/image-20261022085851993.png)

然后他会去下载

www.zip压缩包

![image-20261022085921289](/assets/web-rumen/image-20261022085921289.png)

#### 打开index.php

打开index.php能看到**//flag in fl000g.txt**

![image-20261022090205586](/assets/web-rumen/image-20261022090205586.png)

#### 打开fl000g.txt

或者打开**fl000g.txt**，能看到**flag{flag_here}**，说明了flag的位置就是在fl000g.txt里

![image-20261022090328672](/assets/web-rumen/image-20261022090328672.png)

#### 网址输入fl000g.txt

使用`<URL>/fl000g.txt`,就得到了flag

![image-20261022090625319](/assets/web-rumen/image-20261022090625319.png)

> 1. 解压源码到当前目录，测试正常，收工
> 说明开发者做完网站、测试完成之后，把整套网站源码打包成了一个压缩包，放在网站根目录里，方便备份、转移。
>
> >
> > “当前目录” = 网站的 Web 根目录 `/`
>
> 2. **为什么优先猜 www.zip？**
>
> - `www` 是网站根目录文件夹的传统名字（服务器存放网页文件的文件夹经常命名为 www），打包整个站点源码，习惯命名为 `www.zip`。
> - 同类型备选还有：`web.zip`、`root.zip`、`source.zip`、`code.zip`，但是 **www.zip 出现频率最高**，所以优先试它。
> - 访问路径就是：`靶场地址/www.zip`，浏览器会直接下载整套网站源码压缩包。
>
> 3. **原理**
> 开发者在开发、部署网站时，为了备份源码，会把网站根目录下全部文件打包压缩。日常运维习惯将网站根目录命名为 `www`，打包后的压缩包命名为 `www.zip`，并且随手放在网站根目录忘记删除。
> 当题目提示存在源码打包、解压测试这类线索时，我们优先尝试访问 `/www.zip` 获取源码包；如果 404，再依次尝试 web.zip、source.zip 等名称。
> 4. **区分phps 泄露和www.zip泄露**
>
> - `.phps`：**单个 PHP 文件源码泄露**，一次拿到一个文件的代码
> - `www.zip`：**全站源码打包泄露**，下载一个压缩包，里面包含网站所有 php、配置、其他文件

### web7

还是一样给了提示：

- **版本控制**，在开发里默认指 Git

> **Q1：什么是Git？**
>
> Git 就是现在最主流的代码版本控制系统。
>
> > 开发人员用 git 管理代码，不小心把整个 `.git` 文件夹直接上传到网站服务器（生 产环境）了。

![image-20261022090815191](/assets/web-rumen/image-20261022090815191.png)



#### 法一：使用`<URL>/.git`

直接使用`<URL>/.git`，然后就得到flag了

![image-20261022091447737](/assets/web-rumen/image-20261022091447737.png)

#### 法二：使用dirsearch进行扫描

使用dirsearch进行扫描，可以得到：

![image-20261022091734008](/assets/web-rumen/image-20261022091734008.png)

然后使用`<URL>/.git`也能得到flag

### web8

版本控制泄露除了`.git`，还有`<URL>/.svn/`

![image-20261022091812001](/assets/web-rumen/image-20261022091812001.png)



#### 直接使用`<URL>/.svn/`，得到

![image-20261022092343329](/assets/web-rumen/image-20261022092343329.png)

#### 使用dirsearch扫描，扫出来

![image-20261022092525514](/assets/web-rumen/image-20261022092525514.png)

> **Q1：什么是svn？**
>
> SVN（subversion）是程序员常用的源代码版本管理软件。在使用 SVN 管理本地代码过程中，使用 svn checkout 功能来更新代码时，项目目录下会自动生成隐藏的.svn文件夹（Linux上用 ls 命令看不到，要用 ls -al 命令），其中包含重要的源代码信息。
>  造成SVN源代码漏洞的主要原因是管理员操作不规范，一些网站管理员在发布代码时，不愿意使用“导出”功能，而是直接复制代码文件夹到WEB服务器上，这就使得.svn隐藏文件夹被暴露于外网环境，黑客对此可进一步利用

### web9

已经给了提示，`vim`、生产环境修改、死机（异常退出），直接指向 `.swp` 泄露，这是vim 交换文件（.swp）源码泄露。

![image-20261022092435424](/assets/web-rumen/image-20261022092435424.png)

##### 使用`/index.php.swp`

然后进行了index.php.swp下载

![image-20261022095316727](/assets/web-rumen/image-20261022095316727.png)



打开查看，得到flag

![image-20261022095405627](/assets/web-rumen/image-20261022095405627.png)

> **Q1：什么是vim？**
>
> vim 是 Linux 下常用命令行文本编辑器。使用 vim 打开文件编辑时，会自动生成**交换缓存文件**用于临时保存编辑内容。
>
> 1. 正常保存、正常退出 vim 时，`.swp` 文件会自动删除；
> 2. 如果异常退出（死机、强制关闭、断连等），`.swp` 文件不会被删除，残留在服务器目录；
> 3. 交换文件命名规则：`.原文件名.swp`，多次异常崩溃会依次生成 `.swo`、`.swn` 等；
> 4. 若 Web 服务器没有对这类隐藏临时文件做访问限制，攻击者可以直接访问下载该缓存文件，恢复得到网站源代码，读取 flag。
>
> > 补充其他同类备份文件：vim 还会生成 `文件名~` 波浪号备份文件，也是常见源码泄露点。
>
> **Q2：若不是svn可以尝试哪些敏感路径？**
>
> `.swp` → `.swo` → `.swn`，同时可以顺带测试 `index.php~`。
>
> **Q3：什么是`.swp`?**
>
> `.swp` 是 **swap（交换文件）**。`.vim` 一般是 vim 的配置目录；而打开 `xxx.php` 时 vim 会自动生成 `.xxx.php.swp`，用来暂存未保存修改，正常退出会自动删除，异常崩溃才残留，访问该文件就能拿到源码，这就是常说的 vim 交换文件泄露，后续还有 `.swo`、`.swn`、 `.viminfo`等同系列后缀。

### web10

也是有了提示，是cookie

![image-20261022095514822](/assets/web-rumen/image-20261022095514822.png)

#### 使用F12

F12，打开网络，查看cookie就能看到flag了

![image-20261022100121208](/assets/web-rumen/image-20261022100121208.png)

#### 使用Burp

也可以使用Burp进行抓包，打开Proxy（代理），点击开始拦截，然后刷新网址才会出现请求

![image-20261022100424664](/assets/web-rumen/image-20261022100424664.png)

再行URL解码就可以得到flag了

![image-20261022100647015](/assets/web-rumen/image-20261022100647015.png)

### web11

![image-20261022113010707](/assets/web-rumen/image-20261022113010707.png)

这道题有问题，所以暂时拿不到flag，但是可以学习一下

他说：域名其实也可以隐藏信息，比如 `flag.ctfshow.com` 就隐藏了一条信息

那么可能指的是：DNS 信息搜集、TXT 记录

#### DNS 不只有「域名 → IP」

大多数人第一次接触 DNS，学到的就是「输入网址，DNS 帮你换成 IP」。这个说法只对了一半——那只是 **A 记录**。DNS 其实是个通用的小型数据库，同一条域名下可以挂十几种不同类型的记录：

| 类型    | 存什么           | 典型用途                       |
| ------- | ---------------- | ------------------------------ |
| A       | IPv4 地址        | 网站最常规的解析               |
| AAAA    | IPv6 地址        | 同上，走 v6                    |
| CNAME   | 另一个域名       | 别名，把 `www` 指到别处        |
| MX      | 邮件服务器       | 收信                           |
| NS      | 权威域名服务器   | 谁管这个域的解析               |
| **TXT** | **一段任意文本** | **域名验证、SPF、甚至藏 flag** |

TXT 记录的特别之处就在「任意文本」四个字。它不参与访问，浏览器也不会读它，但任何人都能查。所以它天然适合放两类东西：

1. **验证字符串**。申请 SSL 证书、绑定企业微信/谷歌/阿里云、开通各种开发者服务时，服务商给你一串随机字符，让你去域名后台加一条 TXT。加完之后服务商去查一次，查到了就证明域名确实归你。手动验证的方法就是 `nslookup -qt=txt 域名`。
2. **邮件防伪造**。SPF、DKIM、DMARC 三个协议全靠 TXT：SPF 说明「哪些服务器被允许用我的域名发信」，DMARC 说明「收到伪造邮件该怎么处理」。没有这些记录，别人可以随便伪造你的域名发垃圾邮件。

第三类用途是：**藏东西**。安全圈常见手法是把验证 token、内部信息、甚至 C2 回连地址写进 TXT 记录，看起来完全是一条正常的 SPF 记录。

#### 工具：nslookup（name server lookup）

 Windows、Linux、macOS 全都自带，不用装。它的作用只有一个：**向 DNS 服务器提问，把对方的回答原样显示出来**。

> 常有人推荐 `dig`。`dig` 输出更规整、脚本更好处理，但 Windows 默认没有，得额外装。既然系统自带 nslookup，日常查一下记录够用了。Linux/Kali 两个都有`dig` 。

##### 命令拆解

`nslookup -qt=<类型> <域名> [DNS服务器]` 是查记录的标准句式

```cmd
nslookup -qt=txt flag.ctfshow.com
```

- `nslookup` — 程序名，DNS 查询工具
- `-qt=` — `querytype` 的缩写（q = query，t = type），指定这次想查哪一种记录。等价写法有 `-type=`、`-q=`，`-qt=` 最短
- `txt` — 记录类型，这里是 TXT 文本记录
- `flag.ctfshow.com` — 目标域名

合起来读：**用 nslookup 这个工具，向 DNS 服务器查询 `flag.ctfshow.com` 的 TXT 类型记录。**

如果省略 `-qt`，默认查的是 A 记录，也就是只回一个 IP，看不到你要的东西。

##### 其他常用查询类型

同一套语法，换个类型就能查别的：

```cmd
nslookup -qt=A    example.com   :: IPv4 地址（默认）
nslookup -qt=AAAA example.com   :: IPv6 地址
nslookup -qt=MX   example.com   :: 邮件服务器
nslookup -qt=NS   example.com   :: 权威 DNS 服务器
nslookup -qt=CNAME www.example.com :: 别名指向
nslookup -qt=ANY  example.com   :: 一次查全部（很多服务器会拒答）
```

`-qt=ANY` 看着最方便全面，但是实际上经常不管用：不少 DNS 服务器（尤其 Cloudflare）出于防滥用考虑，对 ANY 查询只回一个精简结果或者不进行回答，这在 RFC 8482 里是被明确允许的。

> Q1：有时候会出现「非权威应答」这个回答，这是什么？

**「非权威应答」的意思不是表明有错误**。 DNS 记录是一级一级缓存下来的：你问本地 DNS，本地没有就去问上级，拿到结果后自己存一份再回给你。因为你问的那台服务器不是这个域名的权威服务器，所以它老实标注一句「这不是官方原话，是我缓存来的」。加了 `8.8.8.8` 这类公共 DNS 之后，回你的是 Google 的缓存，同样是非权威应答。**只要下面有你想要查询的内容，就是查到了。**

### web12

先使用`robots.txt`看一下有没有敏感文件

![image-20261022160352038](/assets/web-rumen/image-20261022160352038.png)

看到有`Disallow: /admin/`,那我们尝试访问看看

![image-20261022160453667](/assets/web-rumen/image-20261022160453667.png)

然后会看到需要登录用户名和密码，一般来说，我们用户名一般是`admin`，那密码在哪里呢，一般我们打CTF需要找到的东西就是密码，那我们来找一下密码在哪里。

回到原来的网页能够看到一串神秘数字，我们试试看吧

![image-20261022160252034](/assets/web-rumen/image-20261022160252034.png)

![image-20261022160731155](/assets/web-rumen/image-20261022160731155.png)

然后我们会发现登录进去了，拿到了flag

![image-20261022160759399](/assets/web-rumen/image-20261022160759399.png)



> 该题也可以通过dirsearch扫描扫出`robots.txt`和`/admin`,然后访问进去，由于扫描需要的时间太久，在这里就不多再赘述



### web13

还是先看一下题目的提示

![image-20261022161135855](/assets/web-rumen/image-20261022161135855.png)

> **技术文档里面不要出现敏感信息，部署到生产环境后及时修改默认密码**

也就是说：
开发者写的**技术文档（PDF 手册）里，不小心把后台地址、默认账号密码写进去了**，而且上线之后没改掉默认密码，我们直接拿这个默认信息登录后台拿 flag。

#### 进入文档

##### 法一：

看靶场底部，这里前面都是大写字母，只有`document`是小写，提示的时候也提过`文档`二字（不懂document的给我去查单词！！！），再加上你鼠标移到`document`，鼠标都变成了pointer(连接指针)了，你真的不想点进去看看吗

![image-20261022162314997](/assets/web-rumen/image-20261022162314997.png)

点进去

##### 法二：

他都说了**这份【技术文档】还留在网站上没删掉**，那么文档名字大概率叫 `document.pdf`，直接路径访问就能拿到文档，里面写着默认密码、后台地址、密钥、flag。

直接在网址后面使用`/document.pdf`,进入网址就能看到登录用户名，登录密码，默认后台地址

![image-20261022163039374](/assets/web-rumen/image-20261022163039374.png)

#### 点击默认后台地址

进去之后网页有问题，是哪里错了吗？- - >并不是

![image-20261022163244993](/assets/web-rumen/image-20261022163244993.png)

`your-domain`指的是你的域名，所以我们要去把`/system1103/login.php`后缀添加到我们的域名后面

再输入用户名和密码就能拿到flag

![image-20261022163438541](/assets/web-rumen/image-20261022163438541.png)

### web14

也是给了提示

![image-20261022202254739](/assets/web-rumen/image-20261022202254739.png)

#### 访问 `<URL>/editor`

可以看到

![image-20261022202416732](/assets/web-rumen/image-20261022202416732.png)

#### 或是使用dirsearch进行扫描

得到两个路径

![image-20261022203639654](/assets/web-rumen/image-20261022203639654.png)

能看到有这个路径`<URL>/editor/`

![image-20261022204109949](/assets/web-rumen/image-20261022204109949.png)

查看`<URL>/assets/`,能看到

![image-20261022203940586](/assets/web-rumen/image-20261022203940586.png)

> **403 Forbidden**：服务器收到你的请求了，但是**拒绝给你访问这个目录 / 文件**，不是找不到（404 才是找不到），nginx 直接拦下来不让看目录列表。



然后，点击这两个随便点一个

![image-20261022212544371](/assets/web-rumen/image-20261022212544371.png)

> **Q1：为什么要去点「插入图片、图片空间」？为什么不是别的按钮？**
>
> **1.首先，这个页面上有个东西叫 KindEditor（富文本编辑器），就是你看到的一大块可以打字、加粗、插图片的编辑框。**
> 它不是开发自己一行行手写做出来的功能，是**网上下载的一个现成开源工具包**，这个工具包名字就叫 KindEditor。
> 这个工具包里面自带一大堆小功能按钮：加粗、换颜色、插入链接、插入图片、插入文件……
> 提示写了：`有时候源码里面就能不经意间泄露重要(editor)的信息,默认配置害死人`
>
> - `editor` = 编辑器，指的就是这个 KindEditor 工具
> 	这句话翻译成人话：**这个编辑器工具本身自带漏洞，不是页面打字框本身有漏洞。我们要从这个编辑器自带的功能里面找突破口。**
>
> **2.我们要区分两类按钮：一类只改文字，一类会碰「服务器上的文件」**
>
> 我们把编辑器按钮分成两大类：
>
> - 【只改页面文字的按钮】：加粗、变色、调整字体、对齐、插入超链接（手动写网址那种）
> 	这些按钮，**只在你当前浏览器里改文字**，不会去服务器翻文件，碰不到服务器硬盘，不可能拿到藏在服务器里的 flag。直接排除。
> - 【要读取服务器文件的按钮】：**插入图片、插入文件（回形针）**
> 	当你点「插入图片」的时候，它给你两个选择：
> 	① 本地上传：把你电脑的图片发到服务器
> 	② **图片空间**：去服务器上面，翻服务器已经存好的图片文件
> 	这个「图片空间」，本质就是编辑器自带的一个**文件浏览小工具**。
> 	它的设计初衷本来是：方便你挑选之前上传到服务器的图片，所以它要能列出服务器文件夹里有什么文件。
>
> > 加粗按钮不需要读服务器文件；但是【图片空间】这个功能，天生就需要去服务器读文件夹列表。
> > 所以漏洞只会出在这种**需要读取服务器文件**的功能上，别的按钮根本没有访问服务器文件的能力。
>
> **3.「默认配置害死人」是什么意思？**
>
> 这个 KindEditor 工具，正常安全版本是有限制的：
>
> > 图片空间只能看专门放上传图片的 `attached` 文件夹，**不允许往上翻目录、不能看服务器其他地方**。
>
> 但是！如果运维偷懒，**不改默认配置**，这个限制就消失了。
> 这个文件浏览工具就失控了：它不光能看图片文件夹，还能一直点 “上级目录”，一路跳到服务器最顶层，随便浏览服务器所有文件夹，这就是**目录遍历漏洞**。
>
> 而这个浏览功能，**绑定在「插入图片 → 图片空间」这个弹窗里**，这是它的入口。
>
> > 这桑编辑器自带一个 “浏览服务器文件” 的功能，这个功能的打开方式，就是点插入图片，再点图片空间。
>
> 回形针（插入文件）按钮，调用的是**同一个后台 php 文件 `file_manager_json.php`**，所以它也能打开这个文件浏览，是同一个漏洞入口，只是按钮不一样。
>
> 不是我们莫名其妙非要去点图片按钮。
> **是只有「图片空间 / 文件空间」这个功能，设计上就需要读取服务器的文件夹列表；其他按钮根本没有读取服务器文件的能力，不可能用来遍历找 flag。漏洞刚好藏在这个文件浏览功能里。**

#### 进入文件路径里找到flag

##### 法一：点击图片

![image-20261022210209426](/assets/web-rumen/image-20261022210209426.png)

###### 点击图片空间

![image-20261022210259293](/assets/web-rumen/image-20261022210259293.png)

###### 点击var文件

![image-20261022210510347](/assets/web-rumen/image-20261022210510347.png)

###### 点击www文件

![image-20261022210536610](/assets/web-rumen/image-20261022210536610.png)

###### 点击html文件

![image-20261022210602990](/assets/web-rumen/image-20261022210602990.png)



###### 点击nothinghere

![image-20261022210624423](/assets/web-rumen/image-20261022210624423.png)

###### 看到有个`fl000g.txt`

![image-20261022210653416](/assets/web-rumen/image-20261022210653416.png)



使用这个`<URL>/nothinghere/fl000g.txt`，得到flag

![image-20261022211152506](/assets/web-rumen/image-20261022211152506.png)

> **Q1: 为什么路径是 `/var/www/html/`？**
>
> 这个是 **Linux 服务器的常识**：
>
> - 绝大多数 Linux + Nginx/Apache + PHP 的网站靶机，**网站根目录默认固定就是 `/var/www/html/`**
>   - `/var`：存放可变数据、网页、日志
>   - `/var/www`：web 服务相关目录
>   - `/var/www/html`：网站根目录，你访问域名看到的 index.php 就放在这里
> - 也就是说：你在浏览器访问 `http://xxx/index.php`，服务器真实磁盘位置就是 `/var/www/html/index.php`
>
> 出题人就是把 flag 文件放在网站根目录下一个不起眼文件夹：`/var/www/html/nothinghere/fl000g.txt`
> `nothinghere` 翻译：这里啥都没有，反义就是：就是在这里呀，快点我。
>
> **Q2：为什么要一层一层点开 var → www → html → nothinghere？**
>
> 图片空间弹窗本质就是一个图形化的文件浏览器，和你 Windows 的此电脑一样：
>
> - 打开图片空间，一开始停在编辑器自己的上传文件夹；
> - 点「上级目录」不断往上回退，退到磁盘根 `/`，就能看到根目录下的 `var` 文件夹；
> - 进入 var → 里面有 www；进入 www → 里面有 html；进入 html → 看到 nothinghere；
> - 点开 nothinghere，就能看到里面存在 `fl000g.txt`
>
> >
> > 1. 弹窗里只是**列出文件名**，它只是给你看名字，不能直接读取 txt 内容；
> > 2. 你拿到文件名之后，要把磁盘绝对路径转换成 web 访问地址：
> > 磁盘：`/var/www/html/nothinghere/fl000g.txt`
> > 网页访问：`域名/nothinghere/fl000g.txt`
> > 因为 `/var/www/html` 对应域名的根 `/`，前面一截等价替换掉。
>
> **Q3：所以机器的文件路径都是这个？**
>
> 并不是所有机器都是 /var/www/html
>
> - 有些靶机是 `/home/wwwroot/`、`/usr/share/nginx/html`；
> - 这道题是 ctfshow 入门题，出题人为了降低难度，直接用最经典、最通用的 `/var/www/html`；
>
> **Q4:为什么是路径是`/nothinghere/fl000g.txt`，而不是`/fl000g.txt`？**
>
> 从目录中看，你现在看到的这个界面，对应的磁盘路径是：
>
> ```
> /var/www/html/
> ```
>
> 里面的内容：
>
> - assets 文件夹
> - editor 文件夹
> - nothinghere 文件夹
> - index.php
>
> >
> > 文件夹的从属关系：`fl000g.txt` **是放在 nothinghere 文件夹里面的**
> > 也就是磁盘完整路径：
>
> ```
> /var/www/html/nothinghere/fl000g.txt
> ```
>
> **核心映射规则（Linux 网站固定对应关系）**
>
> `/var/www/html` ↔ 你的题目网址（域名根 `/`）
>
> - `/var/www/html/index.php`  →  `题目网址/index.php`
> - `/var/www/html/nothinghere/` → `题目网址/nothinghere/`
> - `/var/www/html/nothinghere/fl000g.txt` → `题目网址/nothinghere/fl000g.txt`
>
> 如果写 `题目网址/fl000g.txt`
> 它对应的磁盘路径是：
> `/var/www/html/fl000g.txt`
> 意思是：**fl000g.txt 直接放在 html 根目录，和 nothinghere 文件夹同级**
> 但真实情况是：txt 在 nothinghere 里面，不是和它同级，所以使用这个地址`/fl000g.txt`访问就会 404 Not Found，找不到文件。
>
> 例如：
>
> 把 `/var/www/html` 当成【D 盘】
>
> - D 盘（html）里面有个文件夹叫 nothinghere
> - nothinghere 里面放着 fl000g.txt
> 	- 正确路径：D:\nothinghere\fl000g.txt
> 	- 错误路径：D:\fl000g.txt
> 	- 后者是去 D 盘根目录直接找这个文件，而文件是装在子文件夹里面的，当然找不到。
>
> - `题目网址/nothinghere/`  访问这个**文件夹本身**，nginx 不让浏览目录 → 403
> - `题目网址/nothinghere/fl000g.txt`  直接访问文件夹里面这个具体文件 → 正常读出 flag
>
> 简单来说就是文件在哪一级文件夹里，URL 里就必须带上前面所有文件夹名字，不能跳过中间的 nothinghere。

##### 法二：

###### 点击这个插入文件

![image-20261022212636436](/assets/web-rumen/image-20261022212636436.png)





###### 点击文件空间

![image-20261022212723058](/assets/web-rumen/image-20261022212723058.png)



###### 还是和法一一样的路径查找

![image-20261022212753963](/assets/web-rumen/image-20261022212753963.png)

![image-20261022212826886](/assets/web-rumen/image-20261022212826886.png)

![image-20261022212842198](/assets/web-rumen/image-20261022212842198.png)



![image-20261022212855122](/assets/web-rumen/image-20261022212855122.png)

![image-20261022212912183](/assets/web-rumen/image-20261022212912183.png)



使用这个`<URL>/nothinghere/fl000g.txt`，得到flag

### web15

他说`公开的信息比如邮箱，可能造成信息泄露，产生严重后果`

> 邮箱是公开在网页上的，而邮箱关联的账号信息、个人资料（所在地）属于可以被社工搜集到的隐私，能用来绕过密保、重置密码，造成后台沦陷（拿到 flag）
>
> 网站页面上放了一个管理员邮箱（QQ 邮箱），大家都看得见。
> 这个邮箱绑定了 QQ，QQ 主页会**公开写着他的城市**；后台的密保问题刚好就是【我的所在地是哪个城市？】 所以我们可以：**公开邮箱 → 找到 QQ 号 → 查到 QQ 公开资料（城市） → 回答密保问题 → 重置后台密码 → 进后台拿 flag**

![image-20261022213104977](/assets/web-rumen/image-20261022213104977.png)



##### 使用dirsearch进行扫描，得到两个一样的路径

![image-20261022215220314](/assets/web-rumen/image-20261022215220314.png)

使用`/admin`或者`admin/index.php`都可以进入到同一个界面

![image-20261022215430318](/assets/web-rumen/image-20261022215430318.png)

![image-20261022215452017](/assets/web-rumen/image-20261022215452017.png)

##### 查找用户名和密码

这里需要用户名和密码，那么我们能够从首页看到账号`1156631961@qq.com`，提取出QQ号就是`1156631961`

![image-20261022215051415](/assets/web-rumen/image-20261022215051415.png)

只知道用户名，但是不知道密码，所以我们尝试重置密码，点击忘记密码

![image-20261022215949682](/assets/web-rumen/image-20261022215949682.png)

他问：

![image-20261022220026210](/assets/web-rumen/image-20261022220026210.png)

##### 社工查询 QQ 信息，搜索这个 QQ 号，查看 QQ 资料，得到所在地：**西安**

![img](/assets/web-rumen/66f692a31142ca771049cf91545dd6d8.jpg)



##### 输入西安，然后提交

![image-20261022220355154](/assets/web-rumen/image-20261022220355154.png)



##### 得到密码`admin7789`

![image-20261022220511822](/assets/web-rumen/image-20261022220511822.png)



输入用户名和密码得到flag

![image-20261022220847633](/assets/web-rumen/image-20261022220847633.png)

![image-20261022220949139](/assets/web-rumen/image-20261022220949139.png)







### web16

**测试探针用完要删除，防止信息泄露**，这里的探针一般就是**雅黑 PHP 探针，文件名 tz.php**

![image-20261022221550891](/assets/web-rumen/image-20261022221550891.png)



> Q1：为什么是`tz.php`？
>
> - 字典里自带常见探针文件名是：
> 	`phpinfo.php`、`info.php`、`tz.php`（雅黑探针）、`probe.php`、`p.php`、`phpinfo.php3`，都可以试一下。
> - 雅黑 PHP 探针默认文件名 `tz.php`，很多靶场 / 主机直接沿用。
> - 出题人圈子里形成了固定套路：
> 	hint 写【测试探针用完要删除，防止信息泄露】→ 暗示是雅黑探针，访问 /tz.php
> - 探针本身**不是漏洞**，是运维用来检测服务器的工具；漏洞是**运维忘记删除探针文件，被攻击者访问到，造成敏感信息泄露**。
>
> **Q2：为什么偏偏把这句提示绑定雅黑？**
> 两个原因：
>
> - 雅黑探针是国内运维、CTF 入门题最常用的探针，单文件 tz.php，上传即用，网上教程、靶场大量在用；
> 	它的界面特征独一无二：探针主页放了「PHP 信息 (phpinfo)」这个按钮，这是这道题完整的一条链：
>
> 	```
> 	测试探针用完要删除 → 雅黑探针 → 访问 /tz.php → 页面点【PHP信息(phpinfo)】→ 跳phpinfo页面找flag
> 	```

不想的话，我们使用dirsearch，但是没扫出来，可能是字典不够用

首先先建立一个字典文件`probe.txt`，放到你想要放的路径里，请记住`probe.txt`存放路径，在ffuf复制粘贴这些

```
tz
l
p
phpinfo
info
prober
xprober
upupw
yahei
test
ceshi
php
1
2
shell
back
webshell
admin
pass
pwd
conf
config
backup
bak
db
mysql
sql
phpmyadmin
pm
phpm
phpinfo1
info1
probe
server
status
phpstatus
system
sys
check
env
environment
flag
fl
f1ag
```

#### 使用dirsearch

```
python -m dirsearch -u <URL> -w C:\Computer\webtools\probe.txt -e php,html,txt,phps -f --exclude-size 13976
```

扫出了`tz.php`

![image-20261023152828810](/assets/web-rumen/image-20261023152828810.png)

> | 片段                             | 含义、作用说明                                               |
> | -------------------------------- | ------------------------------------------------------------ |
> | `python`                         | 调用 Python 解释器，用来运行 Python 模块                     |
> | `-m`                             | module（模块）的缩写。作用：把后面的 `dirsearch` 当作一个 Python 模块来运行，而不是去磁盘找 dirsearch.py 文件。pip 安装的包必须用这个写法 |
> | `dirsearch`                      | 要运行的模块名，也就是目录扫描工具                           |
> | `-u`                             | url 缩写，指定扫描的目标网站地址                             |
> | `-w`                             | wordlist 缩写，指定字典文件                                  |
> | `C:\Computer\webtools\probe.txt` | 字典的本地路径，里面存放需要爆破的路径名称（robots、admin 等） |
> | `-e`                             | extension 缩写，追加后缀                                     |
> | `php,html,txt,phps`              | 需要追加的后缀列表，**dirsearch 这里不加小数点**，逗号分隔。会自动生成 `xxx.php`、`xxx.html` 这类请求 |
> | `-f`                             | force extensions，强制后缀。只发送带后缀的请求，不会去请求不带后缀的裸路径（不会单独请求 `/robots`） |
> | `--exclude-size`                 | 排除指定响应大小（字节），等价 ffuf 的 `-fs`。过滤掉页面大小等于后面数字的结果，专门对付伪 200 软 404 |
> | `13976`                          | 虚假 404 页面的字节长度；只要返回页面大小是 13976，就忽略、不输出这条结果 |
>
> >
> > 使用 python 模块方式启动 dirsearch，指定靶场地址、加载 probe.txt 字典，自动追加 php、html、txt、phps 后缀并强制只请求带后缀路径，排除响应大小 13976 字节的伪 404 页面，筛选真实存在的资源。
>
> 1. `--exclude-size` 是 dirsearch 0.5.0 新版才有的参数，旧版本不支持；
> 2. ffuf 写后缀是 `.php`（带点），dirsearch `-e` 后面是 `php`（不带点），很容易写错报错。
>
> 需要我把这一条和之前 ffuf 那条放一起做个对照表格吗？方便写 WP 对比两者。
>

#### 也可以使用ffuf

```
ffuf -u <URL>/FUZZ -w C:\Computer\webtools\probe.txt -e .php,.html,.txt,.phps -fs 13976
```

扫出了`tz.php`

> | 命令片段                         | 含义 & 详细作用                                              |
> | -------------------------------- | ------------------------------------------------------------ |
> | `ffuf`                           | 程序名：就是 ffuf 爆破工具，代表调用这个工具开始运行         |
> | `-u`                             | 参数（url 的缩写）：**指定目标 URL 地址**，后面跟要爆破的网址 |
> | `<URL>/FUZZ`                     | 目标地址。`FUZZ` 是 ffuf 的**占位标记**：字典里每一行内容，会替换掉 FUZZ，发送请求。例：字典里有 `robots` → 请求 `xxx/robots` |
> | `-w`                             | 参数（wordlist 的缩写）：**指定字典文件路径**，后面接字典    |
> | `C:\Computer\webtools\probe.txt` | 你的字典文件位置，probe.txt 里面存着一堆要尝试访问的路径名字（robots、admin、index 等） |
> | `-e`                             | 参数（extension 的缩写）：**自动追加后缀**，会把后面的每一个后缀拼到字典词条后面 |
> | `.php,.html,.txt,.phps`          | 需要追加的后缀列表，逗号隔开，不带空格。比如字典词条是 `index`，ffuf 会自动尝试：index.php、index.html、index.txt、index.phps |
> | `-fs`                            | 参数（filter size 的缩写）：**按响应包大小过滤结果**，过滤掉页面字节大小等于后面数字的请求 |
> | `13976`                          | 假页面（软 404 页面）的字节长度。这个靶场不管访问不存在的什么路径，都会返回一个大小 = 13976 的页面、状态码 200（伪 200）；`-fs 13976` = **凡是返回页面大小是 13976 的，直接忽略，不输出给你看，只打印真实存在的页面** |
>
> >
> > 使用 ffuf 对目标站点进行目录爆破，读取`probe.txt`字典，自动追加`.php .html .txt .phps`后缀，过滤掉响应大小为 13976 字节的伪 404 页面，只输出真实存在的路径。
>

![image-20261023084720200](/assets/web-rumen/image-20261023084720200.png)

> **Q1：ffuf 和 dirsearch有什么区别？是什么？**
>
> ffuf 和 dirsearch 作用差不多，都是 web 目录爆破，ffuf 速度更快，是 CTF 高频工具。
>
> - **ffuf**：Go 语言写的**Web 爆破工具**，主打灵活 FUZZ 爆破（目录、参数、header、POST 都能爆），CTF 圈内软 404 / 伪 204 场景的主流选择。
> - **dirsearch**：Python 写的**Web 目录扫描工具**，主打信息搜集、自带字典、彩色友好输出，偏向常规目录探测。
>
> | 项目      | ffuf                                                         | dirsearch                                                    |
> | --------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
> | 开发语言  | Go                                                           | Python                                                       |
> | 速度      | 快，并发高                                                   | 偏慢，Python 线程限制                                        |
> | 核心过滤  | `-fs` 过滤响应大小，原生支持，用得最多还支持过滤行数、关键词、状态码 | 新版 v0.5.0 才有`--exclude-size`过滤大小，旧版本没有；过滤能力弱很多 |
> | 后缀写法  | `-e .php,.html`【带小数点】                                  | `-e php,html`【不带小数点】（不一样，容易多加`.`）           |
> | FUZZ 占位 | 必须写`FUZZ`标记，自己标记爆破位置；灵活性极强               | 不需要 FUZZ 标记，工具自动在根目录后面拼接路径，写法简单     |
> | `-f`含义  | ffuf 没有`-f`强制后缀参数                                    | `-f` = force extensions，强制只请求带后缀的链接，不请求裸词  |
> | 字典      | **不带内置字典，必须自己提供 wordlist**                      | 自带内置字典，不写`-w`也能直接扫                             |
> | 递归扫描  | 需要额外参数，麻烦                                           | 原生支持`-r`递归子目录，开箱即用                             |
> | 输出报告  | 输出简洁，默认原始结果，美化弱                               | 彩色高亮输出，自带 html 报告导出`-o`，阅读舒服               |
> | 适用场景  | 伪 200（软 404）、参数爆破、vhost 爆破、各种花式 FUZZ        | 正常网站、状态码区分清晰、信息搜集、批量扫站点、导出报告     |
>
> >
> > ffuf 是**通用爆破工具**，灵活、过滤能力强，专门解决伪 200 这类棘手场景；dirsearch 是**专用目录扫描工具**，上手简单、自带字典、输出美观，适合常规无软 404 的站点信息收集。
>

#### 进入`<URL>tz.php`

![image-20261023153857523](/assets/web-rumen/image-20261023153857523.png)

接下来点【PHP 参数】或者【函数检测】

> **Q1：为什么接下来点【PHP 参数】或者【函数检测】？**
> 原因：很多探针会在 PHP 参数、phpinfo 信息区域，直接打印环境变量，**flag 大概率放在环境变量里（比如 FLAG、CTF_FLAG）**，phpinfo 页面会直接展示环境变量。
>
> 另外，探针本质就是美化版 phpinfo，phpinfo 页面会输出：服务器环境变量、PHP 配置、预定义变量，出题人习惯把 flag 写在环境变量中。
>
> **Q2：如果页面里没直接看到 flag？**
>
> 已经拿到网站根目录物理路径：`/var/www/html`
> 说明网站文件都放在这里。
> 可以继续目录扫描：
>
> 1. 看看同目录下别的文件：`/var/www/html` 对应 URL 根 `/`
> 2. 尝试访问 `flag.php`、`fl00g.txt`、`.flag` 等敏感文件

>
> 本题考点为 PHP 探针信息泄露。PHP 探针（tz.php）是美化封装的 phpinfo 页面，作用是展示服务器、PHP 的全部配置信息；出题人常将 flag 存入服务器环境变量，环境变量会在【PHP 参数】板块展示。同时探针泄露了网站根目录绝对路径 `/var/www/html`，给后续文件访问、目录遍历提供路径线索。

#### 进入phpinfo

你会发现鼠标移动到那里可以点击了，为什么不点击？

![image-20261023155447867](/assets/web-rumen/image-20261023155447867.png)

#### 然后ctrl+F，收索flag，得到`flag`

![image-20261023155610955](/assets/web-rumen/image-20261023155610955.png)

### web17

![image-20261023160645500](/assets/web-rumen/image-20261023160645500.png)

提示：`备份的sql文件会泄露敏感信息`。那么这很有可能是SQL 数据库备份文件泄露。

#### 所以可以直接使用backup.sql

![image-20261023161234899](/assets/web-rumen/image-20261023161234899.png)

他就会去进行下载

点开他就能找到flag

![image-20261023161527041](/assets/web-rumen/image-20261023161527041.png)

**Q1：为什么猜 backup.sql？**

> - backup 英文意思就是**备份**；`.sql` 是 MySQL 数据库备份导出文件的后缀，和题目提示 “备份的 sql 文件” 完全对应。
> - sql 备份文件里面保存数据库里所有的数据（表、记录），出题人直接把 flag 写在数据库记录里，导出成 backup.sql 放到网站根目录，忘记删掉，任何人都能下载查看。

**Q2：漏洞是怎么来的？**

> 运维人员在备份 MySQL 数据库时，导出`.sql`备份文件，如果把备份文件直接放在网站 web 根目录下、没有删除，攻击者可以直接通过浏览器访问下载。sql 文件是明文文本，里面包含数据库的表结构、数据记录，很容易泄露账号密码、flag 等敏感内容，这就是 SQL 备份文件泄露。

**Q3：除了backup.sql，还有哪些路径可以尝试？**

> | 路径            | 说明                                   |
> | --------------- | -------------------------------------- |
> | `/backup.sql`   | 最经典、最高频，CTFshow web17 就是这个 |
> | `/db.sql`       | db 是 database 数据库简写              |
> | `/data.sql`     | data 代表数据备份                      |
> | `/back.sql`     | backup 简写 back                       |
> | `/database.sql` | database 完整单词                      |
> | `/dump.sql`     | mysqldump 导出默认常用名字             |
> | `/mysql.sql`    | 标记数据库类型 mysql                   |
> | `/test.sql`     | 测试环境导出的备份                     |
> | `/www.sql`      | 整站数据库备份                         |
> | `/sql.sql`      | 简单命名                               |
>
> >
> > 还有一类带时间戳的，靶场里比较少见，真实渗透经常遇到：`backup_20261023.sql`
>

#### 使用dirsearch扫描

如果不想一个一个尝试，那么我们可以尝试去进行扫描,扫出来`backup.sql`这个路径

```
python -m dirsearch -u <URL>
```

![image-20261023162100129](/assets/web-rumen/image-20261023162100129.png)

### web18

题目提示：`不要着急，休息，休息一会儿，玩 101 分给你 flag。`

![image-20261023163440633](/assets/web-rumen/image-20261023163440633.png)

#### 进入靶场

能看到是个小游戏，玩到101才给flag，如果你这么有时间，就去试试看吧

![image-20261023163630623](/assets/web-rumen/image-20261023163630623.png)

#### 查看源码

可以看见

```
<script type="text/javascript" src="js/Flappy_js.js"></script>
```

![image-20261023163657662](/assets/web-rumen/image-20261023163657662.png)

**Q1：这个代码什么意思呢？**

> | 片段                     | 含义解释                                                  | 作用                                                         |
> | ------------------------ | --------------------------------------------------------- | ------------------------------------------------------------ |
> | `<script`                | HTML 的**脚本起始标签**                                   | 告诉浏览器：接下来这段是脚本程序，不是普通文字               |
> | `type="text/javascript"` | 脚本的类型声明，`type`是属性名，`text/javascript`是属性值 | 声明这个脚本是 JavaScript 代码。现代浏览器可以省略这一行，写了是兼容老浏览器 |
> | `src`                    | 属性名，全称 source，意思是**资源**                       | 用来指定：要加载哪个外部文件                                 |
> | `="js/Flappy_js.js"`     | src 的属性值，是文件路径                                  | `js/` 代表网站根目录下 `js` 文件夹`Flappy_js.js` 是文件名，存放游戏逻辑合起来：去加载 `js` 文件夹里的这个 js 文件 |
> | `>`                      | 标签开始的闭合符号                                        | 标志 script 标签的属性写完了                                 |
> | `</script>`              | 脚本结束标签                                              | 告诉浏览器：脚本内容到此结束                                 |
>

**Q2：这一整行的作用是什么呢？**

> **让浏览器去加载、执行外部文件 `js/Flappy_js.js` 里面的 JS 代码**。
> 这个外部 js 里面，写了小鸟怎么飞、怎么加分、输赢判断等全部游戏逻辑。
>
> **两种 script 写法**
>
> - 这种带 `src="xxx.js"`：**外部 JS 文件**，代码单独放一个文件里（web18 就是这种）
> - `<script> 代码写在这里 </script>`：**内嵌 JS**，代码直接写在当前 html 页面里面，不用单独文件
>

**Q3：为什么我们要点开这个链接？**

> HTML 只负责摆放图片、画布；游戏的计分、判断输赢的逻辑全部写在这个外部 js 里面，所以我们要访问这个 js 链接，去找 `score`、通关判断代码。

**Q4：怎么判断它是前端小游戏？**

> 下面这几条就是判断依据：
>
> 1. **抓包看流量（最核心）**
> 	你玩游戏、分数上涨的时候，用 Burp 抓包，**没有数据包发给服务器提交 score 分数**。
> 	→ 分数变化全程只在浏览器本地发生，数据不上传后端 = 前端 JS 游戏。
>
> > 如果是后端游戏：每一次加分、每一次操作，都会发请求给服务器，服务器保存你的分数。
>
> 2. **F12 查看源码，能直接看到判断代码**
> 	在 Sources 或者页面源码里找到 js 代码，里面直接写死判断：`if(score>120 && game_over==false)`。
> 	规则明文放在前端，任何人都能看见。
> 3. **没有登录、没有 session 保存分数**
> 	刷新页面分数直接清零，服务器不会记住你的分数。后端游戏一般会用 Cookie/Session 在服务端存你的得分。
>
> > 简单判断就是**操作时不发包，逻辑写在 js 里 = 前端校验小游戏**

**Q5：Q4的3.看不懂？**

> **先搞懂这两个词：**
>
> - **Session**：服务器用来记住 “你是谁、你的状态” 的东西，存在服务端。
> - **Cookie**：一小段数据，存在你的浏览器里，用来配合 Session，告诉服务器 “是刚才那个用户回来了”。
>
> > **Session 是服务器的小账本；Cookie 相当于你手里的门票，用来找到服务器上你的那本账本。**
>
> **q1：后端游戏（带 Session 存分）是什么样子？**
>
> 举例子：
>
> 1. 你打开游戏页面 → 服务器给你发一个 Cookie（门票），给你开一本属于你的 Session 账本。
> 2. 你每穿过一根管子、加分 → 浏览器把 “我加分了” 这个请求发给服务器。
> 3. 服务器收到，**在它自己那边的 Session 账本上，帮你把分数加上去**。
> 4. 哪怕你关掉页面再重新打开，只要 Cookie 还在，服务器翻账本，还记得你上次是 85 分。
> 5. 分数控制权在服务器，你在浏览器控制台改 `score=999` 没用，服务器不认这个本地变量，它只认自己账本上记的数字。
>
> 特点：刷新页面，分数不一定清零；服务器记住你的数据。
>
> **q2：Web18 这个前端小游戏，没有 Session 存分是什么意思？**
>
> 1. 从头到尾，**分数只存在你浏览器自己的内存里（JS 变量 score），从来没有发给服务器保存**。
> 2. 服务器根本没有给你开 “账本（Session）” 记录你的分数。
> 3. 只要你刷新页面：JS 重新加载，变量 `score` 直接变回 0，服务器一脸茫然：不知道你刚才玩到多少分。
> 4. 服务器只负责提供页面、js 文件、最后那个 110.php，**完全不参与计分、不记你的游戏进度**。
>
> 特点：刷新 → 分数清零；服务器不保存任何你的游戏状态。
>
> **区分：**
>
> |                      | 前端小游戏（web18）                | 后端小游戏（带 session）           |
> | -------------------- | ---------------------------------- | ---------------------------------- |
> | 分数放在哪里         | 浏览器本地 JS 变量里               | 服务器的 Session / 数据库里面      |
> | 刷新页面之后         | 分数直接变成 0，进度消失           | 服务器还记得你的分数               |
> | 要不要发包保存分数   | 玩游戏的时候，不向服务器提交分数包 | 每次加分都会发包同步分数给服务器   |
> | 能不能控制台改分绕过 | 可以，因为服务器根本不校验分数     | 不行，服务器以自己账本上的分数为准 |
>
> 不是说页面**完全没有 Cookie**，页面可以有 Cookie，但是**Cookie 里面没有存你的游戏分数，服务器也没有用 Session 记录分数**。
> 很多靶场网站本身会有 Cookie，只是这个游戏业务，**没有用 Cookie+Session 来记录得分**。

#### 点击查看`js/Flappy_js.js`

能看到这游戏分数的判断条件

![image-20261023170340884](/assets/web-rumen/image-20261023170340884.png)

##### 通关判断

```
if(score>100)
{
var result=window.confirm("\u4f60\u8d62\u4e86\uff0c\u53bb\u5e7a\u5e7a\u96f6\u70b9\u76ae\u7231\u5403\u76ae\u770b\u770b");
}
else
{
var result=window.confirm("GAMEOVER\næ˜¯å¦ä»Žæ–°å¼€å§‹");
if(result){
location.reload();}
}
}
}
requestAnimationFrame(run);
cvs.addEventListener("click",function(){
b.speed=fly_Power;
});
```

游戏结束 `game_over=true` 的时候，才会检查分数：

- 如果 `score > 100` → 弹出 confirm 提示框
`\u4f60\u8d62\u4e86\uff0c\u53bb\u5e7a\u5e7a\u96f6\u70b9\u76ae\u7231\u5403\u770b\u770b`
解码：**你赢了，去幺幺零点皮爱吃皮看看**
谐音：幺幺零 = 110，皮爱吃皮 = php → `/110.php`
- 如果 `score <=100`：弹出游戏结束，问要不要刷新重来
- `location.reload()` = 刷新页面

**Q1：怎么知道`\u4f60\u8d62\u4e86\uff0c\u53bb\u5e7a\u5e7a\u96f6\u70b9\u76ae\u7231\u5403\u770b\u770b`是 Unicode 转义（JS 的 \u 编码）**

> 标志性特征：
> **`\u` + 4 个十六进制字符（0-9,a-f）**
> 示例：`\u4f60`
> 只要看到 `\uxxxx` 这种格式，就是 **JavaScript Unicode 转义字符**，这是最核心判断标记。
>
> **判断方式 1：看格式**
>
> 格式模板：`\u` + 4 位十六进制
>
> ```
> \u4f60 \u8d62 \u4e86
> ```
>
> 满足 → JS Unicode 编码，直接可以解码成中文
> 区分别的编码，避免搞混：
>
> - `%E4%BD%A0` → **URL 编码**（urlencode，==浏览器地址栏==常见）
> - `&#x4f60;` → **HTML 实体编码**（==网页源码==里的）
> - `\u4f60` → **JS Unicode 转义**（==JS 代码里==面，就是本题这种）
>
> | 编码类型          | 样子        | 出现位置               |
> | ----------------- | ----------- | ---------------------- |
> | JS Unicode 转义   | `\u4f60`    | js 文件、script 标签内 |
> | URL 编码          | `%E4%BD%A0` | url、get 参数          |
> | HTML 十六进制实体 | `&#x4f60;`  | html 源码              |
>
> **判断方式 2：工具识别（在线解码网站）**
>
> 把字符串丢进去，选择「Unicode \u 转中文」，能正常出文字，就是它。
>
> ---
>
> # 三、CTF 里快速记忆口诀（写笔记）
>
> 看见 `\u` 四个数字字母 → JS Unicode，控制台 alert 直接解
> 看见 `%` 百分号开头 → URL 编码
> 看见 `&#x` → HTML 实体编码
>
> # 四、WP 精简段落（直接复制）
>
> >
> > 识别依据：字符串以 `\u` 后跟 4 位十六进制字符为单元，是 JS 的 Unicode 转义格式。
> > 判断手段：
> >
> >
> > 1. 肉眼识别特征 `\uxxxx`；
> > 2. 复制到浏览器 Console 用 alert () 执行，JS 引擎自动解码；
> > 3. 使用在线编码工具，选择 Unicode 转中文验证。
> > 解码后得到提示：你赢了，去幺幺零点皮爱吃皮看看，谐音指向 `/110.php`。
>
> # 补充一个小坑
>
> 如果少了引号，直接粘贴 `\u4f60\u8d62\u4e86` 到 console 会报错！
> 必须包上英文双引号：`"\u4f60\u8d62\u4e86"`

#### 解码

对`\u4f60\u8d62\u4e86\uff0c\u53bb\u5e7a\u5e7a\u96f6\u70b9\u76ae\u7231\u5403\u770b\u770b`进行解码

![image-20261023173521169](/assets/web-rumen/image-20261023173521169.png)

得到解码：**你赢了，去幺幺零点皮爱吃皮看看**
谐音拆解：

- 幺幺零 → 110

- 皮爱吃皮 → php

	- **皮（p）爱（h）吃（p）皮（p）**

		- 皮 → p

		- 爱 → ài → h（这里是出题人简化谐音，不是严格拼音，属于 CTF 经典老套路）

		- 吃 → ch → p

		- 皮 → p

			连起来：**p h p → php**

那么我们访问一下 `/110.php`看看，然后拿到flag

![image-20261023173610526](/assets/web-rumen/image-20261023173610526.png)

### web19

提示：`密钥什么的，就不要放在前端了`

![image-20261023174343916](/assets/web-rumen/image-20261023174343916.png)



#### 查看源码看到

```
<!--
    error_reporting(0);
    $flag="fakeflag"
    $u = $_POST['username'];
    $p = $_POST['pazzword'];
    if(isset($u) && isset($p)){
        if($u==='admin' && $p ==='a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04'){
            echo $flag;
        }
}
    -->
```

![image-20261023192334803](/assets/web-rumen/image-20261023192334803.png)

他的意思是用POST请求，填入用户名`admin`和密码`a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04`

#### 法一：使用hackbar

用POST请求，用hackbar更快一些，试一下

不会使用的，跟着操作来，不过首先你得需要拥有hackbar，自己找教程去装

##### 先点击F12，然后点开hackbar，再点击load

![image-20261023192708183](/assets/web-rumen/image-20261023192708183.png)



点击load之后，URL会被填充

##### 然后打开POST请求

![image-20261023192829571](/assets/web-rumen/image-20261023192829571.png)





##### 填入

```
username=admin&pazzword=a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04
```

![image-20261023192902140](/assets/web-rumen/image-20261023192902140.png)



##### 点击execute

![image-20261023192927052](/assets/web-rumen/image-20261023192927052.png)

##### 然后就拿到了flag

![image-20261023192958076](/assets/web-rumen/image-20261023192958076.png)

#### 法二：使用Burp Suite 抓包改包

##### 首先先看F12的网络

F12的网络界面，我们会发现都是get请求

![image-20261023194525093](/assets/web-rumen/image-20261023194525093.png)

那么我们点击一下登录，会发现出现了POST请求

![image-20261023194705281](/assets/web-rumen/image-20261023194705281.png)



![image-20261023194722494](/assets/web-rumen/image-20261023194722494.png)

##### 打开Burp Suite，开启拦截，然后刷新这个有POST请求的网页

![image-20261023194904855](/assets/web-rumen/image-20261023194904855.png)

##### 发送到repeater

1.可以右键，找到

![image-20261023195030863](/assets/web-rumen/image-20261023195030863.png)

2.或者使用快捷键`ctrl+R`

成功后重放器（repeater）会亮

![image-20261023195046846](/assets/web-rumen/image-20261023195046846.png)

##### 点开repeater

你会看到有这个东西，眼熟吧？不记得就去翻前面

![image-20261023195143647](/assets/web-rumen/image-20261023195143647.png)

##### 对这个用户名和密码进行修改

```
username=admin&pazzword=a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04
```

![image-20261023195253551](/assets/web-rumen/image-20261023195253551.png)

##### 点击发送（send）

![image-20261023195335117](/assets/web-rumen/image-20261023195335117.png)



##### 看响应

在响应里能看到flag

![image-20261023195417231](/assets/web-rumen/image-20261023195417231.png)

#### 法三：AES 解密得到明文密码，正常登录（最难，又最麻烦）

虽然又麻烦，又难，但是总得知道原理吧

##### 1.从页面头部引入的 JS 文件判断

```
<script src="js/crypto.js"></script>	
<script src="js/cipher-core.js"></script>
<script src="js/aes.js"></script>
<script src="js/zero.js"></script>
```

1. `crypto.js` + `cipher-core.js`：是 **CryptoJS** 前端加密库的核心基础文件，这是前端最主流的加密算法库，内置了 AES、DES、MD5 等多种加密实现。
2. `aes.js`：CryptoJS 专门的 **AES 算法模块文件**，引入这个文件就意味着页面一定会用到 AES 加密，没有它无法调用 AES 相关的加密方法。
3. `zero.js`：对应 AES 加密的 **ZeroPadding（零填充）** 模式模块，用来实现「明文不足 16 字节时用 0 补齐」的逻辑，和后面加密配置里的 `ZeroPadding` 一一对应。

##### 2.从加密函数代码判断（核心铁证）

核心代码是这段 `encrypt` 函数：

```
function encrypt(data,key,iv) {
    var key1  = CryptoJS.enc.Latin1.parse(key);
    var iv1   = CryptoJS.enc.Latin1.parse(iv);
    return CryptoJS.AES.encrypt(data, key1,{
        iv : iv1,
        mode : CryptoJS.mode.CBC,
        padding : CryptoJS.pad.ZeroPadding
    }).toString();
}
```

逐点对应 AES 加密的要素：

- `CryptoJS`：调用加密库
- `.AES`：**明确指定使用 AES 算法**
- `.encrypt`：执行加密操作

大括号里是加密的详细配置：

- `iv : iv1`：指定初始向量为` ilove36dverymuch`
- ``mode : CryptoJS.mode.CBC`：加密模式选用 CBC 密码块链模式
- `padding : CryptoJS.pad.ZeroPadding`：填充方式用零填充，长度不够 16 字节就补 0

1. **`CryptoJS.AES.encrypt(...)`**
代码直接调用了 CryptoJS 库的 **AES 加密方法**，函数名是`AES`，作用就是对输入的明文进行 AES 加密运算。
2. **`mode : CryptoJS.mode.CBC`**
指定 AES 的运算模式为 **CBC（密码块链模式）**—— 这是 AES 最常用的分组加密模式，特点是每一块明文加密前，都要和前一块的密文做异或运算，必须搭配初始向量 IV 使用。
3. **`padding : CryptoJS.pad.ZeroPadding`**
指定填充方式为 **零填充**。AES 是按 16 字节（128bit）为一个块加密的，如果明文长度不是 16 字节的整数倍，就用 0 字节把最后一块补满，对应前面引入的 `zero.js` 文件。
4. **密钥 key 和初始向量 iv**
   - 密钥 `0000000372619038` 长度正好 16 字节，对应 **AES-128**（密钥长度 128bit）；
   - CBC 模式必须搭配 **IV（初始向量）** 来保证加密结果唯一，这里 IV 是 `ilove36dverymuch`，同样为 16 字节。

##### 3.完整的加密提交流程

###### AES 解密,法一：使用网站

\[1\]打开在线 AES 加解密网站，比如：`https://www.toolhelper.cn/SymmetricEncryption/AES`

进入到这个界面

![image-20261023202918825](/assets/web-rumen/image-20261023202918825.png)

\[2\]按下面的表格，把参数一一对应填进去：

| 页面选项                  | 填什么                                                       | 对应源码里的出处                            |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| 运算模式                  | `CBC (密码块链)`                                             | 代码里 `mode : CryptoJS.mode.CBC`           |
| 填充模式                  | `Zeros` / `ZeroPadding`（零填充）                            | 代码里 `padding : CryptoJS.pad.ZeroPadding` |
| 密钥长度                  | `128 bits`                                                   | 密钥是 16 位字符串，对应 128 位             |
| 密钥（选 Text 格式）      | `0000000372619038`                                           | 代码里 `var key = "0000000372619038"`       |
| 偏移 / IV（选 Text 格式） | `ilove36dverymuch`                                           | 代码里 `var iv = "ilove36dverymuch"`        |
| 字符编码                  | `UTF-8`                                                      | 明文密码是普通英文，用 UTF-8                |
| 格式                      | `Hex`（十六进制）                                            | 密文是十六进制字符串                        |
| 输入框（待解密内容）      | `a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04` | 后端 PHP 代码里的正确密文                   |

3. 点击「解密」，得到明文密码：
```
i_want_a_36d_girl
```

>
> 容易错的地方：
>
>
> - 填充模式**不能用默认的 PKCS7**，要选 ZeroPadding / 零填充，选解密出来会乱码；
> - 密文格式必须选 Hex，不能选 Base64。

![image-20261023203226696](/assets/web-rumen/image-20261023203226696.png)



###### AES 解密,法二：使用utools

![image-20261023203357147](/assets/web-rumen/image-20261023203357147.png)

是`解密模式`

![image-20261023203421749](/assets/web-rumen/image-20261023203421749.png)

\[1\]确认当前是「解密」模式

点一下左上角的 **解密** 按钮，让它处于选中高亮状态，我们现在要做的是解密密文。

\[2\]改运算模式：ECB → CBC

点第一个写着 `ECB` 的下拉框，选择 **CBC**。

>
> 对应源码里的 `mode : CryptoJS.mode.CBC`，加密用 CBC，解密必须也用 CBC，模式不对解不出来。

\[3\]密钥长度保持 128 不动

第二个下拉框 `128` 不用改，对应 AES-128，和源码里 16 位密钥长度一致。

\[4\]改填充模式：Pkcs7 → 零填充 / ZeroPadding

点第三个写着 `Pkcs7` 的下拉框，选择 **ZeroPadding / 零填充 / Zeros**（不同工具名字略有差别，找带 “零 / Zero” 的）。

>
> 对应源码里的 `padding : CryptoJS.pad.ZeroPadding`

\[5\]改密文格式：Base64 → Hex / 十六进制

点第四个写着 `Base64` 的下拉框，选择 **Hex / 十六进制**。

>
> 我们的密文是纯数字 + 字母 a-f 的十六进制字符串，不是 Base64 格式，选错格式会解密失败。

\[6\]填写密钥 Key

在 `Key` 后面的输入框里，输入：

```
0000000372619038
```

>
> Key 右边的编码保持 `Utf8` 就行，因为密钥是纯英文数字，和源码里的 Latin1 解析结果一致。
> 对应源码里的 `var key = "0000000372619038"`

\[7\]填写偏移 IV

在 `IV` 后面的输入框里，输入：

```
ilove36dverymuch
```

>
> IV 右边的编码也保持 `Utf8`。
> 对应源码里的 `var iv = "ilove36dverymuch"`，CBC 模式必须用 IV，所以刚才改成 CBC 之后这个输入框就可以用了。

\[8\]填写待解密的密文

在下方「请输入」的大文本框里，粘贴这串密文：

```
a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04
```

>
> 对应源码底部 PHP 注释里，后端校验的正确密码密文。

\[9\]点击解密

全部填好之后，点解密按钮，就能得到明文密码：

```
i_want_a_36d_girl
```

![image-20261023203619802](/assets/web-rumen/image-20261023203619802.png)

以上最后在登录界面填上用户名`admin`和密码`i_want_a_36d_girl`，就能得到flag。

###### 结合 `checkForm` 函数，整个登录的加密逻辑是：

1. 用户在密码框输入明文密码；
2. 点击提交后，先调用 `encrypt()` 函数，用「AES-128 + CBC 模式 + ZeroPadding」把明文密码加密成十六进制密文；
3. 把输入框里的明文替换成密文，再提交整个表单给后端；
4. 后端 PHP 直接校验提交的 `pazzword` 是否等于指定的密文字符串，匹配成功就返回 flag。

> AES 是**对称加密**，加密和解密用同一个密钥。
> 题目提示「密钥什么的，就不要放在前端了」，正是因为前端把**密钥、IV、加密模式、填充方式**全部明文写在了 JS 源码里，任何人查看页面源码都能拿到完整加密参数，直接反向解密密文，前端加密等于完全失效 —— 这就是本题的漏洞。

**Q1: 这些 JS 文件名是怎么来的？**

> 这些文件名来自前端最常用的加密库 **CryptoJS** 的官方拆分文件。
>
> CryptoJS 为了让页面加载更轻量，没有把所有加密功能打包成一个大文件，而是拆成了「基础核心 + 各个算法模块」，需要哪个功能就引入哪个文件：
>
> - `crypto.js`：加密库的最底层基础，提供通用的加密工具方法，是整个库的地基
> - `cipher-core.js`：分组加密算法的通用核心代码，所有 “切块加密” 的算法（比如 AES、DES）都依赖它
> - `aes.js`：**AES 加密算法的单独实现文件**。引入了这个文件，页面才能调用 AES 加密功能
> - `zero.js`：「零填充」功能模块。AES 固定按 16 字节一块加密，明文长度不够时需要补位，这个文件负责用数字 0 来补位

**Q2:过来学单词，看一下英文名和中文名**

> | 英文                                | 中文含义     | 在加密里的具体意思                                           |
> | ----------------------------------- | ------------ | ------------------------------------------------------------ |
> | crypto                              | 密码学       | 泛指加密、解密这套技术                                       |
> | cipher                              | 密码、密文   | 加密算法的统称                                               |
> | core                                | 核心         | 基础核心代码                                                 |
> | AES（Advanced Encryption Standard） | 高级加密标准 | 一种全球通用的对称加密算法                                   |
> | zero                                | 零           | 这里指「用数字 0 补位」的零填充方式                          |
> | key                                 | 钥匙         | 密钥，加密和解密都要用的 “密码”                              |
> | iv（Initial Vector）                | 初始向量     | 加密时的 “初始种子”，让相同明文加密出不同结果                |
> | encrypt                             | 加密         | 把可读的明文变成乱码密文的动作                               |
> | decrypt                             | 解密         | 把乱码密文还原成可读明文的动作                               |
> | mode                                | 模式         | 加密算法的具体工作方式                                       |
> | padding                             | 填充         | AES 按固定大小切块加密，长度不够就补字符凑满                 |
> | parse                               | 解析         | 把普通字符串转换成加密算法能识别的格式                       |
> | Latin1                              | 拉丁 1 编码  | 一种字符编码，用来把密钥、IV 转换成加密用的字节              |
> | CBC （ Cipher Block Chaining）      | 密码块链模式 | 引入IV，块之间互相依赖，消除ECB相同明文得到相同密文的问题；存在比特翻转漏洞。 |
>

#### 方法四：控制台篡改 JS 跳过加密

##### 1.原理：

原来的登录流程是：
输入明文密码 → 前端调用 `encrypt()` 自动加密成密文 → 把密文提交给后端

我们的操作是：
在控制台**重写 `encrypt` 函数**，让它 “输入什么就原样返回什么”，等于废掉加密功能。
这样我们直接在密码框里填后端要求的那串密文，提交时不会被二次加密，原样发给后端，就能直接通过校验。

##### 2.操作

###### 第 1 步：打开靶场页面

先打开 web19 的登录页面，保持页面不要刷新。

###### 第 2 步：打开浏览器控制台

按键盘 `F12` 键，调出开发者工具，点击顶部的 **控制台 / Console** 标签。

###### 第 3 步：输入代码，覆盖加密函数

把下面这行代码复制粘贴到控制台里，按回车执行：

```
function encrypt(data){
    return data;
}
```

执行后控制台会输出 `undefined`，这是正常的，代表函数定义成功了。

![image-20261023204406999](/assets/web-rumen/image-20261023204406999.png)

>
> 这句话的意思：重新定义一个叫 `encrypt` 的函数，不管你传什么内容进去，都原封不动返回回来，不再做 AES 加密。
> 因为 JS 里同名函数后面写的会覆盖前面的，所以原来页面里的加密函数就被我们替换掉了。

###### 第 4 步：填写账号密码

回到登录页面：

- 用户名：`admin`
- 密码：直接粘贴后端要求的正确密文
```
a599ac85a73384ee3219fa684296eaa62667238d608efa81837030bd1ce1bf04
```

###### 第 5 步：点击提交

点击「提交」按钮，页面就会直接返回 flag。

![image-20261023204453347](/assets/web-rumen/image-20261023204453347.png)

**Q1：为什么这个方法能生效？**

> 1. **前端代码完全可控**：所有 JS 代码都运行在你自己的浏览器里，你有权修改、覆盖任何函数和变量，浏览器不会阻拦。
> 2. **后端只校验结果**：后端 PHP 只看你发过来的 `pazzword` 参数值对不对，它不管这个值是前端加密来的，还是你直接填的。
> 3. 避开了二次加密的坑：如果直接在输入框填密文、不改函数，前端会把密文再加密一遍，发过去的是错的；改了函数之后，密文会原样提交，正好匹配后端的校验值。
>

**容易出错的地方：**

> 1. **刷新页面会失效**：刷新页面后，JS 会重新加载，原来的函数会恢复，需要重新在控制台执行一遍覆盖代码。
> 2. **函数名不能写错**： `encrypt`要和源码里的函数名完全一致，大小写也要对，不然覆盖不了。
> 3. 不要在密码框填明文密码：这个方法的用法是「直接填密文，跳过加密」，填明文的话发过去还是明文，后端校验不通过。
>

### web20

提示：`mdb文件是早期asp+access构架的数据库文件，文件泄露相当于数据库被脱裤了。`

![image-20261023213239565](/assets/web-rumen/image-20261023213239565.png)

**看不懂这些是什么？那先把提示里的生词和黑话的意思弄成一个表格给你看看**

> | 单词 / 术语 | 中文意思          | 详细解释                                                     |
> | ----------- | ----------------- | ------------------------------------------------------------ |
> | mdb         | Access 数据库文件 | 全称 Microsoft DataBase，是微软 Access 数据库保存的文件格式，早期网站常用它存数据 |
> | ASP         | 动态网页编程语言  | 早期很流行的后端脚本语言，老网站经常用「ASP + Access 数据库」的搭配 |
> | Access      | 小型桌面数据库    | 微软出品的轻量数据库，不用装服务端，一个 `.mdb` 文件就是一整个数据库 |
> | 脱裤        | 数据全泄露        | 圈内黑话，意思是整个数据库被下载，所有数据全部泄露，就像被扒光裤子一样 |
>
> 他考了什么：
>
> **敏感文件泄露：Access 数据库（.mdb）文件泄露**
> 简单来说就是：管理员把网站的数据库文件 `db.mdb` 直接放在了网站能访问的文件夹里，忘记删掉。我们可以直接用浏览器下载整个数据库文件，里面明文存着 flag。

#### 查看网页

![image-20261023214450054](/assets/web-rumen/image-20261023214450054.png)

页面写着「我是 asp 程序，我用的 access 数据库」，作用是**明确告诉我们网站的技术栈**：

- 后端语言是 ASP（老式动态网页语言）
- 数据库用的是 Access（对应的数据库文件格式就是 `.mdb`）
，那么考的就是 **Access 数据库文件（.mdb）泄露**。

#### 法一：直接访问数据库文件下载

老 ASP 站点的数据库文件，非常习惯放在 `db` 文件夹里，文件名也常叫 `db.mdb`。

>
> `db` 是英文 database「数据库」的缩写，是行业通用命名习惯，很多老 ASP 站点都会这么存放数据库。

直接在浏览器地址栏，当前网址后面拼接路径：

```
/db/db.mdb
```

![image-20261023214725762](/assets/web-rumen/image-20261023214725762.png)

访问之后浏览器会自动下载 `db.mdb` 这个数据库文件。

>
> 如果这个路径 404 找不到，就用 dirsearch 扫目录找文件，命令：
>
>
> ```
> python -m dirsearch -u http://你的靶场地址 -e mdb -r
> ```
>
> `-r` 是递归扫描，会自动扫子目录里的文件。

#### 法二：目录扫描爆破

用 dirsearch 扫描网站目录，一步步找出这个文件。

##### 1.先扫网站根目录

```
python -m dirsearch -u 你的靶场地址
```

扫描后会发现存在 `/db/` 这个目录。

![image-20261023215804115](/assets/web-rumen/image-20261023215804115.png)

##### 2.继续扫描 /db 目录

```
python -m dirsearch -u 你的靶场地址/db/ -e mdb
```

就能扫出 `/db/db.mdb` 这个文件，直接访问下载。

![image-20261023215835526](/assets/web-rumen/image-20261023215835526.png)

>
> 直接开递归扫描，一步到位
>
>
> ```
> python -m dirsearch -u 你的靶场地址 -e mdb -r
> ```
>
> `-r` 参数就是递归扫描，扫到目录会自动进去继续扫，不用手动分两步。
>
> ![image-20261023220500583](/assets/web-rumen/image-20261023220500583.png)

#### 打开`db.mdb`

下载 `db.mdb` 之后， 用记事本打开它，`ctrl+F`搜索`ctf`就看到flag了

![image-20261023215047846](/assets/web-rumen/image-20261023215047846.png)

若你还想看别人的web信息泄露题解，可以考虑一下她哟：

::link-banner
---

banner: /assets/web-rumen/zelia-web-info-leak.png
title: ctfshow-web-信息搜集
description: zelia的ctfshow-web-信息搜集
link: "https://zelia.top/2026/ctfshow-web"
---

::
