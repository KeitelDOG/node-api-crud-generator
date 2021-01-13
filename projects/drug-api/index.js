const User = require('./entities/User');
const Store = require('./entities/Store');
const Drug = require('./entities/Drug');

module.exports = {
  package: 'drug-api',
  app: 'Drug API',
  description: 'Express Server used as API for the Drug API application',
  author: 'KeitelDOG',
  repos: 'https://github.com/KeitelDOG/drug-api.git',
  email: 'keiteldog@gmail.com',
  entities: [
    // Keep Order for Parent first and Child after
    User,
    Store,
    Drug
  ]
};
