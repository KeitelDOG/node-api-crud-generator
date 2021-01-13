const BaseController = require('./Base');
const fs = require('fs-extra');
const path = require('path');
const Mustache = require('mustache');

class StructureController extends BaseController {
  generate () {
    this.generateStatics();
    this.generateServerIndex();
    this.generatePackage();
  }

  generateStatics () {
    console.log('generating app static structure...');
    // Remove some directories
    fs.removeSync(
      path.join(__dirname, `../../output/${this.projectName}/database`)
    );

    // Structure
    fs.copySync(
      path.join(__dirname, '../../structure'),
      path.join(__dirname, `../../output/${this.projectName}`)
    );

    // Copy the project directory to output project
    fs.copySync(
      path.join(__dirname, `../../projects/${this.projectName}`),
      path.join(__dirname, `../../output/${this.projectName}/crud`)
    );

    // Copy environment files
    fs.copySync(
      path.join(__dirname, '../../structure/.env.example'),
      path.join(__dirname, `../../output/${this.projectName}/.env`)
    );
    fs.copySync(
      path.join(__dirname, '../../structure/knexfile.example.js'),
      path.join(__dirname, `../../output/${this.projectName}/knexfile.js`)
    );
  }

  generateServerIndex () {
    console.log('generating server index.js');
    const readPath = path.join(__dirname, '../../templates/server/index.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    const rendered = Mustache.render(
      template,
      {
        app: this.crud.app
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/server/index.js`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }

  generatePackage () {
    console.log('generating package...');
    const readPath = path.join(__dirname, '../../templates/package.mustache');

    const template = fs.readFileSync(readPath, { encoding: 'utf-8' });

    const rendered = Mustache.render(
      template,
      {
        package: this.crud.package,
        app: this.crud.app,
        description: this.crud.description,
        author: this.crud.author,
        repos: this.crud.repos
      }
    );

    const writePath = path.join(__dirname, `../../output/${this.projectName}/package.json`);

    fs.writeFileSync(writePath, rendered, { encoding: 'utf-8' });
  }
}

module.exports = StructureController;
