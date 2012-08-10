var Path  = require('path');
var FS = require('fs');
var serverExt = require('./server-ext');
exports.createStaticAction =createStaticAction;
function createStaticAction(rbs,callback){
	var root = rbs.root ;
	return function (req, response) {
		var url =getRequestURL(req);
		var filepath = Path.join(root,url);
		
		//console.info('request:',url)
		FS.stat(filepath,function(error,stats){
		    if(stats){
		    	if(stats.isDirectory()){
		    		return writeDir(url,filepath,response);
		    	}
		    }
		    try{
		    	var text = rbs.getContentAsBinary(url);
		    }catch(e){
		    	console.error('compile failed:',url,e.stack || e);
		    	//throw e;
		    }
		    if(text != null){
		    	return writeContent(req,response,url,text);
		    }
		    if(callback){
		    	callback(req,response);
		    }else{
		    	if(stats){
		    		writeNotFound(filepath,response,"compile failed"); 
		    	}else{
		    		writeNotFound(filepath,response); 
		    	}
		    }
		});
	}
}


function getRequestURL(req){
	url = req.url.replace(/[?#][\s\S]*/,'');
	var uap = /\/[\w][^\/]*\.css$/
	if(url.match(uap)){
		var uar = /^o(?=pera)|msie [6-8]|ms(?=ie \d+)|webkit|^moz(?=.+firefox)|khtml/.exec(
			(req.headers['user-agent']||'').toLowerCase());
		if(uar){
			uar = '-'+uar[0].replace(/msie (\d)/,'ie$1')+'-$&';
		}else{
			uar = '-ie6-$&';
		}
		url = url.replace(/[^\/]*\.css$/,uar);
	}
	return url;
}
function writeContent(req,response,url,text){
	var type = url.replace(/^.*\.(\w+)(?:[;?#].*)?$/,'$1').toLowerCase();
	switch(type){
	case 'htc':
		//type = 'text/x-component';
		type = "application/octet-stream"
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
	case 'jpg':
		type = 'jpeg';
	case 'png':
	case 'gif':
	case 'jpeg':
		type = 'image/'+type;
		break;
	default:
		console.log('unknow:' ,type)
		type = 'text/html;charset=utf-8'
	}
	var expires = new Date(+new Date + 1000 *1)
	var headers = {'Content-Type' : type,"Expires":expires.toGMTString(),"Cache-Control": +expires}
	response.writeHead(200, headers);
	response.write(text);
	var wait = serverExt.getBlockTime(req);
	if(wait >=0){
		setTimeout(function(){response.end()},wait);
	}else{
		response.end()
	}
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
			FS.readFile(require.resolve('rbs/lib/index.html'),'utf-8',
				function(err,tmp){
					var buf = []
					for(var i=0;i<files.length;i++){
						var file = files[i];
						buf.push("<div class='file-row'><a href='",file,"'>",file,'</a></div>\n');
					}
					tmp = tmp.replace('$!{dir}',filepath).replace('$!{content}',buf.join(''));
					response.write(tmp,'utf-8')
					response.end();
				});
		});
	}else{
		response.writeHead(301, {"Location" : url+'/'});    
	            	response.end();    
	}
}