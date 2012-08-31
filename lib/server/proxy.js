var http = require('http');
var fs = require('fs');
var dns = require('dns');
var domainMap = {};
var etc = 'C:\\WINDOWS\\system32\\drivers\\etc\\'
var configPath = etc+'proxy.config';
var lastAccessTime = null;
exports.proxy = proxy;
function hostDemain(path){
  var hosts = fs.readFileSync(etc+path,'utf-8');
  hosts.replace(/^\s127\.0\.0\.1\s+([\w\.\-\_]+)(?:[ \t]*#(\d+))?/gm,function(a,d,t){
    var config = domainMap[d]=domainMap[d]||{}
    if(t){config.time=t}
  })
}
try{hostDemain('hosts')}catch(e){}
try{hostDemain('hosts.ics')}catch(e){}
//console.log(domainMap)
//
//http.createServer(function(request, response) {
//
//}).listen(80);


function proxy(request,response,next){
  var hostname = request.headers.host;
  var config = domainMap[hostname];
  if(config && config.time){
    if(config.ip){
      doProxy(request,response,config)
    }else{
      dns.resolve4(hostname,function(err,addresses){
        config.ip = addresses && addresses[0]||'127.0.0.1'
        doProxy(request,response,config)
      })
    }
  }else{
    next(request,response)
  }
}

function doProxy(request,response,config){
  var now = new Date()/1000
  if(lastAccessTime ===null){
    try{
      lastAccessTime = fs.readFileSync(configPath,'utf-8')*1 || now
    }catch(e){lastAccessTime = now; fs.writeFile(configPath,now+'');}
  }
  if(now - lastAccessTime>60*60*4){//4小时内只允许一次访问
    lastAccessTime =now;
    fs.writeFile(configPath,now+'');
  }else if(now - lastAccessTime>60*config.time){//每组访问不能超过5分钟
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('do it at 4 hours later......');
    return;
  }
  var options = {
    port:80,host:config.ip,
    method:request.method, path:request.url, headers:request.headers
  }
  var proxy_request = http.request(options);
  
  proxy_request.addListener('response', function (proxy_response) {
    proxy_response.addListener('data', function(chunk) {
      response.write(chunk, 'binary');
    });
    proxy_response.addListener('end', function() {
      response.end();
    });
    response.writeHead(proxy_response.statusCode, proxy_response.headers);
  });
  request.addListener('data', function(chunk) {
    proxy_request.write(chunk, 'binary');
  });
  if(request.method == 'POST'){
    request.addListener('end', function() {
      proxy_request.end();
    });
  }else{proxy_request.end();}
}



