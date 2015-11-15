'use strict';

var Router = require('express').Router;
var router = new Router();

var passport = require('passport');

module.exports = router;

router.get('', passport.authenticate('github', {
  scope: [
    'user:email',
    'repo'
  ]
}));

router.get('/callback', passport.authenticate('github', { failureRedirect: '../' }),
  function(req, res) {
    res.redirect('/');
  }
);
