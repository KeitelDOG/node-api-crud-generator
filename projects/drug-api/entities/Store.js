module.exports = {
  name: 'Store',
  plural: 'Stores',
  seedAmount: 20,
  fields: [
    {
      name: 'name',
      type: 'string',
      length: 255,
      faker: 'company.companyName'
    }

  ],
  relations: {
    belongsTo: ['User'],
    hasMany: ['Drug']
  }
};
