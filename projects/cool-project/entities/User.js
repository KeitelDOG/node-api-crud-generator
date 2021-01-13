
module.exports = {
  name: 'User',
  plural: 'Users',
  seedAmount: 20,
  auth: ['email', 'password'],
  defaultAuth: 'default@email.com',
  fields: [
    {
      name: 'name',
      type: 'string',
      length: 100,
      nullable: false,
      index: true,
      faker: 'name.findName'
    },
    {
      name: 'email',
      type: 'string',
      length: 100,
      nullable: false,
      faker: 'internet.email'
    },
    {
      name: 'password',
      type: 'string',
      length: 128,
      hidden: true,
      faker: 'internet.password'
    }
  ],
  relations: {
    hasMany: ['Post', 'Comment'],
    belongsToMany: [
      {
        entity: 'Post', // mentioned users
        relation: 'mPosts',
        fields: [
          {
            name: 'mention_time', // just to illustrate many-to-many (pivot) field
            type: 'datetime',
            nullable: false,
            faker: 'date.recent'
          }
        ]
      },
      {
        entity: 'Comment', // mentioned users
        fields: [
          {
            name: 'mention_time', // just to illustrate many-to-many (pivot) field
            type: 'datetime',
            nullable: false,
            faker: 'date.recent'
          }
        ]
      }
    ]
  }
};
