var createCgi = require('./cgi').create;
exports.createPhpAction = createPhpAction
function createPhpAction(rbs){
	var cgiMap = {}
	return function(request,response,next){
		var url = request.url;
		
		if(url.match(/\.php(?:[?#][\s\S]*)?$/)){
			var path = url.replace(/\.php(?:[?#][\s\S]*)?$/,'.php')
			var cgi = cgiMap[path];
			if(!cgi){
				cgi = cgiMap[path]=createCgi(rbs.root,path,
					{
						command:'php-cgi',
						env:{
							"SCRIPT_NAME":path,
							"REDIRECT_STATUS": "200"
						}
					}
				)
			}
			cgi(request,response,next);
		}else{
			next(request,response)
		}
	}
}