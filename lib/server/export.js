var FS = require('fs');
var Path = require('path');
var http = require('http');
var zipstream = require('zipstream');
exports.createExportAction = createExportAction;
function createExportAction(rbs){
	var root = Path.normalize(rbs.root);
	return function(request,response,next){
		if(/GET/i.test(request.method)){
			response.writeHead(200, {'Content-Type' :'text/html;charset=utf-8'});
			readFiles(root,function(result){
				var template = FS.readFileSync(require.resolve('./export.html')).toString();
				response.write(template.replace('${content}',result.sort().join('\n')));
				response.end()
			})
		}else{//post
			var host = request.headers.host;
			var buf = [];
			var queryparse = require('querystring').parse
			var zip = zipstream.createZip({ level: 1 });
			var disposition = 'attachment; filename=' + encodeURIComponent(root.replace(/.*[\\\/]/,'') + '-site.zip');
			//console.log('disposition:',disposition);
			response.writeHead(200,{
				"Content-Type":'application/zip'
				,'Content-Disposition': disposition
			});
			zip.pipe(response);
			request.on('data',function(data){
				buf.push(data.toString());
			}).on('end',function(){
				var params = queryparse(buf.join(''));
				var list = params.list;
				function oncomplete(written) { 
					response.end();
					console.log(written + ' total bytes written');
				}
				if(list){
					pack(zip,host,list.replace(/^\s+|\s+$/g,'').split(/[\r\n]+/),oncomplete)
				}else{
					readFiles(root,function(result){
						pack(zip,host,filterResult(result,params),oncomplete);
					})
				}
				
			})
		}
	}
}
function filterResult(result,params){
	var list = result.join('\n');
	if(params.cssBranch){
		list = list.replace(/^(.+?)([^\/]+\.css)/gm,addPrefix);
	}
	if(params.jsBranch){
		list = list.replace(/^(.+?)([^\/]+\.js)$/gm,addPrefix);
	}
	if(params.jsBranch){
		list = list.replace(/^(.+?)([^\/]+\.js)$/gm,addPrefix);
	}
	if(params.jsiClosure){
		list = list.replace(/^(.+?).js$/gm,'$&\n$1__define__.js');
	}
	return list.replace(/^\s+|\s+$/g,'').split(/[\r\n]+/)
}
function addPrefix(a,dir,name){
	return name.charAt()=='-'?a:
			'-ie6-ie7-ie8-ie9-ms-webkit-moz-o'.replace(/-\w+/g,dir+'$&-'+name+'\n')
} 
function pack(zip,host,list,oncomplete){
	var p = host.indexOf(':')
	var options = {
		host: p>0?host.slice(0,p):host,
		port: p>0?host.slice(p+1):80,
		"user-agent":'nodejs',
	};
	var index = list.length;
	var live = 0;
	function next(){
		if(index--){
			var item = list[index];
			if(item){
				options.path = item;
				live++;
//				console.log(live,item)
				http.get(options,function(res){
//					//console.log('end file:',item)
//					res.on('end',function(){
//						console.log(item)
//						live --;
//					})
					zip.addFile(res, { name: item.replace(/^\//,'') }, next);
				}).on('error', function(e) {
					console.log("error: " + e.message);
					next();
				}).end();
			}
		}else{
			zip.finalize(oncomplete);
		}
	}
	next();
}
function readFiles(root,callback){
	var result = [];
	var inc = 0;
	function read(file,path){
		inc++;
		FS.stat(file,function(err,stat){
			if(stat){
				//console.log(path,file,stat.isDirectory())
				if(stat.isDirectory()){
					inc++;
					FS.readdir(file,function(err,files){
						var i = files.length;
						while(i--){
							var n = files[i];
							if(n.charAt() !== '.'){
								read(file+'/'+n,path+'/'+n)
							}
						}
						inc--;
						if(inc<1){callback(result)}
					});
				}else{
					result.push(path)
				}
			}
			inc--;
			//console.log(inc,file)
			if(inc<1){callback(result)}
		})
	}
	read(root,'');
}

