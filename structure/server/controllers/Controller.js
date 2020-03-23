class Controller {

  all(req, res, next, attribs = {}) {

    this.model
      .fetchAll(attribs)
      .then((models) => {
        res.status(200).send(models);
      })
      .catch(error => {
        let details = {};
        if (error.message) {
          details.message = error.message;
          details.stack = error.stack;
        }

        if (error.response) {
          details.message = error.response.message;
        }

        res.status(400).send({
          message: "Could not fetch the models from the server",
          error: details,
        });
      });
  }

  find(req, res, next, attribs = {}) {
    let id = req.params.id;

    new this.model({ id })
      .fetch(attribs)
      .then((model) => {
        res.status(200).send(model);
      })
      .catch(error => {
        res.status(400).send({ message: "Could not retrieve the model from the server" });
      });
  };

  insert(req, res) {
    let data = req.body;

    new this.model()
      .save(data, { method: 'insert' })
      .then((result) => {
        res.status(200).send(result);
      })
      .catch(error => {
        res.status(400).send({ message: 'Error, Could not insert model' });
      });
  };

  update(req, res) {
    let id = req.params.id;
    let data = req.body;

    new this.model({ id })
      .save(data, { patch: true })
      .then((result) => {
        res.status(200).send(result);
      })
      .catch(error => {
        res.status(400).send({ message: "Error, could not update model" });
      });
  };

  delete(req, res) {
    let id = req.params.id;

    new this.model({ id })
      .destroy()
      .then((model) => {
        res.status(200).send({ message: "Model deleted" });
      })
      .catch(error => {
        res.status(400).send({ result: "Could not delete the model" });
      });
  };
}

module.exports = Controller;
