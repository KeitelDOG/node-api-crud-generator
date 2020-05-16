const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');

var options = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: '/api-doc-v1.json',
        name: 'APIv1'
      },
      {
        url: '/api-doc-v2.json',
        name: 'APIv2'
      }
    ]
  }
}

const DocumentationController = require('../../controllers/Documentation');
const documentation = new DocumentationController();

// SWAGGER DOCUMENTATION --
router.get('/api-docs/generate', documentation.generate.bind(documentation));

router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, options));

module.exports = router;
