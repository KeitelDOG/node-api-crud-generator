var express = require('express');
var router = express.Router();
const multer = require('multer');

// token authorization
const { verifyToken } = require('../../../middlewares/authorization');

// Declare Controllers
// Auth Controller
//const Auth = require('../../../controllers/v2/Auth');
// Other Controllers

// Instanciate Controllers


router.get('/', function(req, res) {
  console.log('Megalobiz Main App API v2');
  res
    .status(200)
    .send({ status: 'Success', api: 'Version 2' })
});

// endpoints


module.exports = router;