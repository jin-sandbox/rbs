var cp = require('child_process').spawn(
'php-cgi',['D:/workspace/node_modules/rbs/test.php'],{stdio: [null,process.stdout,null]},function(){
	console.dir(arguments)
})
//cp.stdout.end();
//,{ stdio: 'inherit' }
//console.log(cp.getgid())
//cp.stdout.pipe(process.stdout)
//cp.stdin.pipe(process.stdin)
//cp.on('data',function(){
//	console.dir(arguments)
//}).on('error',function(){
//	console.dir(arguments)
//}).on('exit',function(){
//	console.dir('exit!!!')
//})