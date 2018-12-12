module.exports = {
  list: {
    title: '配置列表',
    add: '添加',
    edit: '编辑',
    del: '删除',
    bmenu: {
      conn: {
        reload: '刷新',
      },
      database: {
        addkey: '新增Key',
        reload: '刷新',
      }
    }
  },
  addkey: {
    title: '新增Key',
    toolbar: {
      add: '添加',
      clear: '重置',
    },
    form: {
      keytype: '类型',
      name: '键名',
      value: '键值',
      score: '权重',
      hashkey: 'Key',
      hashvalue: 'Value',
    },
    info: {
      covernx: '如果旧值存在将会覆盖',
      onemember: '只添加一个元素',
      score: '整数或双精度浮点数',
      zsetsuccess: (field)=>antSword.noxss(`操作完成, ${field} 已存在,仅修改了 score`),
      hashsuccess: (field)=> antSword.noxss(`操作完成,${field} 已存在,仅修改了 value`),
      warning: '请填写完整！',
      success: '添加成功!',
      error: '添加失败!',
    }
  },
  keyview: {
    title: '结果信息',
    rename: {
      prompt: '重命名 Key',
      success: '重命名Key成功',
      error: '重命名Key失败',
    },
    del: {
      title: '删除 Key',
      confirm: (name)=> antSword.noxss(`确定要删除 ${name} 吗?`),
      success: '删除 Key 成功',
      error: '删除 Key 失败',
    },
    setttl: {
      title: '设置 TTL',
      success: '设置 TTL 成功',
      error: '设置 TTL 失败',
    }
  },
  detail: {
    title: '详细信息',
    save: {
      error: `保存失败`,
      success: `保存成功`,
    },
  },
  error: {
    minvererr: (minVer, curVer)=> antSword.noxss(`该插件目前仅适用于开发版.当前版本${curVer}低于所需版本${minVer}, 请切换分支到 v2.0.x 并获取最新开发版代码.`),
    auth: (err) => antSword.noxss(`认证失败, 原因:${err}`),
    database: (err) => antSword.noxss(`获取数据库列表失败！\n${err}`),
    nodatabase: (err) => antSword.noxss(`该数据库不存在,${err}`),
    delconf: (err)=> antSword.noxss(`删除配置失败,原因: ${err}`),
    getkeys: (err) => antSword.noxss(`获取 Key 失败,原因: ${err}`),
    notimpl: (typevalue) => antSword.noxss(`暂不支持${typevalue}类型的Key`),
    parseerr: `解析数据失败,请重试`,
  },
  add: {
    form: {
      title: '添加配置',
      host: '连接地址',
      passwd: '连接密码',
      warning: '请填写完整！',
      success: '成功添加配置！',
    },
    toolbar: {
      add: '添加',
      clear: '重置',
    }
  },
  edit: {
    form: {
      title: '编辑配置',
      host: '连接地址',
      passwd: '连接密码',
      warning: '请填写完整！',
      success: '成功编辑配置！',
    },
    toolbar: {
      edit: '编辑',
      clear: '重置',
    }
  },
  del: {
    form: {
      title: '删除配置',
      confirm: '确定要删除该配置吗?',
    },
  },
}