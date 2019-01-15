module.exports = {
  list: {
    title: 'Configurations',
    add: 'Add',
    edit: 'Edit',
    del: 'Del',
    bmenu: {
      conn: {
        reload: 'Refresh',
      },
      database: {
        addkey: 'New Key',
        reload: 'Refresh',
        terminal: 'Terminal',
      }
    }
  },
  insertitem: {
    title: 'Insert Item',
    toolbar: {
      add: 'Add',
      clear: 'Clear',
    },
  },
  delitem: {
    title: 'Delete Item',
    confirm: `Are you sure you want to delete this item?`,
    error: {
      novalue: 'The element to be deleted is not obtained.',
    },
    success: 'Delete item success',
    error: 'Delete item failed',
  },
  edititem: {
    zset:{
      title: 'Edit Score',
    },
    hash:{
      title: 'Edit Hash Value',
    },
    success: 'Edit success',
    error: 'Edit failure',
  },
  addkey: {
    title: 'New Key',
    toolbar: {
      add: 'Add',
      clear: 'Clear',
    },
    form: {
      keytype: 'Type',
      name: 'Name',
      value: 'Value',
      score: 'Score',
      hashkey: 'Key',
      hashvalue: 'Value',
    },
    info: {
      covernx: 'Overwrite if values exist',
      onemember: 'Add only one element',
      score: 'Integer or Double Float',
      zsetsuccess: (field)=>antSword.noxss(`Operation completed, ${field} already exists, only the score has been modified`),
      hashsuccess: (field)=> antSword.noxss(`Operation completed,${field} already exists, only the value has been modified`),
      warning: 'Please fill in the whole!',
      success: 'Add success!',
      error: 'Add failure!',
    }
  },
  keyview: {
    title: 'Results',
    rename: {
      prompt: 'Rename Key',
      success: 'Rename Key success',
      error: 'Rename Key failed',
    },
    del: {
      title: 'Delete Key',
      confirm: (name)=> antSword.noxss(`Are you sure to delete ${name}?`),
      success: 'Delete Key success',
      error: 'Delete Key failed',
    },
    setttl: {
      title: 'Set TTL',
      success: 'Set TTL success',
      error: 'Set TTL failed',
    },
    contextmenu: {
      add: "Add Row",
      del: "Delete Row",
      edit_score: "Edit Score",
      edit_hashvalue: "Edit HashValue",
    }
  },
  detail: {
    title: 'Detail',
    save: {
      error: `Save failure`,
      success: `Save success`,
    },
  },
  error: {
    minvererr: (minVer, curVer)=> antSword.noxss(`The plugin is currently only available for development editions.Your version(${curVer}) is lower than the required version ${minVer}, switch to v2.0.x branch and pull the latest development code.`),
    auth: (err) => antSword.noxss(`Authentication failed, error msg:${err}`),
    database: (err) => antSword.noxss(`Getting the database list failed.\n${err}`),
    nodatabase: (err) => antSword.noxss(`The database does not exist,${err}`),
    delconf: (err)=> antSword.noxss(`Delete configuration failed,error msg: ${err}`),
    getkeys: (err) => antSword.noxss(`Getting Key failed,error msg: ${err}`),
    notimpl: (typevalue) => antSword.noxss(`Type ${typevalue} not support.`),
    parseerr: `Parse response error, please try again.`,
    notimplselect: 'Does not support the SELECT DB in the terminal',
  },
  add: {
    form: {
      title: 'Add configuration',
      host: 'Address',
      passwd: 'Password',
      warning: 'Please fill in the whole!',
      success: 'Successfully add configuration!',
    },
    toolbar: {
      add: 'Add',
      clear: 'Clear',
    }
  },
  edit: {
    form: {
      title: 'Edit configuration',
      host: 'Address',
      passwd: 'Password',
      warning: 'Please fill in the whole!',
      success: 'Successfully edit configuration!',
    },
    toolbar: {
      edit: 'Edit',
      clear: 'Clear',
    }
  },
  del: {
    form: {
      title: 'Delete configuration',
      confirm: 'Are you sure you want to delete this configuration?',
    },
  },
  terminal: {
    title: 'Redis Terminal',
    banner: `Usage:\n\n 1)Press the [Tab] key twice to automatically complete the command;\n 2)Temporarily does not support switching db under the terminal;\n 3)After executing the command, the data may not be returned normally, and try several times;`,
  },
}