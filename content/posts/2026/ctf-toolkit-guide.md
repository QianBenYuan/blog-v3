---
title: "小圆的工具"
description: "小圆的 CTF 工具箱完全索引：工具清单与用途速查，涵盖抓包、Web 渗透、逆向、取证与密码学，附环境速览、目录地图和备份清单。"
image: /assets/私奔了.jpg
date: 2026-10-07
categories:
  - 工具
tags:
  - CTF
  - 工具
  - 环境配置
type: tech
passwordNote: "不是给你看的"
---

## CTF 环境与工具完全指南

> 更新日期：2026-10-23 ｜ 适配机器：HelloCTF_OS（Windows 10）
> 本指南由《CTF工具使用指南》《Firefox渗透测试环境使用指南》《uTools使用指南》三篇合并而成，并补充「本环境」速览与全套 CTF 工具的功能/用法索引。
> **2026-10-23 大版本更新**：Burp 换为 Toolkit 汉化 Pro、`ctf安装工具\` 已并入各处、webtools 大瘦身、新增 MayeLite 工具箱与 CodeBuddy。
> 维护注意：**全文标题最高为三级（###）**，新增章节请沿用该级别往下排。

### 第 0 部分 本环境速览

#### 0.1 系统与权限

| 项 | 状态 |
| :-- | :-- |
| 系统 | Windows 10 (19045) x64，用户 HelloCTF_OS |
| 磁盘 | C 盘空间紧张（约 4GB 可用），装大软件前先想清楚；D 盘是装机介质（0 可用），别往里装 |
| 权限 | 终端脚本**无管理员权限**：MSI 静默安装会失败(1603)，优先用便携/zip 解压版；需要装服务的软件（如 Wireshark）手动双击 + UAC 安装 |
| 浏览器分工 | **Firefox** = 抓包/测试专用（4 个策略托管扩展）；**Edge** = 日常默认浏览器（ABP、Wappalyzer、ZeroOmega） |

#### 0.2 目录地图（找工具先看这里）

| 目录 | 内容 |
| :-- | :-- |
| `C:\HelloCTF\` | **MayeLite 快速启动器**（`Main.exe`，左 Alt+Space 唤出）+ `Toolkit\` CTF 工具全家桶 + `Icon\` 图标库（详见第 3 部分） |
| `C:\HelloCTF\Toolkit\Web\firefox-xpi备份\` | Firefox 4 个策略扩展的 xpi 备份（**策略正在引用，勿删勿移**） |
| `C:\Computer\webtools\` | Web 工具集：CyberChef、sqlmap 源码、ffuf、gobuster、Fenjing、Gopherus、JNDIMap(jar)、shiro_attack |
| `C:\Computer\CodeBuddy CN\` | CodeBuddy CN 1.106.1（VS Code 系 AI 编辑器，含 `bin\buddycn` CLI） |
| `C:\Computer\ctfweb-repo\` | **环境复刻备份仓**：安装文档(docs/)、官方原包(downloads/)、policies.json 参考(files/) |
| `C:\Computer\010 Editor\` | 010 Editor 便携版 |
| `C:\Computer\Wireshark\` | Wireshark 便携版（`Wireshark.exe` 直接跑，Npcap 已就绪） |
| `C:\Computer\新手CTF\` | 做题产出工作区（脚本/writeup/报文） |
| `C:\Python314\` | Python 3.14（pip 包装在用户站点 `AppData\Roaming\Python\Python314`） |
| `C:\Environment\` | Python 3.8、msys64 等旧运行时 |

> 已消失的目录：`C:\Computer\ctf安装工具\`（2026-10-23 前后已清空拆除）——CyberChef 现在唯一一份在 `webtools\CyberChef\`，蚁剑用 `Toolkit\Web\AntSword-Loader`，Firefox xpi 备份移到 `Toolkit\Web\firefox-xpi备份\`。老文档里指向它的路径全部作废。

#### 0.3 网络与加速

- **GitHub 直连不稳**（release 下载常被重置）：优先用清华 TUNA 镜像 `https://mirrors.tuna.tsinghua.edu.cn`（Wireshark 等大件实测快）；pip 用 TUNA 的 pypi 镜像；或开 **Watt Toolkit** 勾选 GitHub 加速。
- `gitlab.com` 可直连且快（ABP 官方构建等在这）。
- **AMO（Firefox 扩展商店）地区屏蔽**：ABP / uBlock Origin / AdGuard 返回 451 装不了，用 Ghostery 替代（详见 2.2）。
- 系统代理 127.0.0.1:31181 经常无人监听，配置代理前先确认端口有服务。
- **magpie 本地模型网关**：`127.0.0.1:3425`，给 Claude Code/DSH/VS Code 等供免费模型路由（WorkBuddy 订阅源），与抓包代理 8080 互不干扰。

#### 0.4 运行时

- **Python 3.14**：`C:\Python314\python.exe`；安全工具（dirsearch/sqlmap）已 pip 装好。
- **Java**：系统 Java 8 可跑一般 jar；`C:\Users\HelloCTF_OS\AppData\Local\Programs\jdk-21.0.12.1+1-jre\` 是便携 JRE 21（原 Burp 2026.9 配套，现 Burp 用 Toolkit 自带 jdk17，JRE21 仍可跑其他新 jar）。
- **WSL Ubuntu**：跑着博客 dev 和 Docker，**与 CTF 无关不要停**；8080 端口曾被子系统的 apache 占用，已禁用，现为 Burp 保留。

#### 0.5 环境与工具一览总表

> 全机"有什么"一张表看完；各工具详细用法见后续章节标注的对应小节。

| 类别 | 名称 | 位置 / 启动方式 | 功能与状态 |
| :-- | :-- | :-- | :-- |
| 启动器 | MayeLite | `C:\HelloCTF\Main.exe`，托盘常驻，**左 Alt+Space** 唤出 | CTF 工具面板（对应 Toolkit 各分类），替代性启动方案与 uTools 并存 |
| 启动器 | uTools | 托盘常驻，**连按两次 Ctrl** 呼出 | 快速启动器 + 13 个 CTF 向插件（见 1.1） |
| 运行时 | Python 3.14 | `C:\Python314\python.exe` | dirsearch / sqlmap 已 pip 装好 |
| 运行时 | Java 8 + 便携 JRE 21 | JRE21：`AppData\Local\Programs\jdk-21.0.12.1+1-jre\` | 跑一般 jar 用 Java 8；Burp 用 Toolkit 自带 jdk17 |
| 运行时 | WSL Ubuntu | `wsl` 命令 | 博客 dev + Docker，与 CTF 无关**勿停** |
| 浏览器 | Firefox 157（中文版） | 桌面快捷方式 | 抓包/测试专用，4 个策略托管扩展（见 2.2） |
| 浏览器 | Edge | 任务栏/开始菜单 | 日常用；已装 ABP、Wappalyzer、ZeroOmega（见 2.2） |
| AI 编辑器 | CodeBuddy CN 1.106.1 | `C:\Computer\CodeBuddy CN\CodeBuddy CN.exe` | VS Code 系 AI 编辑器；**必须从本地路径启动**（UNC/共享路径会 ICU 崩溃） |
| 效率 | Bandizip 7.46 | `C:\Program Files\Bandizip\` | 解压，GBK 中文 zip 不乱码（见 1.2） |
| 效率 | Watt Toolkit 3.1.0 | `C:\Program Files\Steam++\Steam++.exe` | GitHub/Steam 加速（见 1.5）；webtools 里的便携副本已删 |
| 编码/杂项 | CyberChef v11.4.0 | `C:\Computer\webtools\CyberChef\`（离线 html，全机唯一份） | 编码/加解密流水线瑞士军刀（见 1.4） |
| 编码/杂项 | 010 Editor 16.0.4 便携版 | `C:\Computer\010 Editor\` | 十六进制编辑、文件结构解析（见 1.3） |
| 编码/杂项 | [随波逐流]CTF编码工具 V5.3 | `Toolkit\随波逐流\` | 224 种编码一站互转，Misc 万能转换器 |
| 编码/杂项 | CTFCrackTools 4.0.7 | `Toolkit\CTFCrackTools\`（jar） | MD5/栅栏/摩斯/凯撒等多算法破解 |
| 抓包/网络 | **Burp Suite Pro 2024.1.1 汉化版** | 桌面「**Burp Suite Pro 汉化**」快捷方式 | 抓包改包核心，监听 127.0.0.1:8080（见 2.1） |
| 抓包/网络 | Wireshark（便携） | `C:\Computer\Wireshark\Wireshark.exe` | 流量分析，Npcap 已就绪（见 2.5） |
| 抓包/网络 | Nmap / Zenmap | `C:\Program Files (x86)\Nmap\` | 主机发现、端口扫描（见 2.6） |
| 抓包/网络 | Proxifier | `Toolkit\Web\Proxifier\` | 强制任意程序走代理，配合 Burp 抓桌面客户端 |
| Firefox 扩展 | HackBar / FoxyProxy / Ghostery / Wappalyzer | 策略托管，重启自动恢复；xpi 备份在 `Toolkit\Web\firefox-xpi备份\` | HTTP 工具栏 / Burp 代理切换 / 广告拦截 / 技术栈识别（见 2.2） |
| Web 渗透 | 中国蚁剑 AntSword | `Toolkit\Web\AntSword-Loader-v4.0.3-win32-x64\AntSword.exe` | Webshell 管理；数据在 `%APPDATA%\antsword\`（见 2.3） |
| Web 渗透 | dirsearch 0.5.0 | pip（`python -m dirsearch`） | 目录/文件爆破（见 2.4） |
| Web 渗透 | sqlmap 1.10.8 | `AppData\Roaming\Python\Python314\Scripts\sqlmap.exe` | SQL 注入自动化；首次运行按回车过声明（见 2.4） |
| Web 渗透 | ffuf / gobuster | `C:\Computer\webtools\` | 目录/参数 Fuzz（见 2.4） |
| Web 渗透 | 冰蝎 Behinder 4.1 / 哥斯拉 Godzilla | `Toolkit\Web\` | 加密流量 Webshell 管理 |
| Web 渗透 | ShiroExploit / shiro_attack / ThinkphpGUI / Struts2 jar | `Toolkit\Web漏洞利用\`、`webtools\` | Shiro/ThinkPHP/Struts2 历史漏洞利用 |
| Web 渗透 | JNDIMap / Ysoserial / Fenjing / Gopherus / c-jwt-cracker | `webtools\`（JNDIMap 为 jar）/ `Toolkit\Web\Ysoserial\` | JNDI、Java 反序列化、SSTI、SSRF、JWT 利用 |
| 逆向 | jar-analyzer 2.12 / jd-gui | `Toolkit\Web\` | Jar 反编译/调用链分析 |
| 逆向（安卓） | jadx-gui 1.4.7 / GDA 4.10 / ADB | `Toolkit\Android\` | APK 反编译 / 真机调试（见 3.2） |
| 动态调试 | x64dbg | `Toolkit\x64dbg\release\` | 断点/单步/脱壳（见 3.1） |
| 压缩包破解 | ARCHPR 4.54 / Ziperello / Zip_Recovery / Elcomsoft | `Toolkit\压缩包相关\` | zip/rar 密码爆破（字典/掩码/暴力） |
| 图片/Misc | QR Research / SmartDeblur / 随波逐流 OCR | `Toolkit\图片相关\`、`Toolkit\随波逐流\` | 二维码修复 / 图像去模糊 / OCR |
| 字典 | 10000pass.txt 等 | `Toolkit\字典\` | 爆破与 dirsearch 通用 |

> 2026-10-23 精简说明：Toolkit 里的 IDA/Binary/Forensic/密码学辅助/PuzzleSolver 等分类在本机上已不存在（文章旧版提及，以实际 `Toolkit\` 目录为准）；webtools 删除了 WattToolkit 便携副本（装机版在 `Program Files\Steam++`）、ABP/Ghostery 备份 xpi（Ghostery 移入策略备份）、蚁剑重复三份（保留 Toolkit 一份）、ffuf/geckodriver 冗余 zip。

### 第 1 部分 通用效率工具

#### 1.1 uTools 快速启动器

**功能**：插件化快速启动器——热键唤出搜索框，敲字启动程序/打开文件/调起小工具。本机已装 13 个偏 CTF 向插件，**不要再装 Listary 等同类**。

**核心用法**：`连按两次 Ctrl` → 输关键字 → 回车（本机热键是 DoubleCtrl，不是默认 Alt+Space）。

- 搜程序名（`burp`、`010`）启动本机软件；搜插件名打开插件；搜文件名用"本地搜索"找文件。
- 常用插件：**编解码与加解密**（Base64/URL/HEX/MD5 秒转）、**编码小助手**、**Cyber**、**JSON 编辑器**、**反弹shell-改**（生成反弹 shell 命令）、**剪贴板**（翻历史复制）、**Linux 命令文档**、**程序员手册**、**超级JavaScript**（临时跑 JS）、计算稿纸、兔子二维码、文件批量重命名、本地搜索。
- **进阶**：插件窗口内 `Ctrl+D` 分离成独立小窗；输 `插件市场` 装新插件（需登录账号）；托盘右键 → 设置改热键/退出。
- **与 MayeLite 分工**：MayeLite（左 Alt+Space）管 CTF 工具面板（Toolkit 目录映射）；uTools（DoubleCtrl）管转换/小工具/搜索。

#### 1.2 Bandizip（解压）

- 位置：`C:\Program Files\Bandizip\`。
- 优势：对 **GBK 中文文件名的 zip** 自动识别编码不乱码。
- 常用：右键压缩包 →「解压到当前位置」/「自动解压」；带密码的会弹窗输入。

#### 1.3 010 Editor（十六进制编辑）

- 位置：`C:\Computer\010 Editor\010EditorPortable.exe`（便携版，双击即用；30 天试用）。
- **功能**：十六进制编辑、文件结构解析、二进制 patch——Misc/逆向题改文件头、修文件必备。
- 常用：`Ctrl+O` 打开；**Templates** 模板解析 PNG/ELF 等结构；`Ctrl+F` 选 Hex 类型搜十六进制；Scripts 可跑 .1sc 批量脚本。
- CTF 场景：文件头损坏修复（如 PNG 头改回 `89 50 4E 47`）、隐写数据追加查看。

#### 1.4 CyberChef（编码/加解密瑞士军刀）

- 位置：`C:\Computer\webtools\CyberChef\CyberChef_v11.4.0.html`（**全机唯一份**，双击本地 html，完全离线）。可右键发送到桌面建快捷方式。
- **功能**：数百种编码/加密/压缩/解析操作的拖拽组合流水线。
- 用法：左侧 Recipes 搜操作拖到中间流程，右侧即时出结果；**Magic** 操作可自动识别编码。
- 常用组合：From Base64 → gunzip；JWT 解析；RSA/AES/DES 解密；From Hex；URL Decode。
- 与 uTools 插件分工：小转换用 uTools 秒出，链式复杂解码用 CyberChef。

#### 1.5 Watt Toolkit（网络加速）

- 位置：`C:\Program Files\Steam++\Steam++.exe`（安装版；webtools 里的 338MB 便携副本已于 2026-10-23 删除）。
- **功能**：本地反向代理 + hosts 加速 GitHub/Steam/Discord 等。
- 用法：「网络加速」勾选 GitHub 等条目 → 一键加速。

### 第 2 部分 抓包与 Web 渗透

#### 2.1 Burp Suite Pro 2024.1.1 汉化版（抓包改包核心）

- **现役版本**：Toolkit 自带 Pro 2024.1.1 汉化破解版（`C:\HelloCTF\Toolkit\Web\BurpSuite V2024.1.1\`，含自带 jdk17，无需系统 Java）。
- 启动：双击桌面「**Burp Suite Pro 汉化**」（无 CMD 窗口后台启动，冷启动 1~2 分钟）；窗口标题出现「Burp Suite专业版 v2024.1.1 -licensed to h3110w0r1d」即 loader+汉化都生效。手动启动可跑目录里 `CN-JRE Burp.bat`（保持 CMD 开着）。
- 代理监听：**127.0.0.1:8080**（loopback-only）。
- **功能**：Proxy 抓包改包、Repeater 重放、Intruder 爆破、Decoder 编解码、Extender 插件。
- ⚠️ **别跑目录里的「清除许可证.bat」**（会删掉配置重新来）；汉化版偶尔启动后自己退出，再启动一次即可。
- 拦截开关默认**不会自动开**；网页全部挂起转圈先查 Intercept 开关。
- 与 Firefox 配合见 2.2；抓 HTTPS 需装 CA 证书见 2.2 的「CA 证书」小节。
- 旧官方 Community 2026.9 已删（2026-10-23）。

#### 2.2 Firefox 抓包/渗透测试环境

Firefox 为每用户模式安装（157.0.1 win64 中文），4 个扩展由企业策略 `policies.json` **强制管理**（误删/误禁后重启自动恢复）：

| 组件 | 版本 | 说明 |
| :-- | :-- | :-- |
| HackBar | 1.2.8 | 渗透测试工具栏（DevTools 内） |
| FoxyProxy Standard | 9.8 | 代理切换，已预置 Burp Suite (127.0.0.1:8080) |
| Ghostery AdBlocker | 10.6.6 | 广告拦截 |
| Wappalyzer | 6.x | 网站技术栈识别 |

关键路径：程序 `AppData\Local\Mozilla Firefox\firefox.exe`；策略 `AppData\Local\Mozilla Firefox\distribution\policies.json`；**xpi 备份现位于 `C:\HelloCTF\Toolkit\Web\firefox-xpi备份\`**（2026-10-23 迁入，策略已同步改指向；**勿删勿移**）。

##### 快速上手（三步）

```text
1. 启动 Burp Suite（桌面「Burp Suite Pro 汉化」），确认监听 127.0.0.1:8080
2. Firefox 工具栏 FoxyProxy 图标 → 选「Burp Suite」→ 流量进入 Burp
3. F12 → 切到「HackBar」标签页 → 开始测试
```

测完在 FoxyProxy 弹窗点 **关闭代理 (Turn Off)** 恢复直连。

##### HackBar 用法

- **打开**：先访问任意 `http(s)://` 网页（`about:` 页面无效），按 `F12` → 顶部切到 **HackBar** 标签页（没有工具栏按钮）。
- **快捷键**：`Alt+A` 载入当前 URL → `Alt+S` 按 `&`/`?` 分割参数 → 选中参数值点 payload 按钮替换 → `Alt+X` 执行；`Alt+M` 切 Basic/Raw 模式。
- **Basic 模式**：URL/Base64 编解码、SQL/XSS 常用 payload、路径字典。
- **Raw 模式**：手写完整 HTTP 报文（自定义 Cookie/Referer/UA/POST 数据）。
- 场景：改 `id=1` 为注入语句测 SQL；Raw 模式加 `Cookie: admin=1` 绕前端校验。

##### FoxyProxy 用法

- 预置条目「Burp Suite」(HTTP, 127.0.0.1:8080)，默认关闭不影响日常上网。
- 切换：工具栏拼图图标 → FoxyProxy（建议固定到工具栏）→ 点「Burp Suite」走 Burp / 点「关闭代理」直连；支持单标签页代理（Tab Proxy）。
- ⚠️ Burp 没开时切到 Burp 代理，网页全打不开是正常现象，切回即可。
- **抓 HTTPS 装 CA 证书**：切到 Burp 代理 → 访问 `http://burp` → 下载 **CA Certificate** → Firefox 设置 → 隐私与安全 → 证书 → 查看证书 → 证书颁发机构 → 导入 → 勾选「信任使用此 CA 标识网站」。**本机已装好（serial 730F8008），汉化版沿用同一 CA，无需重装。**
- **托管模式**：设置页只读（由组织管理），可切换/开关但不能增删条目；要改配置就编辑 `policies.json` 的 `3rdparty` 段（type 可选 http/https/socks5/pac），改完**完全重启 Firefox**；删掉整个 `3rdparty` 段可解锁 UI 自由编辑（预置条目会被清空）。

##### 策略管理

- 查看：地址栏 `about:policies`（已激活策略）、`about:addons`（受管扩展移除按钮为灰色）。
- **加新扩展进策略**（防误删）：在 `ExtensionSettings` 追加 `{ "installation_mode": "force_installed", "install_url": "file:///...xpi 或 AMO https 链接" }`（file 路径需 URL 编码；扩展 ID 从 xpi 内 manifest.json 的 `browser_specific_settings.gecko.id` 读）。Wappalyzer 即由此方式加入。
- 解除管理：删对应段落/整个文件 → 重启 Firefox → 正常卸载。「浏览器由组织管理」提示属正常。

##### 广告拦截说明

- Firefox 用 **Ghostery**（开箱即用）；**ABP 在国内 AMO 被 451 下架**（uBO/AdGuard 同），未签名 xpi 也会被正式版拒装，只能 DevEdition/Nightly 或 VPN 环境。
- Edge 侧 ABP 4.46.0 已自动安装（建议过滤列表追加 EasyList China：`https://easylist-downloads.adblockplus.org/easylistchina.txt`）。

##### Firefox 环境常见问题

| 问题 | 处理 |
| :-- | :-- |
| 切 Burp 后网页打不开 | Burp 没启动或端口非 8080；先切回关闭代理 |
| HTTPS 全是证书警告 | 按「CA 证书」小节导入 burp CA |
| F12 找不到 HackBar | 先打开普通 http(s) 页面再按 F12 |
| Alt+X 没反应 | `about:addons` → 齿轮 → 管理扩展快捷键 重绑；焦点要在浏览器 |
| 误删扩展 | 无需处理，重启自动恢复 |

##### Edge 浏览器扩展现状

| 扩展 | 状态 |
| :-- | :-- |
| Adblock Plus 4.46.0 | 已自动安装 |
| Wappalyzer 6.12.7 | 已自动安装 |
| Proxy SwitchyOmega 3 (ZeroOmega) | 已注册自动安装；若没有，商店手动装：`microsoftedge.microsoft.com/addons/detail/proxy-switchyomega-3-zer/dmaldhchmoafliphkijbfhaomcgglmgd` |

> SwitchyOmega 有意未装 Firefox（与 FoxyProxy 冲突）；Edge 外部扩展注册键是"消费即清"（启动安装后删键），正常。

#### 2.3 中国蚁剑 AntSword（Webshell 管理）

- 位置：`C:\HelloCTF\Toolkit\Web\AntSword-Loader-v4.0.3-win32-x64\AntSword.exe`（2026-10-23 起 `ctf安装工具` 与 `webtools\AntSword` 的重复份均已清除，**此处为唯一份**）。
- **功能**：一句话木马管理——文件管理、虚拟终端、数据库管理。
- 用法：左上「添加」→ 填 URL、连接密码、脚本类型(PHP/JSP/ASP) → 添加 → 双击进入文件管理。
- 编码器：编辑数据 → 请求信息 → 编码器；常见一手马用 base64/json，自定义马需自写编码器。
- 数据存于 `%APPDATA%\antsword\`，重装备份它。

#### 2.4 命令行 Web 三件套（已装好）

| 工具 | 功能 | 用法 |
| :-- | :-- | :-- |
| **dirsearch** 0.5.0 | 网站目录/文件爆破 | `python -m dirsearch -u http://target -e php,html`（`-w` 指定字典，`-t` 线程） |
| **sqlmap** 1.10.8 | SQL 注入自动化（查库/拖表） | pip 版入口 `AppData\Roaming\Python\Python314\Scripts\sqlmap.exe`；源码版 `webtools\sqlmap-master\`（`python sqlmap.py`）；**首次运行按回车过声明**；`sqlmap -u "http://x/?id=1" --batch --dbs`；POST 用 `-r request.txt`；常用 `--tables` `-T flag --dump` |
| **ffuf / gobuster** | 目录/参数 Fuzz（更快） | `webtools\ffuf.exe -u http://target/FUZZ -w 字典`；`webtools\gobuster.exe dir -u http://target -w 字典`（字典用 `Toolkit\字典\`） |

> sqlmap 在非交互管道下报 `[ERROR] exit` 不是坏了——是没按声明回车。

#### 2.5 Wireshark（流量抓包分析）

- 状态：**便携版**在 `C:\Computer\Wireshark\Wireshark.exe`，直接运行（Npcap 驱动已就绪）。
- **功能**：网卡抓包、协议解析、流量取证。
- 用法：启动选网卡开始捕获；显示过滤器 `http`、`tcp.port==8080`、`ip.addr==x.x.x.x`；右键 → Follow → TCP Stream 看完整会话；也可直接打开 pcap 文件离线分析。
- CTF 场景：流量取证找 flag（http 上传/usb 键鼠流量/icmp 数据），配合 tshark 命令行 `-r a.pcap -Y http`。

#### 2.6 Nmap / Zenmap（主机与端口扫描）

- 位置：`C:\Program Files (x86)\Nmap\`，桌面「Nmap - Zenmap GUI」快捷方式。
- **功能**：主机发现、端口扫描、服务识别。
- 用法（Zenmap 图形界面即可）：Target 填 IP → 常用 Intense scan；命令行 `nmap -sV -sC target`。

#### 2.7 Webshell / 漏洞利用（Toolkit + webtools，按需取用）

| 工具 | 位置 | 功能 |
| :-- | :-- | :-- |
| 冰蝎 Behinder 4.1 | `Toolkit\Web\Behinder_v4.1\` | 加密流量 Webshell 管理（流量特征比蚁剑隐蔽） |
| 哥斯拉 Godzilla | `Toolkit\Web\Godzilla\` | 另一款强加密 Webshell 管理 |
| ShiroExploit | `Toolkit\Web漏洞利用\` | Shiro 反序列化 Key 爆破与利用（GUI 版） |
| shiro_attack 5.1.1 | `webtools\shiro_attack-5.1.1.jar` | Shiro 利用（另一实现） |
| ThinkphpGUI / Struts2 jar | `Toolkit\Web漏洞利用\` | ThinkPHP/Struts2 历史漏洞一键利用 |
| JNDIMap 0.0.5 | `webtools\JNDIMap-0.0.5.jar` | JNDI 注入利用（jar 直接跑） |
| Ysoserial | `Toolkit\Web\Ysoserial\` | Java 反序列化 payload 生成 |
| Fenjing | `webtools\Fenjing-main\` | Jinja2 SSTI 自动化绕过与利用 |
| Gopherus | `webtools\Gopherus-master\` | 构造 SSRF 用的 gopher 协议 payload |
| c-jwt-cracker | `webtools\c-jwt-cracker-master\` | JWT 弱密钥爆破 |
| Proxifier | `Toolkit\Web\Proxifier\` | 强制让无代理配置的程序走代理（配合 Burp 抓桌面客户端） |
| jar-analyzer / jd-gui | `Toolkit\Web\` | Jar 反编译、调用链分析（配合挖链） |

### 第 3 部分 Toolkit 分类索引（`C:\HelloCTF\Toolkit\`）

> 以下均在 `C:\HelloCTF\Toolkit\` 下，按题型取用；启动器面板（MayeLite）与这些目录一一对应。

#### 3.1 Android（Android/）

- **jadx-gui 1.4.7**：apk 直接反编译成 Java 源码看逻辑（逆向安卓题首选）。
- **GDA 4.10**：另一款免安装反编译器，大包快。
- **ADB**：真机/模拟器调试桥（`adb logcat`、拉取文件）。

#### 3.2 Web（Web/）

- 蚁剑 / 冰蝎 / 哥斯拉 / Burp Pro 汉化版 / Proxifier / Yakit / Ysoserial / jar-analyzer / jd-gui / **firefox-xpi备份**（见 2.2、2.3、2.7）。

#### 3.3 Web 漏洞利用（Web漏洞利用/）

- ShiroExploit V2.51、Struts2 jar、ThinkphpGUI——历史漏洞一键利用（见 2.7）。

#### 3.4 动态调试（x64dbg/）

- **x64dbg**（`x64dbg\release\`）：断点/单步/改寄存器/脱壳。

#### 3.5 CTFCrackTools（CTFCrackTools/）

- 多算法集成破解器（MD5/栅栏/摩斯/凯撒等），jar 运行，配 jython 插件；`CTFCrackTools-4.0.7.jar`。

#### 3.6 压缩包破解（压缩包相关/）

- **ARCHPR 4.54**（Advanced Archive Password Recovery）：zip/rar 密码爆破（字典/掩码/暴力）。
- **Ziperello / Zip_Recovery / Elcomsoft Password Recovery**：补充的压缩包密码/恢复工具。

#### 3.7 图片 / Misc（图片相关/、随波逐流/）

- **QR Research**：二维码修复/读取。
- **SmartDeblur**：图片模糊修复。
- **[随波逐流]CTF编码工具 V5.3 / OCR 识别工具**：224 种编码一站互转 + 图片文字识别，Misc 万能转换器。

#### 3.8 字典（字典/）

- `10000pass.txt` 等常用密码字典，爆破和 dirsearch/ffuf 通用。

### 第 4 部分 通用注意事项与备份

1. **杀软误报**：蚁剑、冰蝎、Godzilla、Burp loader 等常被 Defender/国产杀软拦截，误报时将对应目录加入白名单。
2. **授权使用**：所有工具仅用于 CTF 竞赛、靶场练习和**已授权**的安全测试，遵守《网络安全法》及相关法规。
3. **C 盘空间**：安装新东西优先便携版放 `C:\Computer\`；下载的大安装包装完即删。
4. **备份/恢复**：
   - 工具便携化在 `C:\Computer\`、`C:\HelloCTF\Toolkit\`，重装前整目录拷走；**`C:\Computer\ctfweb-repo\` 是给重装用的完整复刻仓**（含官方原包与逐工具安装文档），照 docs/ 从头走即可复刻环境；
   - 蚁剑数据 `%APPDATA%\antsword`；Burp 配置 `%APPDATA%\BurpSuite`；
   - Firefox 重装：重装后重建 `distribution\policies.json`（见 2.2 策略管理），xpi 用 `Toolkit\Web\firefox-xpi备份\`，扩展与代理配置自动恢复；
   - uTools 数据随账号同步。
5. **不要动**：WSL 里的服务、`Toolkit\Web\firefox-xpi备份\`（策略引用源）、`policies.json`、`ctfweb-repo\`（环境复刻备份）。
