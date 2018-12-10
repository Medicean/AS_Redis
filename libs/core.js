
'use strict'

class Core {
  constructor(opt={}) {
    this.host = opt['host']||"127.0.0.1:6379";
  }

  setHost(host) {
    this.host = host;
  }
  
  // 将 buffer 转为 base64 string
  encode(buffer) {
    return new Buffer(buffer).toString('base64');
  }

  decode(str) {
    return new Buffer(str, 'base64');
  }

  get template() {
    return {
      'php': (cmdbuf) => `$cmd=base64_decode("${this.encode(cmdbuf)}");
$conn=@stream_socket_client("tcp://${this.host}", $errno, $errstr, $timeout=30);
if(!$conn){
  echo "LUVSUiBDb25uZWN0aW9uIFJlZnVzZWQ=";
}else{
  @fwrite($conn,$cmd,strlen($cmd));
  $resp=@fread($conn, 8196);
  @stream_set_blocking($conn,0);
  while($buf=@fread($conn,8196)){$resp.=$buf;}
  stream_set_blocking($conn, 1);
  echo base64_encode($resp);
  @stream_socket_shutdown($conn,STREAM_SHUT_RDWR);
  @fclose($conn);
}`,
      'asp': (cmdbuf) => ``,
      'aspx': (cmdbuf) => ``,
    }
  }
}

module.exports = Core;