# AntSword Redis

> AntSword Redis 管理插件, 需要 AntSword >= 2.0.2.1, 如果提示版本低于所需版本, 可切换分支到 `v2.0.x` 并拉取最新的开发版本代码.

通过 WebShell 对内网中的 Redis 进行管理。

## TODO List

该插件目前处于开发中

- [x] Redis 配置管理
- [x] 查看 DB
- [x] 列出 DB 下的 Key
- [ ] Key 管理
  - [x] 重命名
  - [x] 设置 TTL
  - [x] 删除 Key
  - [x] 重载键值
  - [ ] 添加 Key
    - [ ] String
    - [ ] List
    - [ ] Set
    - [ ] ZSet
    - [ ] Hash
- [x] String
  - [x] 查看
  - [x] 修改键值
- [ ] List
  - [x] 查看
  - [x] 修改集合元素
  - [ ] 新增元素
- [ ] Set
  - [x] 查看集合元素
  - [x] 修改集合元素
  - [ ] 新增元素
- [ ] ZSet
  - [x] 查看集合元素
  - [x] 修改集合元素
    - [x] Value
    - [ ] Score
  - [ ] 新增元素
- [ ] Hash
  - [x] 查看集合元素
  - [x] 修改集合元素
    - [x] Key
    - [ ] Value
  - [ ] 新增元素

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

## 相关链接

* [AntSword 文档](http://doc.uyu.us)
* [dhtmlx 文档](http://docs.dhtmlx.com/)
