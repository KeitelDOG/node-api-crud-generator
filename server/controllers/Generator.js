const { ESLint } = require('eslint');
const projects = require('../../projects');
const StructureController = require('./Structure');
const MigrationController = require('./Migration');
const ModelController = require('./Model');
const ControllerController = require('./Controller');
const SeedController = require('./Seed');
const RouteController = require('./Route');
const DocumentationController = require('./Documentation');
const SwaggerController = require('./Swagger');

class GeneratorController {
  generate (req, res, next) {
    // load project info
    this.projectName = req.params.project;
    console.log('bulding project', this.projectName);

    // check project crud
    this.crud = projects[this.projectName];
    if (!this.crud.entities) {
      console.log('no entity data found');
      throw new Error('No data found in CRUD Entities');
    }

    // Generate Static template files
    const structure = new StructureController(req, res);
    structure.generate();

    // Generate Migrations
    const migration = new MigrationController(req);
    migration.generate();

    // Generate models
    const model = new ModelController(req);
    model.generate();

    // Generate Controllers
    const controller = new ControllerController(req);
    controller.generate();

    // Generate Seeds
    const seed = new SeedController(req);
    seed.generate();

    // Generate Routes for API endpoints
    const route = new RouteController(req);
    route.generate();

    // Generate Swagger Controllers for API Documentation
    const swagger = new SwaggerController(req);
    swagger.generate();

    // Generate Documentation API Documentation
    const documentation = new DocumentationController(req);
    documentation.generate();

    console.log('Auto fixing codes for ESLint...');
    this.fixLint()
      .catch((error) => {
        console.error(error);
      })
      .then(() => {
        console.log('Project API successfully generated! 🎉');

        res.status(200).send('Finish');
      });
  }

  async fixLint () {
    // 1. Create an instance with the `fix` option.
    const eslint = new ESLint({ fix: true });

    // 2. Lint files. This doesn't modify target files.
    const results = await eslint.lintFiles([
      `output/${this.projectName}/**/*.js`
    ]);

    // 3. Modify the files with the fixed code.
    await ESLint.outputFixes(results);

    // 4. Format the results.
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);

    // 5. Output it.
    console.log(resultText);
  }
}

module.exports = GeneratorController;
