var Path  = require('path');
var FS = require('fs');
var RBS = require('./rbs').RBS;

function startRbsServer(root,port){
	root = root || Path.resolve('./');
	//console.log('server start @',root);
	var rbs = new RBS(root);
	var server = require('http').createServer(function (req, response) {
		var url =getRequestURL(req);
		var filepath = Path.join(root,url);
		//console.info('request:',url)
		FS.stat(filepath,function(error,stats){
		    if(stats){
		    	if(stats.isDirectory()){
		    		return writeDir(url,filepath,response);
		    	}
		    }
		    var text = rbs.getContentAsBinary(url);
		    if(text != null){
		    	return writeContent(req,response,url,text);
		    }
		    if(stats){
		    	writeNotFound(filepath,response,"compile failed"); 
		    }else{
		    	writeNotFound(filepath,response); 
		    }
		});
	});
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
		console.log('rbs test server is started success!!\nfile :\t'+root+'\nurl :\thttp://'+('127.0.0.1')+':' + port );
	});
	rbs.server = server;
	return rbs;
}

function getRequestURL(req){
	url = req.url.replace(/[?#][\s\S]*/,'');
	var uap = /\/[\w][^\/]*\.css$/
	if(url.match(uap)){
		var uar = /^o(?=pera)|msie [6-8]|ms(?=ie \d+)|webkit|^moz(?=.+firefox)|khtml/.exec(
			req.headers['user-agent'].toLowerCase());
		if(uar){
			uar = '-'+uar[0].replace(/msie (\d)/,'ie$1')+'-$&';
		}else{
			uar = '-ie-$&';
		}
		url = url.replace(/[^\/]*\.css$/,uar);
	}
	return url;
}
function writeContent(req,response,url,text){
	var type = url.replace(/^.*\.(\w+)(?:[;?#].*)?$/,'$1');
	switch(type){
	case 'htc':
		console.log('htc:',req.headers['host'])
		type = 'text/x-component';
		break;
	case 'js':
		type = 'text/javascript;charset=utf-8'
		break;
	case 'css':
		type = 'text/css;charset=utf-8'
		break;
	case 'html':
	case 'htm':
		type = 'text/html;charset=utf-8'
		break;
	default:
		console.log('unknow:' ,type)
		type = 'text/html;charset=utf-8'
	}
	response.writeHead(200, {'Content-Type' : type
	});
	response.write(text);
	response.end();
}
function writeNotFound(filepath,response,msg){
     response.writeHead(200, {"Content-Type": "text/plain"});    
     response.write("404 Not Found \n filepath:"+filepath+'\n'+(msg||''));    
     response.end();    
}

function writeDir(url,filepath,response){
	if(/\/$/.test(url)){
		FS.readdir(filepath, function(err, files) {  
     		response.writeHead(200, {"Content-Type": "text/html;charset=UTF-8"}); 
			response.write('<meta content="text/html; charset=UTF-8" http-equiv="content-type"><span>'+filepath+"</span>&#160;<a href='../' title='返回上一级'>↑</a><hr/>",'utf8');
			for(var i=0;i<files.length;i++){
				response.write("<a href='"+files[i]+"'>"+files[i]+'</a><hr/>','utf8');
			}
			response.end();
		});
	}else{
		response.writeHead(301, {"Location" : url+'/'});    
	            	response.end();    
	}
}
exports.startRbsServer = startRbsServer;