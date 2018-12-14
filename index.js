'use strict';

const LANG = require('./language/');
const LANG_T = antSword['language']['toastr'];
// const Database = require('./libs/database');
const RedisUtil = require('./libs/redisutil');
const Core = require('./libs/core');

class Plugin {
  constructor(opt) {
    antSword['test'] = this;
    let minVer = "2.0.2.1"
    let curVer = antSword.package.version || "0.0.0";
    if(this.CompVersion(minVer, curVer) == false) {
      toastr.error(LANG['error']['minvererr'](minVer, curVer), LANG_T['error']);
      return
    }
    this.dbname = 'redis';
    opt['plugins'] = opt['plugins'] || {};
    this.opt = opt;
    this.core = new antSword['core'][opt['type']](opt);
    // 本插件的所有配置信息
    this.pluginconf = this.opt['plugins'][this.dbname] || {};
    this.KeyBinaryData;
    this.hash = (+new Date * Math.random()).toString(16).substr(2, 8);
    // 初始化UI
    const tabbar = antSword['tabbar'];
    tabbar.addTab(
      `tab_redis_${this.hash}`,
      `<i class="fa fa-server"></i> ${opt['ip']}`,
      null, null, true, true
    );
    this.cell = tabbar.cells(`tab_redis_${this.hash}`);
    this.cell.progressOn();
    this.win = new dhtmlXWindows();
    this.win.attachViewportTo(this.cell.cell);

    // layout
    this.layout_main = this.cell.attachLayout('2U');
    this.layout_right = this.layout_main.cells('b').attachLayout('2E');
    // 左边
    this.list = this.initList(this.layout_main.cells('a'));
    this.keyview = this.initKeyView(this.layout_right.cells('a'));
    this.detail = this.initDetail(this.layout_right.cells('b'));
    
    this.disableResultToolbar();

    // 1. 初始化
    this.tree = this.list.layout.attachTree();
    // 2. 加载 tree
    this.parse();
    //
    this.plugincore = new Core();
    this.redisutil = new RedisUtil();

    // 3. tree单击::设置当前配置&&激活按钮
    this.tree.attachEvent('onClick', (id) => {
      // 更改按钮状态
      id.startsWith('conn::') ? this.enableToolbar() : this.disableToolbar();
      // 设置当前配置
      const tmp = id.split('::');
      const arr = tmp[1].split(':');
      this.dbconf = this.pluginconf[arr[0]];
      // 设置当前数据库
      if (arr.length > 1 ){
        this.dbconf['database'] = new Buffer(arr[1], 'base64').toString();
      }
      if (arr.length > 2) {
        this.enableResultToolbar();
      }else{
        this.disableResultToolbar();
      }
      switch(tmp[0]){
        case 'rediskeys':
          // 暂时不考虑命名空间解析问题
          // let _keys = arr;
          // this.getKeysValue(
          //   _keys[0],
          //   new Buffer(_keys[1], 'base64').toString(),
          //   new Buffer(_keys[2], 'base64').toString()
          // );
        break;
      }
    });
    // 4. tree 双击
    this.tree.attachEvent('onDblClick', (id) => {
      const arr = id.split("::");
      if (arr.length < 2) { throw new Error('ID ERR: ' + id)};
      switch(arr[0]) {
        case 'conn':
          this.getDatabases(arr[1]);
          break;
        case 'database':
          let _db = arr[1].split(':');
          this.getRedisKeys(_db[0], new Buffer(_db[1], 'base64').toString());
          break;
        case 'rediskeys':
          // 暂时不考虑命名空间解析问题
          let _keys = arr[1].split(':');
          this.getKeysValue(
            _keys[0],
            new Buffer(_keys[1], 'base64').toString(),
            new Buffer(_keys[2], 'base64').toString()
          );
          break;
      }
    });
    
    // 5. tree 右键::功能菜单
    this.tree.attachEvent('onRightClick', (id, event) => {
      this.tree.selectItem(id);
      const arr = id.split('::');
      if (arr.length < 2) { throw new Error('ID ERR: ' + id) };
      switch(arr[0]) {
        case 'conn':
          this.tree.callEvent('onClick', [id]);
          bmenu([
            {
              text: LANG['list']['bmenu']['conn']['reload'],
              icon: 'fa fa-refresh',
              action: ()=>{
                this.getDatabases( arr[1].split(":")[0]);
              }
            }
          ], event);
          break;
        case 'database':
          this.tree.callEvent('onClick', [id]);
          bmenu([
            {
              text: LANG['list']['bmenu']['database']['addkey'],
              icon: 'fa fa-plus-circle',
              action: this.addKey.bind(this)
            },
            {
              divider: true
            }, {
              text: LANG['list']['bmenu']['database']['reload'],
              icon: 'fa fa-refresh',
              action: ()=>{
                this.getRedisKeys(arr[1].split(":")[0], new Buffer(arr[1].split(":")[1],'base64').toString());
              }
            }
          ], event);
          break;
        case 'rediskeys':
          // this.tree.callEvent('onClick', [id]);
          break;
      }
    });
    this.cell.progressOff();
  }

  /**
   * AntSword 版本检查
   * @param {String} minVer 最低版本 >=
   * @param {String} curVer 当前版本
   * @return {Boolean}
   */
   CompVersion(minVer, curVer) {
    // 如果版本相同
    if (curVer === minVer) { return true }
    let currVerArr = curVer.split(".");
    let minVerArr = minVer.split(".");
    let len = Math.max(currVerArr.length, minVerArr.length);
    for (let i = 0; i < len; i++) {
        let minVal = ~~minVerArr[i],
            curVal = ~~currVerArr[i];
        if (minVal < curVal) {
            return true;
        } else if (minVal > curVal) {
            return false;
        }
    }
    return false;
  }

  initList(layout) {
    layout.setText(`<i class="fa fa-server"></i> ${LANG['list']['title']}`);
    layout.setWidth('250');

    // tree图标
    const imgs = [
      // connect
      'data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgc3R5bGU9IndpZHRoOiAxZW07IGhlaWdodDogMWVtO3ZlcnRpY2FsLWFsaWduOiBtaWRkbGU7ZmlsbDogY3VycmVudENvbG9yO292ZXJmbG93OiBoaWRkZW47IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcC1pZD0iMTE2MCI+PHBhdGggZD0iTTU3OC41ODcgNzU4LjM1NmMtNTQuMTggMjguMjM2LTg0LjAyMCAyNy44OS0xMjYuODM2IDcuNDYtNDIuNTgyLTIwLjQzMS0zOTguNDEtMTY5LjA3NS0zOTguNDEtMTY5LjA3NXYwIDEwNy43OGMwIDkuMyAxMi45NzIgMTkuMDU0IDM3LjA3NiAzMC42NDQgNDguNjY4IDIzLjMwNiAzMTguNzUyIDEzMi4yMjcgMzYxLjIxOSAxNTIuNzc1IDQyLjU4NiAyMC40MzEgNzIuNjU3IDIwLjU0NyAxMjYuODM2LTcuNDYgNTQuMTc1LTI4LjIzNiAzMDcuNzI4LTEzMi4zNDUgMzU2Ljc0Mi0xNTguMDU3djBjMjQuOTA4LTEyLjk2NiAzNS45MjUtMjMuMTg2IDM1LjkyNS0zMi4yNTR2LTEwNi40MDFoLTAuMTE1Yy0wLjExNS0wLjExNC0zMzguNDk1IDE0Ni4yMzQtMzkyLjQzOCAxNzQuNTg3djB6TTU3OC41ODcgNzU4LjM1NnpNNTc4LjU4NyA2MDYuOTU0Yy01NC4xOCAyOC4yMzYtODQuMDIwIDI3Ljg5LTEyNi44MzYgNy40Ni00Mi41ODItMjAuNTQ3LTM5OC40MS0xNjkuMzAzLTM5OC40MS0xNjkuMzAzdjAgMTA3Ljc4N2MwIDkuMjkyIDEyLjk3MiAxOS4wNTQgMzcuMDc2IDMwLjY0NCA0OC42NjggMjMuNDE0IDMxOC43NTIgMTMyLjM0NSAzNjEuMjE5IDE1Mi44ODkgNDIuNTg2IDIwLjQzMSA3Mi42NTcgMjAuNTQ3IDEyNi44MzYtNy40NiA1NC4xNzUtMjguMjM2IDMwNy43MjgtMTMyLjM0NSAzNTYuNzQyLTE1OC4wNTcgMjQuOTA4LTEyLjk3IDM1LjkyNS0yMy4xODQgMzUuOTI1LTMyLjI1M3YtMTA2LjQwNWgtMC4xMTVjLTAuMTE1LTAuMDAxLTMzOC40OTUgMTQ2LjM0OC0zOTIuNDM4IDE3NC42OTh2MHpNNTc4LjU4NyA2MDYuOTU0ek05NzEuMjUxIDI5MC4zODhjMC40Ni05LjMtMTEuOTM2LTE3LjU2NS0zNi4zODYtMjYuNTE5LTQ3Ljc0OS0xNy41NTktMjk5LjkyMy0xMTcuODg0LTM0OC4yNDYtMTM1LjU1Ni00OC40MzktMTcuNjgtNjguMDY2LTE2Ljg3NS0xMjQuNzY5IDMuMzI4LTU2LjcwMyAyMC4yMDMtMzI1LjI5NyAxMjUuNjg5LTM3My4wNDcgMTQ0LjM5Ni0yNC4xMDMgOS40MTQtMzUuODEgMTguMjU1LTM1LjEyMSAyNy42NjN2LTAuMTE0IDEwNi4wNjBjMCAwIDM1NS41OTggMTQ5Ljc5MiAzOTguNDEgMTcwLjIyMyA0Mi41ODEgMjAuNDMxIDcyLjY1NyAyMC41NDcgMTI2LjgzNi03LjQ2IDU0LjA2MC0yOC40NjcgMzkyLjY2OC0xNzcuMjIzIDM5Mi42NjgtMTc3LjIyM2wtMC4zNDMtMTA0Ljc5N3pNODUyLjQ1NyAyOTMuMjU0bC0xMzkuNDYzIDU0Ljk3OS0xMjUuNjgyLTQ5LjY5OCAxMzkuMjI5LTU1LjA5OSAxMjUuOTE3IDQ5LjgxOHpNNTk0Ljg4MyAzNDUuNDhsLTY0LjM5MyA5NC4yNC0xNDguMzA0LTYxLjUyNSAyMTIuNjk4LTMyLjcxNXpNNDgzLjE5NyAyMDIuMjMzbC0yMC41NDctMzcuOTk1IDY0LjE2OSAyNS4wMjUgNjAuMzc3LTE5Ljg1OC0xNi40MTUgMzkuMTM4IDYxLjYzNCAyMy4xODYtNzkuNTQyIDguMTUxLTE3LjkwOSA0My4wNDYtMjguNjktNDcuODctOTEuODI5LTguMTUgNjguNzU1LTI0LjY3NHpNMzI0LjgwMSAyNTUuNjA0YzYyLjc4NCAwIDExMy43NDYgMTkuNjI3IDExMy43NDYgNDQuMDc2IDAgMjQuMjItNTAuOTYxIDQ0LjA3Ni0xMTMuNzQ2IDQ0LjA3Ni02Mi43ODggMC0xMTMuNzQ5LTE5LjYyNi0xMTMuNzQ5LTQ0LjA3NiAwLjExNC0yNC4xMDMgNTAuOTYtNDQuMDc2IDExMy43NDktNDQuMDc2djB6TTMyNC44MDEgMjU1LjYwNHoiIHAtaWQ9IjExNjEiPjwvcGF0aD48L3N2Zz4=',
      // databass
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAPCAQAAAB+HTb/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAAAGQAAABkAA+Wxd0AAAEXSURBVBjTZck/S5RxAADg5+f75+5t8NTUSktEKCGCFp0U8dwcBMFBNwlu1a8Rrn4CJ0drdDF0bY1e4hAFQcEbTpT0ulfPc2irZ30C3lhWNabsrz/OHPrqLFiy6dKRXEMLmWHvzXlpm1xN6l+pmrzHiKbivyw0jQR36o4cqGtqo6TfpAXz3gUnNnwwpYIHxLiR+247lmnYkhjQL0PLFda0lWOpVUN+amjoIih75dqiUnBsVcWEVEcHkUjHrbrdWMWQfd+UPZOicKfkk3u9sUdzXvjl3I0WEs+99ttH3eDEosikAYmArnu3Ij98ibXN2JEjEuNBR2bdgiJyoaaqT0kikRn0VtWsaZ8Dxq2YNyr1iB6Fc4f2nD4BUO1Rv9s0w+gAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTUtMDctMjVUMjE6NTA6MjYrMDg6MDB8RcVXAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE0LTA1LTAxVDIwOjUwOjM1KzA4OjAwTl0AHAAAAE50RVh0c29mdHdhcmUASW1hZ2VNYWdpY2sgNi44LjgtMTAgUTE2IHg4Nl82NCAyMDE1LTA3LTE5IGh0dHA6Ly93d3cuaW1hZ2VtYWdpY2sub3JnBQycNQAAACV0RVh0c3ZnOmNvbW1lbnQAIEdlbmVyYXRlZCBieSBJY29Nb29uLmlvIDDLy0gAAAAYdEVYdFRodW1iOjpEb2N1bWVudDo6UGFnZXMAMaf/uy8AAAAYdEVYdFRodW1iOjpJbWFnZTo6SGVpZ2h0ADcxMRUA1lUAAAAXdEVYdFRodW1iOjpJbWFnZTo6V2lkdGgANjI03HRLcwAAABl0RVh0VGh1bWI6Ok1pbWV0eXBlAGltYWdlL3BuZz+yVk4AAAAXdEVYdFRodW1iOjpNVGltZQAxMzk4OTQ4NjM1LMlreQAAABN0RVh0VGh1bWI6OlNpemUAMjEuM0tCQnpsrG8AAABadEVYdFRodW1iOjpVUkkAZmlsZTovLy9ob21lL3d3d3Jvb3Qvd3d3LmVhc3lpY29uLm5ldC9jZG4taW1nLmVhc3lpY29uLmNuL3NyYy8xMTU3Ny8xMTU3NzMyLnBuZxOTOSYAAAAASUVORK5CYII=',
      // keys
      'data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iaWNvbiIgc3R5bGU9IndpZHRoOiAxZW07IGhlaWdodDogMWVtO3ZlcnRpY2FsLWFsaWduOiBtaWRkbGU7ZmlsbDogY3VycmVudENvbG9yO292ZXJmbG93OiBoaWRkZW47IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcC1pZD0iNTgxMCI+PHBhdGggZD0iTTUxNy44NjQwNTYgNDg3LjgzNDYyNGMtNTYuNzc0MDUxLTU0LjIxMzczOS01OC44NTAzMzktMTQ0LjE4NzkzNy00LjYzNjYtMjAwLjk2MDk2NCA1NC4yMTI3MTYtNTYuNzczMDI4IDE0NC4xODc5MzctNTguODQ5MzE2IDIwMC45NjA5NjQtNC42MzY2IDU2Ljc3NTA3NCA1NC4yMTM3MzkgNTguODUwMzM5IDE0NC4xODY5MTMgNC42MzY2IDIwMC45NjA5NjRDNjY0LjYxMzMyOCA1MzkuOTcyMDc1IDU3NC42MzkxMzEgNTQyLjA0ODM2MyA1MTcuODY0MDU2IDQ4Ny44MzQ2MjR6TTY4Ny4xOTQ2MjYgNDUyLjk5NDExOGMzNy41MzM4NDgtMzkuMzA4MjYxIDM2LjA5NTA4LTEwMS41OTY5MDktMy4yMTAxMTItMTM5LjEyODcxMS0zOS4zMDQxNjgtMzcuNTMxODAxLTEwMS41OTM4MzktMzYuMDk0MDU2LTEzOS4xMjc2ODcgMy4yMTExMzUtMzcuNTMyODI1IDM5LjMwNzIzOC0zNi4wOTMwMzMgMTAxLjU5MzgzOSAzLjIxMjE1OCAxMzkuMTI1NjQxQzU4Ny4zNzQxNzYgNDkzLjczNjAzMSA2NDkuNjYwNzc4IDQ5Mi4zMDIzNzkgNjg3LjE5NDYyNiA0NTIuOTk0MTE4ek00NzkuMTA0Mjg3IDY3MC45MTc0MDZsLTEwMS40OTU2MDIgMTA2LjI4OTc5MmMyNi4yMDY4NzIgMjUuMDI0OTUzIDI3LjE2Nzc1NiA2Ni41NDA0ODYgMi4xNDE3OCA5Mi43NDk0MDQtMjUuMDI4MDIzIDI2LjIwOTk0Mi02Ni41NDM1NTUgMjcuMTY1NzEtOTIuNzUwNDI3IDIuMTQwNzU3bC01OC4zNjExOTkgNTMuMDI3NzI3YzAgMC02OC43NTA4MjcgMTEuMTAwODI2LTEwMC4zNzkxNzUtMTkuMTAxMDMzLTMxLjYzMDM5NS0zMC4yMDU5NTItMzcuODY1Mzk5LTExMi43MjEyNzEtMzcuODY1Mzk5LTExMi43MjEyNzFsMjQ2LjM3NDI3LTI1OC4zMDI5NTFjLTYzLjE3MzgwOC0xMTcuNjA4NTgxLTQ3LjI0NzA3LTI2Ny4xNjI3MzYgNDkuOTM5Mzg5LTM2OC45Mzk3NDcgMzYuNTE3NzA1LTM4LjI0Mjk5OSA4MC4zNDY5MzMtNjUuMTU2OTc2IDEyNy4xNjUyMzgtODEuMDQwNzM0bDEuMDg0NzA1IDQ2LjI2OTgxM2MtMzUuNDQzMjMzIDE0LjA3OTY3LTY4LjU2NjYzMiAzNS41OTY3MjktOTYuNjE4NTI1IDY0Ljk3MzgwNC04MC4yNzEyMDggODQuMDY0NjA0LTk2LjA5OTcwOCAyMDUuODY1NjcxLTQ5LjQzMzg3NiAzMDUuMDgzMzkzbDIzLjA3NTU1NSAzOS4xNjM5NzVMMTQ2LjA5MDc3NCA3OTguMDE1MTA2YzAgMCAwLjU5MzUxOCA0OS43Nzg3MyAxNy4yNDI3MDkgNjUuNjc3ODM4IDE0Ljg4ODA4MiAxNC4yMTY3OTMgNjEuODMyMjU0IDkuODI4ODU2IDYxLjgzMjI1NCA5LjgyODg1Nmw2MC40MDc4MTItNjMuMjYwNzg5IDMxLjYzMTQxOCAzMC4yMDM5MDZjOC43NDEwODIgOC4zNDYwODUgMjIuNTcwMDQyIDguMDMwOTA3IDMwLjkxNzE1LTAuNzExMTk4IDguMzQ3MTA5LTguNzQyMTA1IDguMDI2ODE0LTIyLjU3MTA2NS0wLjcxMzI0NC0zMC45MTcxNWwtMzEuNjMyNDQxLTMwLjIwNzk5OSAxNTYuNDU2MzU1LTE2My44NDY2NzIgMzkuMDA5NDU2IDIyLjQ4MTAxNGMxMDEuMjU5MjE4IDQyLjAzOTQ2NSAyMjIuMjAxNzMxIDIwLjYxMDQxIDMwMi40NzQ5ODYtNjMuNDUzMTcxIDEwNC4yNTEzNjYtMTA5LjE3ODU4NSAxMDAuMjYwNDcxLTI4Mi4yMTE0NzctOC45MTcwOS0zODYuNDY0ODg5LTMzLjU5MTA0OS0zMi4wNzU1MzMtNzMuMjYwNTM3LTUzLjgyOTk5OS0xMTUuMDkzMjk1LTY1LjQ5MjYybC0xLjAzMDQ2OS00NS4xNTMzODZjNTMuMTk3NTk2IDEyLjQ3MTAzMyAxMDMuOTQ1Mzk3IDM4LjU0Nzk0NCAxNDYuMzIzNTc3IDc5LjAxNTYxMSAxMjYuNjQ1Mzk4IDEyMC45MzEyNTcgMTMxLjI3NzkwNiAzMjEuNjQ5Njk4IDEwLjM0NDYwMiA0NDguMjk2MTE5Qzc0OC4xNTgwOTMgNzA1Ljc4NzU4OCA1OTkuNTAwMzU1IDcyOC41OTgxMDYgNDc5LjEwNDI4NyA2NzAuOTE3NDA2eiIgcC1pZD0iNTgxMSI+PC9wYXRoPjwvc3ZnPg==',
      // column
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAPCAQAAABHeoekAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAKqNIzIAAAAJcEhZcwAAASwAAAEsAHOI6VIAAAB1SURBVBjTY2TYyrCbATcwY2CoYsAHElgYWBjYkAT+MzAwMCLxWRgZtjHsQRIQYGBmeIvEN2VhOMswD0nAiYGXYSOcx8jwk4XhO8MHJAWfGBhQ+F+Z0BzFiM5HV4ABhoiC/yj8f+h8FgYNBh8kAQMGLobfyHwAyM8UUNk8qsEAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTUtMDctMjVUMjE6NDk6MzYrMDg6MDCNdDHDAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE0LTEyLTE5VDE4OjU2OjEyKzA4OjAwOU9bHwAAAE50RVh0c29mdHdhcmUASW1hZ2VNYWdpY2sgNi44LjgtMTAgUTE2IHg4Nl82NCAyMDE1LTA3LTE5IGh0dHA6Ly93d3cuaW1hZ2VtYWdpY2sub3JnBQycNQAAAGN0RVh0c3ZnOmNvbW1lbnQAIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgcgt1lgAAABh0RVh0VGh1bWI6OkRvY3VtZW50OjpQYWdlcwAxp/+7LwAAABh0RVh0VGh1bWI6OkltYWdlOjpIZWlnaHQAMjY1W+dGYAAAABd0RVh0VGh1bWI6OkltYWdlOjpXaWR0aAAyNjZRH0eHAAAAGXRFWHRUaHVtYjo6TWltZXR5cGUAaW1hZ2UvcG5nP7JWTgAAABd0RVh0VGh1bWI6Ok1UaW1lADE0MTg5ODY1NzJGLGnJAAAAE3RFWHRUaHVtYjo6U2l6ZQAxLjEzS0JCW7QG7wAAAFp0RVh0VGh1bWI6OlVSSQBmaWxlOi8vL2hvbWUvd3d3cm9vdC93d3cuZWFzeWljb24ubmV0L2Nkbi1pbWcuZWFzeWljb24uY24vc3JjLzExODMwLzExODMwMjcucG5nOFxJnwAAAABJRU5ErkJggg=='
    ];

    // 左侧拦toolbar
    const toolbar = layout.attachToolbar();
    toolbar.loadStruct([
      { id: 'add', text: LANG['list']['add'], icon: 'plus-circle', type: 'button' },
      { type: 'separator' },
      { id: 'edit', text: LANG['list']['edit'], icon: 'edit', type: 'button', disabled: true },
      { type: 'separator' },
      { id: 'del', text: LANG['list']['del'], icon: 'trash-o', type: 'button', disabled: true }
    ]);
    toolbar.attachEvent('onClick', (id) => {
      switch(id) {
        case 'add':
          this.addConf();
          break;
        case 'del':
          this.delConf();
          break;
        case 'edit':
          this.editConf();
          break;
      }
    });
    
    return {
      imgs: imgs,
      layout: layout,
      toolbar: toolbar
    };
  }

  // Key 界面
  initKeyView(layout) {
    const that = this;

    layout.setText(`<i class="fa fa-code"></i> ${LANG['keyview']['title']}`);
    // layout.setHeight('100');
    
    const toolbar = layout.attachToolbar();
    toolbar.loadStruct([
      { id: 'data_type', type: 'text', text: "" },
      { id: 'data_key', type: 'buttonInput', enabled: false, disabled: true, text: "" },
      { id: 'data_size', type: 'text', text: "" },
      { id: 'data_ttl_label', type: 'text', text: "TTL:" },
      { id: 'data_ttl', type: 'text', text: "" },
      { type: 'separator' },
      { id: 'rename', type: 'button', icon: 'edit', text: 'Rename' },
      { type: 'separator' },
      { id: 'del', type: 'button', icon: 'remove', text: 'Delete' },
      { type: 'separator' },
      { id: 'setttl', type: 'button', icon:'cogs', text: 'SetTTL' },
      { type: 'separator' },
      { id: 'reload', type: 'button', icon:'refresh', text: '重载键值' },
    ]);

    const grid = layout.attachGrid();
    grid.clearAll();
    grid.setHeader("No.,Value,Score");
    grid.setInitWidths("100,600,*");
    grid.setColTypes("ro,ro,ro");
    grid.setColSorting('int');
    grid.setColAlign('left,left,left');
    // grid.setEditable(true);
    grid.enableAutoWidth(true,600,100);

    grid.attachEvent('onRowSelect', (id, lid, event) => {
      bmenu.hide();
      let b64val = grid.getRowAttribute(id, 'b64val');
      let value = new Buffer(b64val, 'base64').toString();
      that.detail.editor.session.setValue(value);
      that.detail.toolbar.setItemText('data_size', `Size: ${that.keySize(value.length)}`);
    });
    
    $('.objbox').on('contextmenu', (e) => {
      (e.target.nodeName === 'DIV' && grid.callEvent instanceof Function && antSword['tabbar'].getActiveTab().startsWith('tab_redis_')) ? grid.callEvent('onRightClick', [-1, -1, e]) : null;
    });

    $('.objbox').on('click', (e) => {
      bmenu.hide();
    });
    // TODO grid 右键菜单
    // 修改 score 和 hash value
    // 暂时可通过添加重复的 field 来完成
    grid.attachEvent('onRightClick', function(id, lid, event) {
      if(id != -1) {
        grid.selectRowById(id);
      }
      if(that.tree.getSelected().split("::")[0] != "rediskeys") {
        return
      }
      let selecttree = that.tree.getSelected().split("::")[1];
      const treeid = selecttree.split(":")[0];
      const conf = that.pluginconf[treeid];
      const db = new Buffer(selecttree.split(":")[1], 'base64').toString();
      const selkey = new Buffer(selecttree.split(":")[2], 'base64').toString();
      if (toolbar.getInput("data_key").value != selkey) {
        // 选择的 Key 和 界面显示的 Key 不一致
        return
      }
      const keytype = toolbar.getItemText("data_type").toLowerCase();
      if( keytype == "string" || keytype == "") {
        // String 不需要
        return
      }
      let menu = [
        { text: LANG['keyview']['contextmenu']['add'], icon: 'fa fa-plus-circle', action:()=>{
            that.insertKeyItem({
              id: treeid,
              conf: conf,
              db: db,
              rediskey: selkey,
              keytype: keytype,
            });
          }
        },
        { text: LANG['keyview']['contextmenu']['del'], icon: 'fa fa-trash', disabled: id <= 0, action:()=>{
            that.delKeyItem({
              id: treeid,
              conf: conf,
              db: db,
              rediskey: selkey,
              keytype: keytype,
              idx: parseInt(id-1), // 移除的序号(删除List时需要)
              ivalue_b64: grid.getRowAttribute(id, 'b64val'), // 元素的b64值
            });
          }
        },
        {divider: true},
        { text: LANG['keyview']['contextmenu']['edit_score'], icon: 'fa fa-edit', disabled: keytype != "zset", action:()=>{
            that.editZsetKeyScore({
              id: treeid,
              conf: conf,
              db: db,
              rediskey: selkey,
              ivalue_b64: grid.getRowAttribute(id, 'b64val'), // 元素的b64值
              ivalue2_b64: grid.getRowAttribute(id, 'b64val2'), // 元素2的b64值
            });
          }
        },
        { text: LANG['keyview']['contextmenu']['edit_hashvalue'], icon: 'fa fa-edit', disabled: keytype != "hash", action:()=>{
            that.editHashKeyValue({
              id: treeid,
              conf: conf,
              db: db,
              rediskey: selkey,
              ivalue_b64: grid.getRowAttribute(id, 'b64val'), // 元素的b64值
              ivalue2_b64: grid.getRowAttribute(id, 'b64val2'), // 元素2的b64值
            });
          }
        },
      ];
      bmenu(menu, event);
    });
    grid.init();
    // const listlayout = layout.attachLayout('2U');
    // let view_listlayout = listlayout.cells('a');
    // let ctrl_listlayout = listlayout.cells('b');
    // view_listlayout.hideHeader();
    // ctrl_listlayout.hideHeader();
    toolbar.attachEvent('onClick', (id)=>{
      const selecttree = that.tree.getSelected().split("::")[1];
      if(selecttree == "") {
        that.disableResultToolbar();
        that.disableEditor();
        return
      }
      // 获取配置
      const treeid = selecttree.split(":")[0];
      const conf = that.pluginconf[treeid];
      const db = new Buffer(selecttree.split(":")[1], 'base64').toString();
      const oldkey = new Buffer(selecttree.split(":")[2], 'base64').toString();
      that.plugincore.setHost(conf['host']);
      switch(id) {
        case 'rename':
          layer.prompt({
            value: oldkey,
            title: LANG['keyview']['rename']['prompt'],
          },(value, index, elem) => {
            layer.close(index);
            var needpass = false;
            var cmd = "";
            if (conf['passwd'].length > 0) {
              cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
              needpass = true;
            }
            cmd += that.redisutil.makeCommand('SELECT', db);
            cmd += that.redisutil.makeCommand('RENAME', oldkey, value);
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res)=>{
              let ret = res['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                var retval;
                if(needpass) {
                  if(errarr.length != 3 || valarr.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr[2].length > 0) {
                    toastr.error(errarr[2].toString(), LANG_T['error']);
                    return
                  }
                  retval = valarr[2];
                }else{
                  if(errarr.length != 2 || valarr.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr[1].length > 0) {
                    toastr.error(errarr[1].toString(), LANG_T['error']);
                    return
                  }
                  retval = valarr[1];
                }
                if(retval.toString() == "OK") {
                  toastr.success(LANG['keyview']['rename']['success'],LANG_T['success']);
                  that.getRedisKeys(treeid, db);
                  var _db = new Buffer(db).toString('base64');
                  var _newkey = new Buffer(value).toString('base64');
                  that.getKeysValue(treeid, db, value);
                  // DOM 树重新渲染需等待
                  setTimeout(() => {
                    that.tree.selectItem(`rediskeys::${treeid}:${_db}:${_newkey}`);
                  }, 100);
                }else{
                  toastr.error(LANG['keyview']['rename']['error'],LANG_T['error']);
                  return
                }
              });
            });
          });
          break;
        case 'del':
          layer.confirm(
            LANG['keyview']['del']['confirm'](oldkey),
            {
              icon: 2,
              shift: 6,
              title: `<i class="fa fa-trash"></i> ${LANG['keyview']['del']['title']}`,
            },
            (_) => {
              layer.close(_);
              var needpass = false;
              var cmd = "";
              if (conf['passwd'].length > 0) {
                cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
                needpass = true;
              }
              cmd += that.redisutil.makeCommand('SELECT', db);
              cmd += that.redisutil.makeCommand('DEL', oldkey);
              that.core.request({
                _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
              }).then((res)=>{
                let ret = res['text'];
                that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                  var retval;
                  if(needpass) {
                    if(errarr.length != 3 || valarr.length != 3){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[0].length > 0) {
                      toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[2];
                  }else{
                    if(errarr.length != 2 || valarr.length != 2){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[1].length > 0) {
                      toastr.error(errarr[1].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[1];
                  }
                  if(parseInt(retval.toString()) > 0) {
                    toastr.success(LANG['keyview']['del']['success'],LANG_T['success']);
                    that.getRedisKeys(treeid, db);
                    that.resetView();
                    that.disableResultToolbar();
                    that.disableEditor();
                  }else{
                    toastr.error(LANG['keyview']['del']['error'],LANG_T['error']);
                    return
                  }
                });
              });
            }
          );
          break;
        case 'setttl':
          let oldttl = toolbar.getItemText('data_ttl');
          layer.prompt({
            value: oldttl,
            title: LANG['keyview']['setttl']['title'],
          },(value, index, elem) => {
            layer.close(index);
            var needpass = false;
            var cmd = "";
            if (conf['passwd'].length > 0) {
              cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
              needpass = true;
            }
            cmd += that.redisutil.makeCommand('SELECT', db);
            cmd += that.redisutil.makeCommand('EXPIRE', oldkey, value);
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res)=>{
              let ret = res['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                var retval;
                if(needpass) {
                  if(errarr.length != 3 || valarr.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr[2].length > 0) {
                    toastr.error(errarr[2].toString(), LANG_T['error']);
                    return
                  }
                  retval = valarr[2];
                }else{
                  if(errarr.length != 2 || valarr.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr[1].length > 0) {
                    toastr.error(errarr[1].toString(), LANG_T['error']);
                    return
                  }
                  retval = valarr[1]
                }
                if(parseInt(retval.toString()) == 1) {
                  toastr.success(LANG['keyview']['setttl']['success'],LANG_T['success']);
                  toolbar.setItemText('data_ttl', value);
                }else{
                  toastr.error(LANG['keyview']['rename']['error'],LANG_T['error']);
                }
              });
            });
          });
          break;
        case 'reload':
          that.getKeysValue(treeid, db, oldkey);
          break;
      }
    });
    return {
      toolbar: toolbar,
      layout: layout,
      grid: grid,
    }
  }
  initDetail(layout) {
    let that = this;
    layout.setText(`<i class="fa fa-code"></i> ${LANG['detail']['title']}`);
    layout.setHeight('300');

    const toolbar = layout.attachToolbar();
    toolbar.loadStruct([
      { id: 'view_type_label', type: 'text', text: 'View as:' },
      { id: 'view_type', type: 'buttonSelect', mode: 'select', selected: "plaintext", width: 100,
        options: [
          { id: 'plaintext', type: 'button', icon: 'file-text-o', text: 'Plain Text'},
          { id: 'json', type: 'button', icon: 'file-code-o', text: 'JSON'},
          { id: 'hex', type: 'button', icon: 'file-excel-o', text: 'Hex'},
          // { id: 'hextable', type: 'button', icon: 'file-excel-o', text: 'Hex Table'},
        ]
      },
      { type: 'separator' },
      {id: 'save', type: 'button', icon: 'save', text: 'Save' },
      { type: 'separator' },
      { id: 'data_size', type: 'text', text: "Size:0b" },
    ]);
    let editor;
    editor = ace.edit(layout.cell.lastChild);
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/tomorrow');
    editor.session.setMode('ace/mode/text');
    editor.session.setUseWrapMode(true);
    editor.session.setWrapLimitRange(null,null);
    editor.setOptions({
      fontSize: '14px',
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: true
    });
    
    toolbar.attachEvent('onClick', (id)=>{
      switch(id) {
        case 'plaintext':
          editor.setReadOnly(false);
          editor.session.setMode('ace/mode/text');
          break;
        case 'json':
          editor.setReadOnly(false);
          editor.session.setMode('ace/mode/json');
          break;
        case 'hex':
          var keytype = that.keyview.toolbar.getItemText('data_type').toLowerCase();
          var bindata='';
          // string 类型的从全局取，list,set,zset,hash 从 grid 中获取
          switch (keytype){
            case 'string':
              bindata = new Buffer(that.KeyBinaryData);
              break;
            default:
              var gid= that.keyview.grid.getSelectedId();
              var b64val = that.keyview.grid.getRowAttribute(gid, 'b64val');
              bindata = new Buffer(b64val, 'base64');
              break;
          }
          editor.session.setValue(that.binstrHexable(bindata));
          editor.session.setMode('ace/mode/text');
          editor.setReadOnly(true);
          break;
        case 'hextable':
          editor.session.setMode('ace/mode/text');
          editor.setReadOnly(true);
          break;
        case 'save':
          const selecttree = that.tree.getSelected().split("::")[1];
          // 获取配置
          const treeid = selecttree.split(":")[0];
          const conf = that.pluginconf[treeid];
          const db = new Buffer(selecttree.split(":")[1], 'base64').toString();
          const oldkey = new Buffer(selecttree.split(":")[2], 'base64').toString();
          that.plugincore.setHost(conf['host']);
          var keytype = that.keyview.toolbar.getItemText('data_type').toLowerCase();
          var newvalue = editor.session.getValue();
          switch(keytype){
            case 'string':
              var needpass = false;
              var cmd = "";
              if (conf['passwd'].length > 0) {
                cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
                needpass = true;
              }
              cmd += that.redisutil.makeCommand('SELECT', db);
              cmd += that.redisutil.makeCommand('SET', oldkey, newvalue);
              that.core.request({
                _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
              }).then((res)=>{
                let ret = res['text'];
                that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                  var retval;
                  if(needpass){
                    if(errarr.length != 3 || valarr.length != 3){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[0].length > 0) {
                      toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[2];
                  }else{
                    if(errarr.length != 2 || valarr.length != 2){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[1].length > 0) {
                      toastr.error(errarr[1].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[1];
                  }
                  if(retval.toString() == "OK") {
                    toastr.success(LANG['detail']['save']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['detail']['save']['error'], LANG_T['error']);
                  }
                });
              });
              break;
            case 'list':
              var gid= that.keyview.grid.getSelectedId();
              var oldidx = parseInt(gid)-1;
              var needpass = false;
              var cmd = "";
              if (conf['passwd'].length > 0) {
                cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
                needpass = true;
              }
              cmd += that.redisutil.makeCommand('SELECT', db);
              cmd += that.redisutil.makeCommand('LSET', oldkey, `${oldidx}`, newvalue);
              that.core.request({
                _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
              }).then((res)=>{
                let ret = res['text'];
                that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                  var retval;
                  if(needpass){
                    if(errarr.length != 3 || valarr.length != 3){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[0].length > 0) {
                      toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[2];
                  }else{
                    if(errarr.length != 2 || valarr.length != 2){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[1].length > 0) {
                      toastr.error(errarr[1].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[1];
                  }
                  if(retval.toString() == "OK") {
                    toastr.success(LANG['detail']['save']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['detail']['save']['error'], LANG_T['error']);
                  }
                });
              });
              break;
            case 'set':
              var gid= that.keyview.grid.getSelectedId();
              var b64val = that.keyview.grid.getRowAttribute(gid, 'b64val');
              var needpass = false;
              var cmd = "";
              if (conf['passwd'].length > 0) {
                cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
                needpass = true;
              }
              cmd += that.redisutil.makeCommand('SELECT', db);
              cmd += that.redisutil.makeCommand('SREM', oldkey, new Buffer(b64val, 'base64').toString());
              cmd += that.redisutil.makeCommand('SADD', oldkey, newvalue);
              that.core.request({
                _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
              }).then((res)=>{
                let ret = res['text'];
                that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                  var retval;
                  if(needpass){
                    if(errarr.length != 4 || valarr.length != 4){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[0].length > 0) {
                      toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    if(errarr[3].length > 0) {
                      toastr.error(errarr[3].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[3];
                  }else{
                    if(errarr.length != 3 || valarr.length != 3){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[1].length > 0) {
                      toastr.error(errarr[1].toString(), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[2];
                  }
                  if(parseInt(retval.toString()) > 0) {
                    toastr.success(LANG['detail']['save']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['detail']['save']['error'], LANG_T['error']);
                  }
                });
              });
              break;
            case 'zset':
              var gid= that.keyview.grid.getSelectedId();
              var b64val = that.keyview.grid.getRowAttribute(gid, 'b64val'); // value
              var b64val2 = that.keyview.grid.getRowAttribute(gid, 'b64val2'); //score
              var needpass = false;
              var cmd = "";
              if (conf['passwd'].length > 0) {
                cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
                needpass = true;
              }
              cmd += that.redisutil.makeCommand('SELECT', db);
              cmd += that.redisutil.makeCommand('ZREM', oldkey, new Buffer(b64val, 'base64').toString());
              cmd += that.redisutil.makeCommand('ZADD', oldkey, new Buffer(b64val2, 'base64').toString(), newvalue);
              that.core.request({
                _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
              }).then((res)=>{
                let ret = res['text'];
                that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                  var retval;
                  if(needpass){
                    if(errarr.length != 4 || valarr.length != 4){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[0].length > 0) {
                      toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    if(errarr[3].length > 0) {
                      toastr.error(errarr[3].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[3];
                  }else{
                    if(errarr.length != 3 || valarr.length != 3){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[1].length > 0) {
                      toastr.error(errarr[1].toString(), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[2];
                  }
                  if(parseInt(retval.toString()) > 0) {
                    toastr.success(LANG['detail']['save']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['detail']['save']['error'], LANG_T['error']);
                  }
                });
              });
              break;
            case 'hash':
              var gid= that.keyview.grid.getSelectedId();
              var b64val = that.keyview.grid.getRowAttribute(gid, 'b64val'); // key
              var b64val2 = that.keyview.grid.getRowAttribute(gid, 'b64val2'); //value
              var needpass = false;
              var cmd = "";
              if (conf['passwd'].length > 0) {
                cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
                needpass = true;
              }
              cmd += that.redisutil.makeCommand('SELECT', db);
              cmd += that.redisutil.makeCommand('HDEL', oldkey, new Buffer(b64val, 'base64').toString());
              cmd += that.redisutil.makeCommand('HSET', oldkey, newvalue, new Buffer(b64val2, 'base64').toString());
              that.core.request({
                _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
              }).then((res)=>{
                let ret = res['text'];
                that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
                  var retval;
                  if(needpass){
                    if(errarr.length != 4 || valarr.length != 4){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[0].length > 0) {
                      toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    if(errarr[3].length > 0) {
                      toastr.error(errarr[3].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[3];
                  }else{
                    if(errarr.length != 3 || valarr.length != 3){
                      toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                      that.redisutil.parser = that.redisutil.initParser();
                      return
                    }
                    if(errarr[1].length > 0) {
                      toastr.error(errarr[1].toString(), LANG_T['error']);
                      return
                    }
                    if(errarr[2].length > 0) {
                      toastr.error(errarr[2].toString(), LANG_T['error']);
                      return
                    }
                    retval = valarr[2];
                  }
                  if(parseInt(retval.toString()) > 0) {
                    toastr.success(LANG['detail']['save']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['detail']['save']['error'], LANG_T['error']);
                  }
                });
              });
              break;
            default:
              break;
          }
          break;
      }
    });
    return {
      editor: editor,
      layout: layout,
      toolbar: toolbar,
    }
  }

  binstrHexable(binstr) {
    let buffer = new Buffer(binstr).toString();
    let ret = '';
    for (let i = 0; i < buffer.length; i++) {
      if(this.isPrint(buffer[i])){
        ret += buffer[i];
      }else{
        var hex = buffer[i].charCodeAt().toString(16);
        // 这个实现的 padding 方法有点 low 暂时先这么用
        var padding = hex.length <=4 ? 4-hex.length: 0;
        var paddingstr = '';
        for(let j=0; j<padding;j++){
          paddingstr += '0';
        }
        ret += `\\u${paddingstr}${hex}`;
      }
    }
    return ret;
  }

  isPrint(aChar) {
    var myCharCode = aChar.charCodeAt(0);
    if((myCharCode > 31) && (myCharCode <  127)) {
      return true;
    }
    return false;
  }
  // 加载配置列表
  parse() {
    const info = antSword['ipcRenderer'].sendSync('shell-findOne', this.opt['_id']);
    this.opt = info;
    this.pluginconf = this.opt['plugins'][this.dbname] || {};

    const conf = this.pluginconf;
    // 1. 清空数据
    this.tree.deleteChildItems(0);
    // 2.添加数据
    let items = [];
    for (let _ in conf) {
      items.push({
        id: `conn::${_}`,
        text: `redis:\/\/${conf[_]['host']}`,
        im0: this.list.imgs[0],
        im1: this.list.imgs[0],
        im2: this.list.imgs[0]
      });
    }
    // 3.刷新UI
    this.tree.parse({
      id: 0,
      item: items
    }, 'json');
    // 禁用按钮
    this.disableToolbar();
    // this.disableEditor();
  }
  // value 大小计算
  keySize(t) {
    let i = false;
    let b = ["b","Kb","Mb","Gb","Tb","Pb","Eb"];
    for (let q=0; q<b.length; q++) if (t > 1024) t = t / 1024; else if (i === false) i = q;
    if (i === false) i = b.length-1;
    return Math.round(t*100)/100+" "+b[i];
  }

  addConf() {
    const hash = (+new Date * Math.random()).toString(16).substr(2, 8);
    const win = this.win.createWindow(hash, 0, 0, 450, 300);
    win.setText(LANG['add']['form']['title']);
    win.centerOnScreen();
    win.button('minmax').hide();
    win.setModal(true);
    win.denyResize();
    
    // 工具栏
    const toolbar = win.attachToolbar();
    toolbar.loadStruct([
      {id: 'add', type: 'button', icon: 'plus-circle', text: LANG['add']['toolbar']['add'] },
      { type: 'separator' },
      {id: 'clear', type: 'button', icon: 'remove', text: LANG['add']['toolbar']['clear'] },
    ]);
    
    // 表单
    const form = win.attachForm([
      { type: 'settings', position: 'label-left', labelWidth: 90, inputWidth: 250 },
      { type: 'block', inputWidth: 'auto', offsetTop: 12, list:[
        { type: 'input', label: LANG['add']['form']['host'], name: 'host', required: true, value: '127.0.0.1:6379' },
        { type: 'input', label: LANG['add']['form']['passwd'], name: 'passwd', value: '' }
      ]},
    ]);
    
    // 工具栏点击事件
    toolbar.attachEvent('onClick', (id) => {
      switch(id) {
        case 'clear':
          form.clear();
          break;
        case 'add':
          if (!form.validate()) {
            return toastr.warning(LANG['add']['form']['warning'], LANG_T['warning']);
          };
          // 解析数据
          let data = form.getValues();
          
          const id = antSword['ipcRenderer'].sendSync('shell-addPluginDataConf', this.dbname, {
            _id: this.opt['_id'],
            data: data
          });
          win.close();
          toastr.success(LANG['add']['form']['success'], LANG_T['success']);
          this.tree.insertNewItem(0,
            `conn::${id}`,
            `redis:\/\/${data['host']}`,
            null,
            this.list.imgs[0],
            this.list.imgs[0],
            this.list.imgs[0]
          );
          break;
      }
    });
  }

  // 编辑配置
  editConf(){
    let that = this;
    const id = that.tree.getSelected().split('::')[1];
    // 获取配置
    const conf = that.pluginconf[id];
    const hash = (+new Date * Math.random()).toString(16).substr(2, 8);
    // 创建窗口
    const win = that.win.createWindow(hash, 0, 0, 450, 300);
    win.setText(LANG['edit']['form']['title']);
    win.centerOnScreen();
    win.button('minmax').hide();
    win.setModal(true);
    win.denyResize();
    // 工具栏
    const toolbar = win.attachToolbar();
    toolbar.loadStruct([{
      id: 'edit',
      type: 'button',
      icon: 'edit',
      text: LANG['edit']['toolbar']['edit']
    }, {
      type: 'separator'
    }, {
      id: 'clear',
      type: 'button',
      icon: 'remove',
      text: LANG['edit']['toolbar']['clear']
    }]);
    // form
    const form = win.attachForm([
      { type: 'settings', position: 'label-left', labelWidth: 90, inputWidth: 250 },
      { type: 'block', inputWidth: 'auto', offsetTop: 12, list:[
        { type: 'input', label: LANG['add']['form']['host'], name: 'host', required: true, value: conf['host'] },
        { type: 'input', label: LANG['add']['form']['passwd'], name: 'passwd', value: conf['passwd'] }
      ]},
    ], true);

    // 工具栏点击事件
    toolbar.attachEvent('onClick', (id) => {
      switch(id) {
        case 'clear':
          form.clear();
          break;
        case 'edit':
          if (!form.validate()) {
            return toastr.warning(LANG['edit']['form']['warning'], LANG_T['warning']);
          };
          // 解析数据
          let data = form.getValues();
          // 验证是否连接成功(获取数据库列表)
          const id = antSword['ipcRenderer'].sendSync('shell-editPluginDataConf', that.dbname, {
            _id: this.opt['_id'],
            id: this.tree.getSelected().split('::')[1],
            data: data
          });
          win.close();
          toastr.success(LANG['edit']['form']['success'], LANG_T['success']);
          // 刷新 UI
          this.parse();
          break;
      }
    });
  }

  // 删除配置
  delConf() {
    const id = this.tree.getSelected().split('::')[1];
    layer.confirm(LANG['del']['form']['confirm'], {
      icon: 2, shift: 6,
      title: LANG['del']['form']['title']
    }, (_) => {
      layer.close(_);
      const ret = antSword['ipcRenderer'].sendSync('shell-delPluginDataConf', this.dbname, {
        _id: this.opt['_id'],
        id: id
      });
      if (ret === 1) {
        toastr.success(LANG['del']['form']['success'], LANG_T['success']);
        this.tree.deleteItem(`conn::${id}`);
        // 禁用按钮
        this.disableToolbar();
        // this.parse();
      }else{
        toastr.error(LANG['error']['delconf'](ret), LANG_T['error']);
      }
    });
  }

  // 获取所有 DB
  getDatabases(id) {
    let that = this;
    that.list.layout.progressOn();
    const conf = that.pluginconf[id];
    that.tree.deleteChildItems(`conn::${id}`);
    that.plugincore.setHost(conf['host']);
    let needpass = false;
    let cmd = "";
    if (conf['passwd'].length > 0) {
      cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
      needpass = true;
    }
    cmd += that.redisutil.makeCommand('INFO', 'Keyspace');
    that.core.request({
      _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
    }).then((res)=>{
      let ret = res['text'];
      that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
        let value = "";
        if(needpass) {
          if(errarr.length != 2 || valarr.length != 2){
            toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
            that.redisutil.parser = that.redisutil.initParser();
            return
          }
          if(errarr[0].length > 0) {
            toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
            return
          }
          if(errarr[1].length > 0) {
            toastr.error(LANG['error']['database'](errarr[1].toString()), LANG_T['error']);
            return
          }
          value = valarr[1].toString();
        }else{
          if(errarr.length != 1 || valarr.length != 1){
            toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
            that.redisutil.parser = that.redisutil.initParser();
            return
          }
          if(errarr[0].length > 0) {
            toastr.error(LANG['error']['database'](errarr[0].toString()), LANG_T['error']);
            return
          }
          value = valarr[0].toString();
        }

        let redisdbs = [];
        for (let i=0; i<16; i++) {
          redisdbs.push({
            db: `${i}`,
            all_keys: 0,
            expires_keys: 0,
            avg_ttl: 0,
          });
        }
        value.split("\r\n").forEach((v)=>{
          if(v.startsWith("#") || v == "") {
            return
          }
          if (/db(\d+?):keys=(\d+?),expires=(\d+?),/.test(v)){
            let dbnum = parseInt(RegExp.$1);
            let keys = parseInt(RegExp.$2);
            let expires = parseInt(RegExp.$3);
            redisdbs[dbnum] = {
              db: `${dbnum}`,
              all_keys: keys,
              expires_keys: expires,
              avg_ttl: 0,
            }
          }
        });

        redisdbs.forEach((_)=>{
          if (!_) {return};
          const _db = new Buffer(_.db).toString('base64');
          let db_text = _.all_keys > 0 ? `db${_.db}(${_.all_keys - _.expires_keys}/${_.all_keys})`: `db${_.db}(${_.all_keys})`;
          that.tree.insertNewItem(
            `conn::${id}`,
            `database::${id}:${_db}`,
            db_text, null,
            that.list.imgs[1],
            that.list.imgs[1],
            that.list.imgs[1]
          );
        });
        that.list.layout.progressOff();
      });
    })
    .catch((err)=>{
      console.log(err);
      that.redisutil.parser = that.redisutil.initParser();
      toastr.error(LANG['error']['database'](err['status'] || JSON.stringify(err)), LANG_T['error']);
      that.list.layout.progressOff();
    });
  }
  // 获取当前 db 下的 Key
  getRedisKeys(id, db) {
    let that = this;
    that.list.layout.progressOn();
    const conf = that.pluginconf[id];
    that.plugincore.setHost(conf['host']);
    let needpass = false;
    let cmd = "";
    if (conf['passwd'].length > 0) {
      cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
      needpass = true;
    }
    cmd += that.redisutil.makeCommand('SELECT', `${db}`);
    cmd += that.redisutil.makeCommand('SCAN', '0', 'MATCH', '*', 'COUNT', '10000');
    that.core.request({
      _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
    }).then((res)=>{
      let ret = res['text'];
      that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
        let value = "";
        if(needpass) {
          if(errarr.length != 3 || valarr.length != 3){
            toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
            that.redisutil.parser = that.redisutil.initParser();
            return
          }
          if(errarr[0].length > 0) {
            toastr.error(LANG['error']['auth'](errarr[0]), LANG_T['error']);
            return
          }
          if(errarr[1].length > 0) {
            toastr.error(LANG['error']['nodatabase'](errarr[1]), LANG_T['error']);
            return
          }
          if(errarr[2].length > 0) {
            toastr.error(errarr[2], LANG_T['error']);
            return
          }
          if (valarr[2].length === 2){
            value = valarr[2][1];
          }else{
            value = valarr[2];
          }
        }else{
          if(errarr.length != 2 || valarr.length != 2){
            toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
            that.redisutil.parser = that.redisutil.initParser();
            return
          }
          if(errarr[0].length > 0) {
            toastr.error(LANG['error']['nodatabase'](errarr[0]), LANG_T['error']);
            return
          }
          if(errarr[1].length > 0) {
            toastr.error(errarr[1], LANG_T['error']);
            return
          }
          if (valarr[1].length === 2){
            value = valarr[1][1];
          }else{
            value = valarr[1];
          }
        }
        
        const _db = new Buffer(db).toString('base64');
        // 删除子节点
        this.tree.deleteChildItems(`database::${id}:${_db}`);
        // 添加子节点
        value.map((_) => {
          if (!_) { return };
          const _rediskey = new Buffer(_).toString('base64');
          this.tree.insertNewItem(
            `database::${id}:${_db}`,
            `rediskeys::${id}:${_db}:${_rediskey}`,
            _,
            null,
            this.list.imgs[2],
            this.list.imgs[2],
            this.list.imgs[2]
          );
        });
        that.list.layout.progressOff();
      });
    })
    .catch((err)=>{
      // 重新初始化 parser
      that.redisutil.parser = that.redisutil.initParser();
      toastr.error(LANG['error']['getkeys'](err['status'] || JSON.stringify(err)), LANG_T['error']);
      that.list.layout.progressOff();
    });
  }

  // 获取 Key 的详细信息
  getKeysValue(id, db, rdkey) {
    let that = this;
    that.list.layout.progressOn();
    const conf = that.pluginconf[id];
    that.plugincore.setHost(conf['host']);
    let needpass = false;
    let cmd = "";
    if (conf['passwd'].length > 0) {
      cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
      needpass = true;
    }
    that.resetView();
    // 首先获取 Key 类型和 TTL
    cmd += that.redisutil.makeCommand('SELECT', `${db}`);
    cmd += that.redisutil.makeCommand('TYPE', `${rdkey}`);
    cmd += that.redisutil.makeCommand('TTL', `${rdkey}`);
    that.core.request({
      _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
    }).then((res)=>{
      let ret = res['text'];
      that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
        let typevalue = "";
        let ttlvalue = "";
        if(needpass) {
          if(errarr.length != 4 || valarr.length != 4){
            toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
            that.redisutil.parser = that.redisutil.initParser();
            return
          }
          if(errarr[0].length > 0) {
            toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
            return
          }
          if(errarr[1].length > 0) {
            toastr.error(LANG['error']['nodatabase'](errarr[1].toString()), LANG_T['error']);
            return
          }
          // type
          if(errarr[2].length > 0) {
            toastr.error(errarr[2].toString(), LANG_T['error']);
            return
          }
          // ttl
          if(errarr[3].length > 0) {
            toastr.error(errarr[3].toString(), LANG_T['error']);
            return
          }
          typevalue = valarr[2].toString();
          ttlvalue = valarr[3].toString();
        }else{
          if(errarr.length != 3 || valarr.length != 3){
            toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
            that.redisutil.parser = that.redisutil.initParser();
            return
          }
          if(errarr[0].length > 0) {
            toastr.error(LANG['error']['nodatabase'](errarr[0].toString()), LANG_T['error']);
            return
          }
          // type
          if(errarr[1].length > 0) {
            toastr.error(errarr[1].toString(), LANG_T['error']);
            return
          }
          // ttl
          if(errarr[2].length > 0) {
            toastr.error(errarr[2].toString(), LANG_T['error']);
            return
          }
          typevalue = valarr[1].toString();
          ttlvalue = valarr[2].toString();
        }

        // 更新界面 value 和 ttl
        that.keyview.toolbar.setValue('data_key', rdkey);
        that.keyview.toolbar.setItemText('data_ttl', `${ttlvalue}`);
        // 根据类型选择
        switch (typevalue) {
          case 'string':
            that.keyview.toolbar.setItemText('data_type', 'STRING');
            cmd = "" ;
            if (needpass){
              cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            }
            cmd += that.redisutil.makeCommand('SELECT', `${db}`);
            cmd += that.redisutil.makeCommand('GET', `${rdkey}`);
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res2)=>{
              let ret2 = res2['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret2),(valarr2, errarr2)=>{
                let strvalue = "";
                if(needpass) {
                  if(errarr2.length != 3 || valarr2.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr2[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr2[2].length > 0) {
                    toastr.error(errarr2[2].toString(), LANG_T['error']);
                    return
                  }
                  strvalue = valarr2[2].toString();
                  that.KeyBinaryData = valarr2[2];
                }else{
                  if(errarr2.length != 2 || valarr2.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[1].length > 0) {
                    toastr.error(errarr2[0].toString(), LANG_T['error']);
                    return
                  }
                  that.KeyBinaryData = valarr2[1];
                  strvalue = valarr2[1].toString();
                }
                this.detail.editor.session.setValue(strvalue);
                that.detail.toolbar.setItemText('data_size', `Size: ${that.keySize(strvalue.length)}`);
                that.keyview.toolbar.setItemText('data_size', "");
                this.enableEditor();
              });
            });
            break;
          case 'list':
            that.keyview.toolbar.setItemText('data_type', 'LIST');
            cmd = "" ;
            if (needpass){
              cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            }
            cmd += that.redisutil.makeCommand('SELECT', `${db}`);
            cmd += that.redisutil.makeCommand('LRANGE', `${rdkey}`, '0', '1000');
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res2)=>{
              let ret2 = res2['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret2),(valarr2, errarr2)=>{
                let listvalue = "";
                if(needpass) {
                  if(errarr2.length != 3 || valarr2.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr2[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr2[2].length > 0) {
                    toastr.error(errarr2[2].toString(), LANG_T['error']);
                    return
                  }
                  // array
                  listvalue = valarr2[2];
                }else{
                  if(errarr2.length != 2 || valarr2.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[1].length > 0) {
                    toastr.error(errarr2[0].toString(), LANG_T['error']);
                    return
                  }
                  // array
                  listvalue = valarr2[1];
                }
                that.keyview.grid.detachHeader(0);
                that.keyview.grid.attachHeader("No.,Value");
                let grid_data = [];
                for(let i=0; i< listvalue.length; i++) {
                  grid_data.push({
                    id: i+1,
                    idx: i,
                    b64val: new Buffer(listvalue[i]).toString('base64'),
                    data: [i+1, listvalue[i].toString()]
                  });
                }
                that.keyview.grid.parse({
                  'rows': grid_data
                }, 'json');
                // this.detail.editor.session.setValue(listvalue);
                this.enableEditor();
              });
            });
            break;
          case 'set':
            that.keyview.toolbar.setItemText('data_type', 'SET');
            cmd = "" ;
            if (needpass){
              cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            }
            cmd += that.redisutil.makeCommand('SELECT', `${db}`);
            cmd += that.redisutil.makeCommand('SMEMBERS', `${rdkey}`);
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res2)=>{
              
              let ret2 = res2['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret2),(valarr2, errarr2)=>{
                let setvalue = "";
                if(needpass) {
                  if(errarr2.length != 3 || valarr2.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr2[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr2[2].length > 0) {
                    toastr.error(errarr2[2].toString(), LANG_T['error']);
                    return
                  }
                  setvalue = valarr2[2];
                }else{
                  if(errarr2.length != 2 || valarr2.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[1].length > 0) {
                    toastr.error(errarr2[0].toString(), LANG_T['error']);
                    return
                  }
                  setvalue = valarr2[1];
                }
                that.keyview.grid.detachHeader(0);
                that.keyview.grid.attachHeader("No.,Value");
                let grid_data = [];
                for(let i=0; i< setvalue.length; i++) {
                  grid_data.push({
                    id: i+1,
                    idx: i,
                    b64val: new Buffer(setvalue[i]).toString('base64'),
                    data: [i+1, setvalue[i].toString()]
                  });
                }
                this.keyview.grid.parse({
                  'rows': grid_data
                }, 'json');
                
                // this.detail.editor.session.setValue(setvalue);
                this.enableEditor();
              });
            });
            break;
          case 'hash':
            that.keyview.toolbar.setItemText('data_type', 'HASH');
            cmd = "" ;
            if (needpass){
              cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            }
            cmd += that.redisutil.makeCommand('SELECT', `${db}`);
            cmd += that.redisutil.makeCommand('HSCAN', `${rdkey}`,'0','COUNT','1000');
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res2)=>{
              let ret2 = res2['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret2),(valarr2, errarr2)=>{
                let setvalue = "";
                if(needpass) {
                  if(errarr2.length != 3 || valarr2.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr2[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr2[2].length > 0) {
                    toastr.error(errarr2[2].toString(), LANG_T['error']);
                    return
                  }
                  setvalue = valarr2[2][1];
                }else{
                  if(errarr2.length != 2 || valarr2.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[1].length > 0) {
                    toastr.error(errarr2[0].toString(), LANG_T['error']);
                    return
                  }
                  setvalue = valarr2[1][1];
                }
                that.keyview.grid.detachHeader(0);
                that.keyview.grid.attachHeader("No.,Key,Value");
                let grid_data = [];
                for(let i=0; i< setvalue.length/2; i++) {
                  grid_data.push({
                    id: i+1,
                    idx: i,
                    b64val: new Buffer(setvalue[i*2]).toString('base64'),
                    b64val2: new Buffer(setvalue[i*2+1]).toString('base64'),
                    data: [i+1, setvalue[i*2].toString(), setvalue[i*2+1].toString()]
                  });
                }
                this.keyview.grid.parse({
                  'rows': grid_data
                }, 'json');
                
                // this.detail.editor.session.setValue(setvalue);
                this.enableEditor();
              });
            });
            break;
          case 'zset':
            that.keyview.toolbar.setItemText('data_type', 'ZSET');
            cmd = "" ;
            if (needpass){
              cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            }
            cmd += that.redisutil.makeCommand('SELECT', `${db}`);
            cmd += that.redisutil.makeCommand('ZRANGE', `${rdkey}`,'0','1000','WITHSCORES');
            that.core.request({
              _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
            }).then((res2)=>{
              let ret2 = res2['text'];
              that.redisutil.parseResponse(that.plugincore.decode(ret2),(valarr2, errarr2)=>{
                let setvalue = "";
                if(needpass) {
                  if(errarr2.length != 3 || valarr2.length != 3){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[0].length > 0) {
                    toastr.error(LANG['error']['auth'](errarr2[0].toString()), LANG_T['error']);
                    return
                  }
                  if(errarr2[2].length > 0) {
                    toastr.error(errarr2[2].toString(), LANG_T['error']);
                    return
                  }
                  setvalue = valarr2[2];
                }else{
                  if(errarr2.length != 2 || valarr2.length != 2){
                    toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                    that.redisutil.parser = that.redisutil.initParser();
                    return
                  }
                  if(errarr2[1].length > 0) {
                    toastr.error(errarr2[0].toString(), LANG_T['error']);
                    return
                  }
                  setvalue = valarr2[1];
                }
                that.keyview.grid.detachHeader(0);
                that.keyview.grid.attachHeader("No.,Value,Score");
                let grid_data = [];
                for(let i=0; i< setvalue.length/2; i++) {
                  grid_data.push({
                    id: i+1,
                    idx: i,
                    b64val: new Buffer(setvalue[i*2]).toString('base64'),
                    b64val2: new Buffer(setvalue[i*2+1]).toString('base64'),
                    data: [i+1, setvalue[i*2].toString(), setvalue[i*2+1].toString()]
                  });
                }
                this.keyview.grid.parse({
                  'rows': grid_data
                }, 'json');
                
                // this.detail.editor.session.setValue(setvalue);
                this.enableEditor();
              });
            });
            break;
          case 'none':
            that.getRedisKeys(id, db);
            that.disableResultToolbar();
            that.disableEditor();
            break;
          default:
            toastr.error(LANG['error']['notimpl'](typevalue), LANG_T['error']);
            break;
        }

        that.list.layout.progressOff();
      });
    })
    .catch((err)=>{
      that.redisutil.parser = that.redisutil.initParser();
      toastr.error(LANG['error']['getkeys'](err['status'] || JSON.stringify(err)), LANG_T['error']);
      that.list.layout.progressOff();
    });
  }
  /**
   * 新增 Key
   */
  addKey() {
    let that = this;
    const info = this.tree.getSelected().split("::")[1];
    const id = info.split(":")[0];
    const db = new Buffer(info.split(":")[1], 'base64').toString();
    const conf = that.pluginconf[id];
    const hash = (+new Date * Math.random()).toString(16).substr(2, 8);
    const win = that.win.createWindow(hash, 0, 0, 450, 350);
    win.setText(LANG['addkey']['title']);
    win.centerOnScreen();
    win.button('minmax').hide();
    win.setModal(true);
    win.denyResize();
    const toolbar = win.attachToolbar();
    toolbar.loadStruct([
      {
        id: 'add',
        type: 'button',
        icon: 'plus-circle',
        text: LANG['addkey']['toolbar']['add'],
      },
      { type: 'separator' },
      {
        id: 'clear',
        type: 'button',
        icon: 'remove',
        text: LANG['addkey']['toolbar']['clear'],
      }
    ]);

    const form = win.attachForm([
      {type: 'settings', position: 'label-left', labelWidth: 90, inputWidth: 250 },
      { type: 'block', inputWidth: 'auto', offsetTop: 12, list: [
        { type: 'input', label: LANG['addkey']['form']['name'], name: 'key_name', required: true },
        { type: 'combo', label: LANG['addkey']['form']['keytype'], readonly: true, name: 'type', options: [
          { text: 'String', value: 'string', list: [
            { type: 'settings', position: 'label-left', offsetLeft: 70, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['covernx']})` },
            { type: 'input', name: 'string_value', rows: 10, inputWidth: 250, required: true}
          ]},
          { text: 'List', value: 'list', list: [
            { type: 'settings', position: 'label-left', offsetLeft: 70, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['onemember']})`,},
            { type: 'input', name: 'list_value', rows: 10, inputWidth: 250, required: true}
          ]},
          { text: 'Set', value: 'set', list: [
            { type: 'settings', position: 'label-left', offsetLeft: 70, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['onemember']})` },
            { type: 'input', name: 'set_value', rows: 10, inputWidth: 250, required: true}
          ]},
          { text: 'ZSet', value: 'zset', list: [
            { type: 'settings', position: 'label-left', offsetLeft: 70, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['onemember']})` },
            { type: 'input', name: 'zset_value', rows: 4, inputWidth: 250, required: true},
            { type: 'label', label: `${LANG['addkey']['form']['score']}(${LANG['addkey']['info']['score']})` },
            { type: 'input', name: 'zset_score', inputWidth: 250, required: true, validate: 'ValidNumeric', }
          ]},
          { text: 'Hash', value: 'hash', list: [
            { type: 'settings', position: 'label-left', offsetLeft: 70, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['hashkey']}(${LANG['addkey']['info']['covernx']})` },
            { type: 'input', name: 'hash_key', rows: 3, inputWidth: 250, required: true},
            { type: 'label', label: LANG['addkey']['form']['hashvalue'] },
            { type: 'input', name: 'hash_value', rows: 4, inputWidth: 250, required: true}
          ]},
        ]}
      ]}
    ], true);

    toolbar.attachEvent('onClick', (btnid)=>{
      switch(btnid){
        case 'clear':
          form.clear();
          break;
        case 'add':
          if(!form.validate()) {
            return toastr.warning(LANG['addkey']['info']['warning'], LANG_T['warning']);
          }
          let addcmd = "";
          // 解析数据
          let data = form.getValues();
          switch(data['type']){
            case "string":
              addcmd += that.redisutil.makeCommand('SET', data["key_name"], data["string_value"]);
              break;
            case "list":
              addcmd += that.redisutil.makeCommand('LPUSH', data["key_name"], data["list_value"]);
              break;
            case "set":
              addcmd += that.redisutil.makeCommand("SADD", data["key_name"], data["set_value"]);
              break;
            case "zset":
              addcmd += that.redisutil.makeCommand("ZADD", data["key_name"], data["zset_score"], data["zset_value"]);
              break;
            case "hash":
              addcmd += that.redisutil.makeCommand("HSET", data["key_name"], data["hash_key"], data["hash_value"]);
              break;
          }
          if(addcmd.length <= 0) {
            return toastr.warning(LANG['addkey']['info']['warning'], LANG_T['warning']);
          }
          let cmd = "";
          let needpass = false;
          if (conf['passwd'].length > 0) {
            cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            needpass = true;
          }
          cmd += that.redisutil.makeCommand('SELECT', `${db}`);
          cmd += addcmd;
          that.plugincore.setHost(conf['host']);
          that.core.request({
            _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
          }).then((res)=>{
            let ret = res['text'];
            that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr) => {
              let retval;
              if(needpass) {
                if(errarr.length != 3 || valarr.length != 3){
                  toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                  that.redisutil.parser = that.redisutil.initParser();
                  return
                }
                if(errarr[0].length > 0) {
                  toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                  return
                }
                if(errarr[2].length > 0) {
                  toastr.error(errarr[2].toString(), LANG_T['error']);
                  return
                }
                retval = valarr[2];
              }else{
                if(errarr.length != 2 || valarr.length != 2){
                  toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                  that.redisutil.parser = that.redisutil.initParser();
                  return
                }
                if(errarr[1].length > 0) {
                  toastr.error(errarr[1].toString(), LANG_T['error']);
                  return
                }
                retval = valarr[1];
              }
              switch(data['type']){
                case 'zset':
                  // 0 添加已经存在元素
                  if (typeof retval == "number" && retval == 0){
                    toastr.success(LANG['addkey']['info']['zsetsuccess'](data['zset_value']), LANG_T['success']);
                  }else{
                    toastr.success(LANG['addkey']['info']['success'], LANG_T['success']);
                  }
                  break;
                case 'hash':
                  // 0 添加已经存在元素
                  if (typeof retval == "number" && retval == 0){
                    toastr.success(LANG['addkey']['info']['hashsuccess'](data['hash_key']), LANG_T['success']);
                  }else{
                    toastr.success(LANG['addkey']['info']['success'], LANG_T['success']);
                  }
                  break;
                default:
                  // 可能是 OK 可能是 int
                  if((typeof retval ==  "object" && new Buffer(retval).toString() == "OK") || (typeof retval == "number" && parseInt(retval) > 0)) {
                    toastr.success(LANG['addkey']['info']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['addkey']['info']['error'], LANG_T['error']);
                    that.getRedisKeys(id, db);
                    return
                  }
                  break;
              }
              win.close();
              that.getRedisKeys(id, db);
            });
          }).catch((err)=>{
            that.redisutil.parser = that.redisutil.initParser();
          });
          break;
      }
    });
  }

  /**
   * 插入元素
   */
  insertKeyItem(opt) {
    let that = this;
    const info = opt['info'];
    const id = opt['id'];
    const db = opt['db'];
    const conf = opt['conf'];
    const keytype = opt['keytype'];
    const rediskey = opt['rediskey'];

    const hash = (+new Date * Math.random()).toString(16).substr(2, 8);
    const win = that.win.createWindow(hash, 0, 0, 380, 300);
    win.setText(LANG['insertitem']['title']);
    win.centerOnScreen();
    win.button('minmax').hide();
    win.setModal(true);
    win.denyResize();
    const toolbar = win.attachToolbar();
    toolbar.loadStruct([
      {
        id: 'add',
        type: 'button',
        icon: 'plus-circle',
        text: LANG['insertitem']['toolbar']['add'],
      },
      { type: 'separator' },
      {
        id: 'clear',
        type: 'button',
        icon: 'remove',
        text: LANG['insertitem']['toolbar']['clear'],
      }
    ]);
    const form = win.attachForm([
      {type: 'settings', position: 'label-left', labelWidth: 150, inputWidth: 150 },
      { type: 'block', inputWidth: 'auto', offsetTop: 12, list: [
          { type:'block', hidden: keytype != "list", disabled: keytype != "list", list: [ // LIST
            { type: 'settings', position: 'label-left', offsetLeft: 12, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['onemember']})`,},
            { type: 'input', name: 'list_value', rows: 10, inputWidth: 250, required: true}
          ]},
          { type: 'block', hidden: keytype != "set", disabled: keytype != "set", list: [
            { type: 'settings', position: 'label-left', offsetLeft: 12, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['onemember']})` },
            { type: 'input', name: 'set_value', rows: 10, inputWidth: 250, required: true}
          ]},
          { type: 'block', hidden: keytype != "zset", disabled: keytype != "zset", list: [
            { type: 'settings', position: 'label-left', offsetLeft: 12, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['value']}(${LANG['addkey']['info']['onemember']})` },
            { type: 'input', name: 'zset_value', rows: 4, inputWidth: 250, required: true},
            { type: 'label', label: `${LANG['addkey']['form']['score']}(${LANG['addkey']['info']['score']})` },
            { type: 'input', name: 'zset_score', inputWidth: 250, required: true, validate: 'ValidNumeric', }
          ]},
          { type: 'block', hidden: keytype != "hash", disabled: keytype != "hash", list: [
            { type: 'settings', position: 'label-left', offsetLeft: 12, labelWidth: 250, inputWidth: 150 },
            { type: 'label', label: `${LANG['addkey']['form']['hashkey']}(${LANG['addkey']['info']['covernx']})` },
            { type: 'input', name: 'hash_key', rows: 3, inputWidth: 250, required: true},
            { type: 'label', label: LANG['addkey']['form']['hashvalue'] },
            { type: 'input', name: 'hash_value', rows: 4, inputWidth: 250, required: true}
          ]},
        ]}
    ], true);
    toolbar.attachEvent('onClick', (btnid)=>{
      switch(btnid){
        case 'clear':
          form.clear();
          break;
        case 'add':
          if(!form.validate()) {
            return toastr.warning(LANG['addkey']['info']['warning'], LANG_T['warning']);
          }
          let addcmd = "";
          // 解析数据
          let data = form.getValues();
          switch(keytype){
            case "list":
              addcmd += that.redisutil.makeCommand('LPUSH', rediskey, data["list_value"]);
              break;
            case "set":
              addcmd += that.redisutil.makeCommand("SADD", rediskey, data["set_value"]);
              break;
            case "zset":
              addcmd += that.redisutil.makeCommand("ZADD", rediskey, data["zset_score"], data["zset_value"]);
              break;
            case "hash":
              addcmd += that.redisutil.makeCommand("HSET", rediskey, data["hash_key"], data["hash_value"]);
              break;
          }
          if(addcmd.length <= 0) {
            return toastr.warning(LANG['addkey']['info']['warning'], LANG_T['warning']);
          }
          let cmd = "";
          let needpass = false;
          if (conf['passwd'].length > 0) {
            cmd = that.redisutil.makeCommand('AUTH', conf['passwd']);
            needpass = true;
          }
          cmd += that.redisutil.makeCommand('SELECT', `${db}`);
          cmd += addcmd;
          that.plugincore.setHost(conf['host']);
          that.core.request({
            _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
          }).then((res)=>{
            let ret = res['text'];
            that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr) => {
              let retval;
              if(needpass) {
                if(errarr.length != 3 || valarr.length != 3){
                  toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                  that.redisutil.parser = that.redisutil.initParser();
                  return
                }
                if(errarr[0].length > 0) {
                  toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                  return
                }
                if(errarr[2].length > 0) {
                  toastr.error(errarr[2].toString(), LANG_T['error']);
                  return
                }
                retval = valarr[2];
              }else{
                if(errarr.length != 2 || valarr.length != 2){
                  toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                  that.redisutil.parser = that.redisutil.initParser();
                  return
                }
                if(errarr[1].length > 0) {
                  toastr.error(errarr[1].toString(), LANG_T['error']);
                  return
                }
                retval = valarr[1];
              }
              switch(keytype){
                case 'zset':
                  // 0 添加已经存在元素
                  if (typeof retval == "number" && retval == 0){
                    toastr.success(LANG['addkey']['info']['zsetsuccess'](data['zset_value']), LANG_T['success']);
                  }else{
                    toastr.success(LANG['addkey']['info']['success'], LANG_T['success']);
                  }
                  break;
                case 'hash':
                  // 0 添加已经存在元素
                  if (typeof retval == "number" && retval == 0){
                    toastr.success(LANG['addkey']['info']['hashsuccess'](data['hash_key']), LANG_T['success']);
                  }else{
                    toastr.success(LANG['addkey']['info']['success'], LANG_T['success']);
                  }
                  break;
                default:
                  // 可能是 OK 可能是 int
                  if((typeof retval ==  "object" && new Buffer(retval).toString() == "OK") || (typeof retval == "number" && parseInt(retval) > 0)) {
                    toastr.success(LANG['addkey']['info']['success'], LANG_T['success']);
                  }else{
                    toastr.error(LANG['addkey']['info']['error'], LANG_T['error']);
                    that.getKeysValue(id, db, rediskey);
                    return
                  }
                  break;
              }
              win.close();
              that.getKeysValue(id, db, rediskey);
            });
          }).catch((err)=>{
            that.redisutil.parser = that.redisutil.initParser();
          });
          break;
      }
    });
  }

  /**
   * 删除元素
   */
  delKeyItem(opt) {
    let that = this;
    const id = opt['id'];
    const conf = opt['conf'];
    const db = opt['db'];
    const rediskey = opt['rediskey'];
    const keytype = opt['keytype'];
    const idx = opt['idx'];
    const ivalue = new Buffer(opt['ivalue_b64'], "base64").toString();
    if(ivalue.length <= 0){
      toastr.warning(LANG['delitem']['error']['novalue'], LANG_T['warning']);
      return
    }
    layer.confirm(
      LANG['delitem']['confirm'],
      {
        icon: 2,
        shift: 6,
        title: `<i class="fa fa-trash"></i> ${LANG['delitem']['title']}`,
      },
      (_) => {
        layer.close(_);
        var needpass = false;
        var cmd = "";
        if (conf['passwd'].length > 0) {
          cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
          needpass = true;
        }
        cmd += that.redisutil.makeCommand('SELECT', db);
        switch(keytype){
          case 'list':
            // 第一步,修改值
            cmd += that.redisutil.makeCommand('LSET', rediskey, String(idx), "---VALUE_REMOVED_BY_ANTSWORD---");
            // 第二步,删除 ---VALUE_REMOVED_BY_ANTSWORD---
            cmd += that.redisutil.makeCommand('LREM', rediskey, "0", "---VALUE_REMOVED_BY_ANTSWORD---");
            break;
          case 'set':
            cmd += that.redisutil.makeCommand('SREM', rediskey, ivalue);
            break;
          case 'zset':
            cmd += that.redisutil.makeCommand('ZREM', rediskey, ivalue);
            break;
          case 'hash':
            cmd += that.redisutil.makeCommand('HDEL', rediskey, ivalue);
            break;
        }
        that.core.request({
          _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
        }).then((res)=>{
          let ret = res['text'];
          that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr) => {
            let retval;
            // 检查解析是否正确
            if(needpass) {
              if (keytype == 'list' && (errarr.length != 4 || valarr.length != 4)){
                toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                that.redisutil.parser = that.redisutil.initParser();
                return
              }
              if(keytype != 'list' && (errarr.length != 3 || valarr.length != 3)){
                toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                that.redisutil.parser = that.redisutil.initParser();
                return
              }
            }else{
              if (keytype == 'list' && (errarr.length != 3 || valarr.length != 3)){
                toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                that.redisutil.parser = that.redisutil.initParser();
                return
              }
              if (keytype != 'list' && (errarr.length != 2 || valarr.length != 2)){
                toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
                that.redisutil.parser = that.redisutil.initParser();
                return
              }
            }
            // 检查认证情况
            if(needpass) {
              if(errarr[0].length > 0) {
                toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
                return
              }
              errarr = errarr.slice(1);
              valarr = valarr.slice(1);
            }
            if(errarr[1].length > 0) {
              toastr.error(errarr[1].toString(), LANG_T['error']);
            }
            // 针对 list 额外检查重命名情况
            if(keytype == "list") {
              if(errarr[2].length > 0) {
                toastr.error(errarr[2].toString(), LANG_T['error']);
              }
              retval = valarr[2];
            }else{
              retval = valarr[1];
            }

            if((typeof retval ==  "object" && new Buffer(retval).toString() == "OK") || (typeof retval == "number" && parseInt(retval) > 0)) {
              toastr.success(LANG['delitem']['success'], LANG_T['success']);
            }else{
              toastr.error(LANG['delitem']['error'], LANG_T['error']);
            }
            that.getKeysValue(id, db, rediskey);
            return
          });
        }).catch((err)=>{
          that.redisutil.parser = that.redisutil.initParser();
        });
      });
  }
  
  editZsetKeyScore(opt) {
    let that = this;
    const id = opt['id'];
    const conf = opt['conf'];
    const db = opt['db'];
    const rediskey = opt['rediskey'];
    const idx = opt['idx'];
    const ivalue = new Buffer(opt['ivalue_b64'], "base64").toString();
    const ivalue2 = new Buffer(opt['ivalue2_b64'], "base64").toString();
    layer.prompt({
      value: ivalue2,
      title: LANG['edititem']['zset']['title'],
    },(value, index, elem) => {
      layer.close(index);
      var needpass = false;
      var cmd = "";
      if (conf['passwd'].length > 0) {
        cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
        needpass = true;
      }
      cmd += that.redisutil.makeCommand('SELECT', db);
      
      cmd += that.redisutil.makeCommand('ZREM', rediskey, ivalue);
      cmd += that.redisutil.makeCommand('ZADD', rediskey, value, ivalue);
      that.core.request({
        _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
      }).then((res)=>{
        let ret = res['text'];
        that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
          var retval;
          if(needpass) {
            if(errarr.length != 4 || valarr.length != 4){
              toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
              that.redisutil.parser = that.redisutil.initParser();
              return
            }
            if(errarr[0].length > 0) {
              toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
              return
            }
            if(errarr[3].length > 0) {
              toastr.error(errarr[3].toString(), LANG_T['error']);
              return
            }
            retval = valarr[3];
          }else{
            if(errarr.length != 3 || valarr.length != 3){
              toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
              that.redisutil.parser = that.redisutil.initParser();
              return
            }
            if(errarr[2].length > 0) {
              toastr.error(errarr[2].toString(), LANG_T['error']);
              return
            }
            retval = valarr[2];
          }
          if(parseInt(retval) > 0) {
            toastr.success(LANG['edititem']['success'],LANG_T['success']);
            that.getKeysValue(id, db, rediskey);
          }else{
            toastr.error(LANG['edititem']['error'],LANG_T['error']);
            return
          }
        });
      }).catch((err)=>{
        that.redisutil.parser = that.redisutil.initParser();
      });
    });
  }

  editHashKeyValue(opt) {
    let that = this;
    const id = opt['id'];
    const conf = opt['conf'];
    const db = opt['db'];
    const rediskey = opt['rediskey'];
    const idx = opt['idx'];
    const ivalue = new Buffer(opt['ivalue_b64'], "base64").toString();
    const ivalue2 = new Buffer(opt['ivalue2_b64'], "base64").toString();
    layer.prompt({
      value: ivalue2,
      title: LANG['edititem']['zset']['title'],
    },(value, index, elem) => {
      layer.close(index);
      var needpass = false;
      var cmd = "";
      if (conf['passwd'].length > 0) {
        cmd += that.redisutil.makeCommand('AUTH', conf['passwd']);
        needpass = true;
      }
      cmd += that.redisutil.makeCommand('SELECT', db);
      cmd += that.redisutil.makeCommand('HSET', rediskey, ivalue, value);
      that.core.request({
        _: that.plugincore.template[that.opt['type']](new Buffer(cmd))
      }).then((res)=>{
        let ret = res['text'];
        that.redisutil.parseResponse(that.plugincore.decode(ret),(valarr, errarr)=>{
          var retval;
          if(needpass) {
            if(errarr.length != 3 || valarr.length != 3){
              toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
              that.redisutil.parser = that.redisutil.initParser();
              return
            }
            if(errarr[0].length > 0) {
              toastr.error(LANG['error']['auth'](errarr[0].toString()), LANG_T['error']);
              return
            }
            if(errarr[2].length > 0) {
              toastr.error(errarr[2].toString(), LANG_T['error']);
              return
            }
            retval = valarr[2];
          }else{
            if(errarr.length != 2 || valarr.length != 2){
              toastr.warning(LANG['error']['parseerr'],LANG_T['warning']);
              that.redisutil.parser = that.redisutil.initParser();
              return
            }
            if(errarr[1].length > 0) {
              toastr.error(errarr[1].toString(), LANG_T['error']);
              return
            }
            retval = valarr[1];
          }
          if(parseInt(retval) == 0) {
            toastr.success(LANG['edititem']['success'],LANG_T['success']);
            that.getKeysValue(id, db, rediskey);
          }else{
            toastr.error(LANG['edititem']['error'],LANG_T['error']);
            return
          }
        });
      }).catch((err)=>{
        that.redisutil.parser = that.redisutil.initParser();
      });
    });
  }
  resetView() {
    this.KeyBinaryData = new Buffer('');
    this.detail.toolbar.setItemText('data_size', 'Size:0b');
    this.detail.editor.session.setValue("");
    this.keyview.grid.clearAll();
    this.keyview.toolbar.getInput("data_key").value = "";
    this.keyview.toolbar.setItemText('data_key', '');
    this.keyview.toolbar.setItemText('data_size', '');
    this.keyview.toolbar.setItemText('data_ttl', '');
  }
  // 启动 toolbar 按钮
  enableToolbar() {
    this.list.toolbar.enableItem('edit');
    this.list.toolbar.enableItem('del');
  }

  disableToolbar() {
    this.resetView();
    this.list.toolbar.disableItem('edit');
    this.list.toolbar.disableItem('del');  
  }

  enableEditor() {
    this.detail.toolbar.enableItem('save');
    this.detail.toolbar.enableItem('view_type');
    this.detail.editor.setReadOnly(false);
  }

  disableEditor() {
    this.detail.toolbar.disableItem('save');
    this.detail.toolbar.disableItem('view_type');
    this.detail.editor.setReadOnly(true);
  }

  enableResultToolbar() {
    // this.keyview.toolbar.enableItem('data_key');
    this.keyview.toolbar.enableItem('rename');
    this.keyview.toolbar.enableItem('del');
    this.keyview.toolbar.enableItem('setttl');
    this.keyview.toolbar.enableItem('reload');
  }

  disableResultToolbar() {
    // this.keyview.toolbar.disableItem('data_key');
    this.keyview.toolbar.disableItem('rename');
    this.keyview.toolbar.disableItem('del');
    this.keyview.toolbar.disableItem('setttl');
    this.keyview.toolbar.disableItem('reload');
    this.disableEditor();
  }
}

module.exports = Plugin;
