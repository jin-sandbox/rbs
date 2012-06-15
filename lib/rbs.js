var VFS = new require('./vfs').VFS;
var Crypto = require('crypto');
var Path = require('path');
var URL = require('url');
var FS = require('fs');

var BINARY_BUILDER = 0;
var TEXT_BUILDER = 1;
var TEXT_FILTER = 2;
var DOM_BUILDER = 3;
var DOM_FILTER = 4;
var SERIALIZER = 5;
function ResourceBase(instance,path,prefix,postfix){
	this.instance = instance;
	this.path = path;
	this.contents = [];
	this.caches = [];
	this.relations = [];
	this.time = +new Date();
	this.prefix = prefix;
	this.postfix = postfix;
}

/**
 * 添加关联文件
 * @public
 * @param path 文件路径（相对当前处理文件）
 */
ResourceBase.prototype.addRelation = function(relation){
	push(this.instance.cleanMap,relation,this.path)
	this.relations.push(relation);
};
function push(map,key,value){
	if(key in map){
		if(map[key].indexOf(value)<0){
			map[key].push(value)
		}
	}else{
		map[key] = [value]
	}
}
function RBS(rootPath){
	/**
	 * {
	 * 	'prefix::postfix':{
	 * 		cleanMap:{
	 * 			'${path}' : []
	 * 		}
	 * 		resourceMap:{
	 * 			'${path}' : {
	 * 				relations:[relation1,..],
	 * 				contents:[content1,content2...],
	 * 				time:+new Date()
	 * 			}
	 * 		}
	 * 		
	 *  }
	 * }
	 */
	var instanceMap = {};
	var file2pathMappers = [];
	var path2fileMappers = [];
	var globalsFilters = [];
	var textBuilderStart = 0;
	var textFilterStart = 0;
	var domBuilderStart = 0;
	var domFilterStart = 0;
	
	var serializeFilter = [];
	var translators = [];
	var rbs = this;
	var vfs = new VFS(_onChange);
	var binaryMap = {};
	var fileMap = {};
	this.config = {}
	
	
	rootPath = this.root = Path.normalize(rootPath||Path.resolve('./'))

	/**
	 * 
	 */
	function load(path,prefix,postfix,lastIndex){
		for(var i = 0;i<path2fileMappers.length;i++){
			path = path2fileMappers[i](path);
		}
		var instanceKey = [prefix,postfix].join('::');
		var instance = instanceMap[instanceKey] || (instanceMap[instanceKey] = {key:instanceKey,cleanMap:{},resourceMap:{}});
		var resource = instance.resourceMap[path] || 
				( instance.resourceMap[path] = new ResourceImpl(instance,path,prefix,postfix));
		var contents = resource.contents;
		var data;
		if(lastIndex in contents){
			return resource;
		}
		for(var i=0;i<=lastIndex;i++){
			if(contents[i]===undefined){
				var pf = globalsFilters[i];
				if(pf[0].test(path)){
					data = _require(rbs,resource,data,i);
					data = pf[1].call(rbs,resource,data);
				}
				contents[i] = data || null;
			}else{
				data = contents[i];
			}
			resource.index = i;
		}
		return resource;
	}
	function _require(rbs,resource,data,i){
		if(data === undefined){
			data = _defaultBinaryBuilder(resource);
			//console.log("debug",resource.sourcePath || resource.path,data)
		}
		if(i>=textFilterStart){
			data = _defaultTextFilter.call(rbs,resource,data);
			if(i>=domFilterStart){
				data = _defaultDOMFilter.call(rbs,resource,data);
			}
		}
		return data;
	}
	function _defaultBinaryBuilder(resource){
		var path = resource.sourcePath|| resource.path;
		return resource.getExternalAsBinary(
				Path.resolve(rootPath,'.'+path));
	}
	function _defaultDOMFilter(resource,dom){
		return dom;
	}
	function  _defaultTextFilter(resource,buf){
		return Buffer.isBuffer(buf)? buf.toString():buf;
	}
	function  _defaultSerializeFilter(resource,data){
		if(data == null){
			data = _defaultBinaryBuilder(resource);
		}
		if(Buffer.isBuffer(data)){
			return data;
		}else if(data){
			return new Buffer(data.toString());
		}
		
	}
	function _serialize(res,data){
		var path = res.path;
		for(var i=0;i<serializeFilter.length;i++){
			var pf = serializeFilter[i];
			if(pf[0].test(path)){
				data = pf[1].call(this,res,data);
			}
		}
		return _defaultSerializeFilter.call(this,res,data);
	}
	function _hash(res,data){
		data = _serialize.call(this,res,data)
		return Crypto.createHash('md5').update(data).digest('base64');
	}
	function _translate(resource,data,translator){
		var caches = resource.caches
		var len = translators.length;
		for(var i = 0;i<len;i++){
			if(translator === translators[i]){
				break;
			}
		}
		if(i in caches){
			return caches[i]
		}
		if(i == len){
			translators[i] = translator;
		}
		return caches[i] = translator.call(rbs,resource,data);
	}
	/**
	 * @public
	 * @param path 文件路径
	 * @param prefix such as browser info: -webkit,-moz,-o,-ms
	 * @param postfix such as i18n key: zh_CN,zh_TW
	 * @param translator 
	 * @return Buffer cache
	 */
	function getContent(path,prefix,postfix,translator){
		if(prefix == undefined){
			var m = path.match(/(^.*\/)(\-[^-]+\-)([^\/]+)$/)
			if(m){
				prefix = m[2];
				path = m[1]+m[3];
			}
		}
		var resource = load(path,prefix,postfix,globalsFilters.length-1);
		var data = resource.contents;
		data = data[data.length-1];
		if(translator){
			return _translate(resource,data,translator)
		}
		return  data;
		
	}
	function getContentAsBinary(path,prefix,postfix){
		return getContent(path,prefix,postfix,_serialize);
	}
	
	function getContentHash(path,prefix,postfix){
		return getContent(path,prefix,postfix,_hash);
	}
	
	function ResourceImpl(){
		ResourceBase.apply(this,arguments)
	}
	function _addFilter(pattern,impl,type){
		var item = [pattern,impl];
		switch(type){
			case BINARY_BUILDER:
				globalsFilters.splice(textBuilderStart++,0,item);
				item = null;
			case TEXT_BUILDER:
				item && globalsFilters.splice(textFilterStart,0,item) ;
				item = null;
				textFilterStart++;
			case TEXT_FILTER:
				item && globalsFilters.splice(domBuilderStart,0,item) ;
				item = null;
				domBuilderStart++;
			case DOM_BUILDER:
				item && globalsFilters.splice(domFilterStart,0,item) ;
				item = null;
				domFilterStart++;
				break;
			case DOM_FILTER:
				globalsFilters.push(item)
				break;
			case SERIALIZER:
				serializeFilter.push(item)
		}
		
	}
	this.getContent = getContent;
	this.getContentAsBinary = getContentAsBinary;
	this.getContentHash = getContentHash;
	
	
	/*======================  on initialize time  =====================*/
	/*======================  need reset after invoked ================*/ 
	this.addBinaryBuilder = function(pattern,impl){
		_addFilter(pattern,impl,BINARY_BUILDER);
	}
	this.addTextBuilder = function(pattern,impl){
		_addFilter(pattern,impl,TEXT_BUILDER);
	}
	this.addTextFilter = function(pattern,impl){
		_addFilter(pattern,impl,TEXT_FILTER);
	}
	this.addDOMBuilder = function(pattern,impl){
		_addFilter(pattern,impl,DOM_BUILDER);
	}
	this.addDOMFilter = function(pattern,impl){
		_addFilter(pattern,impl,DOM_FILTER);
	}
	this.addSerializer = function(pattern,impl){
		_addFilter(pattern,impl,SERIALIZER);
	}
	this.addPathMapper = function(pattern,u2f,f2u){
		f2u && file2pathMappers.push(f2u);
		u2f && path2fileMappers.push(u2f)
	}
	
	
	
	
	
	/* vfs connect */
	ResourceImpl.prototype = new ResourceBase()
	/**
	 * 用于在插件运行过程中，装载指定路径下内容，并经过当前以执行的过滤器处理后的文本。
	 * @public
	 * @param path 文件路径（相对网站根目录）
	 * @return String 文件内容文本
	 */
	ResourceImpl.prototype.load = function(path){
		var index = this.index;
		var res = load(URL.resolve(this.path,path),this.prefix,this.postfix,index);
		var data = res.contents[index];
		if(data==null){
			data = _defaultBinaryBuilder(this);
			if(index>=textFilterStart){
				data = _defaultTextFilter(data);
				if(index>=domFilterStart){
					data = _defaultDOMFilter(data);
				}
			}
		}
		return data;
	};
	ResourceImpl.prototype.getExternalAsBinary = function(file){
		var key = this.instance.key;
		//console.log(file,rootPath,Path.resolve(rootPath,'.'+file))
		file = vfs.getFile(file,key);
		if(!file){return ;}
		//console.log(key,file)
		return _getDataAsBinary(this.path,key,file)
	
	}
	function _getDataAsBinary(path,key,file){
		var data = binaryMap[file];
		var map = fileMap[file];
		if(!map){
			map = fileMap[file] = {};
		}
		push(map,key,path)
		if(!data){
			try{
				data = FS.readFileSync(file);
				//if(data.length == 0){/*file == undefined;*/console.info('empty file:',file);data = null;//??}
			}catch(e){}
			binaryMap[file] = data;
			//console.log("###",file,data.toString())
		}
		return data;
	}
	
	
	function _onChange(key,file){
		delete binaryMap[file];
		var path = Path.relative(rootPath,file).replace(/\\/g,'/').replace(/^\w/,'/$&')
		var instance = instanceMap[key];
		var map = fileMap[file];
		console.info("_onChange:",file,path);
		if(instance){
			var cleanMap = instance.cleanMap;
			var resourceMap = instance.resourceMap;
			if(map && map[key]){
				console.info('_remove_resource_cache from fileMap',map[key])
				_remove_resource_cache(resourceMap,map[key]);
			}
			if(path in cleanMap){
				console.info('_remove_resource_cache from cleanMap',cleanMap[path])
				_remove_resource_cache(resourceMap,cleanMap[path])
				delete cleanMap[path];
			}
		}
	}
	function _remove_resource_cache(resourceMap,list){
		var i = list && list.length;
		while(i--){
			delete resourceMap[list[i]];
		}
	}
}
exports.RBS = RBS;
