module.exports = {
  name: 'Drug',
  plural: 'Drugs',
  seedAmount: 1000,
  fields: [
    {
      name: 'name',
      type: 'string',
      length: 255,
      faker: 'random.word'
    }

  ],
  relations: {
    belongsTo: ['Store']
  }
};
