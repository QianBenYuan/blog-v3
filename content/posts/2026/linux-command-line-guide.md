---
title: "Linux 系统命令行入门实操笔记（Ubuntu 适配）"
description: "从零开始的 Linux 命令行操作指南，涵盖开关机、文件目录操作、文件查看、查找压缩等实用命令，适配 Ubuntu 系统。"
image: /assets/end-of-world-aiin.jpg
date: 2026-07-23
categories:
  - 技术
tags:
  - Linux
  - Ubuntu
  - 命令行
  - bash
type: tech
---
如果懒得看那么多文字，可以直接看==侧栏==

## 一、bash 基础开关机 / 登录命令

### （一）鼠标先在屏幕点击右键，打开终端

![78fe2227ba3bee69b79dc983249dcac5](/assets/linux-command-line-guide/78fe2227ba3bee69b79dc983249dcac5.png)

### （二）进出管理员系统

1. 输入 sudo -i 回车

2. 输入你当前普通用户密码

3. 提示符变为 [root@openEuler ~]##，成功进入管理员模式

4. 用完退出管理员：输入 exit 回车，回到普通用户$

	```
	 sudo -i
	```

	```
	 exit
	```

	

	

	![933c8332994d92f6d926e34f80c75e18](/assets/linux-command-line-guide/933c8332994d92f6d926e34f80c75e18.png)

### （三）reboot 重启系统

输入reboot再进行回车，作用：重启。==注意：谨慎使用==

```
reboot
```

输入reboot再进行回车，作用：重启。==注意：谨慎使用==

![f27eeb3df808680b0b938a890e4274b9](/assets/linux-command-line-guide/f27eeb3df808680b0b938a890e4274b9.png)

### （四）logout 退出登录会话

输入logout退出当前登录账号，回到系统登录输入账号密码界面

```
logout
```

![6b96a6d54eca672214e27bb7af01e465](/assets/linux-command-line-guide/6b96a6d54eca672214e27bb7af01e465.png)

### （五）exit 退出当前登录 / 终端

输入exit退出当前用户登陆

```
exit
```

![fc192184ad0aeda06ec1277290a1afbb](/assets/linux-command-line-guide/fc192184ad0aeda06ec1277290a1afbb.png)

## 二、目录与文件基础操作

### （一）pwd查看当前所在文件夹

输入pwd

```
pwd
```

pwd = print working directory（打印工作目录）

输出 `/root`，代表你现在在 root 管理员的家文件夹

![image-20260722220048293](/assets/linux-command-line-guide/image-20260722220048293.png)

### （二）ls的使用

#### 1.ls基础查看，列出文件夹里所有文件 / 目录，只显示当前目录下文件、文件夹名称

```
ls
```

![image-20260722220408062](/assets/linux-command-line-guide/image-20260722220408062.png)

#### 2.ls .. 看上一级目录（==以下注意空格==）

 ls .. 看上一级目录/上一级文件夹，查看当前文件夹外面一层的内容

```
ls ..
```

![image-20260722220814209](/assets/linux-command-line-guide/image-20260722220814209.png)

#### 3. ls /tmp 查看指定文件夹

ls /tmp直接查看系统临时文件夹 /tmp 里的内容，不用先进去

```
ls /tmp
```

![image-20260722221415088](/assets/linux-command-line-guide/image-20260722221415088.png)

#### 4.ls -a 显示全部文件（含隐藏文件）

Linux 里以 `.` 开头的文件是隐藏文件（比如.bashrc），不加 - a 看不到

```
ls -a
```

![image-20260722221628591](/assets/linux-command-line-guide/image-20260722221628591.png)

#### 5.ls -l 查看文件详细信息

会显示：权限、所有者、大小、修改时间、文件名

```
ls -l
```

![image-20260722221800382](/assets/linux-command-line-guide/image-20260722221800382.png)

#### 6.ls -al 全部文件 + 详细信息

```
ls -al
```

![image-20260722221918325](/assets/linux-command-line-guide/image-20260722221918325.png)

### （三）cd的使用，切换文件夹（进入 / 返回文件夹）（==以下注意空格==）

#### 1.cd / 进入系统根目录

pwd 验证，路径变成 `/`，所有文件夹都在根目录下面

```
cd /
```

![image-20260722222253385](/assets/linux-command-line-guide/image-20260722222253385.png)

#### 2.cd /etc 进入 etc 配置目录

```
cd /etc
```

![image-20260722222608948](/assets/linux-command-line-guide/image-20260722222608948.png)

#### 3.cd sysconfig 相对路径进入子文件夹

`/etc/sysconfig` 这个文件夹 **是 openEuler、CentOS、RedHat 这类系统才自带的目录**我现在用的是 **Ubuntu** 系统，Ubuntu 的 `/etc` 下面根本不存在 `sysconfig` 文件夹，所以 `cd sysconfig` 找不到路径，直接报错。

```
cd sysconfig
```

![image-20260722222908100](/assets/linux-command-line-guide/image-20260722222908100.png)

可以试试看 Ubuntu 的 /etc 里到底有什么，输入这条命令回车，查看 /etc 下所有文件夹：

```
ls /etc
```

![image-20260722223212716](/assets/linux-command-line-guide/image-20260722223212716.png)

#### 4.cd /etc/sysconfig 绝对路径直达

```
cd /etc/sysconfig
```

#### 5.cd .. 返回上一级

```
cd ..
```

![image-20260722223413474](/assets/linux-command-line-guide/image-20260722223413474.png)

#### 6.cd 直接回家目录

```
cd
```

![image-20260722223503923](/assets/linux-command-line-guide/image-20260722223503923.png)

#### 7.cd - 返回上一次待过的目录

```
cd -
```



![image-20260722223548122](/assets/linux-command-line-guide/image-20260722223548122.png)

#### 8.cd ~ 回到家目录

和单独 cd 效果完全一样

```
cd ~
```

![image-20260722223653264](/assets/linux-command-line-guide/image-20260722223653264.png)

### （四）mkdir 创建文件夹（==以下注意空格==）

#### 1.当前目录新建 test1（mkdir test1）

没有写任何路径，只写文件夹名，表示在**你当前正在待的文件夹**内创建 test1

#### 特点

位置完全由你当前目录决定：

（1）现在在桌面执行：生成 `~/桌面/test1`

（2）切到 /tmp 再执行：生成 `/tmp/test1`

```
mkdir test1
```

ls 查看，会多出 test1 文件夹

```
ls
```

![image-20260722223948057](/assets/linux-command-line-guide/image-20260722223948057.png)

#### 2.相对路径创建 test2（mkdir ./test2）

./ 代表当前文件夹，等价直接 mkdir test2（拿mkdir test3举例，格式一样）

拆解

（1）`.` = 固定符号，代表**当前自己所在文件夹**

（2）`./test2` = 当前目录下的 test2

效果

和 `mkdir test2` 一样，没有区别

**什么时候才需要写 `./`？**

只有运行程序时才用（比如 `./run.sh`），单纯创建文件夹，加不加 `./` 无差异。

```
mkdir ./test2
```

![image-20260722224301212](/assets/linux-command-line-guide/image-20260722224301212.png)

#### 3.绝对路径创建（mkdir /root/test4）

直接在 /root 下创建 test4，不用切换目录

（1）最前面 / （root前的/） 系统最顶层根目录
（2）`/root` = 管理员专属文件夹
（3）`/root/test4` = 在 `/root` 里面新建 test4 文件夹

#### 特点

1. 无论你现在在桌面、/home、/etc 任何位置，执行后文件夹**永远创建在 /root 下**
2. 普通用户直接运行会报「权限不足」，因为 `/root` 不让普通人写入，需要加 `sudo mkdir /root/test4`

```
mkdir /root/test4
```



#### mkdir不同格式的区别



| 命令                | 路径类型 | 创建文件夹的位置   | 关键特点                                        |
| ------------------- | -------- | ------------------ | ----------------------------------------------- |
| `mkdir /root/test4` | 绝对路径 | 固定在 `/root/` 下 | 不受当前位置影响，普通用户缺权限                |
| `mkdir test1`       | 相对路径 | 当前打开的文件夹内 | 写法最简单，日常新建文件夹最常用                |
| `mkdir ./test2`     | 相对路径 | 当前打开的文件夹内 | 和 `mkdir test2` 效果完全相同，`.` 代表当前目录 |
| `mkdir test2`       | 相对路径 | 当前打开的文件夹内 | `./` 省略写法，最简洁                           |



### （五）touch创建空白文件

在 test1 里新建 huawei.txt 文件：

```
cd test1
```

```
touch huawei.txt
```

```
ls
```

![image-20260722224800248](/assets/linux-command-line-guide/image-20260722224800248.png)

touch 作用：生成一个大小为 0 的空白文本文件

### （六）cp复制文件 / 文件夹

#### 1.复制文件示例

例：把 huawei.txt 复制到 test2，改名 huawei.txt.bak

```
cp huawei.txt /root/test2/huawei.txt.bak
```

![image-20260722225042971](/assets/linux-command-line-guide/image-20260722225042971.png)

#### 2.复制文件夹（必须加 - r）

-r = recursive 递归，复制文件夹内部所有内容

test1递归到test2里

```
cp -r /root/test1 /root/test2
```

![image-20260722225349809](/assets/linux-command-line-guide/image-20260722225349809.png)

### （七）mv移动 / 重命名

#### 1.移动文件 + 改名

把 test2 下 huawei.txt.bak 移到 /root，重命名 huawei.txt

`mv` `原名字` `目标位置`/`新名字`

`mv` `/root/test2/huawei.txt.bak` `/root`/`huawei.txt`

```
mv /root/test2/huawei.txt.bak /root/huawei.txt
```

![image-20260722233135279](/assets/linux-command-line-guide/image-20260722233135279.png)

#### 2.同目录 mv 重命名（同目录改名）

同一文件夹里移动，就是修改文件名

```
mv test1 fun
```

同一文件夹里移动，就是修改文件名

![image-20260722234151438](/assets/linux-command-line-guide/image-20260722234151438.png)

#### 3.注意

如果当前文件夹**已经存在一个叫 fun 的文件**，执行 `mv passwd fun` 会直接覆盖原来的 fun 文件，旧内容直接丢失，无法找回！

稳妥方式加 `-i`，覆盖前询问你：

```
mv -i test1 fun
```

弹出提示输入 y 才覆盖，输入 n 取消操作



#### mv的区别

| 命令格式               | 作用            | 通俗理解                                      | 适用场景                          |
| ---------------------- | --------------- | --------------------------------------------- | --------------------------------- |
| `mv test1 fun`         | **重命名**      | 同一个文件夹里，把文件换个名字，位置不变      | 想改文件名时                      |
| `mv fun test3/`        | **移动文件**    | 把文件搬到另一个文件夹里，名字不变            | 想把文件挪到别的目录              |
| `mv fun test3/new_fun` | **移动 + 改名** | 搬到别的文件夹，顺便换个新名字                | 既要移动又要改名                  |
| `mv -i test1 fun`      | **安全改名**    | 改名前先问你 "要不要覆盖"，确认才执行         | 怕不小心覆盖已有文件，推荐加 `-i` |
| `mv -i test1 test3/`   | **安全移动**    | 移动前先问你 "目标里已有同名文件，要不要覆盖" | 移动大文件 / 重要文件时防误操作   |

### （八）rm/rmdir删除

#### 1.rm 删除==文件==

删除 test1 里的 huawei.txt：

```
rm /root/test1/huawei.txt
```

![image-20260722230003799](/assets/linux-command-line-guide/image-20260722230003799.png)

![image-20260722230016494](/assets/linux-command-line-guide/image-20260722230016494.png)

#### 2.rmdir 删除==空文件夹==

只能删里面没有文件的空文件夹：

```
rmdir /root/test1
```

![image-20260722230200547](/assets/linux-command-line-guide/image-20260722230200547.png)

如果文件夹有内容，会报错，要用 rm -r

#### 3.rm -r 删除==带内容的文件夹==

有删除确认提示，每个文件都要你手动输 y 确认

```
rm -r /root/test2
```

直接把文件夹 + 里面所有文件全部删掉，无法恢复

![image-20260722230452258](/assets/linux-command-line-guide/image-20260722230452258.png)

#### 4.rm -rf

-f = force 强制，不弹出确认，一键全删

#### rm/rmdir区别

| 对比项目             | rm（基础删除）           | rmdir                          | rm -f                          | rm -r                            | rm -rf                               |
| -------------------- | ------------------------ | ------------------------------ | ------------------------------ | -------------------------------- | ------------------------------------ |
| 核心作用             | 删除普通文件             | 仅删除**空文件夹**             | 强制删除文件                   | 递归删除目录（含内部文件）       | 递归 + 强制删除目录                  |
| 是否能删文件         | ✅ 支持                   | ❌ 完全不行                     | ✅ 支持                         | ✅ 支持                           | ✅ 支持                               |
| 是否能删空文件夹     | ❌ 报错                   | ✅ 支持                         | ❌ 报错                         | ✅ 支持                           | ✅ 支持                               |
| 是否能删带内容文件夹 | ❌ 报错                   | ❌ 报错                         | ❌ 报错                         | ✅ 支持                           | ✅ 支持                               |
| 删除确认提示         | 删除写保护文件会弹窗询问 | 无提示，直接删空目录           | 全程无任何确认弹窗             | 每个文件逐一询问确认             | 全程无任何确认弹窗                   |
| 文件 / 目录不存在时  | 终端报错提示不存在       | 终端报错提示不存在             | 不报错，静默跳过               | 终端报错提示不存在               | 不报错，静默跳过                     |
| 安全程度             | 中等（有确认提醒）       | 最高（只能删空文件夹，难误删） | 偏低（无确认）                 | 较高（逐个确认，有挽回机会）     | 最低（一键全删，无法恢复）           |
| 典型使用场景         | 日常删除少量普通文件     | 清理没用的空白文件夹           | 批量强制删除文件，不想弹窗确认 | 谨慎删除有内容的文件夹，防止误删 | 实验环境一键清空文件夹、脚本批量清理 |



### (九) ln硬链接、软链接

使用前先看一下命令行是否一致

![image-20260723001350704](/assets/linux-command-line-guide/image-20260723001350704.png)

#### 1.硬链接 ln

解释：同一个文件多一个名字，删原文件，硬链接还能正常打开，共用同一个 inode 编号

##### （1）切换目录

```
cd /root/test2/test3
```

##### （2）验证，查看目录

```
ls
```

![image-20260723002139211](/assets/linux-command-line-guide/image-20260723002139211.png)

##### （3）ln 硬链接操作

```
ln huawei.txt /root/test4/huawei1.txt
```

```
cd /root/test4
```

```
ls
```

![image-20260723002311578](/assets/linux-command-line-guide/image-20260723002311578.png)

##### （4）查看 inode 确认是硬链接（两个文件编号相同）

```
ls -i /root/test2/test3/huawei.txt /root/test4/huawei1.txt
```

![image-20260723002410794](/assets/linux-command-line-guide/image-20260723002410794.png)

#### 2.软链接 ln -s（快捷方式）

使用前先看一下命令行是否一致

![image-20260723002926489](/assets/linux-command-line-guide/image-20260723002926489.png)

##### (1)先回到根目录 /root（方便操作）

参数解释：

- `-s`：创建符号软链接（Windows 快捷方式）
- `/root/huawei.txt`：原始真实文件（必须写完整绝对路径，软链接推荐绝对路径，避免失效）
- `/root/test2/test3/huawei2.txt`：存放快捷方式的位置 + 快捷方式名称

```
cd
```

```
ln -s /root/huawei.txt /root/test2/test3/huawei2.txt
```

```
cd /root/test2/test3
```

```
ls
```

![image-20260723003436040](/assets/linux-command-line-guide/image-20260723003436040.png)

#### 3.查看 inode 编号（区分软硬链接与原文件）

##### （1）查看 test3 内原文件 + 刚创建的软链接 inode

```
ls -i /root/test2/test3/huawei.txt /root/test2/test3/huawei2.txt
```

![image-20260723003908118](/assets/linux-command-line-guide/image-20260723003908118.png)

##### （2）对比硬链接（test4 里的 huawei1.txt）和它的原文件 inode

两个文件**inode 数字完全一致**，硬链接共享同一个数据块

```
ls -i /root/test2/test3/huawei.txt /root/test4/huawei1.txt
```

![image-20260723004147340](/assets/linux-command-line-guide/image-20260723004147340.png)

规律：

- `/root/test2/test3/huawei.txt`：独立 inode（真实文件，如一本书）

- `/root/test2/test3/huawei2.txt`：**完全不同的 inode**（软链接是独立文件，仅记录路径，如记录着书架第三排第一列）

	##### （3）一次性对比三类文件（原文件 / 硬链接 / 软链接）

	```
	ls -i /root/huawei.txt /root/test4/huawei1.txt /root/test2/test3/huawei2.txt
	```

	![image-20260723005245474](/assets/linux-command-line-guide/image-20260723005245474.png)

总结：

1. 原文件 `/root/huawei.txt`：独立 inode
2. 硬链接 `/root/test4/huawei1.txt` 和 `/root/test2/test3/huawei.txt` inode 相同
3. 软链接 `/root/test2/test3/huawei2.txt` inode 和所有真实文件都不一样

#### 4.验证软链接核心特性（删除原文件，软链接失效）

##### （1）先查看软链接能否正常读取内容

```
cat /root/test2/test3/huawei2.txt
```

![image-20260723005611534](/assets/linux-command-line-guide/image-20260723005611534.png)

##### （2）删除原始文件 /root/huawei.txt

```
rm /root/huawei.txt
```

![image-20260723005702939](/assets/linux-command-line-guide/image-20260723005702939.png)

##### （3）再次读取软链接，验证失效

```
cat /root/test2/test3/huawei2.txt
```

![image-20260723005758907](/assets/linux-command-line-guide/image-20260723005758907.png)

#### 5.补充恢复文件（方便反复练习）

如果想重新测试，恢复顶层 huawei.txt：

```
cp /root/test2/test3/huawei.txt /root/huawei.txt
## 重新生成软链接
ln -s /root/huawei.txt /root/test2/test3/huawei2.txt
```

#### 区别

| 类型   | inode 编号       | 删除原文件后           |
| ------ | ---------------- | ---------------------- |
| 硬链接 | 和原文件完全相同 | 链接文件仍能正常打开   |
| 软链接 | 和原文件完全不同 | 链接直接失效，无法读取 |

## 三、文件查看命令

`cat/head/less/more` 作用都是**打开文本文件看内容**，区别只在查看方式

### (一).输入文件内容的四种方法与cat 一次性输出全部内容

4 种给test4里huawei1.txt 写入内容的方法

#### 方法1：

##### （1）先进入test4

```
cd test4
```

##### （2）给 huawei1.txt 写入内容

echo 快速写入

```
echo "这是华为测试文件1号" > huawei1.txt
```

![image-20260723134316875](/assets/linux-command-line-guide/image-20260723134316875.png)

##### （3）追加写入

```
echo "新增第二行内容" >> huawei1.txt
```

![image-20260723134341560](/assets/linux-command-line-guide/image-20260723134341560.png)

##### （4）cat 一次性输出全部内容

```
cat /etc/passwd
```

![image-20260723134514490](/assets/linux-command-line-guide/image-20260723134514490.png)

#### 方法2:cat 多行写入一次性写很多行，适合短文档）

```
cat > huawei1.txt << EOF
第一行：测试文本
第二行：Linux文件操作练习
第三行：cat写入多行内容
EOF
```

![image-20260723135215158](/assets/linux-command-line-guide/image-20260723135215158.png)

==注意：会被覆盖==

#### 方法 3：nano 文本编辑器（可视化打字）

1.打开文件编辑

```
nano huawei1.txt
```

![image-20260723140723746](/assets/linux-command-line-guide/image-20260723140723746.png)

2.操作教程

1. 现在可以直接键盘打字，随便输入内容
2. Ctrl+O ：保存写入的文字（O 是字母 O，不是零）
3. 直接回车确认文件名
4. Ctrl+X ：退出编辑器，回到命令行

![image-20260723140836477](/assets/linux-command-line-guide/image-20260723140836477.png)

#### 方法 4：vim 编辑器（需要有vim编辑器的才能使用）

1. 打开文件

```
vim huawei1.txt
```

1. 按键盘 `i` 键，进入输入模式，就能打字
2. 写完按 `Esc` 键退出输入
3. 输入 `:wq` 回车 → 保存并退出

### (二)head 只查看文件开头内容

#### 1.可以试着先在huawei1.txt弄出十一行

![image-20260723141803133](/assets/linux-command-line-guide/image-20260723141803133.png)

#### 2.默认查看前 10 行

```
head huawei1.txt
```

![image-20260723141935856](/assets/linux-command-line-guide/image-20260723141935856.png)

#### 3.自定义查看前 3 行

```
head -n 3 huawei1.txt
```

![image-20260723142043289](/assets/linux-command-line-guide/image-20260723142043289.png)

#### 4.只读取前 100 个字符

```
head -c 100 huawei1.txt
```

![image-20260723142138864](/assets/linux-command-line-guide/image-20260723142138864.png)

另：只读取前 200 个字符

![image-20260723142221764](/assets/linux-command-line-guide/image-20260723142221764.png)

参数 `-c 数字`：读取指定字节文字

### (三) less 分页查看

```
less huawei1.txt
```

![image-20260723142336978](/assets/linux-command-line-guide/image-20260723142336978.png)

进入查看界面操作按键

- 上下箭头：单行上下滚动
- 空格：向下翻一整页
- b：向上翻一整页
- Q：退出查看界面，回到命令行

### (四)more 分页查看（仅向下浏览）

```
more huawei1.txt
```



界面操作按键

- 空格：向下翻整页
- 回车：向下翻一行
- Q：提前退出

![image-20260723142833323](/assets/linux-command-line-guide/image-20260723142833323.png)

#### 四大命令对比总结表：

| 命令 | 功能特点                           | 适用场景                         |
| ---- | ---------------------------------- | -------------------------------- |
| cat  | 一次性打印文件全部内容，操作最简单 | 行数极少的小型文本               |
| head | 仅输出文件开头部分内容             | 只需要预览文件开头，无需完整内容 |
| less | 支持上下自由翻页，操作功能最全     | 大文件、需要来回翻看内容（首选） |
| more | 仅能向下翻页，无法回看上方内容     | 简单快速浏览，不需要回头查看     |

## 四、查找文件命令

### (一). find 全盘 / 目录搜索文件

#### 示例 1：查找 /root 下所有带 huawei 的文件

```
find /root -name "huawei*.txt"
```

![image-20260723143552139](/assets/linux-command-line-guide/image-20260723143552139.png)

解释：

- `/root`：从 root 家目录开始搜索
- `-name "huawei*.txt"`：匹配所有以 huawei 开头的 txt 文件

#### 示例 2：查找属于 root 用户的文件

```
find /root -user root
```

![image-20260723143748420](/assets/linux-command-line-guide/image-20260723143748420.png)

解释：你的所有文件创建者都是 root，会列出 /root 下全部内容

#### 示例 3：过滤 2 天内修改的文件

```
find /root -mtime -2
```

![image-20260723143837347](/assets/linux-command-line-guide/image-20260723143837347.png)

- `-mtime -2`：近 2 天新建 / 修改的文件

- `+2`：2 天前修改的旧文件

- `2`：刚好 2~3 天前修改

### （二） which：查找命令存放位置

```
which ls
which pwd
which find
```

![image-20260723144119173](/assets/linux-command-line-guide/image-20260723144119173.png)

### （三） whereis：查找程序 + 帮助文档

```
whereis bash
whereis ls
```

![image-20260723144331079](/assets/linux-command-line-guide/image-20260723144331079.png)

会同时输出命令本体、手册文件路径

## 五、zip 压缩解压

### (一) 压缩单个文件

#### 1.压缩文件

##### (1)先进入 test1 目录

```
cd test1
```

##### （2）压缩 huawei.txt，打包成 file.zip

```
zip file.zip huawei.txt
```

##### （3）输入`ls`查看，文件夹多出 `file.zip`

```
ls
```

![image-20260723144643114](/assets/linux-command-line-guide/image-20260723144643114.png)

#### 2.压缩整个文件夹（-r 递归）

退回 root 目录，压缩 test2 整个文件夹

```
cd
zip -r test2_all.zip test2
```

![image-20260723144827189](/assets/linux-command-line-guide/image-20260723144827189.png)

`-r`：递归，把子文件夹 test3 和里面文件一起打包，不加 - r 只会打包空文件夹（test2里包含test3文件）

#### 3. unzip 解压 zip 包

##### （1）解压到当前文件夹

```
cd test1
unzip file.zip
```

![image-20260723145617851](/assets/linux-command-line-guide/image-20260723145617851.png)

填y会覆盖同名文件，可以把解压名file换成file1

##### （2） 解压到指定文件夹 test4

```
unzip file.zip -d ~/test4
```

![image-20260723145846251](/assets/linux-command-line-guide/image-20260723145846251.png)

- `-d`：指定解压目标文件夹

- `-o`：强制覆盖已有同名文件（不加会询问）

## 六、tar（tar.gz ）打包压缩

### (一) 仅打包，不压缩（-cf）

把 test4 文件夹打包成 test4.tar

```
cd
tar -cf test4.tar test4
```

![image-20260723150139282](/assets/linux-command-line-guide/image-20260723150139282.png)

- `-c`：创建新压缩包
- `-f`：指定压缩包文件名，**必须写在所有参数最后**

### (二）打包 + gzip 压缩（-czvf，日常用最多）

打包 test2 里的 test3 文件夹：

```
tar -czvf test3_pack.tar.gz test2/test3
```

![image-20260723150527402](/assets/linux-command-line-guide/image-20260723150527402.png)

`-z`：开启 gzip 压缩，体积更小

`-v`：显示打包过程（能看到哪些文件被打包）

### （三）解压 tar.gz 包

#### 1.

##### （1）解压到当前目录

```
tar -zxvf test3_pack.tar.gz
```

![image-20260723150854750](/assets/linux-command-line-guide/image-20260723150854750.png)

##### （2）解压到指定文件夹 test1（-C 指定目录）

```
tar -zxvf test3_pack.tar.gz -C ~/test1
```

![image-20260723151055842](/assets/linux-command-line-guide/image-20260723151055842.png)

- `-x`：解压模式 

- `-C`：自定义解压存放位置

## 七、辅助帮助命令

### (一)help 查看命令官方说明

```
help cd
help pwd
```

![image-20260723151321874](/assets/linux-command-line-guide/image-20260723151321874.png)



![image-20260723151635274](/assets/linux-command-line-guide/image-20260723151635274.png)

只想看简短语法：

```
help -s ls
```

如果报错，核心原因：

- `help` 命令**只支持 bash 内置命令**（cd、pwd、exit、history 这类系统自带内置指令）；

- `ls` 是**外部独立程序**，不属于 bash 内置，所以`help`查不到它的说明。

	可以试试：

```
help -s cd
help -s pwd
```

![image-20260723152217993](/assets/linux-command-line-guide/image-20260723152217993.png)

### (二) history 查看你输入过的全部命令

```
history
```

![image-20260723154202196](/assets/linux-command-line-guide/image-20260723154202196.png)

运行后会列出你从开机到现在所有敲过的指令

### (三)date 查看系统时间

```
date
```

![image-20260723154320013](/assets/linux-command-line-guide/image-20260723154320013.png)

### (四) uptime 查看开机多久

```
uptime
```

![image-20260723154413204](/assets/linux-command-line-guide/image-20260723154413204.png)

### (五）last 查看所有登录记录

![image-20260723154440616](/assets/linux-command-line-guide/image-20260723154440616.png)

## 八、实验配套思考题

### (一)创建 /iamthebest 目录

```
mkdir /iamthebest
ls
```

![image-20260723155011350](/assets/linux-command-line-guide/image-20260723155011350.png)

### (二)在 /iamthebest 目录下创建 cat 和 dog 两个目录

#### 1.进入 iamthebest 文件夹

```
cd /iamthebest
```

#### 2.一次性创建两个文件夹

```
mkdir cat dog
```

#### 3.查看结果

```
ls
```

![image-20260723155304025](/assets/linux-command-line-guide/image-20260723155304025.png)

- `mkdir cat dog` 空格隔开，能同时新建多个目录

### (三)将 /etc/passwd 文件复制到 /iamthebest；查看文件权限

####  1.复制文件

```
cp /etc/passwd /iamthebest
```

![image-20260723155648135](/assets/linux-command-line-guide/image-20260723155648135.png)

####  2.进入目录查看权限

```
cd /iamthebest
ls -l passwd
```

![image-20260723155747016](/assets/linux-command-line-guide/image-20260723155747016.png)

1. `/etc/passwd` 是系统存放所有用户信息的文件（源文件）
2. `cp 源文件 目标文件夹`：把用户文件复制到 iamthebest 里
3. `ls -l` 查看文件详细权限、所有者、大小、修改时间

### （四）执行 cp -i /etc/passwd . 观察现象 + 原因输入命令

```
cp -i /etc/passwd .
```

![image-20260723155946002](/assets/linux-command-line-guide/image-20260723155946002.png)

结果

如果当前目录已经有 passwd，会弹出提示：`cp: overwrite 'passwd'?` 让你输入 y/n 确认；

如果没有文件，直接复制无提示。

含义：

1. `-i`：interactive 交互模式，复制前询问是否覆盖同名文件，防止误删
2. `.` 代表**当前文件夹**，意思是复制到我现在所在的目录
3. 对比不加 `-i`：直接覆盖文件，不会提醒，容易丢失数据

### (五)将 passwd 重命名为 fun

#### 1.命令（当前在 /iamthebest 目录）

```
mv passwd fun
```

#### 2.验证

```
ls
```

![image-20260723160306557](/assets/linux-command-line-guide/image-20260723160306557.png)

`mv` 两大作用：

1. 不同文件夹之间 => 移动文件
2. 同一个文件夹内 => 重命名文件,执行后目录里看不到 passwd，取而代之是 fun。

### (六)移动 fun 完整流程

需求：fun → cat → dog → 回到 iamthebest

#### 1.把 fun 移进 cat 文件夹

```
mv fun cat
ls
```

#### 2.进入 cat 目录

```
cd cat
ls
```

![image-20260723160704621](/assets/linux-command-line-guide/image-20260723160704621.png)

### （七）给 fun 创建硬链接到 cat 目录

#### 1.当前目录：/iamthebest

```
ln fun cat
```

#### 2.验证

```
ls cat
```

![image-20260723161342558](/assets/linux-command-line-guide/image-20260723161342558.png)

- 硬链接和原文件是**同一个文件**，共用一套数据、同一个编号（inode）
- 删除原文件 fun，cat 里的硬链接还能正常打开文件内容

### (八)给 fun 创建软链接到 dog 目录，命名 fun_link

#### 1.命令

```
ln -s /iamthebest/fun dog/fun_link
```

#### 2.验证

```
ls dog
```

dog 里出现 `fun_link`

![image-20260723161952798](/assets/linux-command-line-guide/image-20260723161952798.png)

- `-s` = soft 软链接
- 只是一个快捷方式，指向原文件
- 如果把原文件 fun 删掉，这个软链接会失效，打不开内容

### （九）删除 /iamthebest 里的原 fun 文件

#### 1.命令

```
rm fun
```

#### 2.操作

回车后提示 `rm: remove regular file 'fun'?`，输入 `y` 回车确认

#### 3.验证

```
ls
```

![image-20260723162157656](/assets/linux-command-line-guide/image-20260723162157656.png)

主目录看不到 fun，但 cat 里的硬链接 fun 依然存在，还能读取内容。

### （十）查看所有 fun 文件的 inode 节点信息

inode 编号用来区分软硬链接：硬链接 inode 和原文件一致，软链接不一样

#### 命令

```
ls -i cat dog
```

![image-20260723162339136](/assets/linux-command-line-guide/image-20260723162339136.png)

- `-i` 参数：显示每个文件的 inode 数字
- cat 里的 fun（硬链接）inode 编号和最开始原文件相同
- dog 里的 fun_link（软链接）inode 编号完全不同

### （十一）.打包 fun 文件为 iamstillfun.tar.gz（tar.gz 压缩包）

#### 1.目录：/iamthebest

```
tar -czvf iamstillfun.tar.gz cat/fun
```

- `-c` create 创建压缩包
- `-z` gzip 压缩，生成.tar.gz 格式
- `-v` verbose 显示打包过程（可选，不加也能运行）
- `-f` 指定压缩包文件名，必须放所有参数最后

#### 2.验证

```
ls
```

![image-20260723162554227](/assets/linux-command-line-guide/image-20260723162554227.png)

目录多出 `iamstillfun.tar.gz`

### （十二）把压缩包解压到 cat 目录

#### 1.输入

```
tar -zxvf iamstillfun.tar.gz -C /iamthebest/cat
```

由于`/iamthebest/cat` 里面已经存在文件 `fun`，无法新建同名文件夹`cat`，触发报错

所以,可以试试这个

```
tar -zxvf iamstillfun.tar.gz --strip-components=1 -C /iamthebest/cat
```

![image-20260723163713948](/assets/linux-command-line-guide/image-20260723163713948.png)

- `-x` 解压
- `-C` 指定解压存放目录

#### 2.验证

```
ls cat
```

cat 目录内会重新出现 fun 文件

![image-20260723163803623](/assets/linux-command-line-guide/image-20260723163803623.png)

### （十三）全盘查找所有名为 fun 的文件

#### 1.完整命令

```
find / -type f -name "fun" 2>/dev/null
```

![image-20260723164009121](/assets/linux-command-line-guide/image-20260723164009121.png)

1. `find /`：从系统根目录 `/` 开始全盘搜索
2. `-type f`：只查找普通文件，排除文件夹、快捷方式
3. `-name "fun"`：精准匹配文件名叫 fun 的文件
4. `2>/dev/null`：屏蔽 “权限不足” 的报错，界面干净不杂乱

#### 2.输出结果

会打印出所有存放 fun 文件的完整路径，比如 `/iamthebest/cat/fun`