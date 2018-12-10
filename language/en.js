module.exports = {
  list: {
    title: 'Configurations',
    add: 'Add',
    edit: 'Edit',
    del: 'Del',
  },
  keyview: {
    title: 'Results',
    rename: {
      prompt: 'Rename Key',
      success: 'Rename Key success',
      error: 'Rename Key fail',
    },
    del: {
      title: 'Delete Key',
      confirm: (name)=> antSword.noxss(`Are you sure to delete ${name}?`),
      success: 'Delete Key success',
      error: 'Delete Key fail',
    },
    setttl: {
      title: 'Set TTL',
      success: 'Set TTL success',
      error: 'Set TTL fail',
    }
  },
  detail: {
    title: 'Detail',
    save: {
      error: `Save fail`,
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
}