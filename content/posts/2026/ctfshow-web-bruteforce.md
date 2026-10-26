---
title: "WEB入门题（爆破）"
description: "到爆破了喵"
image: "/assets/我要飞了喵.jpg"
date: 2026-10-24
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
  - 爆破
type: tech
---
## WEB入门题（爆破）

::link-banner
---

banner: /assets/小黑们围着你看.jpg
title: WEB入门题（爆破）
description: 题目来源:ctfshow的WEB入门题
link: "https://ctf.show/challenges"
---

::

### web21

HTTP Basic 认证爆破

打开时的特征：浏览器弹登录框，服务器返回 401，需要跑字典

提示：`爆破什么的，都是基操`
![image-20261024103917313](/assets/ctfshow-web-bruteforce/image-20261024103917313.png)

**Q1：什么是Basic 认证？**

> - 服务器发现请求没带凭据 → 回复 **401 Unauthorized**（未授权），响应头带 `WWW-Authenticate: Basic realm="..."`，浏览器于是弹出登录框。
> - 用户填完账号密码，浏览器把它们拼成 `用户名:密码` 做 **Base64 编码**，放进请求头发回去：
> 	`Authorization: Basic YWRtaW46c2hhcms2Mw==`
> - **Base64**：用 A-Z、a-z、0-9、`+`、`/` 这 64 个可打印字符表示任意数据，`=` 是补位符。**可逆编码，不是加密**，拿到就能解码还原。
>
> 所以攻击思路：认证就一个请求头，头里的 base64 我们自己也能生成——把「admin:每个候选密码」都编一遍挨个试，谁返回 200 谁就是正确密码。这就是**爆破（brute force）**。
>
> | 英文                  | 中文/意思                                                |
> | --------------------- | -------------------------------------------------------- |
> | payload               | 载荷，攻击时真正发出去的内容                             |
> | brute force           | 爆破：枚举所有候选直到试中                               |
> | dictionary / wordlist | 字典：候选密码清单（本题 99 行）                         |
> | 401 Unauthorized      | 未授权，认证失败                                         |
> | WWW-Authenticate      | 服务器让浏览器弹 Basic 登录框的响应头                    |
> | realm                 | 认证域，登录框上的提示文字                               |
> | Authorization         | 请求头，用来携带认证凭据                                 |
> | Basic                 | 认证方案名 = base64(用户名:密码)                         |
> | Base64                | 可逆编码方式（不是加密）                                 |
> | Intruder              | Burp Suite 的爆破模块                                    |
> | Custom Iterator       | 自定义迭代器：把几块内容按顺序拼接，生成每一次的 payload |
> | Payload Processing    | 载荷处理：对 payload 再加工（本题用来做 Base64 编码）    |
> | Payload Encoding      | Burp 默认对特殊字符做 URL 编码，**本题必须取消**         |
> | status code 200       | HTTP 状态码：200=成功，401=认证失败                      |
>

可以先使用cmd看一下靶场的状态

```
curl.exe -v <URL>
```

![image-20261024111938101](/assets/ctfshow-web-bruteforce/image-20261024111938101.png)

```
HTTP/1.1 401 Unauthorized                                    ← 状态行
Server: nginx/1.20.1
Www-Authenticate: Basic realm="请输入admin的用户名和密码"       ← 关键头 1
X-Powered-By: PHP/7.3.11                                     ← 关键头 2
（响应体：需要用户名和密码才能继续访问）
```

> HTTP 响应分三块：**状态行**（结果如何）、**响应头**（一行一条的说明信息）、**响应体**（真正的页面内容）。这三个关键信息分别告诉我们：
>
> - **`401 Unauthorized` 是状态码**，意思是“你没带身份凭证或凭证不对，页面不给你看”。就像进门时保安拦住你：“先出示工牌。”看到 401 就知道：这道题卡在**登录认证**这一关，而不是什么代码漏洞。
> - **`WWW-Authenticate: Basic realm="..."`** 是随 401 一起发的“弹框指令”，告诉浏览器：“请用 Basic 方式弹一个登录框”。所以用 浏览器打开这道题，会先弹出输入账号密码的小窗——这是认证题最直观的特征。
> - **`X-Powered-By: PHP/7.3.11`** 是服务器“自报家门”：这网站的后端程序是 PHP 写的，版本 7.3.11（X-Powered-By = “由什么技术驱动”）。如果是 Tomcat，这里通常会是 `Server: Apache-Coyote/...` 之类。

**Q2：什么是Tomcat？**

> Tomcat 是一款常用的 Java 网站服务器软件，它的**管理后台**默认就用 HTTP Basic 认证。所以“爆破 Tomcat 管理密码”是 Basic 认证爆破最经典的实战场景，老 writeup 都习惯拿它当这类题的代称。
>
> 而这道题的出题人用 PHP **模仿**了同样的认证形式（401 + 弹登录框 + Authorization 头）。对做题的人来说，要学的技能和要做的操作一模一样：生成 `base64(用户名:密码)`、塞进请求头、拿字典挨个试。所以标题叫“Tomcat 认证爆破”，只是要明白：**考点是“HTTP Basic 认证爆破”这个通用技术，Tomcat 是经典原型，本题本体是 PHP 模拟的。**

**简单来说就是：**

> 打开靶场时，服务器返回了 401（要求先登录）和“请输入 admin 的用户名和密码”的弹框指令，说明这是一道认证题；同时服务器自曝后端是 PHP 写的，并不是真 Tomcat。“Tomcat 认证爆破”是这类题的经典原型（Tomcat 管理后台默认就是这种登录框），本题用 PHP 模仿了同样的形式，解法一样。

#### 使用Burp Intruder 自定义迭代器

这里有个压缩包，下载并解压

![image-20261025093043710](/assets/ctfshow-web-bruteforce/image-20261025093043710.png)

会有一个字典

![image-20261025093121218](/assets/ctfshow-web-bruteforce/image-20261025093121218.png)



Burp开拦截，打开网址，放行，然后在网址输入`admin\admin`（我们要看认证信息，`Authorization` 头），登录

![image-20261025093510830](/assets/ctfshow-web-bruteforce/image-20261025093510830.png)

![image-20261025092904686](/assets/ctfshow-web-bruteforce/image-20261025092904686.png)

会发现出现了`Authorization` 头就是成功了，`YWRtaW46YWRtaW4=`base64解码就是`admin`

![image-20261025094250924](/assets/ctfshow-web-bruteforce/image-20261025094250924.png)

发送到Intruder（快捷键`ctrl+I`）

![image-20261025093202234](/assets/ctfshow-web-bruteforce/image-20261025093202234.png)

intruder亮了就是成功发送了

![image-20261025093354365](/assets/ctfshow-web-bruteforce/image-20261025093354365.png)

然后进入intruder页面

![image-20261025094602476](/assets/ctfshow-web-bruteforce/image-20261025094602476.png)

找到`Authorization`，选中 `YWRtaW46YWRtaW4=`

![image-20261025094751974](/assets/ctfshow-web-bruteforce/image-20261025094751974.png)

点击`添加 payload 位置 §`

![image-20261025094843952](/assets/ctfshow-web-bruteforce/image-20261025094843952.png)

成功了会变色

![image-20261025094937497](/assets/ctfshow-web-bruteforce/image-20261025094937497.png)

左下角也会显示出`1 个 payload 位置`

![image-20261025095015832](/assets/ctfshow-web-bruteforce/image-20261025095015832.png)

点击`payload`

![image-20261025095157467](/assets/ctfshow-web-bruteforce/image-20261025095157467.png)

找到页面上方的 **「Payload 类型」** 下拉框，现在显示的是「简单列表」。点击下拉箭头，选择 **`Custom iterator`（自定义迭代器）**。

![image-20261025095416836](/assets/ctfshow-web-bruteforce/image-20261025095416836.png)

选完类型后，下方会出现位置切换按钮，分三段设置：

1. **Position 1**（默认显示的第一个）：在输入框里输入 `admin`（固定的用户名）

2. **切换到位置 2，输入冒号**

	点击左上角 **「位置: 1」** 旁边的下拉箭头，选择 **2**，切换到第二个位置的配置。
	在下方的输入框中，输入一个英文冒号 `:`（用户名和密码之间的分隔符）。

3. **切换到位置 3，加载密码字典**

	再次点击位置下拉框，选择 **3**，切换到第三个位置。
	点击左侧的 **「从文件加载」** 按钮，在弹出的窗口里选中你准备好的密码字典 `.txt` 文件。可以使用你准备好的字典，也可以使用这道题给你的字典，我就拿这道题的字典爆破了。

![image-20261025095710564](/assets/ctfshow-web-bruteforce/image-20261025095710564.png)

![image-20261025100010676](/assets/ctfshow-web-bruteforce/image-20261025100010676.png)

![image-20261025100025536](/assets/ctfshow-web-bruteforce/image-20261025100025536.png)

三个位置都配好后，向下滚动页面：

1.**添加自动 Base64 编码**
找到「Payload 处理」区域 → 点「添加」→ 点击编码，选择 `Base64-encode` → 确定。
作用：每次拼好 `admin:密码` 后，自动转成 base64 格式，匹配 Basic 认证要求。

![image-20261025100226997](/assets/ctfshow-web-bruteforce/image-20261025100226997.png)

![image-20261025100302614](/assets/ctfshow-web-bruteforce/image-20261025100302614.png)

2.**取消 URL 编码**
继续向下找到「Payload 编码」区域，**取消勾选「URL-encode these characters」**。
原因：base64 里的 `=`、`/`、`+` 如果被自动转义，服务器解码会失败，永远爆破不出结果。

![image-20261025100411591](/assets/ctfshow-web-bruteforce/image-20261025100411591.png)

3.全部设置完成后，点击右上角的 **「开始攻击」** 即可启动爆破。

![image-20261025100426911](/assets/ctfshow-web-bruteforce/image-20261025100426911.png)

看到有一个状态码是200，这个就是正确的密码，他的base64编码是`YWRtaW46c2hhcms2Mw==`,base64解码是`shark63`

![image-20261025100719138](/assets/ctfshow-web-bruteforce/image-20261025100719138.png)

![image-20261025100840808](/assets/ctfshow-web-bruteforce/image-20261025100840808.png)

关掉Burp的拦截，输入正确的用户名和密码，就能拿到flag了

![image-20261025101001842](/assets/ctfshow-web-bruteforce/image-20261025101001842.png)

#### 如果你不想看图，只想知道操作，就看这里

##### 1.抓包并送入 Intruder

- 浏览器访问靶场，随便提交一次账号密码，Burp 捕获带 `Authorization` 请求头的 GET 请求
- 右键请求 → `Send to Intruder`

##### 2. 标记爆破位置（Positions 页）

- 攻击类型：默认 `Sniper`
- 选中 `Authorization: Basic` 后的整段 base64 字符串，点击 `§` 标记为替换位
- 确认左下角显示 **1 个 payload 位置**

##### 3. 配置载荷（Payloads 页）

1. **Payload 类型**：选 `Custom iterator（自定义迭代器）`
   - 位置 1：填 `admin`
   - 位置 2：填英文冒号 `:`
   - 位置 3：点击「从文件加载」，导入密码字典
2. **Payload 处理**：添加 → 编码 → `Base64-encode`
3. **Payload 编码**：**取消勾选「URL 编码字符」**（必做，否则 base64 特殊字符会被转义）

##### 4. 攻击与判果

- 点击右上角「开始攻击」
- 结果中**状态码 200**、或**响应长度明显异于其他 401 条目**的，即为正确密码
- 对对应 payload 做 base64 解码得到明文账号密码，登录页面获取 flag

### web22

提示`域名也可以爆破的，试试爆破这个ctf.show的子域名`

![image-20261025103335068](/assets/ctfshow-web-bruteforce/image-20261025103335068.png)

由于`域名更新后，flag.ctf.show域名失效`，所以这道题我们打不了，但是还是要学一下关于这方面的内容

#### Q1：域名、子域名、"爆破域名"是什么意思？

- 域名是分层结构，从右往左一级级变具体：`show`（顶级域名）→ `ctf.show`（主域名）→ `vip.ctf.show`（子域名，vip 叫前缀/三级域）。
- **DNS（Domain Name System，域名系统）** 是互联网的"电话簿"：你问它 `vip.ctf.show` 在哪，它回答一个 IP 地址（如 124.222.110.176），这个问答过程叫**解析（resolve）**。
- **子域名爆破**的原理极其朴素：准备一个常用词字典（www、vip、bbs、db、mail、admin、test……），逐个拼成 `词.ctf.show` 去问 DNS——**能问出 IP 的就是真实存在的子域名**，答"查无此域"的就是不存在的。和 web21 爆破密码一个思路，只是这次"字典"里装的是域名前缀，"试对"的标志从"返回 200"变成"DNS 能解析"。
- **为什么要收集子域名（渗透视角）**：主站往往防护最严，但一个公司可能有一堆被遗忘的站点——老论坛（bbs）、数据库管理页（db）、测试环境（test）、老活动页（vip）。这些"边角资产"更新少、防护弱，是最常被攻破的入口。所以**子域名收集是渗透测试信息收集的第一步**，业内叫"扩大攻击面"。

> | 英文                                   | 中文/含义                                                    |
> | -------------------------------------- | ------------------------------------------------------------ |
> | domain                                 | 域名                                                         |
> | subdomain                              | 子域名                                                       |
> | DNS (Domain Name System)               | 域名系统，域名↔IP 的"电话簿"                                 |
> | resolve / resolution                   | 解析：把域名翻译成 IP 的过程                                 |
> | A 记录                                 | DNS 里"域名→IPv4 地址"那种记录                               |
> | brute force                            | 爆破：拿候选清单挨个试直到试中                               |
> | dictionary / wordlist                  | 字典：候选清单（这里装的是域名前缀）                         |
> | enumeration                            | 枚举：把所有可能一个个列出来试                               |
> | cyberspace search engine / 空间测绘    | 网络空间搜索引擎：扫描整个互联网并建索引的平台               |
> | asset                                  | 资产：一台服务器、一个站点、一个端口都算"资产"               |
> | crawl / spider                         | 爬取/爬虫：程序自动顺着链接抓网页入库                        |
> | syntax                                 | 语法（如搜索语法 `domain="ctf.show"`）                       |
> | tag                                    | 标签，HTML 里 `<a>`、`<p>` 这类标记，页面上某个栏目也叫 tag  |
> | WP                                     | writeup 的缩写，解题报告                                     |
> | Layer                                  | 「子域名挖掘机」，Windows 图形界面子域名爆破工具             |
> | OneForAll                              | 命令行综合子域名收集工具（Python 写的）                      |
> | wildcard DNS / 泛解析                  | `随便什么.ctf.show` 都能解析出 IP 的配置；有泛解析的域名爆破会全"存在"，需要按内容去重判断，是爆破最大的坑 |
> | CT / Certificate Transparency / crt.sh | 证书透明度：网站申请 HTTPS 证书会进公开日志，查 `%.ctf.show` 就能翻出历史子域名（被动收集） |
> | passive / active recon                 | 被动收集（查别人已收录的数据）/ 主动探测（自己发请求试）     |

####  法1：空间搜索引擎（360 Quake）

**原理**：360 Quake、FOFA、Hunter（鹰图）、ZoomEye（钟馗之眼）这类平台 7×24 小时扫描全网、爬取页面并建立索引——谷歌/百度搜的是网页，它们搜的是**服务器和资产**。别人早替你"爬"过 ctf.show 的子域名了，你只需要查它的数据库。

**步骤**：

1. 打开 `quake.360.net`，注册登录。
2. 搜索框输入查询语法 `domain="ctf.show"` —— 意思是"只显示域名属于 ctf.show 的资产"。
3. 结果里翻到 `vip.ctf.show`，点进去/浏览器访问，当年页面的 tag（标签/栏目）里就写着 flag。

**同平台语法对照**（都是搜"主域名"的意思，各家用词不同）：

| 平台        | 搜索语法                   |
| ----------- | -------------------------- |
| 360 Quake   | `domain:"ctf.show"`        |
| FOFA        | `domain="ctf.show"`        |
| Hunter 鹰图 | `domain.suffix="ctf.show"` |
| ZoomEye     | `site:ctf.show`            |

#### 法2：子域名爆破/挖掘工具 

**Layer 子域名挖掘机**：Windows 图形界面小工具，输入主域名 `ctf.show`、选个字典、点开始，它自动逐个查 DNS，还会**抓取每个找到的子域名的网页标题**显示在列表里——"layer 里能查看爆破出来的网页的页面，进去找"说的就是它内置了这个浏览功能。当年用它跑出来的子域名：

```
bbs.ctfshow.com    db.ctfshow.com    www.ctfshow.com
vip.ctfshow.com    source.ctfshow.com    wp.ctfshow.com
```

（注意 ctfshow.com 和 ctf.show 都是官方在用的域名，两种写法等价看待。）其中 `vip.ctfshow.com` 页面的 tag 里藏着 flag。

**OneForAll**：命令行工具，功能更全（多渠道收集 + 字典爆破 + 存活验证 + 解析 IP 一步到位）：

```bash
python oneforall.py --targets ctf.show run
# 结果输出到 results/ctf.show.csv
```

**不装工具，手工也能验证某个子域名是否存在**（体验爆破的最小单元）：

```bash
nslookup vip.ctf.show      # 有回应 → 存在（本机实测解析到 124.222.110.176）
nslookup flag.ctf.show     # 查无此域 → 不存在/已失效（本机实测）
```

#### 法3：零工具被动收集

- **证书透明度**：浏览器打开 `https://crt.sh`，搜 `%.ctf.show`（% 是通配符），能把提交过的 HTTPS 证书里的子域名全列出来。
- **搜索引擎语法**：Google/Bing 搜 `site:ctf.show`，被收录的子域名也会露出来。
- 这类方法叫**被动收集**：不发探测流量、不碰目标服务器，只查公开数据。

**主动爆破 vs 被动收集对比**：

|      | 主动爆破（Layer/OneForAll/字典） | 被动收集（Quake/crt.sh/搜索语法） |
| ---- | -------------------------------- | --------------------------------- |
| 原理 | 自己发 DNS 查询逐个试            | 查别人已经收录的数据              |
| 优点 | 能发现刚上线的站点               | 隐蔽、快、不触碰目标              |
| 缺点 | 流量大、受字典质量限制、怕泛解析 | 数据有延迟，新站搜不到            |
| 实战 | 两者结合用，结果取并集           | 同左                              |

####  小结

1. 渗透第一步永远是信息收集，子域名收集是其中核心一环——**攻击面比主站大得多**。
2. 两条路：**主动爆破**（字典+DNS）和**被动收集**（空间测绘/证书/搜索语法），工具是 Layer、OneForAll，平台是 Quake/FOFA/Hunter/ZoomEye/crt.sh。
3. 爆破的坑：**泛解析**（所有前缀都解析成功）——判断存在与否要看内容是否唯一，不能只看 DNS 是否应答。

### web23

![image-20261025220612779](/assets/ctfshow-web-bruteforce/image-20261025220612779.png)

> | 单词 / 函数 | 中文 / 含义           | 详细说明                                                     |
> | ----------- | --------------------- | ------------------------------------------------------------ |
> | token       | 令牌 / 凭证           | 传给后端的参数，符合规则就能拿到 flag                        |
> | MD5         | 哈希加密算法          | 把任意字符串转换成固定 32 位的十六进制字符串（由数字 0-9、小写字母 a-f 组成） |
> | `intval()`  | 转整数函数（PHP）     | PHP 内置函数，把字符串转成整数；**字母开头的字符串会被转成 0**，只有数字开头才会提取数字值 |
> | `substr()`  | 截取字符串函数（PHP） | 从字符串里取出指定位置的字符；PHP 字符串下标从 0 开始计数    |
> | GET 传参    | 地址栏传参            | 在网址末尾加 `?参数名=值` 传递数据，比如 `?token=422`        |
> | 下标 / 索引 | 字符位置编号          | 程序中字符串默认从 0 开始数，比如第 1 个字符下标是 0，第 2 个字符下标是 1 |

**Q1：后端在干嘛？**

> 这是一套 MD5 校验规则：
>
> 1. 接收你通过 URL 传递的 `token` 参数
> 2. 把 `token` 计算成 32 位的 MD5 字符串
> 3. 同时满足两个条件就输出 flag：
> 	- **条件 1**：MD5 字符串的第 2 位、第 15 位、第 18 位字符完全相等（对应程序下标 1、14、17）
> 	- **条件 2**：这三个字符转成整数后相加，再除以第 2 位的整数值，结果等于第 32 位字符转成整数的值（对应下标 31）
>
> > 你传一个 token，后端算它的 MD5，MD5 特定位置的字符满足数学要求，就把 flag 给你。

#### 打开靶场能看到：

![image-20261025222528087](/assets/ctfshow-web-bruteforce/image-20261025222528087.png)

```
error_reporting(0);          // 关闭错误提示
include('flag.php');         // 引入flag文件，flag存在里面

if(isset($_GET['token'])){   // 如果传了token参数
    $token = md5($_GET['token']);  // 把你传的token计算成32位MD5
    
    // 第一层判断：第2、15、18位字符必须完全相等（下标1、14、17）
    if(substr($token, 1,1)===substr($token, 14,1) && substr($token, 14,1) ===substr($token, 17,1)){
        
        // 第二层判断：三个数相加除以自身，结果等于第32位的整数值（下标31）
        if((intval(substr($token, 1,1))+intval(substr($token, 14,1))+substr($token, 17,1))/substr($token, 1,1)===intval(substr($token, 31,1))){
            echo $flag;  // 两层都通过，输出flag
        }
    }
}else{
    highlight_file(__FILE__); // 没传token就显示当前源码
}

```

1.**第一层**：MD5 字符串的第 2 个、第 15 个、第 18 个字符，三个必须一模一样

2.**第二层**：这三个字符转成数字相加，再除以第一个数，结果必须等于 MD5 最后一个字符转成的数字

核心简化技巧：

因为第一层已经规定三个位置的字符完全相等，我们把这个数字设为 `x`。
三个数相加：`x + x + x = 3x`
再除以自身：`3x / x = 3`

**结论**：第二层的计算结果一定等于 3，也就是说：

- MD5 的**最后一位（第 32 位）** 转成整数后必须是 3
- 三个相同的字符必须是数字 1-9（0 不能当除数，字母转 intval 会变成 0，也不行）

知道这个结论后，脚本可以先判断「最后一位是不是 3」「三个位置是不是数字」，不满足直接跳过。

**Q1：为什么必须是数字 1-9？**

> 这里要结合 PHP 的 `intval()` 函数特性：
>
> 1.**字母转整数会变成 0**：比如 `intval('a') = 0`、`intval('f') = 0`
>
> 2.**0 不能当除数**：数学里除以 0 是错误的，PHP 会直接报错，判断不通过
>
> 所以推导下来：
>
> - 三个位置不能是字母 → 转成 0 会除零报错
> - 三个位置也不能是数字 0 → 同样除零报错
> - 结论：三个位置只能是 **数字 1 ~ 9**
>
> 同理，最后一位要满足转成整数等于 3，也必须是数字字符 `3`，字母转出来是 0，不满足。
>
> 

**Q2：为什么0 不能当除数？**

> 数学里有个铁则：**任何数除以 0 都没有意义，会报错**。
> 如果三个位置的字符是数字 0，转成数值也是 0，式子就变成 `(0+0+0) / 0`，触发除零错误，PHP 直接中断执行，不会输出 flag。
>
> 结合上一条，结论就是：
> 三个位置只能是 **数字 1~9**，不能是 0，也不能是字母。

#### 法 1：Burp Suite Intruder 爆破

1.**构造带参请求**
浏览器访问靶场地址，末尾加 `?token=1`，例如：

```
http://靶场地址/?token=1
```

用 Burp 抓包，把这条 GET 请求发送到 Intruder 模块。

![image-20261025225805279](/assets/ctfshow-web-bruteforce/image-20261025225805279.png)

![image-20261025225824866](/assets/ctfshow-web-bruteforce/image-20261025225824866.png)

2.**标记爆破位置**
在 Positions 页面，选中 `token=` 后面的数字 `1`，用 `§` 符号包裹，标记为唯一的爆破位。攻击类型保持默认 Sniper。

![image-20261025225855210](/assets/ctfshow-web-bruteforce/image-20261025225855210.png)

3.**配置 Payload**
在 Payloads 页面：

- Payload 类型选择 `Numbers（数字）`
- 生成方式选 `Sequential（连续序列）`
- 起始值填 `1`，结束值填 `10000`，步长填 `1`

![image-20261025225928475](/assets/ctfshow-web-bruteforce/image-20261025225928475.png)

![image-20261025225940658](/assets/ctfshow-web-bruteforce/image-20261025225940658.png)

4.**识别正确结果**
点击开始攻击，在结果列表里找 **响应长度（Length）和其他条目明显不同** 的行，对应的数字就是有效 token。

你看这个，他与别人不一样，所以，很有可能token是`422`这个数字，所以我们用`/?token=422`，拿到 flag。

![image-20261025230142548](/assets/ctfshow-web-bruteforce/image-20261025230142548.png)

点击`长度`也能看到

![image-20261025230748165](/assets/ctfshow-web-bruteforce/image-20261025230748165.png)

或者用`过滤`来搜索找到适合的token会发现我们可以使用`422`或`1202`

![image-20261025230858200](/assets/ctfshow-web-bruteforce/image-20261025230858200.png)

![image-20261025230841631](/assets/ctfshow-web-bruteforce/image-20261025230841631.png)

![image-20261025231058219](/assets/ctfshow-web-bruteforce/image-20261025231058219.png)

![image-20261026010123502](/assets/ctfshow-web-bruteforce/image-20261026010123502.png)

![image-20261026010210655](/assets/ctfshow-web-bruteforce/image-20261026010210655.png)

**Q1：`?` 是干什么的？**

> `?` 是 URL 里**查询参数的分隔符**
> 格式规则：
> `域名/路径?参数名=值`
>
> - `?` 前面：网页的地址（路径）
> - `?` 后面：带给后端的数据，叫 **GET 参数**
>
> 例子：
>
> ```
> https://xxx.ctf.show/?token=422
> ```
>
> `?` 告诉服务器：我要给你传一些参数了。
>
> > 类比：你去窗口办事，前面是窗口地址，`?` 之后是你递过去的表单信息。

**Q2：为什么是 `token=xxx`，token 是什么？**

> `token` 是**参数名字**，这个名字不是固定天生就叫 token！
>
> - 写网站代码的人，想叫什么就叫什么：可以是 `id=`、`c=`、`user=`、`key=`、`num=`
> - 这道题的后端代码写的是：接收名叫 `token` 的这个参数，拿它去算 md5 判断
>
> ![image-20261026010927047](/assets/ctfshow-web-bruteforce/image-20261026010927047.png)
>
>  所以**不是全世界都必须叫 token，是这道题目开发者定义参数名叫 token**
> 换一道题可能就是 `?c=xxx`、`?id=xxx`

**Q3：我们可以通过哪些途径找到这题要用 `?token=`？**

> 一般就这几种途径（CTF 里面找参数的方法）：
>
> 1. **看提示、看源码**：网页源代码、js 代码里写了 token
> 2. **看抓包**：访问页面、提交表单的时候，Burp 抓到的请求里面自带 `?token=xxx`
> 3. **报错信息泄露**：页面报错显示 `$token` 变量
> 4. **猜测 + 爆破**：猜常见参数名（id、c、token、key、num），配合字典试
>
> > 这道 web 题的题目逻辑：后端读取 GET 参数 `token`，对它做 `md5()`，然后检查 MD5 的第 2、15、18 位是否相等、`(x+x+x)/x` 是否等于最后一位——满足就输出 flag。**这题和 0e 弱比较没有关系**，0e 那套是另一类 MD5 题的技巧（两个不同字符串的 MD5 都是 `0e` 开头、被 PHP 当科学计数法比较），别混在一起记。
> > 所以传参格式固定为 `?token=数字`
> >
> > - `token`：**参数名（key）**，后端代码约定好的名字，不能随便改成别的；改成 `?abc=422` 后端读不到，无效
> > - `422`：**参数值（value）**，这个是我们爆破、寻找的内容。1~9999 里满足全部校验的只有 `422` 和 `1202` 两个（可以自己跑上面法 2 的脚本验证，把 `break` 去掉就能把两个都打印出来）
> > - `?` = 分隔网页地址和传给后端的数据；
> > - `token` = 这道题后端写死要接收的参数名字；
> > - `=` 等于号，用来分开【参数名】和【你传给它的值】。

#### 法2：Python 脚本本地枚举

无需向靶场发送大量请求，在本地通过脚本遍历计算 MD5 值，匹配后端校验规则，找到符合条件的 token 即可直接使用，运行效率高，也不会对服务器造成压力。

##### 完整可运行代码

复制保存为 `.py` 文件即可直接运行：

```
import hashlib

# 遍历 1 到 9999 的纯数字，寻找符合规则的 token
for i in range(1, 10000):
    # 将数字转为字符串并计算 32 位 MD5 哈希值
    md5_str = hashlib.md5(str(i).encode('utf-8')).hexdigest()

    # 快速过滤：MD5 最后一位必须为 3（由数学推导可知结果恒为3）
    if md5_str[31] != '3':
        continue

    # 第一层校验：第2、15、18位字符完全相等（对应下标1、14、17）
    if md5_str[1] == md5_str[14] == md5_str[17]:
        # 排除字母：PHP的intval()会将字母转为0，无法通过校验
        if not md5_str[1].isdigit():
            continue
        # 排除数字0：0不能作为除数，会触发除零错误
        if md5_str[1] == '0':
            continue

        # 第二层校验：三数之和除以自身，结果等于最后一位的整数值
        num = int(md5_str[1])
        if (num + num + num) / num == int(md5_str[31]):
            print(f"找到有效token：{i}")
            print(f"对应MD5：{md5_str}")
            break
```

![image-20261026012823936](/assets/ctfshow-web-bruteforce/image-20261026012823936.png)



##### 代码详解

###### 1. 导入哈希工具库

```
import hashlib
```

- `import`：Python 关键字，意为「导入」，用于引入官方封装好的工具库，无需手动编写底层算法
- `hashlib`：Python 内置的哈希算法库，封装了 MD5、SHA1 等常用哈希计算函数，本题用来计算 MD5 值

###### 2. 循环遍历数字

```
for i in range(1, 10000):
```

- `for`：Python 关键字，用于创建循环，让同一段代码重复执行
- `i`：循环变量，每次循环依次取值 1、2、3……9999，代表当前测试的 token 值
- `range(1, 10000)`：生成连续整数的函数，规则为「含头不含尾」，即生成 1 到 9999 的所有整数
- 冒号 `:`：Python 语法规定，循环、判断语句后必须加冒号，后续缩进的代码为循环 / 判断的执行体

###### 3. 计算 MD5 哈希值

```
md5_str = hashlib.md5(str(i).encode('utf-8')).hexdigest()
```

从内到外逐层执行：

- `str(i)`：将数字转为字符串格式。MD5 只能对字节 / 字符串计算，无法直接处理数字
- `.encode('utf-8')`：将字符串编码为**字节格式**。`hashlib` 要求输入必须为**字节类型**，`utf-8` 是通用的字符编码
- `hashlib.md5(...)`：调用 MD5 算法，生成 MD5 对象
- `.hexdigest()`：将 MD5 对象转为 32 位十六进制字符串（即日常见到的 MD5 值格式）
- `md5_str =`：将最终的 32 位 MD5 字符串存入变量，供后续判断使用

###### 4. 快速过滤

```
if md5_str[31] != '3':
    continue
```

- `md5_str[31]`：取 MD5 字符串的第 32 个字符（程序下标从 0 开始，下标 31 对应最后一位）
- `!=`：不等于
- `if`：Python 关键字，意为「如果」，满足条件则执行缩进内的代码
- `continue`：Python 关键字，意为「跳过本次循环，直接进入下一轮」
- 作用：由数学推导可知三数相除的结果恒为 3，因此先通过最后一位快速过滤绝大多数不符合的数字，大幅提升脚本运行速度

###### 5. 第一层校验

```
if md5_str[1] == md5_str[14] == md5_str[17]:
```

- 分别对应 MD5 的第 2、15、18 位字符（下标 1、14、17）
- `==`：相等判断符，注意和赋值符号 `=` 区分
- 连等写法：同时判断三个位置的字符完全相等，对应源码中第一层校验规则

###### 6. 排除字母与 0

```
if not md5_str[1].isdigit():
    continue
if md5_str[1] == '0':
    continue
```

- `.isdigit()`：字符串自带方法，判断字符是否为纯数字，是则返回真，否则返回假
- `not`：逻辑取反，即「不是数字」
- 作用 1：PHP 的 `intval()` 函数会将字母转为 0，无法通过第二层校验，提前排除
- 作用 2：数学中 0 不能作为除数，除零会触发报错，直接不通过校验，提前排除

###### 7. 第二层校验

```
num = int(md5_str[1])
if (num + num + num) / num == int(md5_str[31]):
```

- `int()`：Python 内置函数，将字符转为整数类型
- 三数相等均为 `num`，求和后除以自身结果恒为 3，与最后一位的整数值对比
- 此处为严格对应后端校验逻辑，实际已由前面的「最后一位为 3」保证成立

###### 8. 输出结果并终止循环

```
print(f"找到有效token：{i}")
print(f"对应MD5：{md5_str}")
break
```

- `print()`：Python 内置函数，在控制台打印输出内容
- `f"..."`：格式化字符串，大括号 `{}` 内的变量会自动替换为实际值
- `break`：Python 关键字，意为「立即终止整个循环」，找到第一个有效解就停止，节省时间

###### 运行结果

脚本执行后会输出第一个符合条件的解：

```
找到有效token：422
对应MD5：f85454e8279be180185cac7d243c5eb3
```

###### 使用方法

在靶场地址后拼接 GET 参数即可：

```
http://你的靶场地址/?token=422
```

访问后后端会执行相同的 MD5 校验，校验通过则页面直接输出 flag。

### web24

![image-20261026211006340](/assets/ctfshow-web-bruteforce/image-20261026211006340.png) 

> | 单词         | 中文含义                                                     |
> | ------------ | ------------------------------------------------------------ |
> | 伪随机数     | 看起来随机，但由固定种子按照算法计算出来，不是真的无规律随机；种子一样，出来的数字序列就一模一样 |
> | seed（种子） | 用来启动随机算法的初始数字，本题种子：`372619038`            |
> | `mt_srand()` | PHP 函数：给 mt_rand 设置随机种子（播种）                    |
> | `mt_rand()`  | PHP 函数：根据已经种下的种子，生成伪随机整数                 |
> | `intval()`   | 强制转为整数                                                 |
> | `isset()`    | 判断参数是否存在                                             |
> | `$_GET['r']` | 接收 URL 上 `?r=xxx` 传进来的 GET 参数                       |
>

#### 后端源码

```
<?php
error_reporting(0);
include("flag.php");
if(isset($_GET['r'])){
    $r = $_GET['r'];
    mt_srand(372619038);
    if(intval($r)===intval(mt_rand())){
        echo $flag;
    }
}else{
    highlight_file(__FILE__);
    echo system('cat /proc/version');
}
?>
```

![image-20261026211213719](/assets/ctfshow-web-bruteforce/image-20261026211213719.png)

1. `error_reporting(0);`：关闭 PHP 错误提示，防止泄露信息
2. `include("flag.php");`：引入存放 flag 的文件
3. `if(isset($_GET['r']))`：判断 URL 有没有传入 `?r=数字` 这个参数
   - 如果**没有传 r**：直接展示源代码（就是我们看到的页面），顺带输出系统内核版本
   - 如果**传了 r**：进入校验逻辑
4. `mt_srand(372619038);`
重点！固定种子播种。只要种子固定、PHP 版本相同，后续`mt_rand()`产出的数字是固定不变的。
5. `if(intval($r)===intval(mt_rand()))`
把我们传入的 r、后端 mt_rand 生成的随机数都转成整数，**全等匹配**；匹配成功，输出 flag。

> 核心漏洞原理：
> 真正的随机数无法预测；但**伪随机数是算法算出来的**，种子一旦写死，随机结果是可复现、可预测的。
> 不需要 Burp 爆破（爆破范围极大，几乎不可能跑出来，也就是提示 “爆个锤子” 的意思）。

> 大坑：**PHP 版本会影响 mt_rand 的输出结果！**
> mt_rand 在 PHP4.2.0 之后算法改动过，不同版本同一个种子，生成数字不一样。靶场是什么版本，我们复现时就要选对应版本。
> 本题可用版本：PHP 8.2.9，运行得到第一个随机数：`1155388967`

**Q1:如何确定靶场 PHP 版本？**

> 1. 比赛通用方法：抓包，看响应头 `X-Powered-By: PHP/xxx`，获取版本；很多靶机会关闭这个头，拿不到。我试过这道题，没有显示出来。
> 2. 本题来源是老 CTFshow 题库，大量选手复现验证：种子`372619038`，**PHP 8.2.9 运行得到 `1155388967`，可以通过校验**。
> 3. 陌生新题方案：使用支持切换 PHP 版本的在线运行网站（onlinephp.io），固定代码，逐个切换版本测试，哪个版本算出的数字能过靶场，哪个就是靶场版本。

#### 解题步骤

##### 拿到种子

源码直接写死种子：`mt_srand(372619038);`

##### 同版本 PHP 环境复现随机数

新建 PHP 代码：

```
<?php
mt_srand(372619038);
echo intval(mt_rand());
?>
```

运行这段代码，得到结果：`1155388967`

>
> 运行方式二选一：
>
>
> 1. 在线 PHP 运行网站（推荐：onlinephp.io，可以自由切换 PHP 版本）
> 2. 本地搭建对应版本 PHP

##### GET 传参访问靶场

URL 格式：

```
靶场地址/?r=1155388967
```

匹配成功，拿到 flag。

![image-20261026214411320](/assets/ctfshow-web-bruteforce/image-20261026214411320.png)

**Q1:什么叫 “算法改动”?**

> `mt_rand()` 底层是 **Mersenne Twister（梅森旋转）** 伪随机算法。
>
> - PHP 4.2.0 之前：一套计算规则
> - PHP 4.2.0 ~ 后续很多版本：换了一套
> - 更高的新版本（8.x）又有调整
>
> > 类比：
> > 同样是 “给数字 372619038 做计算”
> > PHP7 的计算公式：`372619038 → 算出 A`
> > PHP8.2.9 的计算公式：`372619038 → 算出 1155388967`
> > PHP8.3 的计算公式：`372619038 → 算出 B`
>
> 种子一模一样，但是**计算的公式不一样，最后输出的随机数字就不一样**。

### web25

![image-20261026222018620](/assets/ctfshow-web-bruteforce/image-20261026222018620.png)

> 题目提示：爆个🔨，不爆了
> 考点：PHP mt_rand 伪随机数 + php_mt_seed 种子反推、代码审计、Cookie 校验
> 前置知识承接 Web24：mt_srand 播种种子，相同种子 + 相同 PHP 版本，mt_rand 产出数字序列固定、可预测。

> | 名词                | 中文解释                                                     |
> | ------------------- | ------------------------------------------------------------ |
> | `mt_srand(seed)`    | 给梅森旋转伪随机算法设置种子（播种），种子固定，随机序列固定 |
> | `mt_rand()`         | 根据已经种下的种子，依次生成伪随机整数，**调用一次，往后走一位序列** |
> | `hexdec()`          | 把十六进制字符串转为十进制数字                               |
> | `substr()`          | 截取字符串一部分                                             |
> | `md5()`             | MD5 哈希算法，输出 32 位十六进制字符串                       |
> | `$_GET['r']`        | 接收 URL 上 `?r=xxx` 的 GET 参数                             |
> | `$_COOKIE['token']` | 读取请求 Cookie 里面名叫 token 的值                          |
> | `intval()`          | 强制转为整数                                                 |
> | `php_mt_seed`       | 开源工具：**已知某一次 mt_rand 输出，反向算出可能的种子 seed** |
> | 伪随机序列          | 种子一旦确定，mt_rand () 多次调用，出来的一串数字顺序永远不变 |

#### 后端源码

```
<?php
error_reporting(0);
include("flag.php");
if(isset($_GET['r'])){
    $r = $_GET['r'];
    // 种子：取flag的md5前8位，转十六进制为十进制，种子写死在后端，我们看不到
    mt_srand(hexdec(substr(md5($flag), 0,8)));
    $rand = intval($r)-intval(mt_rand());
    if((!$rand)){  // $rand == 0，也就是 $r 等于【第一次mt_rand()的值】
        // 条件二：Cookie里面token = 第二次mt_rand + 第三次mt_rand 的和
        if($_COOKIE['token']==(mt_rand()+mt_rand())){
            echo $flag;
        }
    }else{
        echo $rand; // 相减不等于0，直接输出差值
    }
}else{
    highlight_file(__FILE__);
    echo system('cat /proc/version');
}
?>
```

![image-20261026222054165](/assets/ctfshow-web-bruteforce/image-20261026222054165.png)

#### 序列顺序

```
mt_srand(seed);   // 播种
$a1 = mt_rand();  // 第1次，用来和我们传入的r对比
$a2 = mt_rand();  // 第2次
$a3 = mt_rand();  // 第3次
token = $a2 + $a3;
```

>
> 两个条件必须**同时满足**，才输出 flag：
>
>
> 1. `?r=a1` （r 等于第一次随机数，让 `$rand=0`）
> 2. 请求 Cookie 带上 `token = a2+a3`

#### 漏洞思路原理

我们**不知道原始 seed**，也不知道 flag。
但是代码给了我们一个突破口：传入 `?r=0`，

```
$rand = 0 - a1 = -a1
```

页面会直接输出这个 `$rand`，我们取相反数，就拿到 **a1（第一次 mt_rand 的值）**。

拿到 a1 之后，使用 `php_mt_seed` 工具，输入 a1，工具会批量算出**所有有可能生成这个 a1 的 seed 种子**，并且标注适配的 PHP 版本。

> 提示 “爆个🔨” 意思：不要暴力遍历种子，用专门工具反向推导种子。
> PHP 版本决定 mt_rand 内部算法！不同版本，同一个 seed，a1,a2,a3 全部不一样。工具返回的 seed 会标注适配版本，我们要选和靶场一致的版本（本题靶场 PHP7.1+）。

#### 解题流程

##### 拿到第一次随机数 a1

访问：

```
靶场地址/?r=0
```

页面输出 `-a1`，取相反数，得到 `a1`
举例：如果页面输出 `-292505171`，那么 `a1 = 292505171`

##### 使用 php_mt_seed 反推候选种子 seed

1. ###### 工具下载地址：[https://www.openwall.com/php_mt_seed/php_mt_seed-4.0.tar.gz](https://www.openwall.com/php_mt_seed/php_mt_seed-4.0.tar.gz)
2. ###### 放到 Kali，解压，编译（gcc 编译 C 源码）

```
tar -zxvf php_mt_seed-4.0.tar.gz
cd php_mt_seed-4.0
make
```

3. ###### 运行，把刚刚拿到的 a1 作为参数传入

```
./php_mt_seed 292505171
```

工具输出一堆 seed，并且标注版本：

- `PHP 3.0.7~5.2.0`
- `PHP5.2.1~7.0.x`
- `PHP7.1.0+`

>
> 我们只保留标注 `PHP7.1.0+` 的 seed，这些才是候选种子，其余直接丢掉。

##### 逐个候选 seed，本地 PHP 复现随机序列

写 PHP 测试代码，替换 seed，依次测试每一个候选 seed：

```
<?php
$seed = 2757201994; // 这里换成工具输出的7.1+候选seed
mt_srand($seed);
$a1 = mt_rand();
$a2 = mt_rand();
$a3 = mt_rand();
$token = $a2 + $a3;
echo "a1 = ".$a1."<br>";
echo "a2 = ".$a2."<br>";
echo "a3 = ".$a3."<br>";
echo "token = ".$token;
?>
```

判断标准：代码跑出来的`a1`和我们步骤 1 拿到的 a1 一模一样 → 这个 seed 是正确种子！
记录下这个 seed 对应的 `token = a2+a3`

>
> 小技巧：可以写循环脚本批量测试全部候选 seed，不用手动一个个换。工具一次会吐出几十上百个 `PHP7.1.0+` 候选，手动换太慢，下面这版直接批量跑：

```php
<?php
// 把 php_mt_seed 输出里所有 "PHP 7.1.0+" 的 seed 粘到这个数组里
$seeds = [2757201994, 1234567890, 987654321];
$target_a1 = 292505171;   // 步骤 1 用 ?r=0 拿到的 a1

foreach ($seeds as $seed) {
    mt_srand($seed);          // 每个 seed 都要重新播种，序列才会从头开始
    $a1 = mt_rand();          // 第 1 次
    $a2 = mt_rand();          // 第 2 次
    $a3 = mt_rand();          // 第 3 次
    if ($a1 == $target_a1) {  // 和靶场给出的 a1 对上，说明种子对了
        echo "命中 seed = {$seed}\n";
        echo "token = " . ($a2 + $a3) . "\n";
    }
}
?>
```

运行：`php mt.php`，对上 a1 的那一行就是答案，抄下 `token`。

##### 构造请求，同时满足两个条件

请求 URL：

```
靶场地址/?r=a1
```

请求头增加 Cookie：

```
Cookie: token=刚刚算出的token值
```

两种发送方式任选：

1. Burp 抓包，修改请求，加上 Cookie 头，放行
2. HackBar / 在线 curl 直接带 Cookie 访问

**Burp 里加 Cookie 的具体做法**：把请求 `Send to Repeater`（`Ctrl+R`），在请求头区域最后一行下面新起一行，写 `Cookie: token=算出来的那个数`，然后点 `Send`。注意是**英文冒号 + 一个空格**，别写成中文冒号。

**命令行做法**：

```bash
curl -s -b "token=算出来的token值" "http://靶场地址/?r=a1"
```

`-b` 就是把 Cookie 带上的参数（b = cookie jar / 这里直接给键值对）。

满足两个条件，页面返回 flag。

#### 结果怎么判断

三种可能的返回，对应三种问题：

| 页面返回 | 说明 |
| -------- | ---- |
| 一段 `ctfshow{...}` 之类的字符串 | 两个条件都过了，拿到 flag |
| 一个**数字**（正数或负数） | 只走到了 `echo $rand`：说明 `r` 没对上 a1，也就是 seed 猜错了、或者 a1 抄错了 |
| 空白页 / 还是源码页 | Cookie 没带上（`token` 名字写错、写在 URL 上而不是请求头里），或 `r` 参数被漏掉 |

> 记住这道题的判定逻辑：**`r` 决定你能不能进门，Cookie 里的 `token` 决定进门后能不能拿东西**。两个都对了才出 flag，缺一个都只是"没有反应"。

#### Q&A

**Q1：为什么每次请求都不用管"序列走到第几个"？**

> 因为 PHP 是**一次请求一次执行**：你每发一个请求，脚本从头跑一遍，`mt_srand()` 重新播种，`mt_rand()` 又是从序列第一个数开始。所以「第 1 个给 `r`、第 2+3 个给 `token`」这个对应关系是固定死的，不用担心"请求一次序列就往后走一位"。
>
> 反过来说，如果在**同一个请求**里连续调用 `mt_rand()`，那才是依次取 a1、a2、a3——源码里就是这么写的。

**Q2：为什么传 `r=0` 就能白拿 a1？**

> `$rand = intval(0) - intval(mt_rand()) = 0 - a1 = -a1`，而 `!$rand` 为假，于是走 `else` 分支 `echo $rand`，页面直接把 `-a1` 打印出来。取个相反数就是 a1。
>
> 这属于**"拿错误回显当侧信道"**：代码本意是方便调试（告诉你差多少），结果反而泄露了随机数。

**Q3：为什么非要挑对 PHP 版本？**

> 因为 `mt_rand()` 在不同版本里**取值方式改过**（PHP 7.1.0 起对梅森旋转的输出做了修正）。同一个 seed，7.0 和 7.1+ 算出来的 a1、a2、a3 完全不同。
>
> php_mt_seed 的输出会按版本分段列出候选，**只保留 `PHP 7.1.0+` 那一段**，其余直接丢掉——选错段，跑一百个 seed 也对不上 a1。

**Q4：php_mt_seed 为什么要跑一会儿？**

> 它做的是**逆推**：已知"某个 seed 播种后第 1 个随机数等于 a1"，反解出所有可能的 32 位 seed。这本质是一次离线暴力搜索（在 2³² 空间里筛），所以在 Kali 上跑几十秒到几分钟很正常，不是卡死了。

**Q5：token 为什么是 `a2+a3`，不是直接给 a2？**

> 看出题人的代码：`$_COOKIE['token']==(mt_rand()+mt_rand())`。这里连着调用了两次 `mt_rand()`，所以序列往前走了两位。**数清楚源码里 `mt_rand()` 出现的次数和顺序**，是这类题唯一的难点。

### 爆破入门小结

五道题把"爆破"拆成了五种完全不同的对象，但骨架是同一套：**找一个后端会拿去比较的值 → 准备候选 → 批量试 → 用"不一样的响应"判断哪个对了。**

| 题目 | 爆破的是什么 | 怎么判断"试对了" | 关键操作 |
| ---- | ------------ | ---------------- | -------- |
| web21 | `base64(admin:密码)` | 状态码从 401 变 200（或响应长度突变） | Custom iterator 拼三段 + Base64 编码 + **关掉 URL 编码** |
| web22 | 子域名前缀 | DNS 能解析出 IP | Layer / OneForAll 跑字典；Quake、crt.sh 被动收集 |
| web23 | `token` 数字（1~9999） | 响应长度和其他条目不同 | Intruder 的 Numbers 类型；能本地算就先本地算 |
| web24 | 不需要爆破 | `r` 和 `mt_rand()` 全等 | 读源码拿种子，同版本 PHP 复现随机数 |
| web25 | 反推 seed（不是盲爆） | 本地算出的 a1 与靶场一致 | `?r=0` 骗回显 + php_mt_seed + Cookie 校验 |

#### 四个通用步骤

1. **找位置**：先确定后端到底在校验什么（请求头里的 `Authorization`？URL 里的 `token`？Cookie？DNS？）。看不出来就看源码、看回显、看提示语。
2. **定范围**：字典、数字区间、还是根本不用爆（能算出来的就别爆）。
3. **配处理**：需要编码就加 Payload Processing，需要拼接就上 Custom iterator，注意**别让 Burp 自动 URL 编码毁掉你的 payload**。
4. **判结果**：状态码、响应长度、响应关键字，三个维度一起看，别只盯长度。

#### 几个真会踩的坑

- **URL 编码**：base64 里的 `=`、`+`、`/` 一旦被转义成 `%3D`、`%2B`、`%2F`，服务端解不出来，怎么爆都是 401。
- **泛解析**：子域名题里如果 `随便什么.域名` 都能解析出 IP，说明配了泛解析，必须按页面内容去重，不能只看 DNS 有没有应答。
- **版本依赖**：`mt_rand` 是伪随机，**同种子 + 同版本 = 同序列**，版本错了全盘皆错。
- **响应长度相同不代表没戏**：有些题 flag 长度固定，长度不变但内容变了，要配关键字过滤（Grep - Match）来找。
- **能算就别爆**：web23 只有 422 和 1202 两个解，web24 压根不用爆。先想"这题是不是可以本地推导"，比开 Intruder 高效得多。
- **别把请求量打爆**：真靶场/真站点都有频率限制，本地能算的一律本地算，需要发请求的也先小字典试水。
