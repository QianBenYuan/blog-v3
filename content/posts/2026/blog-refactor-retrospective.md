---
title: "博客改造复盘：从 Typora 高亮到 SSH 免密推送"
description: "一天内动了博客的四处地方：让 Typora 的等号高亮在博客上正常显示、给「比赛」加上 moectf 子分类、关掉刷屏的行尾校验、把推送从 HTTPS 换成 SSH。记录每一步是怎么把范围缩到真凶的，以及踩过的坑。"
image: /assets/校园，日光.jpg
date: 2026-09-13
categories:
  - 杂谈
tags:
  - Nuxt
  - Git
  - CSS
  - 博客
  - 复盘
type: tech
---

## 一、今天动了几处地方

| # | 问题 | 一句话解法 |
|---|---|---|
| 1 | Typora 里标的 `==高亮==`，推到博客上变成一串等号 | 加一个 remark 插件，构建时把 `==文字==` 变成 `<mark>` |
| 2 | 想让「比赛」下面有个子分类 moectf | 把分类当成**路径**处理，而不是发明新概念 |
| 3 | `pnpm lint` 满屏 `Expected linebreak to be unix` | 关掉这条规则，而不是去改几百个文件 |
| 4 | `git push` 一直 `Connection was reset` | 换成 SSH，彻底不折腾代理 |

下面一个个说。**比起结论，我更想记下每一步是怎么把范围缩小的**——因为下次换个问题，这套排查思路还能用。

---

## 二、Typora 的高亮，在博客上不见了

### 现象

我在 Typora 里习惯用 `==文字==` 标重点。写的时候看着挺好，推到博客上高亮全没了，页面直接显示 `==数据库==` 这种带等号的原文。

### 第一个错误的方向：去改 CSS

我最初的想法很直接：给高亮加点颜色不就行了？于是去翻 `mark` 的样式，发现主题**本来就有**：

```scss
mark {
	background-color: var(--c-primary-soft);
	color: var(--c-primary);
}
```

那为什么没颜色？

**因为 `==数据库==` 压根没变成 `mark` 元素。**

这是我今天学到的第一条：**CSS 只能给「已经存在的元素」上色。** 如果那串文字从头到尾只是一个纯文本字符串，CSS 里写什么都够不着它。

### 怎么证实的

我没有停在"应该是这样吧"，而是直接去看构建产物——预渲染出来的 HTML：

```bash
.output/public/2026/php-basic-learning/index.html
```

在里面搜到的是：

```html
<li>Python：多用于爬虫、数据分析、==后端开发==、工具脚本；</li>
```

`==后端开发==` **原样躺在正文 HTML 里**，而且全站 `<mark>` 数量是 0。到这里结论就定了：**问题在解析层，不在样式层。**

> 教训：改样式之前，先确认元素到底有没有进 ==DOM==。看一眼渲染产物，比对着 CSS 猜半天有用得多。

### 解法：一个 remark 插件

博客是 Nuxt Content，markdown 的解析过程允许插插件。我照抄仓库里已有的 `remark-music.ts` 的写法，加了 `remark-highlight.ts`。

它干的事很简单——遍历语法树的 `text` 节点，把 `==X==` 拆成三部分：普通文字、`<mark>X</mark>`、普通文字。

```ts
visit(tree, 'text', (node, index, parent) => {
	// 把 ==X== 拆出来，做成 { type: 'highlight', data: { hName: 'mark' } }
	// 这样最终会渲染成 <mark>X</mark>
})
```

然后在 `nuxt.config.ts` 里注册：

```ts
remarkPlugins: {
	[pluginPath('remark-highlight')]: {},
	// ...
}
```

### 两个必须保证的细节

**① 只处理 `text` 节点，所以代码块和行内代码绝对安全。**

这条不保证的话会误伤一大片。比如 Python 里的 `if x == 126:`、base64 结尾的 `N2ghNUkkTQ==`，都可能被当成高亮吃掉。

**② `== 文字 ==`（等号内侧带空格）不生效**，跟 Typora 的行为保持一致。

我在接进构建之前，先单独跑了 9 组用例：

| 输入 | 期望 | 结果 |
|---|---|---|
| `都隐藏在了==数据库==深处` | 命中「数据库」 | ✅ |
| `== 数据库==` | 不命中（内侧有空格） | ✅ |
| `a==b 是 Python 的比较` | 不命中 | ✅ |
| `==a==b==c==` | 命中 a 和 c | ✅ |

9/9 通过才接进去。最后端到端验证：

```
php-basic-learning : <mark> 24 个 | 残留字面 == 0 个
hehu-sql-injection : <mark>  4 个 | 残留字面 == 0 个
moectf-web-pentest : <mark>  0 个 | 残留字面 == 0 个   ← base64 的 == 没被误伤
linux-command-line : <mark> 10 个                     ← 手写的 <mark> 照旧可用
```

顺手把已经发布的两篇文章也修好了——不过它们的**仓库文件一个字没改**，因为修的是渲染器，`==` 从此以后本来就该正常显示。

---

## 三、给「比赛」加一个子分类 moectf

### 需求

想让「比赛」下面有个子分类 `moectf`，把那几篇 MoeCTF 的题解放进去。

### 先摸清主题怎么处理分类

翻代码发现一个关键设定：**这套主题是扁平分类，而且只认 `categories[0]`**（数组的第一项）：

```ts
// app/composables/useArticle.ts（改之前）
const categories = computed(() => [...new Set(list.map(i => i.categories?.[0]))])
const listCategorized = computed(() => list.filter(i => i.categories?.[0] === category.value))
```

也就是说，子分类这种概念在界面上**根本没有**，得改代码。

### 一个省事的发现

真正让方案定下来的，是我在服务端接口里翻到的这段（`server/api/stats.get.ts`）：

```ts
for (const [index, categoryName] of categories.entries()) {
	const category = findOrCreateCategory(categoryName, currentLevel)
	category.posts++
	if (index < categories.length - 1) {
		if (!category.children) category.children = []
		currentLevel = category.children
	}
}
```

**服务端早就在把 `categories` 数组当成「分类路径」来建树了**（`比赛 → moectf`），接口里甚至有 `children` 字段。

这说明数据结构上**本来就有约定**，只是客户端没跟上。那我就不用发明新概念，只要把客户端对齐到服务端已经认可的那个约定就行。

> 这大概是今天最值钱的一条经验：**先找项目里已有的约定，再决定要不要发明新东西。** 如果当时我自作聪明设计一套 `parent` 字段，前后端就会有两套并存的模型，以后全是坑。

### 改法：把「只比对第一项」改成「路径里包含即可」

```ts
// 改之后
const listCategorized = computed(() => list.filter(
	item => !category.value || (item.categories ?? []).includes(category.value),
))
```

别小看这一行。它同时满足了三件事：

| 你选的分类 | 匹配逻辑 | 结果 |
|---|---|---|
| 比赛 | 路径里含「比赛」 | 3 篇全出（含 moectf 那几篇） |
| moectf | 路径里含「moectf」 | 只出 moectf 的 3 篇 |
| 学习（单分类文章） | 路径里含「学习」 | 与旧逻辑**完全等价**，行为不变 |

父分类自动包含子分类、子分类可以单独筛选、老文章不受影响——**一行谓词全解决了**。

### 界面部分

- 分类下拉：子分类缩进排在父分类下面，还带文章数
- 文章徽章：显示成 `比赛 · moectf`
- 颜色和图标：子分类没单独配，就**继承父级**（拿到的是奖杯 + 金色），少写一行配置

验证还是老办法——直接看构建产物里的 HTML：

```html
<button class="sub">
  <svg class="i-tabler:trophy">…</svg>
  <span>moectf</span>
  <span class="count">3</span>
</button>
```

缩进类、计数、继承来的图标，三个都对。

---

## 四、关掉行尾校验，而不是去改几百个文件

### 现象

跑 `pnpm lint`，stylelint 报了几百条：

```
Expected linebreak to be unix    @stylistic/linebreaks
```

### 先分清：这是不是我造成的

我的第一反应是"我是不是把文件的行尾改坏了"。验证方法是拿**我没碰过的文件**对照：

```
app/components/partial/Dropdown.vue   （我改过）CR=69  行数=69
app/components/partial/Button.vue     （没碰过）CR=77  行数=77
```

两个文件的 CR 数都等于总行数——说明**整个工作区都是 CRLF**（Windows 下的正常现象，`.gitattributes` 是 `text=auto`），这是**历史遗留的噪音，不是我引入的**。

### 两个选项，选了后者

| 选项 | 后果 |
|---|---|
| 把全仓库统一转成 LF | 会动到几百个文件的行尾，产出一个巨大的 diff |
| **关掉这条规则** | 不动任何存量文件，`.editorconfig` 已经在要求 LF，交给编辑器管 |

我选了后者。配置文件里加一行就完事：

```js
// stylelint.config.mjs
'@stylistic/linebreaks': null,
```

### 但噪音之外，真有一个错是我自己的

同一次 lint 里还夹着两条**属性顺序**错误：

```
Dropdown.vue:38  Expected "align-items" to come before "gap"
Dropdown.vue:55  Expected "font-size" to come before "color"
```

这是我新写的 CSS 违反了项目的 `order/properties-order` 规则。**这两条我老老实实改了**（把属性按规范顺序排好）。

> 所以这里的关键区分是：**"历史噪音"和"自己引入的错误"要分开对待。** 噪音可以关规则，自己的错必须改——不然就是把规则一关，问题全盖住了。

---

## 五、推送被墙：从 HTTPS 换到 SSH

### 现象

```bash
$ git push
fatal: unable to access 'https://github.com/...': Recv failure: Connection was reset
```

### 排查过程（重点是怎么排除误判）

**第一步：先怀疑是不是我自己的环境。** 我这边跑命令是带沙箱的，沙箱会不会拦外网？

排除方法：关掉沙箱再试一次 —— **还是 `Connection was reset`**。所以不是沙箱。

**第二步：查网络本身。** 发现系统代理是开着的（Clash Verge），但 **git 默认不读 Windows 的系统代理**，所以它在裸连。

**第三步：验证"路到底通不通"。** 让 curl 走同一个代理：

```bash
curl -x http://127.0.0.1:31181 https://github.com   # → HTTP 200
```

200！说明**路是通的**，问题在 git 的配置，不在网络。

**第四步：加上代理再推。**

```bash
git -c http.proxy=http://127.0.0.1:31181 push
# → SSL certificate problem: unable to get local issuer certificate
```

git 全局用的是 openssl 后端，走代理后证书链验证失败。换成走 Windows 证书存储的 **schannel** 后端：

```bash
git -c http.proxy=http://127.0.0.1:31181 -c http.sslBackend=schannel push origin main
# → e686edb..3ed39b0  main -> main   ✅ 推上去了
```

### 为什么最后还是换成了 SSH

推是推出去了，但这条命令有两个隐患：

1. **Clash 的端口是动态的**——这次是 `31181`，重启后可能变，写死进配置迟早失效；
2. **代理没开的时候**，git 会因为连不上代理而**所有操作都失败**，比现在还难受。

于是我测了一下 SSH 通道：

```bash
ssh -T git@github.com              # 能完成握手
ssh -T -p 443 git@ssh.github.com   # 也能
# 都只回 Permission denied (publickey) —— 意思是"你没配钥匙"，不是"连不上"
```

**SSH 通道没被墙，只差一把密钥。** 那就配密钥，一劳永逸。

### 配置步骤（四步）

**① 生成密钥**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "qianbenyuan-blog"
```

> ⚠️ 注意：要在 **bash / Git Bash** 里跑。cmd 不认 `~`，会报 `No such file or directory`。

**② 让 github 走 443 端口**（22 端口万一哪天被墙的保险）

```
# ~/.ssh/config
Host github.com
    HostName ssh.github.com
    Port 443
    User git
```

**③ 把公钥加到 GitHub**

```bash
cat ~/.ssh/id_ed25519.pub
```

复制输出的**一整行**，打开 <https://github.com/settings/ssh/new>，Title 随便填，粘贴到 Key 框，点 Add SSH key。

> 这里我犯过一个蠢：把那行公钥粘到终端里跑，被回 `'ssh-ed25519' is not recognized as an internal or external command`。**公钥不是命令**，它是要贴到网页里的内容。

**④ 切换远端并验证**

```bash
git remote set-url origin git@github.com:用户名/仓库名.git
ssh -T git@github.com
# → Hi 你的用户名! You've successfully authenticated...
git push
# → Everything up-to-date
```

从此推送就是 `git push` 一条命令，**不需要代理、不需要任何参数**。

### 两条注意事项（重点）

**① 私钥没有设密码短语，等于一张长期通行证。**

我生成时用了 `-N ""`（空密码），好处是推送全程免交互；代价是**这把私钥文件本身就是凭证，别往外传**（不要提交进仓库、不要发给别人）。

想加密码：

```bash
ssh-keygen -p -f ~/.ssh/id_ed25519
```

代价是每次推送要输一次密码。

**② 密钥只配在了 Windows 侧，WSL 里没有。**

如果哪天在 WSL 终端里推，会失败。解决办法是把 `id_ed25519` 复制到 WSL 的 `~/.ssh/` 并 `chmod 600`，或者干脆在那边另配一把。

### 一条安全红线

排查过程中我一度想用 `http.schannelCheckRevoke=false` 把 TLS 吊销检查关掉绕过问题——**这个被权限系统拦下来了，而且拦得对**。

那是"降低安全性换取能跑通"的典型做法。正确思路是：**先找一条不牺牲安全的路**（这次的 SSH 就是），实在没有再说。事实证明根本不需要关它。

---

## 六、今天收获的几条通用经验

1. **报错要分层定位。** 推送失败可能是：网络被墙？git 没走代理？还是我自己的沙箱？——一层层排除，别在第一个猜测上下结论。今天我就差点把"沙箱拦的"当成结论，关掉沙箱一试才发现不是。

2. **改样式之前，先确认元素存在。** CSS 解决不了"元素压根没生成"的问题。

3. **优先对齐项目已有的约定，而不是发明新概念。** 服务端已经在用 `categories` 数组当分类路径了，客户端跟上就行，多设计一套字段只会留下两套模型。

4. **分清"历史噪音"和"自己引入的错误"。** 前者可以关规则，后者必须老实改。

5. **能用更安全的路，就别用绕路。** 关 TLS 校验能解决的那点麻烦，换 SSH 十分钟就彻底解决了。

---

## 七、名词表

| 名词 | 大白话 |
|---|---|
| **remark 插件** | markdown 解析过程中的一道工序，可以在"文本 → 语法树"之间做转换 |
| **mdast / 语法树** | markdown 被解析后的树形结构，节点分 text、code、link 等类型 |
| **`<mark>`** | HTML 原生的"高亮"标签，浏览器默认给黄底 |
| **预渲染（prerender）** | 构建时就把 HTML 生成好，而不是等浏览器打开再算——所以产物里能直接搜到渲染结果 |
| **CRLF / LF** | 换行符的两种写法：Windows 用 CRLF，Linux/macOS 用 LF |
| **OpenSSL / schannel** | 两种 TLS 实现：前者用自己的证书包，后者用 Windows 系统证书库 |
| **SSH 密钥** | 一对文件：私钥（自己留着）+ 公钥（可以公开给 GitHub），用来证明"你是你" |
| **密码短语（passphrase）** | 给私钥再加一道密码锁，更安全但每次要输 |
