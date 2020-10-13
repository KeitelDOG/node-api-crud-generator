module.exports = {
  name: 'Post',
  plural: 'Posts',
  seedAmount: 100,
  fields: [
    {
      name: 'details',
      type: 'string',
      length: 4000,
      faker: 'lorem.sentence',
    },
    {
      name: 'picture_1',
      type: 'string',
      length: 255,
      faker: 'image.imageUrl',
      file: true,
    },
    {
      name: 'picture_2',
      type: 'string',
      length: 255,
      faker: 'image.imageUrl',
      file: true,
    },
  ],
  relations: {
    belongsTo: ['User', 'Post'], // User: owner, Post: original post
    hasMany: [
      {
        entity: 'Comment',
        relation: 'myComments',
        field: 'comment_fk',
      },
      'Post', // Post: shares (can bu null)
    ],
    belongsToMany: [
      { entity: 'User' }, // User: mentioned users
    ],
  }
};