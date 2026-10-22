---
title: "WBE入门题"
description: "一些WEB入门题"
image: "/assets/web-rumen/cover.jpg"
date: 2026-10-22
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
  - 信息泄露
type: tech
---
## WEB入门题

::link-banner
---

banner: /assets/web-rumen/banner.jpg
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
