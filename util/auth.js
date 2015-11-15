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
    var user = {
      username: profile.username,
      displayName: profile.displayName,
      reposUrl: profile._json.repos_url,
      accessToken: accessToken
    };
    return done(null, user);
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  logger.debug('passport initialized');
}
