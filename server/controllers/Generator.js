const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');
const moment = require('moment');
const projects = require('../../projects');

class GeneratorController {

  constructor() {
    this.projectName = '';
    this.crud = {};
    this.entities = [];
    this.belongsToManyTrack = [];
    this.belongsToManySeedTrack = [];
    this.migrationMoment;
    this.seedNumber;
  }

  generate(req, res, next) {
    // load project info
    this.projectName = req.params.project;
    console.log('bulding project', this.projectName);
    this.entities = projects[this.projectName].entities;
    this.crud = projects[this.projectName];

    if (!this.entities) {
      console.log('no entity data found');
      return;
    }

    this.belongsToManyTrack = [];
    // migration file naming with datetime
    this.migrationMoment = moment();
    this.migrationMoment.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    // seed file naming ID
    this.seedNumber = 1;

    // Generate Static template files
    this.generateStatics();

    // Generate App setup files
    this.generateServerIndex();
    this.generatePackage();

    // Generate DB-Model-Controller
    for (var i = 0; i < this.entities.length; i++) {
      let entity = this.entities[i];

      this.entities[i].seedAmount = this.entities[i].seedAmount || [];
      this.entities[i].fields = this.entities[i].fields || [];

      // migration
      this.generateMigration(entity);

      // bookshelf model
      this.generateModel(entity);

      // controller
      this.generateController(entity);

      // seed
      this.generateSeed(entity, i);
    }

    // Generate Many-to-Many Migrations at last position
    for (var i = 0; i < this.entities.length; i++) {
      let entity = this.entities[i];
      this.generateManyMigrations(entity);
      this.generateManySeeds(entity, i);
    }

    // Generate API endpoints
    this.generateApi();

    // Generate Documentation API Documentation
    this.generateApiDocumentation(req);

    res.status(200).send('Finish');
  }

  generateStatics() {
    // Structure
    fs.copySync(
      path.join(__dirname, `../../structure`),
      path.join(__dirname, `../../output/${this.projectName}`)
    );

    // Copy the project directory to output project
    fs.copySync(
      path.join(__dirname, `../../projects/${this.projectName}`),
      path.join(__dirname, `../../output/${this.projectName}/crud`)
    );

    // Copy environment files
    fs.copySync(
      path.join(__dirname, `../../structure/.env.example`),
      path.join(__dirname, `../../output/${this.projectName}/.env`)
    );
    fs.copySync(
      path.join(__dirname, `../../structure/knexfile.example.js`),
      path.join(__dirname, `../../output/${this.projectName}/knexfile.js`)
    );
  }

  generateServerIndex() {
    let readPath = path.join(__dirname, '../../templates/server/index.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    let rendered = Mustache.render(
      template,
      {
        app: this.crud.app,
      }
    );

    let writePath = path.join(__dirname, `../../output/${this.projectName}/server/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generatePackage() {
    let readPath = path.join(__dirname, '../../templates/package.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    let rendered = Mustache.render(
      template,
      {
        package: this.crud.package,
        app: this.crud.app,
        description: this.crud.description,
        author: this.crud.author,
        repos: this.crud.repos,
      }
    );

    let writePath = path.join(__dirname, `../../output/${this.projectName}/package.json`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateMigration(entity) {
    let tableName = this.toTableCase(entity.plural);

    // Start filename to keep order of migration files
    this.migrationMoment.add(1, 'seconds');
    let startName = this.migrationMoment.format('YYYYMMDDHHmmss');

    let readPath = path.join(__dirname, '../../templates/database/migrations/migration.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // ADD FIELDS
    let fieldsCode = '';

    // 1-To-Many foreign fields
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);

        fieldsCode += `    table.integer('${this.toTableCase(relEntity.name)}_id').unsigned()`;

        // check if foreign field is from hasOne
        if (relEntity.hasOwnProperty('relations') && relEntity.relations.hasOne) {
          if (relEntity.relations.hasOne.includes(entity.name)) {
            fieldsCode += '.unique()';
          }
        }

        fieldsCode += ';\n';
      });
    }

    // Normal fields
    entity.fields = entity.fields || [];
    fieldsCode += this.generateMigrationFields(entity.fields);

    // ADD foreigns
    let foreignsCode = '';
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      foreignsCode = '\n';
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);

        foreignsCode += `    table.foreign('${this.toTableCase(relEntity.name)}_id').references('${this.toTableCase(relEntity.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;
      });
    }

    let rendered = Mustache.render(template,
      {
        tableName,
        fields: fieldsCode,
        foreigns: foreignsCode
      }
    );

    let writePath = path.join(__dirname, `../../output/${this.projectName}/database/migrations/${startName}_create_table_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateMigrationFields(fields) {
    let fieldsCode = '';

    fields.forEach(field => {
      // Normal table code
      if (field.type === 'string') {
        // String field
        field.length = field.length || 255;
        fieldsCode += `    table.string('${field.name}', ${field.length})`;
      } else if (field.type === 'decimal') {
        field.precision = field.precision || 18;
        field.scale = field.scale || 2;
        fieldsCode += `    table.decimal('${field.name}', ${field.precision}, ${field.scale})`;
      } else {
        fieldsCode += `    table.${field.type}('${field.name}')`;
      }

      // extension functions code
      if (field.hasOwnProperty('nullable') && field.nullable === false) {
        fieldsCode += `.notNullable()`;
      }
      if (field.hasOwnProperty('index') && field.index === true) {
        fieldsCode += `.index()`;
      }
      if (field.hasOwnProperty('unique') && field.unique === true) {
        fieldsCode += `.unique()`;
      }

      if (field.hasOwnProperty('default')) {
        if (typeof field.default === 'string') {
          fieldsCode += `.default('${field.default}')`;
        } else {
          fieldsCode += `.default(${field.default})`;
        }
      }

      fieldsCode += ';\n';
    });

    return fieldsCode;
  }

  generateManyMigrations(entity) {
    // Many-To-Many foreign fields
    // Many to Many structure is different
    // They are Object instead of string
    /*
    {
      entity: 'Entity',
      fields: [
        {

        }
      ]
    }
    */
    if (entity.hasOwnProperty('relations') && entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(objRelation => {
        let relEntity = this.lookupEntity(objRelation.entity);
        // pivot fields
        let fields = objRelation.fields || [];
        this.generateManyMigration(entity, relEntity, fields);
      });
    }
  }

  generateController(entity) {

    // Special actions for Authentication Controller
    let authActions = '';
    let authImport = '';

    if (entity.hasOwnProperty('auth')) {
      // for controllers import
      authImport = `const Auth = require('./Auth');`;

      // Generate Auth Actions methods code to add into the Controller at the end in the templates
      let readPath = path.join(__dirname, '../../templates/controllers/authActions.mustache');
      let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
      //console.log('template', template);

      authActions = Mustache.render(
        template,
        {
          entity: this.toCamelCase(entity.name),
          identification: entity.auth[0],
          secret: entity.auth[1],
        }
      );


      // Save Auth File
      let authReadPath = path.join(__dirname, '../../templates/controllers/Auth.mustache');
      let authTemplate = fs.readFileSync(authReadPath, { encoding: 'utf-8' });

      let authRendered = Mustache.render(
        authTemplate,
        {
          Entity: entity.name,
          entity: this.toCamelCase(entity.name),
          Identification: this.fieldToCamelUppercase(entity.auth[0]),
          identification: entity.auth[0],
          secret: entity.auth[1],
        }
      );

      let authWritePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/Auth.js`);

      fs.writeFileSync(authWritePath, authRendered, { encoding: 'utf-8' });

      // Save Auth Swagger file
      let swaggerReadPath = path.join(__dirname, '../../templates/controllers/swagger/Auth.mustache');
      let swaggerTemplate = fs.readFileSync(swaggerReadPath, { encoding: 'utf-8' });

      let swaggerRendered = Mustache.render(
        swaggerTemplate,
        {
          identification: entity.auth[0],
          secret: entity.auth[1],
        }
      );

      let swaggerWritePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/swagger/Auth.js`);

      fs.writeFileSync(swaggerWritePath, swaggerRendered, { encoding: 'utf-8' });

      // Add Auth Middleare to token check
      this.generateAutorizationMiddleware();
    }

    // For Normal Controller
    let readPath = path.join(__dirname, '../../templates/controllers/Controller.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Actions for autoloading parent (belongsTo) and child (hasOne) model
    let actions = '';

    // belongsTo and hasOne relations
    if (entity.hasOwnProperty('relations')) {
      let parents = [];
      let ones = [];

      if (entity.relations.belongsTo) {
        parents = entity.relations.belongsTo.map(relation => {
          let relEntity = this.lookupEntity(relation);
          return `'${this.toTableCase(relEntity.name)}'`;
        });
      }
      if (entity.relations.hasOne) {
        ones = entity.relations.hasOne.map(relation => {
          let relEntity = this.lookupEntity(relation);
          return `'${this.toTableCase(relEntity.name)}'`;
        });
      }

      let keyValues = `      withRelated: [${parents.concat(ones).join(', ')}],`;
      actions += this.generateRetrieveAction(entity, 'all', keyValues);
      actions += '\n';
      actions += this.generateRetrieveAction(entity, 'find', keyValues);
    }

    // TODO: Add Multer for fields that need file upload
    // belongsTo and hasOne relations
    let fileFields = entity.fields.filter(field => {
      return field.hasOwnProperty('file') && field.file === true;
    });

    if (fileFields.length) {
      let oldFilesCode = '';
      fileFields.forEach(field => {
        oldFilesCode += `        req.oldFilepaths.push('public/files/' + model.get('${field.name}'));\n`;
      });

      actions += '\n';
      actions += this.generateMulterUpdateAction(entity, oldFilesCode);
    }


    let rendered = Mustache.render(template,
      {
        Entity: entity.name,
        actions,
        authImport,
        authActions,
      }
    );

    let writePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateAutorizationMiddleware() {
    let readPath = path.join(__dirname, '../../templates/middlewares/authorization.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    let rendered = Mustache.render(template);

    let writePath = path.join(__dirname, `../../output/${this.projectName}/server/middlewares/authorization.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateModel(entity) {
    let readPath = path.join(__dirname, '../../templates/models/Model.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // HIDDEN
    let hidden = '';
    let fields = [];
    entity.fields.forEach(field => {
      if (field.hidden === true) {
        fields.push(field.name);
      }
    });
    hidden = `\n  hidden: ['${fields.join(`', '`)}'],`;

    // RELATIONS
    let relations = '';
    if (entity.hasOwnProperty('relations')) {
      if (entity.relations.belongsTo) {
        entity.relations.belongsTo.forEach(relation => {
          relations += this.generateRelation(relation, 'belongsTo');
        });
      }

      if (entity.relations.hasOne) {
        entity.relations.hasOne.forEach(relation => {
          relations += this.generateRelation(relation, 'hasOne');
        });
      }

      if (entity.relations.hasMany) {
        entity.relations.hasMany.forEach(relation => {
          relations += this.generateRelation(relation, 'hasMany');
        });
      }

      if (entity.relations.belongsToMany) {
        entity.relations.belongsToMany.forEach(objRelation => {
          relations += this.generateRelation(objRelation.entity, 'belongsToMany');
        });
      }
    }

    let rendered = Mustache.render(
      template,
      {
        Entity: entity.name,
        tableName: this.toTableCase(entity.plural),
        hidden,
        relations
      }
    );

    let writePath = path.join(__dirname, `../../output/${this.projectName}/server/models/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateSeed(entity, index) {
    let tableName = this.toTableCase(entity.plural);

    let readPath = path.join(__dirname, '../../templates/database/seeds/seed.mustache');

    if (entity.hasOwnProperty('auth')) {
      readPath = path.join(__dirname, '../../templates/database/seeds/authSeed.mustache');
    }

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // fields DATA
    let fieldValues = '';
    let defaultAuth = '';
    let identification = '';
    entity.fields = entity.fields || [];

    // Add fields for foreign keys in the Many side of 1-to-Many or Many-to-Many
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);

        // Calculate foreign key value from Parent range to respect constraint
        let fkValue = `parseInt(Math.random() * ${relEntity.seedAmount} + 1),`;

        // SELF RELATIONSHIP
        // if parent is the same entity, then a self relationship
        // avoid targeting all records, because only 1 record will exist a each insertion time.
        if (relEntity.name === entity.name) {
          /*
          generate random id from 1 to actual incrementation in the loop for seeding.
          Let's say for i = 0, there is no record yet for that entity
          then, we shall send null
          For i = 1, there is only one record in the database
          so we can generate only value 1 for foreign key
          For i = 10, there will be 10 records for that entity
          so we can generate value form 1 to 10 for forein key
          */

          // overwrite the foreign key value
          fkValue = `parseInt(Math.random() * i) || null,`;
        }

        // UNIQUE CHILD for hasOne Relation
        // check if foreign field is from hasOne
        if (relEntity.hasOwnProperty('relations') && relEntity.relations.hasOne) {
          // if at the reverse, the relEntity contains hasOne to entity
          // then the forein key field will be unique
          // so we must avoid random value from parent id, use incremental id
          if (relEntity.relations.hasOne.includes(entity.name)) {
            // overwrite the foreign key value
            if (entity.hasOwnProperty('auth')) {
              fkValue = ' i !== undefined ? i + 2 : 1,';
            } else {
              fkValue = 'i + 1,';
            }
          }
        }

        if (entity.hasOwnProperty('auth')) {
          fieldValues += '  ';
        }

        fieldValues += `      ${this.toTableCase(relEntity.name)}_id: ${fkValue}\n`;
      });
    }

    if (entity.hasOwnProperty('auth')) {
      identification = entity.auth[0];
      defaultAuth = entity.defaultAuth;
    }

    // generate keyValues for normal fields
    fieldValues += this.generateKeyValuesSeed(entity.fields, entity);

    let rendered = Mustache.render(
      template,
      {
        tableName,
        seedAmount: entity.seedAmount,
        identification,
        defaultAuth,
        fieldValues
      }
    );

    // Start filename to keep order of migration files
    let startName = (this.seedNumber * 100).toString();
    this.seedNumber++;
    startName = '0'.repeat(5 - startName.length) + startName;

    let writePath = path.join(__dirname, `../../output/${this.projectName}/database/seeds/${startName}_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateKeyValuesSeed(fields, entity = {}) {
    let fieldValues = '';

    // Create faker key value method for each field
    fields.forEach(field => {

      // Create hash password for Auth Entity field
      if (entity.hasOwnProperty('auth') && entity.auth[1] === field.name) {
        fieldValues += `        ${field.name}: hash,\n`;
      } else if (field.hasOwnProperty('faker')) {
        // Provided Faker method
        let fakers = field.faker.split('.');

        if (field.type === 'string') {
          // add string length limit
          field.length = field.length || 255;
          fieldValues += this.generateFieldValue(entity, field.name, fakers[0], fakers[1], field.length);
        } else {
          fieldValues += this.generateFieldValue(entity, field.name, fakers[0], fakers[1]);
        }
      } else {
        // Default faker method according to field type
        if (field.type === 'string') {
          field.length = field.length || 255;
          fieldValues += this.generateFieldValue(entity, field.name, 'lorem', 'sentence', field.length);
        } else if (field.type === 'integer') {
          fieldValues += this.generateFieldValue(entity, field.name, 'random', 'number');
        } else if (field.type === 'decimal') {
          fieldValues += this.generateFieldValue(entity, field.name, 'finance', 'amount');
        } else if (field.type === 'date') {
          fieldValues += this.generateFieldValue(entity, field.name, 'date', 'past');
        } else {
          fieldValues += this.generateFieldValue(entity, field.name, 'fake', '');
        }
      }
    });

    return fieldValues;
  }

  generateManySeeds(entity, index) {
    // Many-To-Many foreign fields
    if (entity.hasOwnProperty('relations') && entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(objRelation => {
        let relEntity = this.lookupEntity(objRelation.entity);
        // pivot fields
        let fields = objRelation.fields || [];
        this.generateManySeed(entity, relEntity, fields);
      });
    }
  }

  generateRelation(relation, relationFunction) {
    let entity = this.lookupEntity(relation);

    let readPath = path.join(__dirname, '../../templates/models/Relation.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    let relationName;
    if (relationFunction === 'belongsTo') {
      relationName = this.toCamelCase(entity.name);
    } else if (relationFunction === 'hasOne') {
      relationName = this.toCamelCase(entity.name);
    } else if (relationFunction === 'hasMany') {
      relationName = this.toCamelCase(entity.plural);
    } else if (relationFunction === 'belongsToMany') {
      relationName = 'many' + entity.plural;
    }

    return Mustache.render(
      template,
      {
        Entity: entity.name,
        relationName,
        relationFunction,
      }
    );
  }

  generateApi() {
    let readPath = path.join(__dirname, '../../templates/routes/api.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Multers creation
    let multers = '';
    this.entities.forEach(entity => {
      multers += this.generateMulterCreation(entity);
    });

    // Controllers declaration
    let controllers = '';
    let auth = false;
    this.entities.forEach(entity => {
      if (entity.hasOwnProperty('auth')) {
        auth = true;
      }
      controllers += this.generateControllerDeclaration(entity);
    });

    // Controllers instanciation
    let controllerInstances = '';
    this.entities.forEach(entity => {
      if (entity.hasOwnProperty('auth')) {
        controllerInstances += 'const auth = new AuthController();\n';
      }
      controllerInstances += this.generateControllerInstance(entity);
    });

    // Endpoints
    let endpoints = '';
    this.entities.forEach(entity => {
      endpoints += this.generateEndpoints(entity);
    });

    // Put Auth codes in Route V1
    let authController = '';
    let authRoutes = '';
    if (auth) {
      authController = `const AuthController = require('../../../controllers/v1/Auth');`;
      authRoutes += `router.get('/auth', verifyToken, auth.auth.bind(auth));\n`;
      authRoutes += `router.post('/signin', auth.signin.bind(auth));\n`;
      authRoutes += `router.post('/signup', auth.signup.bind(auth));\n`;
    }

    let rendered = Mustache.render(
      template,
      {
        appName: this.crud.app,
        multers,
        controllers,
        controllerInstances,
        endpoints,
        authController,
        authRoutes
      }
    );

    let writePath = path.join(__dirname, `../../output/${this.projectName}/server/routes/api/v1/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateApiDocumentation(req) {
    let resource = {
      status: () => {
        return {
          send: () => {
            return;
          }
        }
      }
    }

    const DocumentationController = require(`../../output/${this.projectName}/server/controllers/Documentation`);
    let documentation = new DocumentationController();
    req.query.key = 'KsvSfbTUYsh3EF4cfCx35hEsCAzTMnsw';
    process.env.SECURITY_KEY = 'KsvSfbTUYsh3EF4cfCx35hEsCAzTMnsw';
    documentation.generate(req, resource);
  }

  generateMulterCreation(entity) {
    let hasFileField = entity.fields.some(field => {
      return field.hasOwnProperty('file') && field.file === true;
    });

    if (!hasFileField) {
      return '';
    }

    let readPath = path.join(__dirname, '../../templates/routes/multerCreation.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: this.toCamelCase(entity.name),
      }
    );
  }

  generateControllerDeclaration(entity) {
    let readPath = path.join(__dirname, '../../templates/routes/ControllerDeclaration.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name,
      }
    );
  }

  generateControllerInstance(entity) {
    let readPath = path.join(__dirname, '../../templates/routes/ControllerInstance.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name,
        entity: this.toCamelCase(entity.name),
      }
    );
  }

  generateEndpoints(entity) {
    let readPath = path.join(__dirname, '../../templates/routes/endpoints.mustache');

    let fields = '';

    let filtered = entity.fields.filter(field => {
      return field.hasOwnProperty('file') && field.file === true;
    });

    if (filtered.length) {
      readPath = path.join(__dirname, '../../templates/routes/multerEndpoints.mustache');

      fields = filtered.map(field => {
        return `{ name: '${field.name}' }`;
      }).join(', ');
    }

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: this.toCamelCase(entity.name),
        entityUri: this.toDashCase(entity.plural),
        fields,
      }
    );
  }

  generateFieldValue(entity, field, category, method, length = 0) {
    let readPath = path.join(__dirname, '../../templates/database/seeds/fieldValue.mustache');

    if (entity.hasOwnProperty('auth')) {
      readPath = path.join(__dirname, '../../templates/database/seeds/authFieldValue.mustache');
    }

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        field,
        category,
        method: method + '()',
        limit: length ? `.slice(0, ${length})` : '',
      }
    );
  }

  generateRetrieveAction(entity, method, keyValues) {
    let readPath = path.join(__dirname, '../../templates/controllers/retrieveAction.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: entity.name,
        method,
        keyValues,
      }
    );
  }

  generateMulterUpdateAction(entity, oldFilesCode) {
    let readPath = path.join(__dirname, '../../templates/controllers/multerUpdateAction.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        oldFilesCode
      }
    );
  }

  generateManyMigration(entity1, entity2, fields) {
    // Create a Many-To-Many table for both tables
    let tb1 = this.toTableCase(entity1.plural);
    let tb2 = this.toTableCase(entity2.plural);
    let tableName;

    // tables will be placed in alphabetic order
    if (tb1 < tb2) {
      tableName = tb1 + '_' + tb2;
    } else {
      tableName = tb2 + '_' + tb1;
    }

    // Abort if a many-to-many migration already exists between those 2 entities
    if (this.belongsToManyTrack.includes(tableName)) {
      return;
    }

    let readPath = path.join(__dirname, '../../templates/database/migrations/migration.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Foreign key fields
    let fieldsCode = '';

    fieldsCode += `    table.integer('${this.toCamelCase(entity1.name)}_id').unsigned();\n`;
    fieldsCode += `    table.integer('${this.toCamelCase(entity2.name)}_id').unsigned();\n`;

    // Many-to-Many Fields (pivot) if any
    fieldsCode += this.generateMigrationFields(fields);

    // Foreign key indexes
    let foreignsCode = '\n';
    foreignsCode += `    table.foreign('${this.toCamelCase(entity1.name)}_id').references('${this.toCamelCase(entity1.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;
    foreignsCode += `    table.foreign('${this.toCamelCase(entity2.name)}_id').references('${this.toCamelCase(entity2.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;

    let rendered = Mustache.render(template,
      {
        tableName,
        fields: fieldsCode,
        foreigns: foreignsCode
      }
    );

    // Start filename to keep order of migration files
    this.migrationMoment.add(1, 'seconds');
    let startName = this.migrationMoment.format('YYYYMMDDHHmmss');

    let writePath = path.join(__dirname, `../../output/${this.projectName}/database/migrations/${startName}_create_table_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

    this.belongsToManyTrack.push(tableName);
  }

  generateManySeed(entity1, entity2, fields) {
    // Create a Many-To-Many seed for both tables
    let tb1 = this.toTableCase(entity1.plural);
    let tb2 = this.toTableCase(entity2.plural);
    let tableName;

    // tables will be placed in alphabetic order
    if (tb1 < tb2) {
      tableName = tb1 + '_' + tb2;
    } else {
      tableName = tb2 + '_' + tb1;
    }

    // Abort if a many-to-many migration already exists between those 2 entities
    if (this.belongsToManySeedTrack.includes(tableName)) {
      return;
    }

    let readPath = path.join(__dirname, '../../templates/database/seeds/seed.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Foreign key fields
    let fieldValues = '';

    // Calculate foreign key value from Parent range to respect constraint
    let fk1Value = `parseInt(Math.random() * ${entity1.seedAmount} + 1),`;
    let fk2Value = `parseInt(Math.random() * ${entity2.seedAmount} + 1),`;

    fieldValues += `      ${this.toCamelCase(entity1.name)}_id: ${fk1Value}\n`;
    fieldValues += `      ${this.toCamelCase(entity2.name)}_id: ${fk2Value}\n`;

    // generate keyValues for normal fields
    fieldValues += this.generateKeyValuesSeed(fields);

    let rendered = Mustache.render(
      template,
      {
        tableName,
        seedAmount: Math.min(entity1.seedAmount, entity2.seedAmount),
        fieldValues
      }
    );

    // Start filename to keep order of migration files
    let startName = (this.seedNumber * 100).toString();
    this.seedNumber++;
    startName = '0'.repeat(5 - startName.length) + startName;

    let writePath = path.join(__dirname, `../../output/${this.projectName}/database/seeds/${startName}_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

    this.belongsToManySeedTrack.push(tableName);
  }

  lookupEntity(name) {
    let filtered = this.entities.filter(entity => {
      return entity.name === name;
    });

    if (!filtered.length) {
      throw new Error(`Entity with name ${name} is not defined`);
    }

    return filtered[0];
  }

  toTableCase(string) {
    // form LocationTypes to location_types
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '_' + letter.toLowerCase();
      }
    }, '');
  }

  toDashCase(string) {
    // form LocationTypes to location-types
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '-' + letter.toLowerCase();
      }
    }, '');
  }

  toCamelCase(string) {
    // form LocationType to locationType
    return string[0].toLowerCase() + string.slice(1);
  }

  fieldToCamelUppercase(string) {
    // form location_type to LocationType
    return string.split('_').map(word => {
      return word[0].toUpperCase() + word.slice(1);
    }).join('');
  }

}

module.exports = GeneratorController;
