const Swagger = require('./Swagger');

class Auth extends Swagger {

  constructor() {
    super();
    this.paths = {};
  }

  generate() {
    return this.paths;
  }
}

module.exports = Auth;
