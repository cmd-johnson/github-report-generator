'use strict';

var config = {};

// automatically load all non-hidden .json files in the config directory
require('fs').readdirSync(__dirname).filter(function(filename) {
  return filename.indexOf('.') !== 0 && filename.endsWith('.json');
}).forEach(function(filename) {
  // strip the .json extension
  var name = filename.slice(0, filename.length - 5);
  // load the config files
  config[name] = require('./' + filename);
});

module.exports = config;
