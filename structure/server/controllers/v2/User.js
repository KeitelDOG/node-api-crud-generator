const User = require('../../models/User');
const UserV1Controller = require('../v1/User');

class UserController extends UserV1Controller {
  constructor() {
    super();
  }

  all(req, res) {
    console.log('called form api v2');
    super.all(req, res);
  }

}

module.exports = UserController;
