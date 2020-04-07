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
  ],
  relations: {
    belongsTo: ['User', 'Post'], // User: owner, Post: original post
    hasMany: ['Comment', 'Post'], // Post: shares (can bu null)
    belongsToMany: [
      { entity: 'User' }, // User: mentioned users
    ],
  }
};