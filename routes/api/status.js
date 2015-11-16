'use strict';

var Router = require('express').Router;
var router = new Router();

module.exports = router;

router.get('', function(req, res) {
  var user = {
    loggedIn: req.isAuthenticated(),
    username: req.user.username || '',
    displayName: req.user.displayName || ''
  };
  res.json(user);
});
