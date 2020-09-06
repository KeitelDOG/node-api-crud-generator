var knex = require('knex')({
  client:'mysql',
    connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  pool: {
    min: 2,
    max: 10
  },
});

var bookshelf = require('bookshelf')(knex);
bookshelf.plugin('pagination');
bookshelf.plugin('registry');
bookshelf.plugin('visibility');

module.exports = bookshelf;
