var Path = require('path')
var startServer = require('../lib/server').startServer;
var RBS = require('../lib/rbs').RBS;
var rbs = new RBS();
startServer(rbs);
exports.rbs = rbs;
