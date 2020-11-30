const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');

class ControllerController extends BaseController {
  generate () {
    for (let i = 0; i < this.entities.length; i++) {
      this.generateController(this.entities[i]);
    }
  }

  generateController (entity) {
    console.log(`generating controller for ${entity.name}...`);

    // Special actions for Authentication Controller
    let authActions = '';
    let authImport = '';

    if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
      console.log('generating auth controller...');

      // for controllers import
      authImport = 'const Auth = require(\'./Auth\');';

      // Generate Auth Actions methods code to add into the Controller at the end in the templates
      const readPath = path.join(__dirname, '../../templates/controllers/authActions.mustache');
      const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
      // console.log('template', template);

      authActions = Mustache.render(
        template,
        {
          entity: this.toCamelCase(entity.name),
          identification: entity.auth[0],
          secret: entity.auth[1]
        }
      );

      // Save Auth File
      const authReadPath = path.join(__dirname, '../../templates/controllers/Auth.mustache');
      const authTemplate = fs.readFileSync(authReadPath, { encoding: 'utf-8' });

      const authRendered = Mustache.render(
        authTemplate,
        {
          Entity: entity.name,
          entity: this.toCamelCase(entity.name),
          Identification: this.fieldToCamelUppercase(entity.auth[0]),
          identification: entity.auth[0],
          secret: entity.auth[1]
        }
      );

      const authWritePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/Auth.js`);

      fs.writeFileSync(authWritePath, authRendered, { encoding: 'utf-8' });

      // Add Auth Middleware to token check
      this.generateAutorizationMiddleware();
    }

    // For Normal Controller
    const readPath = path.join(__dirname, '../../templates/controllers/Controller.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // Actions for autoloading parent (belongsTo) and child (hasOne) model
    let actions = '';

    // belongsTo and hasOne relations
    if (Object.prototype.hasOwnProperty.call(entity, 'relations')) {
      let parents = [];
      let ones = [];

      if (entity.relations.belongsTo) {
        parents = entity.relations.belongsTo.map(relation => {
          const relEntity = this.lookupEntity(relation);
          // relation can be string or object
          if (typeof relation === 'object' && relation.relation) {
            return `'${relation.relation}'`;
          }
          return `'${this.toCamelCase(relEntity.name)}'`;
        });
      }
      if (entity.relations.hasOne) {
        ones = entity.relations.hasOne.map(relation => {
          const relEntity = this.lookupEntity(relation);
          // relation can be string or object
          if (typeof relation === 'object' && relation.relation) {
            return `'${relation.relation}'`;
          }
          return `'${this.toCamelCase(relEntity.name)}'`;
        });
      }

      const keyValues = `      withRelated: [${parents.concat(ones).join(', ')}],`;
      actions += this.generateRetrieveAction(entity, 'all', keyValues);
      actions += '\n';
      actions += this.generateRetrieveAction(entity, 'find', keyValues);
    }

    // TODO: Add Multer for fields that need file upload
    // belongsTo and hasOne relations
    const fileFields = entity.fields.filter(field => {
      return field.file === true;
    });

    if (fileFields.length) {
      let oldFilesCode = '';
      fileFields.forEach(field => {
        oldFilesCode += `        req.oldFilepaths.push('public/files/' + model.get('${field.name}'));\n`;
      });

      actions += '\n';
      actions += this.generateMulterUpdateAction(entity, oldFilesCode);
    }

    const rendered = Mustache.render(template,
      {
        Entity: entity.name,
        actions,
        authImport,
        authActions
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateAutorizationMiddleware () {
    console.log('generating authorization middleware...');
    const readPath = path.join(__dirname, '../../templates/middlewares/authorization.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    const rendered = Mustache.render(template);

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/middlewares/authorization.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateRetrieveAction (entity, method, keyValues) {
    const readPath = path.join(__dirname, '../../templates/controllers/retrieveAction.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: entity.name,
        method,
        keyValues
      }
    );
  }

  generateMulterUpdateAction (entity, oldFilesCode) {
    const readPath = path.join(__dirname, '../../templates/controllers/multerUpdateAction.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        oldFilesCode
      }
    );
  }
}

module.exports = ControllerController;
