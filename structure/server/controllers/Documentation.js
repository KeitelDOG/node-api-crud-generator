const fs = require('fs');
const path = require('path');
const SwaggerV1 = require('./v1/swagger');

class DocumentationController {
  constructor (crud) {
    this.crud = require('../../crud');
    this.docV1 = null;
    this.docV2 = null;

    // Fill default values
    for (let i = 0; i < this.crud.entities.length; i++) {
      this.crud.entities[i].seedAmount = this.crud.entities[i].seedAmount || 10;
      this.crud.entities[i].fields = this.crud.entities[i].fields || [];
      this.crud.entities[i].relations = this.crud.entities[i].relations || {};
    }
  }

  generate (req, res) {
    const security = req.query.key;
    if (security !== process.env.SECURITY_KEY) {
      res.status(400).send('Incorrect Key');
      return;
    }

    const swaggerV1 = new SwaggerV1(this.crud, this.docV1);
    this.docV1 = swaggerV1.generate();

    // Finally write documentation file
    const documentation = JSON.stringify(this.docV1);
    const writePath = path.join(__dirname, '../api-docs/api-doc-v1.json');
    fs.writeFileSync(writePath, documentation, { encoding: 'utf-8' });

    res.status(200).send('API Documentation Finished');
  }
}

module.exports = DocumentationController;
