'use strict';

var bodyParser = require('body-parser');
var express = require('express');
var session = require('express-session');

var app = express();

// mount config and logger object on the main module
var config = module.config = require('./config/');
var logger = module.logger = require('./util/logger');

// parse urlencoded and json bodies
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// enable session cookies
app.use(session({
  secret: config.server.session.secret,
  saveUninitialized: false,
  resave: false
}));

// enable github authentification (has to be done after the session is initialized)
require('./util/auth')(app);

// register routes
app.use('/', require('./routes/'));

// start the server
var port = process.env.port || config.server.port || 3000;
app.listen(port, function() {
  logger.info('now listening on port ' + port);
});

// log uncaught exceptions
process.on('uncaughtException', function(err) {
  logger.fatal('uncaught exception', err);
});
