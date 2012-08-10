var createCgi = require('./cgi/cgi').create;
exports.createPhpAction = createPhpAction
function createPhpAction(rbs){
	return function(request,response,next){
		var url = request.url;
		if(url.match(/\.php(?:[?#][\s\S]*)?$/,'')){
			createCgi(rbs.root,url,
				{
					command:'php-cgi',
					env:{
						"SCRIPT_NAME":url,
						"REDIRECT_STATUS": "200"
					}
				}
			)(request,response,next);
		}else{
			next(request,response)
		}
	}
}