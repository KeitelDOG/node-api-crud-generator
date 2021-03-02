/* eslint-disable keyword-spacing */
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
  constructor (crud, doc) {
    this.crud = crud;
    this.doc = doc;
    this.allowFields = [];
    this.denyFields = [];
    this.required = [];
    this.types = {
      tinyint: 'integer',
      smallint: 'integer',
      mediumint: 'integer',
      int: 'integer',
      integer: 'integer',
      decimal: 'number',
      bigint: 'integer',
      string: 'string',
      varchar: 'string',
      char: 'string',
      date: 'string',
      datetime: 'string',
      time: 'string',
      boolean: 'boolean'
    };
  }

  generate () {
    this.generateBase();
    // add and call other methods here to generate more stuffs
    return this.doc;
  }

  generateBase () {
    // DO NOT OVERWRITE PATHS in (this.doc.paths)
    this.doc = {
      ...this.doc,
      openapi: '3.0.0',
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
          url: '/api/v1',
          description: `${this.crud.app} API version 1`
        }
      ]
    }
  }

  generateIndex () {
    const path = '/' + this.toDashCase(this.entity.plural);
    // add relation foreign key fields (FK) with required
    const fks = this.getRelationsForeignKeys();

    let fields = ['id'];
    fields = fields.concat(Object.keys(fks.properties));
    fields = fields.concat(this.entity.fields.map(field => field.name));
    fields = fields.concat(['created_at', 'updated_at']);

    const endpoint = {
      get: {
        operationId: `all${this.entity.name}`,
        tags: [this.entity.name],
        summary: `Get list of ${this.entity.plural}`,
        description: `Retrieve a list of ${this.entity.plural} with limit, offset, sorting, fitlering and relations. List of fields: [${fields.join(', ')}]`,
        parameters: this.getIndexParameters(),
        responses: this.getResponses(),
        security: [
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

  generateFind () {
    const path = '/' + this.toDashCase(this.entity.plural) + '/{id}';

    const endpoint = {
      get: {
        operationId: `find${this.entity.name}`,
        tags: [this.entity.name],
        summary: `Find one ${this.entity.name}`,
        description: `Find a specific record on ${this.entity.name} by sumbitting a GET request with the id and relations parameters`,
        responses: this.getResponses(true),
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `ID of the ${this.entity.name}`,
            required: true,
            schema: { type: 'integer' }
          },
          this.getRelationsDefinition(this.entity)
        ],
        security: [
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

  generateStore () {
    const path = '/' + this.toDashCase(this.entity.plural);

    // add relation foreign key fields (FK) with required
    const fks = this.getRelationsForeignKeys();
    const properties = fks.properties;

    const allow = this.allowFields.join(',');
    const deny = this.denyFields.join(',');

    // add normal fields
    this.entity.fields.forEach(field => {
      const type = this.types[field.type];

      properties[field.name] = {
        type
        // format: 'application/x-www-form-urlencoded'
      };

      if (field.nullable === false) {
        this.required.push(field.name);
      }
    });

    // filter fields in allow or deny
    Object.keys(properties).forEach(key => {
      if (allow && !allow.includes(key)) {
        // skip if field is not in allow list
        delete properties[key];
      } else if (deny && deny.includes(key)) {
        // skip if field is in deny list
        delete properties[key];
      }
    });

    const endpoint = {
      post: {
        operationId: `store${this.entity.name}`,
        tags: [this.entity.name],
        summary: `Store ${this.entity.name}`,
        description: `Save a new ${this.entity.name} by sumbitting a POST request with the table fields`,
        responses: this.getResponses(true),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                description: 'JSON string containing info for ' + this.entity.name,
                required: this.required,
                type: 'object',
                properties
              }
            },
            'application/x-www-form-urlencoded': {
              schema: {
                description: 'JSON string containing info for ' + this.entity.name,
                required: this.required,
                type: 'object',
                properties
              }
            }
          }
        },
        security: [
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

  generateUpdate () {
    const path = '/' + this.toDashCase(this.entity.plural) + '/{id}';

    // add relation foreign key fields (FK) with required
    const fks = this.getRelationsForeignKeys();
    const properties = fks.properties;

    const allow = this.allowFields.join(',');
    const deny = this.denyFields.join(',');

    // add normal fields
    this.entity.fields.forEach(field => {
      const type = this.types[field.type];

      properties[field.name] = {
        type
        // format: 'application/x-www-form-urlencoded'
      };

      if (field.nullable === false) {
        this.required.push(field.name);
      }
    });

    // filter fields in allow or deny
    Object.keys(properties).forEach(key => {
      if (allow && !allow.includes(key)) {
        // skip if field is not in allow list
        delete properties[key];
      } else if (deny && deny.includes(key)) {
        // skip if field is in deny list
        delete properties[key];
      }
    });

    const endpoint = {
      put: {
        operationId: `update${this.entity.name}`,
        tags: [this.entity.name],
        summary: `Update some fields on ${this.entity.name}`,
        description: `Update some fields of a specific record on ${this.entity.name} by sumbitting a PUT request with the id and some of the fields`,
        responses: this.getResponses(true),
        parameters: [
          {
            name: 'id',
            in: 'path',
            description: `ID of the ${this.entity.name}`,
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                description: 'JSON string containing info for ' + this.entity.name,
                required: this.required,
                type: 'object',
                properties
              }
            },
            'application/x-www-form-urlencoded': {
              schema: {
                description: 'JSON string containing info for ' + this.entity.name,
                required: this.required,
                type: 'object',
                properties
              }
            }
          }
        },
        security: [
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

  generateDelete () {
    const path = '/' + this.toDashCase(this.entity.plural) + '/{id}';

    const endpoint = {
      delete: {
        operationId: `delete${this.entity.name}`,
        tags: [this.entity.name],
        summary: `Delete a ${this.entity.name}`,
        description: `Delete a specific record on ${this.entity.name} by sumbitting a DELETE request with the id`,
        responses: this.getResponses(true),
        parameters: {
          name: 'id',
          in: 'path',
          description: `ID of the ${this.entity.name}`,
          required: true,
          schema: { type: 'integer' }
        },
        security: [
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

  getIndexParameters () {
    const params = [];

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
    params.push(this.getRelationsDefinition(this.entity));

    // sort
    params.push({
      name: 'sort',
      in: 'query',
      description: `Order By any field in ${this.entity.name} using this pattern : ?sort=field1.direction1,field2.direction2 . direction(asc or desc). ex: ?sort=age.desc,name.asc`,
      required: false,
      schema: { type: 'string' }
    });

    // where
    params.push({
      name: 'where',
      in: 'query',
      description: `Filter results with where clause with ${this.entity.name} fields using this pattern :
      ?where=field1[.]operand[.]value1[,]field2[.]operand2[.]value2 . example: ?where=id[.]>[.]100 . For IS NULL or IS NOT NULL, use pattern: ?where=phone[.]null or ?where=phone[.]notNull .`,
      required: false,
      schema: { type: 'string' }
    });

    return params;
  }

  getRelationsDefinition () {
    // generate relations syntax
    const ones = [];
    const manys = [];
    const manyToManys = [];

    if (this.entity.relations.belongsTo) {
      this.entity.relations.belongsTo.forEach(relation => {
        const relEntity = this.lookupEntity(relation);
        const relationName = this.toCamelCase(relEntity.name);
        ones.push(relationName);
      });
    }
    if (this.entity.relations.hasMany) {
      this.entity.relations.hasMany.forEach(relation => {
        const relEntity = this.lookupEntity(relation);
        const relationName = this.toCamelCase(relEntity.plural);
        manys.push(relationName);
      });
    }
    if (this.entity.relations.belongsToMany) {
      this.entity.relations.belongsToMany.forEach(objRelation => {
        const relEntity = this.lookupEntity(objRelation);
        const relationName = 'many' + relEntity.plural;
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
      description: `Relations defined for ${this.entity.name} separated by comma. ex: ?relations=parent1,parent1.children. ${relText}`,
      required: false,
      schema: { type: 'string' }
    };
  }

  getRelationsForeignKeys () {
    // get relation foreign key fields (FK)
    const properties = {};

    if (Object.prototype.hasOwnProperty.call(this.entity, 'relations')) {
      this.entity.relations.belongsTo = this.entity.relations.belongsTo || [];
      this.entity.relations.hasOne = this.entity.relations.hasOne || [];

      const parents = this.entity.relations.belongsTo.concat(this.entity.relations.hasOne);

      parents.forEach(relation => {
        const relEntity = this.lookupEntity(relation);

        // default foreign key name, OR provided one
        let fkName = `${this.toTableCase(relEntity.name)}_id`;
        if (typeof relation === 'object') {
          // create FK field with object field
          fkName = relation.field;

          if (relation.nullable === false) {
            this.required.push(fkName);
          }
        }

        properties[fkName] = {
          type: 'number'
          // format: 'application/x-www-form-urlencoded'
        };
      });
    }

    return {
      properties
    };
  }

  getResponses (withResource = false) {
    const responses = {
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

    if (withResource) {
      responses[404] = {
        description: 'resource not found'
      }
    }

    return responses;
  }

  lookupEntity (entity) {
    // entity (relation) can be string or object
    let name = entity;
    if (typeof entity === 'object') {
      name = entity.entity;
    }

    const filtered = this.crud.entities.filter(entity => {
      return entity.name === name;
    });

    if (!filtered.length) {
      throw new Error(`Entity with name ${name} is not defined`);
    }

    return filtered[0];
  }

  toTableCase (string) {
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '_' + letter.toLowerCase();
      }
    }, '');
  }

  toDashCase (string) {
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '-' + letter.toLowerCase();
      }
    }, '');
  }

  toCamelCase (string) {
    return string[0].toLowerCase() + string.slice(1);
  }
}

module.exports = Swagger;
