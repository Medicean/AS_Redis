'use strict'

class Core {
  constructor(opt = {}) {
    this.host = opt['host'] || "127.0.0.1:6379";
  }

  setHost(host) {
    this.host = host;
  }

  // 将 buffer 转为 base64 string
  encode(buffer) {
    return Buffer.from(buffer).toString('base64');
  }

  decode(str) {
    let b64buff = Buffer.from(str, 'base64');
    if (b64buff.toString().indexOf('ERROR://') > -1) {
      throw new Error(b64buff.toString());
    }
    return b64buff;
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
      'aspx': (cmdbuf) => `try{
var ipAddress = "${this.host.split(':')[0]}";
var portNum = ${this.host.split(':')[1]};
var sendbytes = System.Convert.FromBase64String("${this.encode(cmdbuf)}");
var remoteEndPoint = new System.Net.IPEndPoint(System.Net.IPAddress.Parse(ipAddress), portNum);
var client = new System.Net.Sockets.Socket(
    System.Net.Sockets.AddressFamily.InterNetwork,
    System.Net.Sockets.SocketType.Stream,
    System.Net.Sockets.ProtocolType.Tcp
);
client.Connect(remoteEndPoint);
client.Send(sendbytes);
var recvStr = "";
var bytes = 0;
var receiveBuffer = new byte[1024];
do {
    bytes = client.Receive(receiveBuffer, receiveBuffer.Length, System.Net.Sockets.SocketFlags.None);
    recvStr += System.Text.Encoding.UTF8.GetString(receiveBuffer, 0, bytes);
}while (bytes == 1024);
client.Shutdown(System.Net.Sockets.SocketShutdown.Both);
client.Close();
Response.Write(System.Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(recvStr)));
} catch (err) {
  Response.Write(System.Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("ERROR:// " + err.message)));
}
`,
    }
  }
}

module.exports = Core;