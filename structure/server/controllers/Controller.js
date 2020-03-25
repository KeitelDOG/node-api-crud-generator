class Controller {

  constructor() {
    this.attribs = {};
    this.sort;
    this.where;
  }

  all(req, res, next) {
    // uncomment to debug
    //this.attribs.debug = true;

    this.applyRelations(req.query);
    this.applyWhere(req.query);
    this.applyLimit(req.query);
    this.applySort(req.query);

    new this.model().query(qb => {
      // where
      this.where.forEach(({ column, operand, value }) => {
        if (value !== null) {
          qb.where(column, operand, value);
        } else if (operand === 'null') {
          qb.whereNull(column);
        } else if (operand === 'notNull') {
          qb.whereNotNull(column);
        }
      });

      // sort
      this.sort.forEach(({ column, order }) => {
        qb.orderBy(column, order);
      });
    })
      .fetchPage(this.attribs)
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

  find(req, res, next) {
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

  applyWhere(query) {
    this.where = [];
    if(!query.where) {
      return;
    }

    // Multiple sorting, support only Where... AND... , but not OR yet
    // ?where=first_name[.]=[.]Keitel,last_name[.]like[.]Jovin
    let parts = query.where.split(',');
    parts.forEach(part => {
      let trio = part.split('[.]');
      if (trio.length === 3) {
        this.where.push({
          column: trio[0],
          operand: trio[1],
          // surround with percentage if operand is "like"
          value: trio[1] === 'like' ? '%' + trio[2] + '%' : trio[2]
        });
      } else if (trio.length === 2) {
        this.where.push({
          column: trio[0],
          operand: trio[1],
          value: null,
        });
      }
    });
  }

  applySort(query) {
    this.sort = [];
    if(!query.sort) {
      return;
    }

    // Multiple sorting
    // ?sort=first_name.desc,last_name.desc
    let parts = query.sort.split(',');
    parts.forEach(part => {
      let kv = part.split('.');
      if (kv.length > 1) {
        this.sort.push({
          column: kv[0],
          order: kv[1]
        });
      }
    });
  }

  applyLimit(query, attribs) {
    this.limit = query.limit || 20;
    this.offset = query.offset || 0;

    this.attribs.limit = this.limit;
    this.attribs.offset = this.offset;
  }

  applyRelations(query) {
    if(!query.relations) {
      return;
    }

    // remove all relations if false
    console.log('relations', query.relations);
    if (query.relations === 'false') {
      delete this.attribs.withRelated;
      return;
    }

    // Multiple sorting, support only Where... AND... , but not OR yet
    // ?where=first_name[.]=[.]Keitel,last_name[.]like[.]Jovin
    let relations = query.where.split(',');
    relations.forEach(relation => {
      this.attribs.withRelated = this.attribs.withRelated || [];
      this.attribs.withRelated.push(relation);
    });
  }
}

module.exports = Controller;
