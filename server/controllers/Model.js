const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');

class ModelController extends BaseController {
  generate () {
    for (let i = 0; i < this.entities.length; i++) {
      this.generateModel(this.entities[i]);
    }
  }

  generateModel (entity) {
    console.log(`generating model for ${entity.name}...`);

    const readPath = path.join(__dirname, '../../templates/models/Model.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // HIDDEN
    let hidden = '';
    const fields = [];
    entity.fields.forEach(field => {
      if (field.hidden === true) {
        fields.push(field.name);
      }
    });
    hidden = `\n  hidden: ['${fields.join('\', \'')}'],`;

    // RELATIONS
    let relations = '';
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
      entity.relations.belongsToMany.forEach(relation => {
        relations += this.generateRelation(relation, 'belongsToMany');
      });
    }

    const rendered = Mustache.render(
      template,
      {
        Entity: entity.name,
        tableName: this.toTableCase(entity.plural),
        hidden,
        relations
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/models/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateRelation (relation, relationFunction) {
    let readPath = path.join(__dirname, '../../templates/models/Relation.mustache');

    // relation can be string or object
    let name = relation;
    if (typeof relation === 'object') {
      name = relation.entity;
      if (relation.field) {
        // template to add custom foreign key
        readPath = path.join(__dirname, '../../templates/models/RelationFK.mustache');
      }
    }

    const entity = this.lookupEntity(name);

    let relationName;
    let foreignKey;

    let joinTableName;
    let fk1;
    let fk2;

    if (relationFunction === 'belongsTo') {
      relationName = this.toCamelCase(entity.name);
      foreignKey = `${this.toTableCase(entity.name)}_id`;
    } else if (relationFunction === 'hasOne') {
      relationName = this.toCamelCase(entity.name);
      foreignKey = `${this.toTableCase(entity.name)}_id`;
    } else if (relationFunction === 'hasMany') {
      relationName = this.toCamelCase(entity.plural);
    } else if (relationFunction === 'belongsToMany') {
      relationName = 'many' + entity.plural;
      readPath = path.join(__dirname, '../../templates/models/Relation.mustache');

      // model.belongsToMany(Target, [joinTableName], [foreignKey], [otherKey], [foreignKeyTarget], [otherKeyTarget])

      if (relation.table) {
        readPath = path.join(__dirname, '../../templates/models/RelationManyTable.mustache');

        joinTableName = relation.table;

        if (relation.fk1) {
          readPath = path.join(__dirname, '../../templates/models/RelationManyFull.mustache');

          fk1 = relation.fk1;
          fk2 = relation.fk2;
        }
      }
    }

    // Generate Template here after readPath has been updated accross all logics
    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    // If relation is an object, more things to consider
    // model.belongsTo(Target, [foreignKey], [foreignKeyTarget])
    // model.hasMany(Target, [foreignKey], [foreignKeyTarget])
    // model.hasOne(Target, [foreignKey], [foreignKeyTarget])

    if (typeof relation === 'object') {
      // override relationName if provided
      relationName = relation.relation || relationName;
      foreignKey = relation.field || foreignKey;
    }

    return Mustache.render(
      template,
      {
        Entity: entity.name,
        relationName,
        relationFunction,
        foreignKey,
        joinTableName,
        fk1,
        fk2
      }
    );
  }
}

module.exports = ModelController;
