# AntSword Redis

> AntSword Redis 管理插件, 需要 AntSword >= 2.0.2.1, 如果提示版本低于所需版本, 可切换分支到 `v2.0.x` 并拉取最新的开发版本代码.
>
> PS: 时间仓促, 代码太丑 :D

通过 WebShell 对内网中的 Redis 进行管理。

## TODO List

该插件目前处于开发中

- [x] Redis 配置管理
- [x] 查看 DB
- [x] 列出 DB 下的 Key
- [x] Key 管理
  - [x] 重命名
  - [x] 设置 TTL
  - [x] 删除 Key
  - [x] 重载键值
  - [x] 添加 Key
    - [x] String
    - [x] List
    - [x] Set
    - [x] ZSet
    - [x] Hash
- [x] String
  - [x] 查看
  - [x] 修改键值
- [x] List
  - [x] 查看
  - [x] 修改集合元素
  - [x] 新增元素
- [x] Set
  - [x] 查看集合元素
  - [x] 修改集合元素
  - [x] 新增元素
- [x] ZSet
  - [x] 查看集合元素
  - [x] 修改集合元素
    - [x] Value
    - [x] Score
  - [x] 新增元素
- [x] Hash
  - [x] 查看集合元素
  - [x] 修改集合元素
    - [x] Key
    - [x] Value
  - [x] 新增元素

## 安装

### 商店安装 (暂不支持)

进入 AntSword 插件中心，选择 Redis，点击安装

### 手动安装

1. 获取源代码

	```
	git clone https://github.com/Medicean/AS_Redis.git
	```
	
	或者
	
	点击 [这里](https://github.com/Medicean/AS_Redis/archive/master.zip) 下载源代码，并解压。

2. 拷贝源代码至插件目录

    将插件目录拷贝至 `antSword/antData/plugins/` 目录下即安装成功

## 已知问题

* list, set, zset, hash 元素列表，点击太快会导致 popmenu 无法弹出, 重载键值即可解决
* 点击太快会导致 `redis-parser` 解析出错
* 最多获取每个DB下 10000 个 Key, 因为再多的话，tree 会特别慢

如果想进行筛选，可先行手动修改`index.js` 中 `getRedisKeys` 方法的命令:

```
    cmd += that.redisutil.makeCommand('SCAN', '0', 'MATCH', '*', 'COUNT', '10000');
```
例如只想查看 `a` 开头的 Key, 只需要修改 `*` 为 `a*`, 然后重启 AntSword 即可 

* 目前未针对获取 Set, List, Hash, Zset 类型的 Key 中的元素进行分页, 默认获取 0 - 1000 的元素

## 相关链接

* [AntSword 文档](http://doc.uyu.us)
* [dhtmlx 文档](http://docs.dhtmlx.com/)
