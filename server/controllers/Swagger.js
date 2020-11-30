const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');

class SwaggerController extends BaseController {
  generate () {
    this.generateSwagger();
  }

  generateSwagger () {
    console.log('generating Swagger Entities...');

    const readPath = path.join(__dirname, '../../templates/controllers/swagger/index.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // Swagger Controllers declaration
    let controllers = '';
    this.entities.forEach(entity => {
      controllers += this.generateSwaggerDeclaration(entity);
    });

    // Swagger Controllers instanciation
    let controllerInstances = '';
    this.entities.forEach(entity => {
      controllerInstances += this.generateSwaggerInstance(entity);
    });

    const rendered = Mustache.render(
      template,
      {
        controllers,
        controllerInstances
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/swagger/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });

    // Generate Swagger Controllers
    this.entities.forEach(entity => {
      this.generateSwaggerController(entity);
    });
  }

  generateSwaggerController (entity) {
    console.log(`generating swagger controller for ${entity.name}...`);
    if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
      console.log('generating swagger auth controller...');
      // Save Auth Swagger file
      const swaggerReadPath = path.join(__dirname, '../../templates/controllers/swagger/Auth.mustache');
      const swaggerTemplate = fs.readFileSync(swaggerReadPath, { encoding: 'utf-8' });

      const swaggerRendered = Mustache.render(
        swaggerTemplate,
        {
          identification: entity.auth[0],
          secret: entity.auth[1]
        }
      );

      const swaggerWritePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/swagger/Auth.js`);

      fs.writeFileSync(swaggerWritePath, swaggerRendered, { encoding: 'utf-8' });
    }

    // For Normal Controller
    const readPath = path.join(__dirname, '../../templates/controllers/swagger/Controller.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    const rendered = Mustache.render(template,
      {
        Entity: entity.name
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/controllers/v1/swagger/${entity.name}.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateSwaggerDeclaration (entity) {
    const readPath = path.join(__dirname, '../../templates/controllers/swagger/controllerDeclaration.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name
      }
    );
  }

  generateSwaggerInstance (entity) {
    const readPath = path.join(__dirname, '../../templates/controllers/swagger/controllerInstance.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name,
        entity: this.toCamelCase(entity.name)
      }
    );
  }
}

module.exports = SwaggerController;
