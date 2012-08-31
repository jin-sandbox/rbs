var RBS = require('../rbs').RBS;
var JSConsole = require('./jsconsole').JSConsole
function buildAction(action,callback,pattern,method){
	if(typeof pattern == 'string'){
		pattern = new RegExp('^'+pattern.replace(/\*/g,'.*').replace(/\:\w+/g,'[^\\/]+'))
	}
	return function(req,resp){
		if(pattern && !pattern.test(req.url.replace(/[?#].*$/,''))){
			return callback(req,resp)
		} else if(method && method != req.method){
			return callback(req,resp);
		}else{
			return action(req,resp,callback)
		}
	}
}

function TestServer(rbs,port){
	//console.log('server start @',root);
	function httpHander(){
		chain.apply(this,arguments)
	}
	var server = require('http').createServer(httpHander);
	var chain = buildAction(require('./static').createStaticAction(rbs));
	chain = buildAction(require('./export').createExportAction(rbs),chain,/^\/--export\.zip$/);
	chain = buildAction(require('./php').createPhpAction(rbs),chain,/\.php$/);
	//chain = buildAction(function(){process.exit(0)},chain,/\/--exit/);
	chain = buildAction(require('./proxy').proxy,chain);
	this.add = function(callback,pattern,method){
		chain=buildAction(callback,chain,pattern,method)
	}
	port = port || 2012;
	var tryinc = 0;
	function complete(e){
		testServer.port =port;
		testServer.complete(rbs.root,'http://127.0.0.1:'+port); 
		tryinc = -1;
		try{require('http').createServer(httpHander).on('error',function(){}).listen(80);}catch(e){}
	}
	server.on('error', function (e) {
		if (e.code == 'EADDRINUSE' && tryinc>=0) {
			if(tryinc++ == 0){
				require('http').get("http://127.0.0.1:"+port+"/--exit", function(res) {
					console.log("Got response: " + res.statusCode);
					server.listen(port,complete);
				}).on('error', function(e) {
					console.log("Got error: " + e.message);
					server.listen(port,complete);
				});
			}else{
				console.log('port:'+port+' in use, retrying '+ ++port+'...');
				setTimeout(function () {
					server.listen(port,complete);
				}, 1000);
			}
		}
	});
	var testServer = this;
	testServer.console = new JSConsole();
	testServer.rbs = rbs;
	testServer.root = rbs.root;
	server.listen(port,complete);
}
TestServer.prototype = {
	complete:function(root,url){
		console.log('rbs test server is started success!!\nfile :\t'+root+
			'\nurl :\t'+url );
	},
	get : function(pattern,callback){
		this.add(callback,pattern,'GET')
	},
	post : function(pattern,callback){
		this.add(callback,pattern,'POST')
	},
	all : function(pattern,callback){
		this.add(callback,pattern)
	}
}


function startServer(rbs,port){
	return new TestServer(rbs,port);
}

exports.startServer = startServer;