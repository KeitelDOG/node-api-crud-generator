module.exports = {
  development: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      database: 'project',
      user: 'root',
      password: 'FILL_ME',
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: 'database/migrations',
    },
    seeds: {
      directory: 'database/seeds',
    },
  },
};
