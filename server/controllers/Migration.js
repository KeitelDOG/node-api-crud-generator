const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');
const moment = require('moment');

class MigrationController extends BaseController {
  generate () {
    // Important: clear many to many migration tracker
    this.belongsToManyTrack = [];

    // migration file naming with datetime
    this.migrationMoment = moment();
    this.migrationMoment.set({
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0
    });

    for (let i = 0; i < this.entities.length; i++) {
      this.generateMigration(this.entities[i]);
    }

    // Generate Many-to-Many Migrations at last position
    for (let i = 0; i < this.entities.length; i++) {
      this.generateManyMigrations(this.entities[i]);
    }
  }

  generateMigration (entity) {
    console.log(`generating migration for ${entity.name}...`);
    const tableName = this.toTableCase(entity.plural);

    // Start filename to keep order of migration files
    this.migrationMoment.add(1, 'seconds');
    const startName = this.migrationMoment.format('YYYYMMDDHHmmss');

    const readPath = path.join(__dirname, '../../templates/database/migrations/migration.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // ADD FIELDS
    let fieldsCode = '';

    // 1-To-Many foreign fields
    if (entity.relations.belongsTo) {
      entity.relations.belongsTo.forEach(relation => {
        const relEntity = this.lookupEntity(relation);

        // default foreign key name, OR provided one
        let fkName = `${this.toTableCase(relEntity.name)}_id`;
        if (typeof relation === 'object' && relation.field) {
          // create FK field with object field
          fkName = relation.field;
        }

        fieldsCode += `    table.integer('${fkName}').unsigned()`;

        // check for nullable
        if (typeof relation === 'object' && relation.nullable === false) {
          fieldsCode += '.notNullable()';
        }

        // check if foreign field is from hasOne
        if (relEntity.relations.hasOne) {
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
    if (entity.relations.belongsTo) {
      foreignsCode = '\n';
      entity.relations.belongsTo.forEach(relation => {
        const relEntity = this.lookupEntity(relation);

        // default foreign key name, OR provided one
        let fkName = `${this.toTableCase(relEntity.name)}_id`;
        if (typeof relation === 'object' && relation.field) {
          // create FK field with object field
          fkName = relation.field;
        }

        foreignsCode += `    table.foreign('${fkName}').references('${this.toTableCase(relEntity.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;
      });
    }

    const rendered = Mustache.render(template,
      {
        tableName,
        fields: fieldsCode,
        foreigns: foreignsCode
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/database/migrations/${startName}_create_table_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateMigrationFields (fields) {
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
      if (field.unsigned === true) {
        fieldsCode += '.unsigned()';
      }
      if (field.nullable === false) {
        fieldsCode += '.notNullable()';
      }
      if (field.index === true) {
        fieldsCode += '.index()';
      }
      if (field.unique === true) {
        fieldsCode += '.unique()';
      }

      if (Object.prototype.hasOwnProperty.call(field, 'default')) {
        if (typeof field.default === 'string') {
          fieldsCode += `.defaultTo('${field.default}')`;
        } else {
          fieldsCode += `.defaultTo(${field.default})`;
        }
      }

      if (field.defaultRaw) {
        fieldsCode += `.defaultTo(${field.default})`;
      }

      fieldsCode += ';\n';
    });

    return fieldsCode;
  }

  generateManyMigrations (entity) {
    console.log(`generating many-to-many migration for ${entity.name}...`);

    // Many-To-Many foreign fields
    // Many to Many structure is different
    // They are Object only, no string
    // All 2 fk1, fk2 are required together
    /*
    {
      entity: 'Entity',
      relation: 'manyEntities',
      table: 'entities',
      fk1: 'foreign_key_1',
      fk2: 'foreign_key_2',
      fields: [
        {

        }
      ]
    }
    */
    if (entity.relations.belongsToMany) {
      entity.relations.belongsToMany.forEach(relation => {
        const relEntity = this.lookupEntity(relation.entity);
        this.generateManyMigration(entity, relEntity, relation);
      });
    }
  }

  generateManyMigration (entity1, entity2, relation) {
    // Create a Many-To-Many table for both tables
    const tb1 = this.toTableCase(entity1.plural);
    const tb2 = this.toTableCase(entity2.plural);
    let tableName;
    // pivot fields
    const fields = relation.fields || [];

    // tables will be placed in alphabetic order if not provided
    if (relation.table) {
      tableName = relation.table;
    } else if (tb1 < tb2) {
      tableName = tb1 + '_' + tb2;
    } else {
      tableName = tb2 + '_' + tb1;
    }

    // Abort if a many-to-many migration already exists between those 2 entities
    if (this.belongsToManyTrack.includes(tableName)) {
      return;
    }

    const readPath = path.join(__dirname, '../../templates/database/migrations/migration.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // Foreign key fields
    let fieldsCode = '';
    const fk1 = relation.fk1 || `${this.toTableCase(entity1.name)}_id`;
    const fk2 = relation.fk2 || `${this.toTableCase(entity2.name)}_id`;

    fieldsCode += `    table.integer('${fk1}').unsigned().notNullable();\n`;
    fieldsCode += `    table.integer('${fk2}').unsigned().notNullable();\n`;

    // Many-to-Many Fields (pivot) if any
    fieldsCode += this.generateMigrationFields(fields);

    // Foreign key indexes
    let foreignsCode = '\n';
    foreignsCode += `    table.foreign('${fk1}').references('${this.toTableCase(entity1.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;
    foreignsCode += `    table.foreign('${fk2}').references('${this.toTableCase(entity2.plural)}.id').onUpdate('CASCADE').onDelete('RESTRICT');\n`;

    const rendered = Mustache.render(template,
      {
        tableName,
        fields: fieldsCode,
        foreigns: foreignsCode
      }
    );

    // Start filename to keep order of migration files
    this.migrationMoment.add(1, 'seconds');
    const startName = this.migrationMoment.format('YYYYMMDDHHmmss');

    const writePath = path.join(__dirname, `../../output/${this.projectName}/database/migrations/${startName}_create_table_${tableName}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

    this.belongsToManyTrack.push(tableName);
  }
}

module.exports = MigrationController;
