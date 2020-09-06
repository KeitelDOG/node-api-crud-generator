var express = require('express');
var router = express.Router();
const multer = require('multer');

// token authorization
const { verifyToken } = require('../../../middlewares/authorization');

// Declare Controllers
// Auth Controller

// Other Controllers
const TestController = require('../../../controllers/v2/Test');

// Instanciate Controllers
const test = new TestController();


router.get('/', function(req, res) {
  console.log('Main App API v2');
  res
    .status(200)
    .send({ status: 'Success', api: 'Version 2' })
});

// endpoint for authentication

// endpoint for testing API Flow with Versions, should return api version 2
router.get('/tests', test.check.bind(test));


module.exports = router;