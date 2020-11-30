const Controller = require('../Controller');

class TestController extends Controller {
  check (req, res) {
    res.status(200).send('test check called from api v1');
  }
}

module.exports = TestController;
