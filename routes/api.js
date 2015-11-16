'use strict';

var config = require.main.config.github;

var Router = require('express').Router;
var router = new Router();

module.exports = router;
module.exports.ensureAuthenticated = ensureAuthenticated;
module.exports.getRequestHeaders = getRequestHeaders;

router.use('/status', require('./api/status'));
router.use('/repositories', require('./api/repositories'));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    message: 'you need to be logged in to use this endpoint'
  });
}

function getRequestHeaders(user) {
  var headers = {
    Authorization: 'Bearer ' + user.accessToken,
    'User-Agent': config.userAgent
  };
  return headers;
}
