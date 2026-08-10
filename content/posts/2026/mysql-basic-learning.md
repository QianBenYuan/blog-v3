---
title: "MySQL 基础篇学习笔记"
description: "通过黑马程序员学习 MySQL 的基础笔记，涵盖数据库概念、SQL 语句、数据类型、约束、多表查询、事务等核心知识点。"
image: /assets/1B77C18732F4B4848A53918342CF3840.jpg
date: 2026-08-10
categories:
  - 技术
tags:
  - MySQL
  - 数据库
  - SQL
type: tech
---

## MYSQL基础篇学习

我是通过黑马程序员进行学习，这里只是我学习的记录与描写，有需要的可以跳转至https://www.bilibili.com/video/BV1Kr4y1i7ru?vd_source=faf51a070951ae795a5bb0f0eed4c3f1&spm_id_from=333.788.videopod.episodes&p=12

### 01.MySQL课程介绍

数据库知识很重要，软件工程基础

MySQL是存储和管理的软件

SQL语句

集群

![image-20260730153510427](/assets/mysql-basic/image-20260730153510427.png)

![image-20260730153535636](/assets/mysql-basic/image-20260730153535636.png)

#### 02.基础-课程内容-数据库相关概念

![image-20260730154230946](/assets/mysql-basic/image-20260730154230946.png)

数据库相关概念

![image-20260730154620938](/assets/mysql-basic/image-20260730154620938.png)

#### 03.WySQL数据库

我建议先在虚拟机安装Windows10，把MySQL安装在虚拟机Windows10里

https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-community-8.0.46.0.msi

![image-20260730155045794](/assets/mysql-basic/image-20260730155045794.png)

```
https://dev.mysql.com/downloads/windows/installer/8.0.html
```

![image-20260730161312722](/assets/mysql-basic/image-20260730161312722.png)

不需要点上面的，会去到Oracle进行账号登录

![image-20260730161430269](/assets/mysql-basic/image-20260730161430269.png)

![image-20260730205513452](/assets/mysql-basic/image-20260730205513452.png)

![image-20260730205609633](/assets/mysql-basic/image-20260730205609633.png)

![image-20260730205926202](/assets/mysql-basic/image-20260730205926202.png)

![image-20260730210143995](/assets/mysql-basic/image-20260730210143995.png)

![image-20260730210310274](/assets/mysql-basic/image-20260730210310274.png)

![image-20260730210338083](/assets/mysql-basic/image-20260730210338083.png)

##### 参数作用

- -u 登录用户名  **参数全称：** --user   **含义：**指定登录用户名 -u root  = 使用账号  root  登录
- -p 密码  **参数全称：** --password **含义：**需要输入密码
- -h 数据库IP地址 **参数全称：** -h = --host 指定数据库地址
- -P 数据库端口（大写！）  **参数全称：** -P = --port 指定端口（**大写P**！！)
- -e 执行一条SQL语句，不用进入交互界面 

#### 04.基础-概述-数据模型

![image-20260810164018666](/assets/mysql-basic/image-20260810164018666.png)

![image-20260810164052193](/assets/mysql-basic/image-20260810164052193.png)

![image-20260810164115510](/assets/mysql-basic/image-20260810164115510.png)

### 05.基础-SQL-通用语法及分类

![image-20260802154310294](/assets/mysql-basic/image-20260802154310294.png)

![image-20260802154706957](/assets/mysql-basic/image-20260802154706957.png)

#### 06.基础-SQL-DDL-数据库操作

![image-20260802154949500](/assets/mysql-basic/image-20260802154949500.png)



##### 07.基础-SQL-DDL-表操作-创建&查询

![image-20260803143140384](/assets/mysql-basic/image-20260803143140384.png)

![image-20260803143359700](/assets/mysql-basic/image-20260803143359700.png)

##### 08.基础-SQL-DDL-数据类型及案例

![image-20260803144820492](/assets/mysql-basic/image-20260803144820492.png)

![image-20260803145637014](/assets/mysql-basic/image-20260803145637014.png)

![image-20260803150858629](/assets/mysql-basic/image-20260803150858629.png)

![image-20260803152859072](/assets/mysql-basic/image-20260803152859072.png)

![image-20260803153515361](/assets/mysql-basic/image-20260803153515361.png)

##### 09.基础-SQL-DDL-表操作-修改&删除

![image-20260803204453979](/assets/mysql-basic/image-20260803204453979.png)

![image-20260804092658371](/assets/mysql-basic/image-20260804092658371.png)

![image-20260804092856605](/assets/mysql-basic/image-20260804092856605.png)

![image-20260804092942932](/assets/mysql-basic/image-20260804092942932.png)

![image-20260804093117233](/assets/mysql-basic/image-20260804093117233.png)

##### 10.基础-SQL-DDL小结

![image-20260804093535345](/assets/mysql-basic/image-20260804093535345.png)

### 11.基础-SQL-图形化界面工具DataGrip

https://www.jetbrains.com/datagrip/download/download-thanks.html?platform=windows

![image-20260804101400458](/assets/mysql-basic/image-20260804101400458.png)

![image-20260804111029333](/assets/mysql-basic/image-20260804111029333.png)

由于我用的是2026版本，要换成free版本，在安装好后

![image-20260804111153375](/assets/mysql-basic/image-20260804111153375.png)

对账号进行登录就可以获得免费版本

![image-20260804111225530](/assets/mysql-basic/image-20260804111225530.png)

跟着电脑步骤一步步做

![image-20260804155800489](/assets/mysql-basic/image-20260804155800489.png)

![image-20260804155856393](/assets/mysql-basic/image-20260804155856393.png)

然后换名字

![image-20260804155726321](/assets/mysql-basic/image-20260804155726321.png)

创建

或者使用

```
create schema test;
```

或者

```
create database test;
```

![image-20260804160057094](/assets/mysql-basic/image-20260804160057094.png)

![image-20260804160145379](/assets/mysql-basic/image-20260804160145379.png)

通过这个添加列

![image-20260804160336182](/assets/mysql-basic/image-20260804160336182.png)

点击后进行右键可以看到

![image-20260804160612846](/assets/mysql-basic/image-20260804160612846.png)

![image-20260804160638699](/assets/mysql-basic/image-20260804160638699.png)

![image-20260804160650801](/assets/mysql-basic/image-20260804160650801.png)

好了之后点击确定

如果要进行修改，则

![image-20260804161010761](/assets/mysql-basic/image-20260804161010761.png)

进入到

![image-20260804161028263](/assets/mysql-basic/image-20260804161028263.png)

要增加列，则

![image-20260804161145329](/assets/mysql-basic/image-20260804161145329.png)

![image-20260804161211132](/assets/mysql-basic/image-20260804161211132.png)

也可以通过这种方式来控制表

![image-20260804161341153](/assets/mysql-basic/image-20260804161341153.png)

数据库可以通过sql语句展现出来

![image-20260804161540749](/assets/mysql-basic/image-20260804161540749.png)

![image-20260804161629960](/assets/mysql-basic/image-20260804161629960.png)

通过desc user；

可以看到表

![image-20260804161840544](/assets/mysql-basic/image-20260804161840544.png)

### 12.基础-SQL-DML-插入

![image-20260804162441353](/assets/mysql-basic/image-20260804162441353.png)

![image-20260804162704973](/assets/mysql-basic/image-20260804162704973.png)

#### 13.基础-SQL-DML-更新和删除

![image-20260804164514096](/assets/mysql-basic/image-20260804164514096.png)

![image-20260804164553052](/assets/mysql-basic/image-20260804164553052.png)

如果没带where会更新所有的数据

![image-20260804164645128](/assets/mysql-basic/image-20260804164645128.png)

![image-20260804164725197](/assets/mysql-basic/image-20260804164725197.png)

![image-20260804164747010](/assets/mysql-basic/image-20260804164747010.png)

#### 14. 基础-SQL-DML小结

![image-20260804165021740](/assets/mysql-basic/image-20260804165021740.png)

### 15.基础-SQL-DQL-基础查询

![image-20260804190111563](/assets/mysql-basic/image-20260804190111563.png)

![image-20260804190229656](/assets/mysql-basic/image-20260804190229656.png)

![image-20260804190357153](/assets/mysql-basic/image-20260804190357153.png)

#### 16.基础-SQL-DQL-条件查询

![image-20260804191501912](/assets/mysql-basic/image-20260804191501912.png)

![image-20260804191743921](/assets/mysql-basic/image-20260804191743921.png)

![image-20260804191845209](/assets/mysql-basic/image-20260804191845209.png)

![image-20260804192020525](/assets/mysql-basic/image-20260804192020525.png)

![image-20260804192054442](/assets/mysql-basic/image-20260804192054442.png)

![image-20260804192208097](/assets/mysql-basic/image-20260804192208097.png)

![image-20260804192348006](/assets/mysql-basic/image-20260804192348006.png)

#### 17.基础-SQL-DQL-聚合函数

![image-20260804192444269](/assets/mysql-basic/image-20260804192444269.png)

![image-20260804192658393](/assets/mysql-basic/image-20260804192658393.png)

![image-20260804192719757](/assets/mysql-basic/image-20260804192719757.png)

![image-20260804192814262](/assets/mysql-basic/image-20260804192814262.png)

#### 18.基础-SQL-DQL-分组查询

![image-20260804192856040](/assets/mysql-basic/image-20260804192856040.png)

![image-20260804193015493](/assets/mysql-basic/image-20260804193015493.png)

![image-20260804193440593](/assets/mysql-basic/image-20260804193440593.png)

![image-20260804193504097](/assets/mysql-basic/image-20260804193504097.png)

#### 19.基础-SQL-DQL-排序查询

![image-20260805110548433](/assets/mysql-basic/image-20260805110548433.png)

![image-20260805110909312](/assets/mysql-basic/image-20260805110909312.png)

#### 20.基础-SQL-DQL-分页查询

![image-20260805110956576](/assets/mysql-basic/image-20260805110956576.png)

![image-20260805111223148](/assets/mysql-basic/image-20260805111223148.png)

#### 21.基础-SQL-DQL-案例练习

![image-20260805111300515](/assets/mysql-basic/image-20260805111300515.png)

![image-20260805111538677](/assets/mysql-basic/image-20260805111538677.png)

![image-20260805111804048](/assets/mysql-basic/image-20260805111804048.png)

#### 22.基础-SQL-DQL-执行顺序

![image-20260805111947964](/assets/mysql-basic/image-20260805111947964.png)

![image-20260805112045490](/assets/mysql-basic/image-20260805112045490.png)

![image-20260805112113423](/assets/mysql-basic/image-20260805112113423.png)

![image-20260805112133470](/assets/mysql-basic/image-20260805112133470.png)

#### 23.基础-SQL-DQL小结

![image-20260805112512627](/assets/mysql-basic/image-20260805112512627.png)

### 24.基础-SQL-DCL-用户管理

![image-20260805113851486](/assets/mysql-basic/image-20260805113851486.png)

![image-20260805113910418](/assets/mysql-basic/image-20260805113910418.png)

![image-20260805121928555](/assets/mysql-basic/image-20260805121928555.png)

![image-20260805122005187](/assets/mysql-basic/image-20260805122005187.png)

![image-20260805122102895](/assets/mysql-basic/image-20260805122102895.png)

![image-20260805122150855](/assets/mysql-basic/image-20260805122150855.png)

![image-20260805122218542](/assets/mysql-basic/image-20260805122218542.png)

![image-20260805122253661](/assets/mysql-basic/image-20260805122253661.png)

#### 25.基础-SQL-DCL-权限控制

![image-20260805122338378](/assets/mysql-basic/image-20260805122338378.png)

![image-20260805122504834](/assets/mysql-basic/image-20260805122504834.png)

![image-20260805122552694](/assets/mysql-basic/image-20260805122552694.png)

![image-20260805122627042](/assets/mysql-basic/image-20260805122627042.png)

![image-20260805122722610](/assets/mysql-basic/image-20260805122722610.png)

![image-20260805122744685](/assets/mysql-basic/image-20260805122744685.png)

#### 26.基础-SQL-DCL小结

![image-20260805122918998](/assets/mysql-basic/image-20260805122918998.png)

### 27.基础-函数-字符串函数

![image-20260805152429784](/assets/mysql-basic/image-20260805152429784.png)

![image-20260805152442588](/assets/mysql-basic/image-20260805152442588.png)

![image-20260805152646672](/assets/mysql-basic/image-20260805152646672.png)

![image-20260805152735105](/assets/mysql-basic/image-20260805152735105.png)

![image-20260805152752529](/assets/mysql-basic/image-20260805152752529.png)

![image-20260805152833053](/assets/mysql-basic/image-20260805152833053.png)

![image-20260805152909173](/assets/mysql-basic/image-20260805152909173.png)

![image-20260805153040997](/assets/mysql-basic/image-20260805153040997.png)

![image-20260805153055299](/assets/mysql-basic/image-20260805153055299.png)

#### 28.基础-函数-数值函数

![image-20260805153127875](/assets/mysql-basic/image-20260805153127875.png)

![image-20260805153232676](/assets/mysql-basic/image-20260805153232676.png)

![image-20260805153301858](/assets/mysql-basic/image-20260805153301858.png)

![image-20260805153328742](/assets/mysql-basic/image-20260805153328742.png)

![image-20260805153351524](/assets/mysql-basic/image-20260805153351524.png)

![image-20260805153418242](/assets/mysql-basic/image-20260805153418242.png)

![image-20260805153509745](/assets/mysql-basic/image-20260805153509745.png)

![image-20260805153528751](/assets/mysql-basic/image-20260805153528751.png)

如果有5位数，则可以进行填充0

![image-20260805153704704](/assets/mysql-basic/image-20260805153704704.png)

#### 29.基础-函数-日期函数

![image-20260805153745224](/assets/mysql-basic/image-20260805153745224.png)

![image-20260805153849133](/assets/mysql-basic/image-20260805153849133.png)

![image-20260805153903788](/assets/mysql-basic/image-20260805153903788.png)

![image-20260805153918715](/assets/mysql-basic/image-20260805153918715.png)

![image-20260805153948901](/assets/mysql-basic/image-20260805153948901.png)

![image-20260805154035623](/assets/mysql-basic/image-20260805154035623.png)

![image-20260805154109122](/assets/mysql-basic/image-20260805154109122.png)

![image-20260805154549428](/assets/mysql-basic/image-20260805154549428.png)

![image-20260805154613480](/assets/mysql-basic/image-20260805154613480.png)

![image-20260805154727903](/assets/mysql-basic/image-20260805154727903.png)

#### 30.基础-函数-流程函数

![image-20260805154802968](/assets/mysql-basic/image-20260805154802968.png)

![image-20260805154916731](/assets/mysql-basic/image-20260805154916731.png)

![image-20260805154929211](/assets/mysql-basic/image-20260805154929211.png)

![image-20260805155005135](/assets/mysql-basic/image-20260805155005135.png)

![image-20260805155021943](/assets/mysql-basic/image-20260805155021943.png)

![image-20260805155035076](/assets/mysql-basic/image-20260805155035076.png)

![image-20260805155209533](/assets/mysql-basic/image-20260805155209533.png)

![image-20260805155236332](/assets/mysql-basic/image-20260805155236332.png)

![image-20260805155252273](/assets/mysql-basic/image-20260805155252273.png)

![image-20260805155436903](/assets/mysql-basic/image-20260805155436903.png)

#### 31.基础-函数-小结

![image-20260805155555430](/assets/mysql-basic/image-20260805155555430.png)

![image-20260805155642185](/assets/mysql-basic/image-20260805155642185.png)

### 32.基础-约束-概述

![image-20260805160840954](/assets/mysql-basic/image-20260805160840954.png)

![image-20260805161602099](/assets/mysql-basic/image-20260805161602099.png)

#### 33.基础-约束-演示

![image-20260805162031257](/assets/mysql-basic/image-20260805162031257.png)

![image-20260805162254356](/assets/mysql-basic/image-20260805162254356.png)

![image-20260805162337585](/assets/mysql-basic/image-20260805162337585.png)

![image-20260805162353819](/assets/mysql-basic/image-20260805162353819.png)

主键自动增长，id会自己增长

![image-20260805162554296](/assets/mysql-basic/image-20260805162554296.png)

name不能为空且唯一

![image-20260805162806953](/assets/mysql-basic/image-20260805162806953.png)

可以在这里进行添加

#### 34.基础-约束-外键约束

![image-20260805162948207](/assets/mysql-basic/image-20260805162948207.png)

![image-20260805163120452](/assets/mysql-basic/image-20260805163120452.png)

![image-20260805163218314](/assets/mysql-basic/image-20260805163218314.png)

![image-20260805163310445](/assets/mysql-basic/image-20260805163310445.png)

![image-20260805163400679](/assets/mysql-basic/image-20260805163400679.png)

#### 35.基础-约束-外键删除更新行为

![image-20260805163805233](/assets/mysql-basic/image-20260805163805233.png)

![image-20260805163834651](/assets/mysql-basic/image-20260805163834651.png)

![image-20260805164017932](/assets/mysql-basic/image-20260805164017932.png)

![image-20260805164036245](/assets/mysql-basic/image-20260805164036245.png)

如果通过图形表，则右键，选modify

![image-20260805164140424](/assets/mysql-basic/image-20260805164140424.png)

![image-20260805164247919](/assets/mysql-basic/image-20260805164247919.png)

双击

![image-20260805164319309](/assets/mysql-basic/image-20260805164319309.png)

![image-20260805164333557](/assets/mysql-basic/image-20260805164333557.png)

#### 36.基础-约束-小结

![image-20260805164528531](/assets/mysql-basic/image-20260805164528531.png)

### 37.基础-多表查询-多表关系介绍

![image-20260805171748050](/assets/mysql-basic/image-20260805171748050.png)

![image-20260805171810375](/assets/mysql-basic/image-20260805171810375.png)

![image-20260805171851252](/assets/mysql-basic/image-20260805171851252.png)

![image-20260805171943718](/assets/mysql-basic/image-20260805171943718.png)

![image-20260805183802664](/assets/mysql-basic/image-20260805183802664.png)

![image-20260805183811291](/assets/mysql-basic/image-20260805183811291.png)

![image-20260805183828054](/assets/mysql-basic/image-20260805183828054.png)

![image-20260805183925989](/assets/mysql-basic/image-20260805183925989.png)

#### 38.基础-多表查询-概述

![image-20260805184324533](/assets/mysql-basic/image-20260805184324533.png)

![image-20260805184417511](/assets/mysql-basic/image-20260805184417511.png)

![image-20260805184523114](/assets/mysql-basic/image-20260805184523114.png)

#### 39.基础-多表查询-内连接

![image-20260805184647465](/assets/mysql-basic/image-20260805184647465.png)

![image-20260805184840191](/assets/mysql-basic/image-20260805184840191.png)

用别名

![image-20260805184948483](/assets/mysql-basic/image-20260805184948483.png)

![image-20260805185106301](/assets/mysql-basic/image-20260805185106301.png)

#### 40.基础-多表查询-外连接

![image-20260805192904395](/assets/mysql-basic/image-20260805192904395.png)

![image-20260805193523014](/assets/mysql-basic/image-20260805193523014.png)

![image-20260805193822734](/assets/mysql-basic/image-20260805193822734.png)

#### 41.基础-多表查询-自连接

![image-20260805194017252](/assets/mysql-basic/image-20260805194017252.png)

![image-20260805194348597](/assets/mysql-basic/image-20260805194348597.png)

![image-20260805194504413](/assets/mysql-basic/image-20260805194504413.png)

![image-20260805194616282](/assets/mysql-basic/image-20260805194616282.png)

#### 42.基础-多表查询-联合查询union

![image-20260805195350359](/assets/mysql-basic/image-20260805195350359.png)

![image-20260805195520372](/assets/mysql-basic/image-20260805195520372.png)

![image-20260805195534042](/assets/mysql-basic/image-20260805195534042.png)

用union all会有重复

![image-20260805195714167](/assets/mysql-basic/image-20260805195714167.png)

用union，则能够去除重复

![image-20260805200303768](/assets/mysql-basic/image-20260805200303768.png)

![image-20260805195913718](/assets/mysql-basic/image-20260805195913718.png)

#### 43.基础-多表查询-子查询介绍

![image-20260805200436623](/assets/mysql-basic/image-20260805200436623.png)

#### 44.基础-多表查询-标量子查询

![image-20260805200520213](/assets/mysql-basic/image-20260805200520213.png)

![image-20260805200648267](/assets/mysql-basic/image-20260805200648267.png)

![image-20260805200720391](/assets/mysql-basic/image-20260805200720391.png)

![image-20260805201215669](/assets/mysql-basic/image-20260805201215669.png)

![image-20260805201248733](/assets/mysql-basic/image-20260805201248733.png)

#### 45.基础-多表查询-列子查询

![image-20260805201407570](/assets/mysql-basic/image-20260805201407570.png)

![image-20260805201656719](/assets/mysql-basic/image-20260805201656719.png)

![image-20260805201742337](/assets/mysql-basic/image-20260805201742337.png)

![image-20260805201927381](/assets/mysql-basic/image-20260805201927381.png)

![image-20260805201939073](/assets/mysql-basic/image-20260805201939073.png)

![image-20260805202043930](/assets/mysql-basic/image-20260805202043930.png)

![image-20260805202327303](/assets/mysql-basic/image-20260805202327303.png)

#### 46.基础-多表查询-行子查询

![image-20260805202523072](/assets/mysql-basic/image-20260805202523072.png)

![image-20260805202659570](/assets/mysql-basic/image-20260805202659570.png)

![image-20260805202720027](/assets/mysql-basic/image-20260805202720027.png)

![image-20260805202745622](/assets/mysql-basic/image-20260805202745622.png)

#### 47.基础-多表查询-表子查询

![image-20260806162515154](/assets/mysql-basic/image-20260806162515154.png)

![image-20260806162656982](/assets/mysql-basic/image-20260806162656982.png)

#### 48.基础-多表查询-练习1

![image-20260806162736881](/assets/mysql-basic/image-20260806162736881.png)

创建表

![image-20260806162823429](/assets/mysql-basic/image-20260806162823429.png)

![image-20260806162931856](/assets/mysql-basic/image-20260806162931856.png)

![image-20260806163000423](/assets/mysql-basic/image-20260806163000423.png)

![image-20260806163151026](/assets/mysql-basic/image-20260806163151026.png)

![image-20260806163307762](/assets/mysql-basic/image-20260806163307762.png)

![image-20260806163336508](/assets/mysql-basic/image-20260806163336508.png)

![image-20260806163628384](/assets/mysql-basic/image-20260806163628384.png)

如果

![image-20260806163720606](/assets/mysql-basic/image-20260806163720606.png)

则不能使用内连接，要用外连接，一般用左外连接

![image-20260806164009178](/assets/mysql-basic/image-20260806164009178.png)

![image-20260806164217777](/assets/mysql-basic/image-20260806164217777.png)

![image-20260806165020448](/assets/mysql-basic/image-20260806165020448.png)

##### 49.基础-多表查询-练习2

![image-20260806171333643](/assets/mysql-basic/image-20260806171333643.png)

可以通过

![image-20260806171409941](/assets/mysql-basic/image-20260806171409941.png)

来格式化，让sql语句变得更直观

![image-20260806171441101](/assets/mysql-basic/image-20260806171441101.png)

![image-20260806171547900](/assets/mysql-basic/image-20260806171547900.png)

![image-20260806171631414](/assets/mysql-basic/image-20260806171631414.png)

如果用的是子查询，则

![image-20260806171659007](/assets/mysql-basic/image-20260806171659007.png)

![image-20260806171747229](/assets/mysql-basic/image-20260806171747229.png)

![image-20260806172135900](/assets/mysql-basic/image-20260806172135900.png)

![image-20260806172317303](/assets/mysql-basic/image-20260806172317303.png)

![image-20260806172450249](/assets/mysql-basic/image-20260806172450249.png)

#### 50.基础-多表查询-小结

![image-20260806172618895](/assets/mysql-basic/image-20260806172618895.png)

### 51.基础-事务-简介

![image-20260807141558137](/assets/mysql-basic/image-20260807141558137.png)

![image-20260808230959871](/assets/mysql-basic/image-20260808230959871.png)

![image-20260810144617290](/assets/mysql-basic/image-20260810144617290.png)

![image-20260810144638890](/assets/mysql-basic/image-20260810144638890.png)

#### 52.基础-事务-操作演示

![image-20260810144724322](/assets/mysql-basic/image-20260810144724322.png)

![image-20260810145204706](/assets/mysql-basic/image-20260810145204706.png)

![image-20260810145216426](/assets/mysql-basic/image-20260810145216426.png)

![image-20260810145229185](/assets/mysql-basic/image-20260810145229185.png)

![image-20260810145316831](/assets/mysql-basic/image-20260810145316831.png)

![image-20260810145417955](/assets/mysql-basic/image-20260810145417955.png)

![image-20260810152439588](/assets/mysql-basic/image-20260810152439588.png)

#### 53.基础-事务-四大特性ACID

![image-20260810152800132](/assets/mysql-basic/image-20260810152800132.png)

#### 54.基础-事务-并发事务问题

![image-20260810153103684](/assets/mysql-basic/image-20260810153103684.png)

#### 55.基础-事务-并发事务演示及隔离级别

![image-20260810153900327](/assets/mysql-basic/image-20260810153900327.png)

#### 56.基础-事务-小结

![image-20260810155117217](/assets/mysql-basic/image-20260810155117217.png)

### 57.基础篇总结

![image-20260810155328490](/assets/mysql-basic/image-20260810155328490.png)