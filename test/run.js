var Path  = require('path');
var FS = require('fs');
var root = Path.resolve('./');

console.log('server start @',root);

var RBS = require('../lib/rbs').RBS;
var rbs = new RBS(root);

require('http').createServer(function (req, response) {
	var url = req.url.replace(/[?#][\s\S]*/,'');
	var filepath = Path.join(root,url);
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
	console.info('request:',url)
	
	FS.stat(filepath,function(error,stats){
	    if(stats){
	    	if(stats.isDirectory()){
	    		return writeDir(url,filepath,response);
	    	}
	    }
	    var text = rbs.getContentAsBinary(url);
	    if(text){
	    	response.writeHead(200, {'Content-Type' : 'text/html;charset=utf-8'});
	    	response.write(text);
	    	response.end();
	    	return;
	    }
	    if(stats){
	    	writeNotFound(filepath,response,"compile failed"); 
	    }else{
	    	writeNotFound(filepath,response); 
	    }
	});
}).listen(2012,'127.0.0.1');
console.log('lite test server is started: http://'+('127.0.0.1')+':' + (2012) );

function writeNotFound(filepath,response,msg){
     response.writeHead(404, {"Content-Type": "text/plain"});    
     response.write("404 Not Found \n filepath:"+filepath+'\n'+(msg||''));    
     response.end();    
}

function writeDir(url,filepath,response){
	if(/\/$/.test(url)){
		FS.readdir(filepath, function(err, files) {  
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
exports.rbs = rbs;