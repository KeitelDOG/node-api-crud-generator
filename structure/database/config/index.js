require('dotenv').config();
const path = require('path');

var knex = require('knex')({
    client:'mysql',
    connection: {
        host: process.env.DB_HOST,
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

module.exports = bookshelf;
