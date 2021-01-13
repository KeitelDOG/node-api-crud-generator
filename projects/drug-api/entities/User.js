module.exports = {
  name: 'User',
  plural: 'Users',
  seedAmount: 100,
  auth: ['email', 'password'],
  defaultAuth: 'default@email.com',
  fields: [
    {
      name: 'full_name',
      type: 'string',
      length: 255,
      faker: 'name.findName'
    },
    {
      name: 'email',
      type: 'string',
      length: 255,
      faker: 'internet.email'
    },
    {
      name: 'password',
      type: 'string',
      length: 128,
      faker: 'internet.password'
    }

  ],
  relations: {
    hasOne: ['Store']
  }
};
