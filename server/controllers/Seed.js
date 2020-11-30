const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');

class SeedController extends BaseController {
  generate () {
    // Important: clear many to many seed tracker
    this.belongsToManySeedTrack = [];

    // seed file naming ID
    this.seedNumber = 1;

    for (let i = 0; i < this.entities.length; i++) {
      this.generateSeed(this.entities[i]);
    }

    // Generate Many-to-Many Migrations at last position
    for (let i = 0; i < this.entities.length; i++) {
      this.generateManySeeds(this.entities[i]);
    }
  }

  generateSeed (entity, index) {
    console.log(`generating seed for ${entity.name}...`);

    const tableName = this.toTableCase(entity.plural);

    let readPath = path.join(__dirname, '../../templates/database/seeds/seed.mustache');

    if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
      readPath = path.join(__dirname, '../../templates/database/seeds/authSeed.mustache');
    }

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // fields DATA
    let fieldValues = '';
    let defaultAuth = '';
    let identification = '';
    entity.fields = entity.fields || [];

    // Add fields for foreign keys in the Many side of 1-to-Many or Many-to-Many
    if (entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        const relEntity = this.lookupEntity(relation);

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
          fkValue = 'parseInt(Math.random() * i) || null,';
        }

        // UNIQUE CHILD for hasOne Relation
        // check if foreign field is from hasOne
        if (relEntity.relations.hasOne) {
          // if at the reverse, the relEntity contains hasOne to entity
          // then the forein key field will be unique
          // so we must avoid random value from parent id, use incremental id
          if (relEntity.relations.hasOne.includes(entity.name)) {
            // overwrite the foreign key value
            if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
              fkValue = ' i !== undefined ? i + 2 : 1,';
            } else {
              fkValue = 'i + 1,';
            }
          }
        }

        if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
          fieldValues += '  ';
        }

        // default foreign key name, OR provided one
        let fkName = `${this.toTableCase(relEntity.name)}_id`;
        if (typeof relation === 'object' && relation.field) {
          // create FK field with object field
          fkName = relation.field;
        }

        fieldValues += `      ${fkName}: ${fkValue}\n`;
      });
    }

    if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
      identification = entity.auth[0];
      defaultAuth = entity.defaultAuth;
    }

    // generate keyValues for normal fields
    fieldValues += this.generateKeyValuesSeed(entity.fields, entity);

    const declaration = 'const faker = require(\'faker/locale/en\');\n\n';

    const rendered = Mustache.render(
      template,
      {
        declaration,
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

    const writePath = path.join(__dirname, `../../output/${this.projectName}/database/seeds/${startName}_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateManySeeds (entity) {
    console.log(`generating many-to-many seed for ${entity.name}...`);

    // Many-To-Many foreign fields
    if (entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(relation => {
        const relEntity = this.lookupEntity(relation.entity);
        this.generateManySeed(entity, relEntity, relation);
      });
    }
  }

  generateManySeed (entity1, entity2, relation) {
    // Create a Many-To-Many seed for both tables
    const tb1 = this.toTableCase(entity1.plural);
    const tb2 = this.toTableCase(entity2.plural);
    let tableName;

    // pivot fields
    const fields = relation.fields || [];

    // if no table provided, tables will be placed in alphabetic order
    if (relation.table) {
      tableName = relation.table;
    } else if (tb1 < tb2) {
      tableName = tb1 + '_' + tb2;
    } else {
      tableName = tb2 + '_' + tb1;
    }

    // Abort if a many-to-many migration already exists between those 2 entities
    if (this.belongsToManySeedTrack.includes(tableName)) {
      return;
    }

    const readPath = path.join(__dirname, '../../templates/database/seeds/seed.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // Foreign key fields
    let fieldValues = '';
    const fk1 = relation.fk1 || `${this.toTableCase(entity1.name)}_id`;
    const fk2 = relation.fk2 || `${this.toTableCase(entity2.name)}_id`;

    // Calculate foreign key value from Parent range to respect constraint
    const fk1Value = `parseInt(Math.random() * ${entity1.seedAmount} + 1),`;
    const fk2Value = `parseInt(Math.random() * ${entity2.seedAmount} + 1),`;

    fieldValues += `      ${fk1}: ${fk1Value}\n`;
    fieldValues += `      ${fk2}: ${fk2Value}\n`;

    // generate keyValues for normal fields
    fieldValues += this.generateKeyValuesSeed(fields);

    // declare faker only if necessary to avoid Lint error
    let declaration = null;
    if (fields.length) {
      declaration = 'const faker = require(\'faker/locale/en\');\n\n';
    }

    const seedAmount = relation.seedAmount || Math.min(entity1.seedAmount, entity2.seedAmount);

    const rendered = Mustache.render(
      template,
      {
        declaration,
        tableName,
        seedAmount,
        fieldValues
      }
    );

    // Start filename to keep order of migration files
    let startName = (this.seedNumber * 100).toString();
    this.seedNumber++;
    startName = '0'.repeat(5 - startName.length) + startName;

    const writePath = path.join(__dirname, `../../output/${this.projectName}/database/seeds/${startName}_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

    this.belongsToManySeedTrack.push(tableName);
  }

  generateKeyValuesSeed (fields, entity = {}) {
    let fieldValues = '';

    // Create faker key value method for each field
    fields.forEach(field => {
      let type = field.type;
      // Use equivalent type if available
      if (this.types[field.type] && this.types[field.type].type) {
        type = this.types[field.type].type;
      }

      // Create hash password for Auth Entity field
      if (Object.prototype.hasOwnProperty.call(entity, 'auth') && entity.auth[1] === field.name) {
        fieldValues += `        ${field.name}: hash,\n`;
      } else if (Object.prototype.hasOwnProperty.call(field, 'faker')) {
        // Provided Faker method
        const fakers = field.faker.split('.');

        if (type === 'string') {
          // add string length limit
          field.length = field.length || 255;
          fieldValues += this.generateFieldValue(entity, field, fakers[0], fakers[1]);
        } else {
          fieldValues += this.generateFieldValue(entity, field, fakers[0], fakers[1]);
        }
      } else {
        // Default faker method according to field type
        if (type === 'string') {
          field.length = field.length || 255;
          fieldValues += this.generateFieldValue(entity, field, 'lorem', 'sentence');
        } else if (type === 'integer') {
          fieldValues += this.generateFieldValue(entity, field, 'random', 'number');
        } else if (type === 'decimal') {
          fieldValues += this.generateFieldValue(entity, field, 'finance', 'amount');
        } else if (type === 'date') {
          fieldValues += this.generateFieldValue(entity, field, 'date', 'past');
        } else if (type === 'time') {
          fieldValues += this.generateFieldValue(entity, field, 'time', 'recent');
        } else if (type === 'boolean') {
          fieldValues += this.generateFieldValue(entity, field, 'random', 'boolean');
        } else {
          // DO NOT GENERATE DEFAULT YET FOR UNHANDLED TYPES
          // fieldValues += this.generateFieldValue(entity, field, 'fake', '');
        }
      }
    });

    return fieldValues;
  }

  generateFieldValue (entity, field, category, method) {
    let readPath = path.join(__dirname, '../../templates/database/seeds/fieldValue.mustache');

    if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
      readPath = path.join(__dirname, '../../templates/database/seeds/authFieldValue.mustache');
    }

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    if (category === 'fake') {
      // return `      ${field}: faker.fake(${length}),\n`;
    }

    let limit = '';
    if (field.type === 'string' && field.length) {
      limit = `.slice(0, ${field.length})`;
    }

    // Number max limit
    let max = '';
    if (this.types[field.type] && this.types[field.type].type === 'number') {
      max = this.types[field.type].max || '';
      if (field.unsigned === true) {
        // double it
        max = max ? max * 2 : '';
      }
    }

    return Mustache.render(
      template,
      {
        field: field.name,
        category,
        method: method + `(${max})`,
        limit
      }
    );
  }
}

module.exports = SeedController;
