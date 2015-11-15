'use strict';

// disable console warnings of eslint
/* eslint-disable no-console */

var config = require.main.config.logger;
var winston = require('winston');
var Logger = winston.Logger;

// add all colors and levels defined in the config
var colors = {};
var levels = {};
config.levels.forEach(function(level, index) {
  colors[level.name] = level.color;
  levels[level.name] = index;
});

// add a transport object for every transport defined in the config
var transports = [];
config.transports.forEach(function(transport) {
  try {
    transports.push(new winston.transports[transport.type](transport));
  } catch (exception) {
    console.warn('error instanciating transport ' + JSON.stringify(transport));
  }
});

// create and export the logger object
var logger = new Logger({
  colors: colors,
  levels: levels,
  transports: transports
});
module.exports = logger;
