const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');
const moment = require('moment');
const crud = require('../../crud.js');

class GeneratorController {

  constructor() {
    this.entities = crud.entities;
    this.belongsToManyTrack = [];
    this.migrationMoment;
    this.seedNumber;
  }

  generate(req, res, next) {
    this.belongsToManyTrack = [];
    this.migrationMoment = moment();
    this.migrationMoment.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
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

    res.status(200).send('Finish');
  }

  generateStatics() {
    // Structure
    fs.copySync(
      path.join(__dirname, `../../structure`),
      path.join(__dirname, `../../output`)
    );
  }

  generateServerIndex() {
    let readPath = path.join(__dirname, '../../templates/server/index.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    let rendered = Mustache.render(
      template,
      {
        app: crud.app,
      }
    );

    let writePath = path.join(__dirname, `../../output/server/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generatePackage() {
    let readPath = path.join(__dirname, '../../templates/package.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    let rendered = Mustache.render(
      template,
      {
        package: crud.package,
        app: crud.app,
        description: crud.description,
        author: crud.author,
        repos: crud.repos,
      }
    );

    let writePath = path.join(__dirname, `../../output/package.json`);

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
    let fields = '';

    // 1-To-Many foreign fields
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);

        fields += `    table.integer('${this.toCamelCase(relEntity.name)}_id').unsigned();\n`;
      });
    }

    // Normal fields
    entity.fields = entity.fields || [];
    entity.fields.forEach(field => {
      // Normal table code
      if (field.type === 'string') {
        // String field
        field.length = field.length || 255;
        fields += `    table.string('${field.name}', ${field.length})`;
      } else if (field.type === 'decimal') {
        field.precision = field.precision || 18;
        field.scale = field.scale || 2;
        fields += `    table.decimal('${field.name}', ${field.precision}, ${field.scale})`;
      } else {
        fields += `    table.${field.type}('${field.name}')`;
      }

      // extension functions code
      if (field.hasOwnProperty('nullable') && field.nullable === false) {
        fields += `.notNullable()`;
      }
      if (field.hasOwnProperty('index') && field.index === true) {
        fields += `.index()`;
      }
      if (field.hasOwnProperty('unique') && field.unique === true) {
        fields += `.unique()`;
      }

      if (field.hasOwnProperty('default')) {
        if (typeof field.default === 'string') {
          fields += `.default('${field.default}')`;
        } else {
          fields += `.default(${field.default})`;
        }
      }

      fields += ';\n';
    });

    // ADD foreigns
    let foreigns = '';
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      foreigns = '\n';
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);

        foreigns += `    table.foreign('${this.toCamelCase(relEntity.name)}_id').references('${this.toCamelCase(relEntity.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;
      });
    }

    let rendered = Mustache.render(template, { tableName, fields, foreigns });

    let writePath = path.join(__dirname, `../../output/database/migrations/${startName}_create_table_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateManyMigrations(entity) {
    // Many-To-Many foreign fields
    if (entity.hasOwnProperty('relations') && entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(relation => {
        let relEntity = this.lookupEntity(relation);
        this.generateManyMigration(entity, relEntity);
      });
    }
  }

  generateController(entity) {

    // Special Controller for Authentication
    if (entity.hasOwnProperty('auth')) {
      let readPath = path.join(__dirname, '../../templates/controllers/Auth.mustache');
      let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
      //console.log('template', template);

      let rendered = Mustache.render(
        template,
        {
          Entity: entity.name,
          entity: this.toCamelCase(entity.name),
          identification: entity.auth[0],
          secret: entity.auth[1],
        }
      );

      let writePath = path.join(__dirname, `../../output/server/controllers/v1/${entity.name}.js`);

      fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

      return;
    }

    // For Normal Controller
    let readPath = path.join(__dirname, '../../templates/controllers/Controller.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Actions for autoloading parent model
    let actions = '';

    // Foreign fields
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      let parents = entity.relations.belongsTo.map(relation => {
        let relEntity = this.lookupEntity(relation);
        return `'${this.toTableCase(relEntity.name)}'`;
      });

      let keyValues = `      withRelated: [${parents.join(', ')}],`;
      actions += this.generateAction(entity, 'all', keyValues);
      actions += '\n';
      actions += this.generateAction(entity, 'find', keyValues);
    }

    // TODO: Add Multer for fields that need file upload


    let rendered = Mustache.render(template,
      {
        Entity: entity.name,
        actions,
      }
    );

    let writePath = path.join(__dirname, `../../output/server/controllers/v1/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateModel(entity) {
    let readPath = path.join(__dirname, '../../templates/models/Model.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // RELATIONS
    let relations = '';
    if (entity.hasOwnProperty('relations')) {
      if (entity.relations.belongsTo) {
        entity.relations.belongsTo.forEach(relation => {
          relations += this.generateRelation(relation, 'belongsTo');
        });
      }

      if (entity.relations.hasMany) {
        entity.relations.hasMany.forEach(relation => {
          relations += this.generateRelation(relation, 'hasMany');
        });
      }

      if (entity.relations.belongsToMany) {
        entity.relations.belongsToMany.forEach(relation => {
          relations += this.generateRelation(relation, 'belongsToMany');
        });
      }
    }

    let rendered = Mustache.render(
      template,
      {
        Entity: entity.name,
        tableName: this.toTableCase(entity.plural),
        relations
      }
    );

    let writePath = path.join(__dirname, `../../output/server/models/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateSeed(entity, index) {
    let tableName = this.toTableCase(entity.plural);

    let readPath = path.join(__dirname, '../../templates/database/seeds/seed.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // fields DATA
    let fieldValues = '';
    entity.fields = entity.fields || [];

    // Add fields for foreign keys in the Many side of 1-to-Many or Many-to-Many
    if (entity.hasOwnProperty('relations') && entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        let relEntity = this.lookupEntity(relation);

        // Calculate foreign key value from Parent range to respect constraint
        let fkValue = `parseInt(Math.random() * ${relEntity.seedAmount} + 1),`;

        fieldValues += `      ${this.toCamelCase(relEntity.name)}_id: ${fkValue}\n`;
      });
    }

    // Create faker key value method for each field
    entity.fields.forEach(field => {
      // Provided Faker method
      if (field.hasOwnProperty('faker')) {
        let fakers = field.faker.split('.');

        if (field.type === 'string') {
          // add string length limit
          field.length = field.length || 255;
          fieldValues += this.generateFieldValue(field.name, fakers[0], fakers[1], field.length);
        } else {
          fieldValues += this.generateFieldValue(field.name, fakers[0], fakers[1]);
        }
      } else {
        // Default faker method according to field type
        if (field.type === 'string') {
          field.length = field.length || 255;
          fieldValues += this.generateFieldValue(field.name, 'lorem', 'sentence', field.length);
        } else if (field.type === 'integer') {
          fieldValues += this.generateFieldValue(field.name, 'random', 'number');
        } else if (field.type === 'decimal') {
          fieldValues += this.generateFieldValue(field.name, 'finance', 'amount');
        } else if (field.type === 'date') {
          fieldValues += this.generateFieldValue(field.name, 'date', 'past');
        } else {
          fieldValues += this.generateFieldValue(field.name, 'fake', '');
        }
      }
    });

    let rendered = Mustache.render(
      template,
      {
        tableName,
        seedAmount: entity.seedAmount,
        fieldValues
      }
    );

    // Start filename to keep order of migration files
    let startName = (this.seedNumber * 100).toString();
    this.seedNumber++;
    startName = '0'.repeat(5 - startName.length) + startName;

    let writePath = path.join(__dirname, `../../output/database/seeds/${startName}_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateManySeeds(entity, index) {
    // Many-To-Many foreign fields
    if (entity.hasOwnProperty('relations') && entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(relation => {
        let relEntity = this.lookupEntity(relation);
        this.generateManySeed(entity, relEntity);
      });
    }
  }

  generateRelation(relation, relationFunction) {
    let entity = this.lookupEntity(relation);

    let readPath = path.join(__dirname, '../../templates/models/Relation.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name,
        relationName: relationFunction === 'belongsTo' ? this.toCamelCase(entity.name) : this.toCamelCase(entity.plural),
        relationFunction,
      }
    );
  }

  generateApi() {
    let readPath = path.join(__dirname, '../../templates/routes/api.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Controllers declaration
    let controllers = '';
    this.entities.forEach(entity => {
      controllers += this.generateControllerDeclaration(entity);
    });

    // Controllers instanciation
    let controllerInstances = '';
    this.entities.forEach(entity => {
      controllerInstances += this.generateControllerInstance(entity);
    });

    // Endpoints
    let endpoints = '';
    this.entities.forEach(entity => {
      endpoints += this.generateEndpoints(entity);
    });

    let rendered = Mustache.render(
      template,
      {
        appName: crud.app,
        controllers,
        controllerInstances,
        endpoints
      }
    );

    let writePath = path.join(__dirname, `../../output/server/routes/api/v1/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
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

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: this.toCamelCase(entity.name),
        entityUri: this.toDashCase(entity.plural),
      }
    );
  }

  generateFieldValue(field, category, method, length = 0) {
    let readPath = path.join(__dirname, '../../templates/database/seeds/fieldValue.mustache');

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

  generateAction(entity, method, keyValues) {
    let readPath = path.join(__dirname, '../../templates/controllers/action.mustache');

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

  generateManyMigration(entity1, entity2) {
    // Create a Many-To-Many table for both tables
    let tableName = this.toTableCase(entity1.name) + '_' + this.toTableCase(entity2.name);

    let reverseTableName = this.toTableCase(entity2.name) + '_' + this.toTableCase(entity1.name);

    // Abort if a many-to-many migration already exists between those 2 entities
    if (this.belongsToManyTrack.includes(tableName) || this.belongsToManyTrack.includes(reverseTableName)) {
      return;
    }

    let readPath = path.join(__dirname, '../../templates/database/migrations/migration.mustache');

    let template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    //console.log('template', template);

    // Foreign key fields
    let fields = '';

    fields += `    table.integer('${this.toCamelCase(entity1.name)}_id').unsigned();\n`;
    fields += `    table.integer('${this.toCamelCase(entity2.name)}_id').unsigned();\n`;

    // Foreign key indexes
    let foreigns = '\n';
    foreigns += `    table.foreign('${this.toCamelCase(entity1.name)}_id').references('${this.toCamelCase(entity1.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;
    foreigns += `    table.foreign('${this.toCamelCase(entity2.name)}_id').references('${this.toCamelCase(entity2.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;

    let rendered = Mustache.render(template,
      {
        tableName,
        fields,
        foreigns
      }
    );

    // Start filename to keep order of migration files
    this.migrationMoment.add(1, 'seconds');
    let startName = this.migrationMoment.format('YYYYMMDDHHmmss');

    let writePath = path.join(__dirname, `../../output/database/migrations/${startName}_create_table_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

    this.belongsToManyTrack.push(tableName);
  }

  generateManySeed(entity1, entity2) {

    // Create a Many-To-Many table for both tables
    let tableName = this.toTableCase(entity1.name) + '_' + this.toTableCase(entity2.name);

    // Abort if a many-to-many migration already exists between those 2 entities
    if (!this.belongsToManyTrack.includes(tableName)) {
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

    let writePath = path.join(__dirname, `../../output/database/seeds/${startName}_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
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

module.exports = GeneratorController;
