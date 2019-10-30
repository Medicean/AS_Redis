const Parser = require("redis-parser");
// var commands = require('redis-commands');

class RedisUtil {
  constructor() {
    this.replyarr = Array();
    this.errarr = Array();
    this.parser = this.initParser();
  }
  initParser() {
    let that = this;
    return new Parser({
      returnReply: (reply) => {
        that.replyarr.push(reply);
        that.errarr.push("");
      },
      returnError: (err) => {
        that.replyarr.push("");
        that.errarr.push(err);
      },
      returnFatalError: (err) => {
        that.replyarr.push("");
        that.errarr.push(err);
      },
      returnBuffers: true,
    });
  }

  parseResponse(buffer, callback) {
    this.clear();
    this.parser.execute(buffer);
    callback(this.replyarr, this.errarr);
  }

  clear() {
    this.replyarr = Array();
    this.errarr = Array();
  }

  /**
   *  将指令转成协议
   *  makeCommand("info", "all");
   *  makeCommand("config", "get", "dir");
   * */
  makeCommand(...args) {
    let cmds = Array();
    cmds.push(`*${args.length}\r\n`);
    args.forEach((arg) => {
      if (typeof arg == 'number') {
        arg = String(arg);
      }
      cmds.push(`\$${Buffer.from(arg).length}\r\n${arg}\r\n`);
    })
    return cmds.join("")
  }
}

module.exports = RedisUtil;