const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../../api-docs/api-doc-v1.json');

const DocumentationController = require('../../controllers/Documentation');
const documentation = new DocumentationController();

// SWAGGER DOCUMENTATION --
router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerDocument));

router.get('/api-docs/generate', documentation.generate.bind(documentation));

module.exports = router;
