'use strict';

var express = require('express');
var path = require('path');

var Router = express.Router;
var router = new Router();

module.exports = router;

router.use('/login', require('./login'));
router.use('/api', require('./api'));
router.use('/', express.static(path.join(__dirname, '../public')));
