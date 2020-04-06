module.exports = {
  name: 'Comment',
  plural: 'Comments',
  seedAmount: 1000,
  fields: [
    {
      name: 'details',
      type: 'string',
      length: 4000,
      nullable: false,
      faker: 'lorem.sentence',
    },
  ],
  relations: {
    belongsTo: ['User', 'Post'], // User: owner
    belongsToMany: ['User'], // User: mentioned users
  }
};