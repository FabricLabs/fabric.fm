var config = require('./config');

var Maki = require('maki');
var fabric = new Maki(config);

fabric.start();
