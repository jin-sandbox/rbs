var Path = require('path')
var root = Path.resolve('./');
var startRbsServer = require('../lib/server').startRbsServer;
exports.rbs = startRbsServer(root);
