var createCgi = require('./cgi').create;
exports.createPhpAction = createPhpAction
function createPhpAction(rbs){
	var cgiMap = {}
	return function(request,response,next){
		var url = request.url;
		if(url.match(/\.php(?:[?#][\s\S]*)?$/,'')){
			var cgi = cgiMap[url];
			if(!cgi){
				cgi = cgiMap[url]=createCgi(rbs.root,url,
					{
						command:'php-cgi',
						env:{
							"SCRIPT_NAME":url,
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