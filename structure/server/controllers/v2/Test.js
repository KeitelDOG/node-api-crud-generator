const TestV1Controller = require('../v1/Test');

class TestController extends TestV1Controller {
  constructor() {
    super();
  }

  check(req, res) {
    res.status(200).send('test check called from api v2');
  }

}

module.exports = TestController;
