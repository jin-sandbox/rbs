var Path = require('path');
var FS = require('fs');
var readline = require('readline').createInterface(process.stdin, process.stdout)
var exampleMap = {}
var webURL ;
var blockTimes = [];

exports.init =init;
exports.addExample =addExample;
exports.getBlockTime =getBlockTime;

function addBlock(pattern,time1,time2){
	pattern = new RegExp(pattern);
	var source = pattern+'';
	var i = blockTimes.length;
	while(i--){
		var item = blockTimes[i];
		if(item[0] == source){
			return blockTimes[i] = [pattern,time1,time2]
		}
	}
	blockTimes.push([pattern,time1,time2])
}
addBlock('\/wait\.js\\b',1000,1000)
function getBlockTime(url){
	var i = blockTimes.length;
	while(i--){
		var item = blockTimes[i];
		if(item[0].test(url)){
			return item[1] + parseInt(Math.random() * item[2] || 0);
		}
	}
}
function removeBlock(pattern){
	pattern = new RegExp(pattern)+'';
	var i = blockTimes.length;
	while(i--){
		if(blockTimes[i][0] == pattern){
			return blockTimes.splice(i,1)[0]
		}
	}
}

function listBlock(){
	return blockTimes.join('\n')
}
function addExample(path,content){
	exampleMap[path] = content;
}
function init(root,url){
	webURL = url;
	console.log('rbs test server is started success!!\nfile :\t'+root+
			'\nurl :\t'+url );
	//var exampleStatus = checkExample('static/cs.js','static/cs.htc','example/test.css','example/test.html');
	var missedAndChanged = [[],[]];
	for(var path in exampleMap){
		try{
			var source = FS.readFileSync(Path.resolve(path));
			var expect = exampleMap[path]
			if(source+'' != expect+''){
				//console.log(path,(source+'').substr(0,100) , ''+(expect+'').substr(0,100))
				missedAndChanged[1].push(path);//changed
			}
		}catch(e){
			if(e.code == 'ENOENT'){
				missedAndChanged[0].push(path);//missed
			}
		}
	}
	addMissedFile.apply(this,missedAndChanged)
}
function addMissedFile(missed,changed){
	if(missed.length){
		console.log('missed example files:\n',missed);
		readline.question('add it? (yes|no)', function(v) {
			if(/yes/i.test(v)){
				writeExample(missed)
			}
			addChangedFile(changed)
		});
	}else{
		addChangedFile(changed)
	}
}
function addChangedFile(changed){
	if(changed.length){
		console.log('changed example files:\n',changed);
		readline.question('replace it ? (yes|no)', function(v) {
			if(/yes/i.test(v)){
				writeExample(changed)
			}
			openURL()
		});
	}else{
		openURL()
	}
}
function openURL(){
//	var libpath = require.resolve('cs/lib/runtime/index.js');
//	var filepath = Path.resolve('./lib/runtime/index.js');
//	if(libpath == filepath){//in development . no not start by default.
	try{
		var openURL = require('openurl')
		readline.question('open default web browser for test ? (yes|no)', function(v) {
			if(/yes/i.test(v)){
				openURL.open(webURL)
			}
			openJSConsole()
		});
	}catch(e){
		return openJSConsole();
	}
}
function openJSConsole(){
	readline.setPrompt('js>');
	readline.prompt();
	readline.on('line', function(line) {
		switch(line.trim()) {
		case 'help':
			console.log('block ^/static/.*\\.js$ 100');
			console.log('block ^/static/.*\\.js$ 0');
			console.log('block');
			break;
		case 'block':
			console.log(listBlock())
			break;
		default:
			var block = /^block\s+(.*?)\s+(\d+)$/.exec(line);
			if(block){
				if(block[2] == 0){
					removeBlock(block[1]);
				}else{
					addBlockn(block[1],block[2]);
				}
			}else{
				try{
					var v = eval(line);
					if(/^[\._\w]+$/.test(line)){
						v = require('util').inspect(v,true);
					}
					console.log(v);
				}catch(e){
					console.log(e);
				}
			}
		}
		readline.setPrompt('js>');
		readline.prompt();
	}).on('close', function() {
		process.exit(0);
	});
}

/*========================================= util ========================================*/
function writeExample(files){
	for(var i = 0;i<files.length;i++){
		var path = files[i];
		//需要部署示例
		var dir = path.replace(/[^\/]+$/,'')
		try{
			FS.readFileSync(Path.resolve(dir));
		}catch(e){
			if(e.code == 'ENOENT'){
				//需要创建目录
				console.log('mkdir:',dir)	
				FS.mkdirSync(dir);
			}
		}
		console.log('copy file:',path)
		var content = exampleMap[path];
		FS.writeFile(path, content);
	}
}



