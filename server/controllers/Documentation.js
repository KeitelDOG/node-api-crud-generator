const BaseController = require('./Base');

class DocumentationController extends BaseController {
  generate () {
    this.generateApiDocumentation();
  }

  generateApiDocumentation () {
    console.log('generating API Documentation...');

    const resource = {
      status: () => {
        return {
          send: () => {
          }
        }
      }
    }

    const DocumentationController = require(`../../output/${this.projectName}/server/controllers/Documentation`);
    const documentation = new DocumentationController();
    this.req.query.key = 'KsvSfbTUYsh3EF4cfCx35hEsCAzTMnsw';
    process.env.SECURITY_KEY = 'KsvSfbTUYsh3EF4cfCx35hEsCAzTMnsw';
    documentation.generate(this.req, resource);
  }
}

module.exports = DocumentationController;
