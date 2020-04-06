const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  // skipt token verification
  next();
  return;
};
