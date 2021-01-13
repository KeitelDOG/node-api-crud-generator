/* RULES
 *
 *
 *
 */

const User = require('./entities/User');
const Post = require('./entities/Post');
const Comment = require('./entities/Comment');

module.exports = {
  package: 'cool-project',
  app: 'Cool Project',
  description: 'Express Server used as API for the Cool Project application',
  author: 'KeitelDOG',
  repos: 'https://github.com/KeitelDOG/cool-project.git',
  email: 'keiteldog@gmail.com',
  entities: [
    // Keep Order for Parent first and Child after
    User,
    Post,
    Comment
  ]
};
