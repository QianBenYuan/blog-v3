---
title: "[无法加载远程服务 ActiveX 控件]的解决办法"
description: "Windows 10 上使用 WSL 时反复弹出「无法加载远程服务 ActiveX 控件，请确保 rdclientax.dll 在路径中」的彻底解决办法：根因是 WSLg 的 rdclientax.dll 依赖 Windows 11 才有的 GetTempPath2W，通过关闭 WSLg 图形界面解决。"
image: /assets/双手莫弈.jpg
date: 2026-09-30
categories:
  - 开发
tags:
  - WSL
  - WSLg
  - Windows
  - 故障排查
type: tech
---

## [无法加载远程服务 ActiveX 控件]的解决办法

用 WSL（Windows 子系统）时反复弹出这个框，关掉一个又冒一个，弹窗会越积越多：

![img](/assets/wslg-rdclientax-fix/popup-1.png)

![img](/assets/wslg-rdclientax-fix/popup-2.png)

如果你在 WSL 里没有在跑任何图形界面程序，只是正常敲命令、拉 docker，那基本可以确定就是这个问题。

### 先确认是不是这个问题

```powershell
# 1）看 msrdc.exe 是不是从 WSL 目录起来的
#    路径是 C:\Program Files\WSL\msrdc.exe 就说明是 WSLg 在弹，不是「远程桌面连接」
Get-Process msrdc -ErrorAction SilentlyContinue | Select-Object Id, Path

# 2）确认系统版本：只有 Windows 10 会中招
(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion') |
    Select-Object ProductName, DisplayVersion, CurrentBuild, UBR
```

### 原因

弹窗来自 WSLg（WSL 自带的图形界面支持），具体是 `C:\Program Files\WSL\msrdc.exe` 想加载同目录的 `rdclientax.dll`。而这个 DLL **静态导入了 `GetTempPath2W`，那是 Windows 11 才有的 API**。

Windows 10 的 `kernel32.dll` 里没有这个导出，于是 `LoadLibrary` 直接失败（错误码 127 / `ERROR_PROC_NOT_FOUND`）。msrdc 拿不到 RDP 的 ActiveX 控件，就弹出上面那个「请确保 rdclientax.dll 在路径中」。

所以关键点是：**文件其实好好地躺在那里，也不是注册表掉了**。重装 DLL、`regsvr32` 注册、`SFC` 扫描、DISM 修复，全都没用，因为这个二进制在 Windows 10 上根本加载不起来。

### 解决办法

WSLg 的作用只是「把 Linux 图形界面显示在 Windows 窗口里」，用不到它就不会再弹。新建 `%USERPROFILE%\.wslconfig` 写一行配置，然后彻底重启 WSL 即可，**不需要管理员权限**：

```powershell
# ① 写入 .wslconfig，关闭 WSLg 图形界面
"[wsl2]`nguiApplications=false" |
    Set-Content -LiteralPath "$env:USERPROFILE\.wslconfig" -Encoding ASCII

# ② 关掉 WSL 及其图形会话
wsl --shutdown

# ③ 清掉已经弹出来的残留窗口
Get-Process msrdc -ErrorAction SilentlyContinue | Stop-Process -Force

# ④ 验证：WSL 能正常起来
wsl -e echo WSL_OK

# ⑤ 验证：msrdc.exe 已经不再被拉起，下面这条应该没有输出
Get-Process msrdc -ErrorAction SilentlyContinue
```

`.wslconfig` 这个文件的内容就是：

```ini
[wsl2]
guiApplications=false
```

跑完第 ④ 步能打印 `WSL_OK`，第 ⑤ 步没有任何输出，就说明修好了。

### 注意事项

- 只影响 WSLg 的图形界面，**WSL 命令行、docker、编译、跑服务全都不受影响**。唯一的代价是没法在 WSL 里直接打开 Linux 图形程序（`gedit`、`xmessage`、`firefox` 之类）。
- 想恢复：删掉 `%USERPROFILE%\.wslconfig`，再执行一次 `wsl --shutdown`，然后弹窗会回来。
- Windows 11 不需要这个操作，因为 `GetTempPath2W` 本来就存在。
- **不要删 `C:\Program Files\WSL` 目录里的 dll**。里面那个加载失败的 `rdclientax.dll` 是必需文件，删掉会让 WSLg 彻底起不来。
- 升级 WSL 到最新版**并不能**修好这个问题——新版自带的 msrdc 一样依赖 Windows 11 的 API。想彻底支持 WSLg 图形界面，只能升到 Windows 11，或者回退到一个客户端还兼容 Windows 10 的旧版 WSL。