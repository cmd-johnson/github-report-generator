'use strict';

var Router = require('express').Router;
var router = new Router();

module.exports = router;

router.use('/login', require('./login'));
