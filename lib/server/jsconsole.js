var readline = require('readline').createInterface(process.stdin, process.stdout)

exports.JSConsole =JSConsole;
JSConsole.prototype.add = function(pattern,action){
	var list = this.action;
	if(pattern instanceof RegExp){
		(list['']||(list['']=[])).push(function(cmd){
			var m = pattern.match(cmd);
			if(m){
				return action(cmd,m)
			}
		})
	}else{
		cmd = cmd || '';
		(list[cmd]||(list[cmd]=[])).push(action)
	}
}

JSConsole.prototype.question = function(title,action,next){
	if(this.questionStack.push(arguments)==1){
		question.apply(this.questionStack,arguments)
	}
	return this;
}
function question(title,action,next){
	var questionStack = this;
	readline.question(title+':', function(v) {
		questionStack.shift();
		action(v)
		next && next()
		var args = questionStack[0];
		reset();
		args && question.apply(questionStack,args)
		
	});
	
}
//	this.add('help',function(){
//		console.log('block ^/static/.*\\.js$ 100');
//		console.log('block ^/static/.*\\.js$ 0');
//		console.log('block');
//	})
//	this.add('block',function(){
//		console.log(listBlock())
//	})
//	this.add(null,function(){
//		try{
//			var v = eval(line);
//			if(/^[\._\w]+$/.test(line)){
//				v = require('util').inspect(v,true);
//			}
//			console.log(v);
//		}catch(e){
//			console.log(e);
//		}
//	})
//	this.add(/^block\s+(.*?)\s+(\d+)$/,function(cmd,block){
//		if(block[2] == 0){
//			removeBlock(block[1]);
//		}else{
//			addBlockn(block[1],block[2]);
//		}
//	})
//	this.add(/^trace(?:\s+(\w+))?$/,function(cmd,trace){
//		if(trace[1]){
//			traceRequest = /true|yes|1/i.test(trace[1])
//		}else{
//			console.log('trace:',traceRequest)
//		}
//		return true
//	})

function JSConsole(){
	this.questionStack = []
	var cs = this;
	this.action = {'':[
		function(line){
			try{
				var v = eval(line);
				if(/^[\._\w]+$/.test(line)){
					v = require('util').inspect(v,true);
				}
				console.log(v);
			}catch(e){
				console.log(e);
			}
		}]};
	reset();
	readline.on('line', function(line) {
		if(!line){return;}
		var line = line.trim();
		var action = cs.action[line];
		if(action instanceof Array || (action = cs.action['']) instanceof Array){
			var i = action.length;
			while(i--){
				if(action[i](line)){break};
			}
		}
		reset();
	}).on('close', function() {
		process.exit(0);
	});
}
function reset(prompt){
	readline.setPrompt(prompt||'js>');
	readline.prompt();
}
//var cs = new JSConsole();
//cs.question('test1',function(v){
//	console.log(1,v)
//})
//cs.question('test2',function(v){
//	console.log(2,v)
//})

