const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');

class RouteController extends BaseController {
  generate () {
    this.generateApi();
  }

  generateApi () {
    console.log('generating API routes...');

    const readPath = path.join(__dirname, '../../templates/routes/api.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });
    // console.log('template', template);

    // Multers creation
    let multers = '';
    this.entities.forEach(entity => {
      multers += this.generateMulterCreation(entity);
    });

    // comment out multer declaration if there is no file type field
    let commentOut = '';
    if (!multers) {
      commentOut = '// ';
    }

    // Controllers declaration
    let controllers = '';
    let auth = false;
    this.entities.forEach(entity => {
      if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
        auth = true;
      }
      controllers += this.generateControllerDeclaration(entity);
    });

    // Controllers instanciation
    let controllerInstances = '';
    this.entities.forEach(entity => {
      if (Object.prototype.hasOwnProperty.call(entity, 'auth')) {
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
      authController = 'const AuthController = require(\'../../../controllers/v1/Auth\');';
      authRoutes += 'router.get(\'/auth\', verifyToken, auth.auth.bind(auth));\n';
      authRoutes += 'router.post(\'/signin\', auth.signin.bind(auth));\n';
      authRoutes += 'router.post(\'/signup\', auth.signup.bind(auth));\n';
    }

    const rendered = Mustache.render(
      template,
      {
        appName: this.crud.app,
        multers,
        commentOut,
        controllers,
        controllerInstances,
        endpoints,
        authController,
        authRoutes
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/routes/api/v1/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generateControllerInstance (entity) {
    const readPath = path.join(__dirname, '../../templates/routes/ControllerInstance.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name,
        entity: this.toCamelCase(entity.name)
      }
    );
  }

  generateEndpoints (entity) {
    let readPath = path.join(__dirname, '../../templates/routes/endpoints.mustache');

    let fields = '';

    const filtered = entity.fields.filter(field => {
      return field.file === true;
    });

    if (filtered.length) {
      readPath = path.join(__dirname, '../../templates/routes/multerEndpoints.mustache');

      fields = filtered.map(field => {
        return `{ name: '${field.name}' }`;
      }).join(', ');
    }

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: this.toCamelCase(entity.name),
        entityUri: this.toDashCase(entity.plural),
        fields
      }
    );
  }

  generateMulterCreation (entity) {
    const hasFileField = entity.fields.some(field => {
      return field.file === true;
    });

    if (!hasFileField) {
      return '';
    }

    const readPath = path.join(__dirname, '../../templates/routes/multerCreation.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        entity: this.toCamelCase(entity.name)
      }
    );
  }

  generateControllerDeclaration (entity) {
    const readPath = path.join(__dirname, '../../templates/routes/ControllerDeclaration.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    return Mustache.render(
      template,
      {
        Entity: entity.name
      }
    );
  }
}

module.exports = RouteController;
