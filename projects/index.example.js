const coolProject = require('./cool-project');
const drugApi = require('./drug-api');
// const megalobiz = require('./megalobiz');

// KEYS must be the same as directory (URI part)
// ex:
// URI: generate/cool-project
// KEY: cool-project
module.exports = {
  'cool-project': coolProject,
  'drug-api': drugApi
  // megalobiz,
};
