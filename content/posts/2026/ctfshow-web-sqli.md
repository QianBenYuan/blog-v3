---
title: "ctfshow-WEB入门（sql注入）"
description: "ctfshow-WEB入门（sql注入）"
image: "/assets/光下的西施.jpg"
date: 2026-11-05
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

所以这个靶场里“点查询表格变了但页面没刷新”“请求自动带 page/limit”“返回 json 就能显示成表格”，都是 layui 在背后做的，不是出题人自己写的。

对做题来说，看到 `layui-*` 的 class 或 `layui.use`，基本就能判断数据是 Ajax + JSON，可以直接抓接口打，不用管页面长什么样。

一句话：layui 是给网页“化妆 + 装动作”的前端工具包，和 SQL 注入本身没关系，但它决定了数据以什么方式进出浏览器。

#### 题解

##### 先看看能不能进行注入

传一个单引号试试：

```sql
id=1'
```

页面返回异常，说明引号是能被闭合的。再对比 `1' and 1=1--+` 和 `1' and 1=2--+`，一个正常一个报错，那么基本上就是==字符型注入==了。

![image-20261125203312718](/assets/ctfshow-web-sqli/image-20261125203312718.png)

##### 把藏起来的 flag 捞出来

后台条件是 `username != 'flag' and id = '...'`。and 的优先级比 or 高，所以只要让 and 前面那半截为假，再用 or 接一个恒真的条件，整张表就都出来了。

```sql
id=-1' or 1=1--+
```

![image-20261125210600409](/assets/ctfshow-web-sqli/image-20261125210600409.png)

`id=-1` 在表里不存在，前半段直接假掉，`or 1=1` 让条件恒真。接口支持 limit 参数，默认只回一条，把 limit 调大就能看到所有用户，flag 就躺在 username=flag 那一行。

如果只想精准拿 flag，不用全表：

```sql
id=-1' or username='flag'--+
```

![image-20261125210613166](/assets/ctfshow-web-sqli/image-20261125210613166.png)
