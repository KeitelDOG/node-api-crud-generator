/*
  SWAGGER Info ----
  param schema type:
  string (this includes dates and files)
  number
  integer
  boolean
  array
  object

  https://swagger.io/docs/specification/data-models/data-types/
*/

class Swagger {

  constructor(crud, doc) {
    this.crud = crud;
    this.doc = doc;
  }

  generate() {
    this.generateBase();

    this.crud.entities.forEach(entity => {
      this.generateIndex(entity);
      this.generateFind(entity);
      this.generateStore(entity);
      this.generateUpdate(entity);
      this.generateDelete(entity);
    });

    return this.doc;
  }

  generateBase() {
    // DO NOT OVERWRITE PATHS in (this.doc.paths)
    this.doc = {
      ...this.doc,
      openapi:'3.0.0',
      info: {
        title: `${this.crud.app} API Documentation`,
        description: `${this.crud.app} Application Programming Interface (API) Documentation`,
        contact: {
          email: this.crud.email
        },
        license: {
          name: 'Apache 2.0',
          url: 'http://www.apache.org/licenses/LICENSE-2.0.html'
        },
        version: '1.0.0'
      },
      servers: [
        {
          'url':'/api/v1',
          'description':`${this.crud.app} API version 1`
        }
      ],
    }
  }

  generateIndex(entity) {
    let path = '/' + this.toDashCase(entity.plural);

    let endpoint = {
      get: {
        operationId: `all${entity.name}`,
        tags: [entity.name],
        summary: `Get list of ${entity.plural}`,
        description: `Retrieve a list of ${entity.plural} with limit, offset, sorting, fitlering and relations. List of fields: [${entity.fields.map(field => field.name).concat(['id', 'created_at', 'updated_at']).join(', ')}]`,
        parameters: this.getIndexParameters(entity),
        responses: this.getResponses(),
        security:[
          {
            jwt: []
          }
        ]
      }
    };

    this.doc.paths[path] = {
      ...this.doc.paths[path],
      ...endpoint
    };
  }

  generateFind(entity) {
    let path = '/' + this.toDashCase(entity.plural) + '/{id}';

    let endpoint = {
      get: {
        operationId: `find${entity.name}`,
        tags: [entity.name],
        summary: `Find one ${entity.name}`,
        description: `Find a specific record on ${entity.name} by sumbitting a GET request with the id and relations parameters`,
        responses: this.getResponses(true),
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `ID of the ${entity.name}`,
            required: true,
            schema: { type: 'integer' }
          },
          this.getRelationsDefinition(entity)
        ],
        security:[
          {
            jwt: []
          }
        ]
      }
    };

    this.doc.paths[path] = {
      ...this.doc.paths[path],
      ...endpoint
    };
  }

  generateStore(entity) {
    let path = '/' + this.toDashCase(entity.plural);

    let properties = {};
    let required = [];

    entity.fields.forEach(field => {
      let type = field.type;
      if (type === 'decimal') {
        type = 'number'
      }

      properties[field.name] = {
        type,
        //format: 'application/x-www-form-urlencoded'
      };

      if (field.nullable === false) {
        required.push(field.name);
      }
    });

    let endpoint = {
      post: {
        operationId: `store${entity.name}`,
        tags: [entity.name],
        summary: `Store ${entity.name}`,
        description: `Save a new ${entity.name} by sumbitting a POST request with the table fields`,
        responses: this.getResponses(true),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                description: 'JSON string containing info for ' + entity.name,
                required,
                type: 'object',
                properties
              }
            },
            'application/x-www-form-urlencoded': {
              schema: {
                description: 'JSON string containing info for ' + entity.name,
                required,
                type: 'object',
                properties
              }
            }
          }
        },
        security:[
          {
            jwt: []
          }
        ]
      }
    };

    this.doc.paths[path] = {
      ...this.doc.paths[path],
      ...endpoint
    };
  }

  generateUpdate(entity) {
    let path = '/' + this.toDashCase(entity.plural) + '/{id}';

    let properties = {};
    let required = [];

    entity.fields.forEach(field => {
      let type = field.type;
      if (type === 'decimal') {
        type = 'number'
      }

      properties[field.name] = {
        type,
        //format: 'application/x-www-form-urlencoded'
      };

      if (field.nullable === false) {
        required.push(field.name);
      }
    });

    let endpoint = {
      put: {
        operationId: `update${entity.name}`,
        tags: [entity.name],
        summary: `Update some fields on ${entity.name}`,
        description: `Update some fields of a specific record on ${entity.name} by sumbitting a PUT request with the id and some of the fields`,
        responses: this.getResponses(true),
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `ID of the ${entity.name}`,
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                description: 'JSON string containing info for ' + entity.name,
                required,
                type: 'object',
                properties
              }
            },
            'application/x-www-form-urlencoded': {
              schema: {
                description: 'JSON string containing info for ' + entity.name,
                required,
                type: 'object',
                properties
              }
            }
          }
        },
        security:[
          {
            jwt: []
          }
        ]
      }
    };

    this.doc.paths[path] = {
      ...this.doc.paths[path],
      ...endpoint
    };
  }

  generateDelete(entity) {
    let path = '/' + this.toDashCase(entity.plural) + '/{id}';

    let endpoint = {
      delete: {
        operationId: `delete${entity.name}`,
        tags: [entity.name],
        summary: `Delete a ${entity.name}`,
        description: `Delete a specific record on ${entity.name} by sumbitting a DELETE request with the id`,
        responses: this.getResponses(true),
        parameters: {
          name: 'id',
          in: 'path',
          description: `ID of the ${entity.name}`,
          required: true,
          schema: { type: 'integer' }
        },
        security:[
          {
            jwt: []
          }
        ]
      }
    };

    this.doc.paths[path] = {
      ...this.doc.paths[path],
      ...endpoint
    };
  }

  getIndexParameters(entity) {
    let params = [];

    // offset
    params.push({
      name: 'offset',
      in: 'query',
      description: 'Set from which id the result should start. ex: ?offset=40 . The default is 0.',
      required: false,
      schema: { type: 'integer' }
    });

    // limit
    params.push({
      name: 'limit',
      in: 'query',
      description: 'Number models to retrieve in the List. ex: ?limit=100 . The default is 20.',
      required: false,
      schema: { type: 'integer' }
    });

    // relations
    params.push(this.getRelationsDefinition(entity));

    // sort
    params.push({
      name: 'sort',
      in: 'query',
      description: `Order By any field in ${entity.name} using this pattern : ?sort=field1.direction1,field2.direction2 . direction(asc or desc). ex: ?sort=age.desc,name.asc`,
      required: false,
      schema: { type: 'string' }
    });

    // where
    params.push({
      name: 'where',
      in: 'query',
      description: `Filter results with where clause with ${entity.name} fields using this pattern :
      ?where=field1[.]operand[.]value1[,]field2[.]operand2[.]value2 . example: ?where=id[.]>[.]100 . For IS NULL or IS NOT NULL, use pattern: ?where=phone[.]null or ?where=phone[.]notNull .`,
      required: false,
      schema: { type: 'string' }
    });


    return params;
  }

  getRelationsDefinition(entity) {
    // generate relations syntax
    let ones = [];
    let manys = [];
    let manyToManys = [];

    if (entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);
        let relationName = this.toCamelCase(relEntity.name);
        ones.push(relationName);
      });
    }
    if (entity.relations.hasMany) {
      entity.relations.hasMany.forEach(relation => {
        let relEntity = this.lookupEntity(relation);
        let relationName = this.toCamelCase(relEntity.plural);
        manys.push(relationName);
      });
    }
    if (entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(objRelation => {
        let relEntity = this.lookupEntity(objRelation.entity);
        let relationName = 'many' + relEntity.plural;
        manyToManys.push(relationName);
      });
    }

    let relText = 'Relations:';
    if (ones.length) {
      relText += ` one(${ones.join(', ')})`;
    }
    if (manys.length) {
      relText += ` many(${manys.join(', ')}) `;
    }
    if (manyToManys.length) {
      relText += ` many-to-many(${manyToManys.join(', ')})`;
    }

    return {
      name: 'relations',
      in: 'query',
      description: `Relations defined for ${entity.name} separated by comma. ex: ?relations=parent1,parent1.children. ${relText}`,
      required: false,
      schema: { type: 'string' }
    };
  }

  getResponses(withResource = false) {
    let responses = {
      200: {
        description: 'successful operation',
        content: { 'application/json': [] }
      },
      400: {
        description: 'bad request'
      },
      401: {
        description: 'request missing something'
      },
      500: {
        description: 'server error. if you found a 500 error code, please contact the webmaster at the top of the Page'
      }
    };

    if(withResource) {
      responses[404] = {
        description: 'resource not found'
      }
    }

    return responses;
  }


  lookupEntity(name) {
    let filtered = this.crud.entities.filter(entity => {
      return entity.name === name;
    });

    if (!filtered.length) {
      throw new Error(`Entity with name ${name} is not defined`);
    }

    return filtered[0];
  }

  toTableCase(string) {
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '_' + letter.toLowerCase();
      }
    }, '');
  }

  toDashCase(string) {
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '-' + letter.toLowerCase();
      }
    }, '');
  }

  toCamelCase(string) {
    return string[0].toLowerCase() + string.slice(1);
  }

}

module.exports = Swagger;
