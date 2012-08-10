var RBS = require('../rbs').RBS;
var serverExt = require('./server-ext');
function buildActionChain(actionList){
	var len = actionList.length;
	var next;
	for(var i=0;i<len;i++){
		next = buildAction(actionList[i],next)
	}
	return next;
}
function buildAction(action,callback){
	return function(req,resp){
		return action(req,resp,callback)
	}
}
function startServer(rbs,port){
	//console.log('server start @',root);
	var actionList = [require('./static').createStaticAction(rbs)
				,require('./export').createExportAction(rbs)
				,require('./php').createPhpAction(rbs)];
	var actionChain = buildActionChain(actionList);
	var server = require('http').createServer(
		actionChain
	);
	port = port || 2012;
	server.on('error', function (e) {
		if (e.code == 'EADDRINUSE') {
			console.log('port:'+port+' in use, retrying '+ ++port+'...');
			setTimeout(function () {
				server.listen(port);
			}, 1000);
		}
	});
	server.listen(port,function(e){
		//console.dir(e)
		serverExt.init(rbs.root,'http://127.0.0.1:'+port); 
	});
	return server;
}

exports.startServer = startServer;