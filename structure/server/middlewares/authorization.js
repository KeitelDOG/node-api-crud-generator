// const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  // skip token verification
  // generator will replace with middleware if need for Authentication
  next();
  return null;
};
