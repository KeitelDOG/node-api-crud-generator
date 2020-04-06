const Swagger = require('./Swagger');
const Auth = require('./Auth');


class Index {

  constructor(crud, doc) {
    this.crud = crud;
    this.doc = doc;
  }

  generate() {
    this.doc = {
      paths: {}
    };

    // auth endpoints (Auth doc will be empty if not using authentication)
    // retrieve Auth entity
    let entities = this.crud.entities.filter(ent => {
      return ent.hasOwnProperty('auth');
    });

    if (entities.length) {
      const auth = new Auth(entities[0]);
      let data = auth.generate();
      this.doc.paths = {
        ...this.doc.paths,
        ...data.paths,
      };
      this.doc.components = {
        ...this.doc.components,
        ...data.components,
      };
    }

    // PUT ALL SWAGGER CONTROLLERS with Documentation code HERE
    // auto-generated endpoints
    const swagger = new Swagger(this.crud, this.doc);
    this.doc = swagger.generate();

    // other endpoints


    return this.doc;
  }

}

module.exports = Index;
