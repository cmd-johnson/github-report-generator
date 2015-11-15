'use strict';

var passport = require('passport');
var GitHubStrategy = require('passport-github2');
var logger = require.main.logger;
var config = require.main.config.github;

module.exports = init;

function init(app) {
  logger.debug('initializing passport...');

  passport.serializeUser(function(user, done) {
    return done(null, user);
  });
  passport.deserializeUser(function(obj, done) {
    return done(null, obj);
  });

  passport.use(new GitHubStrategy({
    clientID: config.clientID,
    clientSecret: config.clientSecret,
    callbackURL: config.callbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  logger.debug('passport initialized');
}
