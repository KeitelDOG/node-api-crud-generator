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
    belongsTo: [
      'User',
      // Custom relation (object)
      // all 3: entity, relation and field must be provided
      {
        entity: 'Post',
        relation: 'myPost',
        field: 'comment_fk',
      }
    ], // User: owner
    belongsToMany: [
      { entity: 'User' }, // User: mentioned users
    ],
  }
};