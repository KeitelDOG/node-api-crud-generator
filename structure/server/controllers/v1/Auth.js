const User = require('../../models/User.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Function to encrypt password
exports.hashPass = (pass, cb) => {
  bcrypt.hash(pass, 10, function(err, hash) {
    cb(hash);
  });
};

//Function to decrypt password
exports.decrypt = (password, hashPass, cb) => {
  bcrypt.compare(password, hashPass, function(err, res) {
    cb(err, res);
  });
};

// Signup method for user
exports.signup = (req, res) => {
  let data = req.body;

  exports.hashPass(data.password, (password)=>{
    data.password = password;
    User.insert(data, (error, user)  => {
      if (error) {
        res.status(403).send({
          message: "Can't signup the user",
          error
        });
      } else {
        res.status(200).send(user);
      }
    });
  });
};

// Create user signin process
exports.signin = (req, res) => {
  let data = req.body;

  User.findByEmail(data.email, (error, user) => {
    if (error) {
      res.status(400).send({ message: 'Email does not exists' });
    } else {
      exports.decrypt(data.password, user.password, (error, response) => {
        if(error) {
          res.status(400).send({ message: 'Wrong user credentials' });
        }else {
          delete user.password;
          let token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '720h' });
          res.status(200).send({ token, user });
        }
      });
    }
  });
};
