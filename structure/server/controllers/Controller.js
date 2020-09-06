const fs = require('fs');

class Controller {

  constructor() {
    this.attribs;
    this.sort;
    this.where;
  }

  all(req, res, next) {
    this.attribs = this.attribs || {};
    // uncomment to debug
    //this.attribs.debug = true;

    this.applyRelations(req.query);
    this.applyWhere(req.query);
    this.applyPage(req.query);
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
      .then(results => {
        res.status(200).send({
          models: results.models,
          pagination: results.pagination,
        });
      })
      .catch(error => {
        let details = this.getErrorDetails(error);
        res.status(400).send({
          message: 'Could not fetch the models from the server',
          error: details,
        });
      });
  }

  find(req, res, next) {
    this.attribs = this.attribs || {};
    // uncomment to debug
    //this.attribs.debug = true;

    this.applyRelations(req.query);

    let id = req.params.id;

    new this.model({ id })
      .fetch(this.attribs)
      .then((model) => {
        res.status(200).send(model);
      })
      .catch(error => {
        let details = this.getErrorDetails(error);
        res.status(400).send({
          message: 'Could not retrieve the model from the server',
          error: details
        });
      });
  };

  insert(req, res) {
    let data = req.body;

    // this handle multiple files upload
    // but ONLY 1 file for each field will be used
    if(req.files) {
      // put each filename into corresponding field name
      Object.keys(req.files).forEach(key => {
        let file = req.files[key][0];
        data[file.fieldname] = file.filename;
      });
    }

    new this.model()
      .save(data, { method: 'insert' })
      .then((result) => {
        res.status(201).send(result);
      })
      .catch(error => {
        // unlink the files on error
        if (req.files) {
          Object.keys(req.files).forEach(key => {
            let file = req.files[key][0];
            fs.unlinkSync(file.path);
          });
        }

        let details = this.getErrorDetails(error);
        res.status(400).send({
          message: 'Could not insert model',
          error: details,
        });
      });
  };

  update(req, res) {
    let id = req.params.id;
    let data = req.body;

    new this.model({ id })
      .save(data, { patch: true })
      .then((result) => {
        // Remove old files if any when using multer files upload
        if (req.oldFilepaths) {
          req.oldFilepaths.forEach(path => {
            fs.unlinkSync(path);
          });
        }

        res.status(201).send(result);
      })
      .catch(error => {
        // unlink the files on error
        if (req.files) {
          Object.keys(req.files).forEach(key => {
            let file = req.files[key][0];
            fs.unlinkSync(file.path);
          });
        }

        let details = this.getErrorDetails(error);
        res.status(400).send({
          message: 'Could not update model',
          error: details,
        });
      });
  };

  delete(req, res) {
    let id = req.params.id;

    new this.model({ id })
      .destroy()
      .then((model) => {
        res.status(201).send({ message: 'Model deleted' });
      })
      .catch(error => {
        let details = this.getErrorDetails(error);
        res.status(400).send({
          message: 'Could not delete the model',
          error: details,
        });
      });
  };

  applyWhere(query) {
    this.where = [];
    if(!query.where) {
      return;
    }

    // Multiple sorting, support only Where... AND... , but not OR yet
    // ?where=first_name[.]=[.]Keitel,last_name[.]like[.]Jovin
    let parts = query.where.split('[,]');
    parts.forEach(part => {
      let trio = part.split('[.]');
      if (trio.length === 3) {
        this.where.push({
          column: trio[0],
          operand: trio[1],
          // surround with percentage if operand is 'like'
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

  applyPage(query, attribs) {
    this.page = query.page || 1;
    this.pageSize = query.pageSize || 20;

    this.attribs.page = this.page;
    this.attribs.pageSize = this.pageSize;
  }

  applyLimit(query, attribs) {
    if (query.limit || query.offset) {
      this.limit = query.limit || 20;
      this.offset = query.offset || 0;

      this.attribs.limit = this.limit;
      this.attribs.offset = this.offset;
    }
  }

  applyRelations(query) {
    if(!query.relations) {
      return;
    }

    // remove all relations if false
    if (query.relations === 'false') {
      delete this.attribs.withRelated;
      return;
    }

    // Cascade Relation support
    // ?relations=user,posts.comments
    let relations = query.relations.split(',');
    relations.forEach(relation => {
      this.attribs.withRelated = this.attribs.withRelated || [];
      this.attribs.withRelated.push(relation);
    });
  }

  getErrorDetails(error) {
    let details = {};
    if (error.message) {
      details.message = error.message;
      details.stack = error.stack;
    }

    if (error.response && !details.message) {
      details.message = error.response.message;
    }

    return details;
  }
}

module.exports = Controller;
