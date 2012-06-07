var FS = require('fs');
var Path = require('path');
var http = require('http');
var zipstream = require('zipstream');
var template = FS.readFileSync(require.resolve('./export.html')).toString();
exports.exportAction = exportAction;
function exportAction(request,response,rbs){
	var root = Path.normalize(rbs.root);;
	if(/get/i.test(request.method)){
		response.writeHead(200, {'Content-Type' :'text/html;charset=utf-8'});
		readFiles(root,function(result){
			response.write(template.replace('${content}',result.sort().join('\n')));
			response.end()
		})
	}else{//post
		var host = request.headers.host;
		var buf = [];
		var queryparse = require('querystring').parse
		var zip = zipstream.createZip({ level: 1 });
		zip.pipe(response);
		response.writeHead({
			"Content-Type":'application/zip',
			'Content-Disposition': 'attachment;filename=' + root.replace(/.*[\\\/]/,'') + '-site.zip'
		});
		request.on('data',function(data){
			buf.push(data.toString());
		}).on('end',function(){
			var list = queryparse(buf.join('')).list.replace(/^\s+|\s+$/g,'').split(/[\r\n]+/);
			pack(zip,host,list)
			
		})
	}
}
function pack(zip,host,list){
	var p = host.indexOf(':')
	var options = {
		host: p>0?host.slice(0,p):host,
		port: p>0?host.slice(p+1):80,
		"user-agent":'nodejs',
		path: '/'
	};
	var index = list.length;
	function next(){
		if(index--){
			var item = list[index];
			if(item){
				options.path = item;
				http.get(options,function(res){
					console.log('addFile:',item)
					zip.addFile(res, { name: item.replace(/^\//,'') }, next);
				}).on('error', function(e) {
					console.log("error: " + e.message);
				}).end();
			}
		}else{
			zip.finalize(function(written) { 
				console.log(written + ' total bytes written');
			});
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

//readFiles('.',function(result){
//	console.log(result,result.length)
//})

function doExport(rbs,fileList){
	var zipstream = require('zipstream');
	//var out = fs.createWriteStream('out.zip');
	var zip = zipstream.createZip({ level: 1 });

	zip.pipe(out);

	zip.addFile(fs.createReadStream('README.md'), { name: 'README.md' }, function() {
		zip.addFile(fs.createReadStream('example.js'), { name: 'example.js' },
			function() {
				zip.finalize(function(written) { console.log(written + ' total bytes written'); });
			});
		});
}