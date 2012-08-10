var url = require('url');
var spawn = require('child_process').spawn;

var SERVER_SOFTWARE = "Node/"+process.version;
var SERVER_PROTOCOL = "HTTP/1.1";
var GATEWAY_INTERFACE = "CGI/1.1";

function createCgi(root,path,options) {
  options = options || {};
  var defaultEnv = {};
  var fullpath = (root+path).replace(/\\/g,'/')
  copy({
      GATEWAY_INTERFACE:  GATEWAY_INTERFACE,
      REQUEST_URI:        path,
      SCRIPT_FILENAME:    fullpath,
      SCRIPT_NAME:        path,//TODO://get real path(remove pathinfo)
      PATH_INFO:          '',//TODO://get pathinfo,
      SERVER_PROTOCOL:    SERVER_PROTOCOL,
      SERVER_SOFTWARE:    SERVER_SOFTWARE,
      DOCUMENT_ROOT:      root
  }, defaultEnv);
  copy(process.env, defaultEnv);
  return function(req, res, next) {
  	var uri = url.parse(req.url);
    var host = (req.headers.host || '').split(':');
    var address = host[0];
    var port = host[1]||'80';
    var env = {__proto__:defaultEnv,
    	SERVER_NAME:address || 'unknown',
    	SERVER_PORT:port}
    // The client HTTP request headers are attached to the env as well,
    // in the format: "User-Agent" -> "HTTP_USER_AGENT"
    for (var header in req.headers) {
      var key = header.toUpperCase().replace(/-/g, '_');
      var value = req.headers[header];
      env['HTTP_' + key] = value;
      if(key.match(/^CONTENT-(?:LENGTH|TYPE)$/)){
      	env[key.replace('-','_')] = value;//CONTENT_LENGTH,CONTENT_TYPE
      }else if(key == 'AUTHORIZATION'){
      	var auth = value.split(' ');
        env.AUTH_TYPE = auth[0];
        //var unbase = new Buffer(auth[1], 'base64').toString().split(':');
      }
    }

    // Now add the user-specified env variables
    options.env && copy(options.env, env);
    env.REQUEST_METHOD = req.method;
    env.QUERY_STRING = uri.query || '';
    
    console.log('execute:',fullpath)
    var cgiSpawn = spawn(options.command , [fullpath], {
      //'customFds': fds,
      'env': env,
      stdio: [null, null, process.stderr]
    });
    var parsed;
    var buf0 = null;
    cgiSpawn.stdout.on('data',function(buf){
    	console.log(buf.length,buf.toString('utf8',0,10))
    	if(parsed){
    		res.write(buf)
    	}else{
	    	if(buf0){
	    		buf = Buffer.concat([buf0,buf])
	    	}
	    	var len = buf.length
	    	var begin = 0;
	    	var end = 0;
	    	while(end < len){
	    		if(buf[end] == 10){// \n
	    			var line = buf.toString('utf8',begin,end-1);
	    			console.log(line)
	    			begin = ++end;
	    			if(line == ''){
	    				console.log('complete!!!')
	    				cgiSpawn.stdout.removeListener('data', arguments.callee);
	    				cgiSpawn.stdout.pipe(res);
	    				res.write(buf.slice(begin))
	    				parsed = true
	    				return;
	    			}else{
	    				var header = line.match(/([^:\s]+)\s*:\s*(.*?)\s*$/);
	    				if(header){
	    				var key = header[1];
	    				var value = header[2];
	    				if(/^Status$/i.test(key)){
	    					res.statusCode = value;
	    				}else{
	    					res.setHeader(key,value)
	    				}
	    				}else{
	    					console.log("????",line)
	    				}
	    			}
	    		}
	    		end++;
	    	}
	    	buf0 = buf.slice(begin)
    	}
    })
    req.pipe(cgiSpawn.stdin)
    
  }
}
module.exports.create = createCgi;



// TODO: Remove this function, and use the prototype of the env instead
// Copies the values from source onto destination
function copy(source, destination) {
  for (var i in source) {
    destination[i] = source[i];
  }
  return destination;
}
