const projects = require('../../projects');

class BaseController {
  constructor (req) {
    this.req = req;
    this.projectName = '';
    this.crud = {};
    this.entities = [];
    this.types = {
      tinyint: { type: 'number', max: 127 },
      smallint: { type: 'number', max: 32767 },
      mediumint: { type: 'number', max: 8388607 },
      int: { type: 'number', max: 2147483647 },
      integer: { type: 'number', max: 2147483647 },
      decimal: { type: 'number', max: 2147483647 },
      bigint: { type: 'number' }, // 2^63 - 1
      string: { type: 'string' },
      varchar: { type: 'string' },
      char: { type: 'string' },
      date: { type: 'date' },
      datetime: { type: 'date' },
      time: { type: 'time' },
      boolean: { type: 'boolean' }
    };

    this.fillAttributes();
  }

  fillAttributes () {
    // load project info
    this.projectName = this.req.params.project;
    this.crud = projects[this.projectName];

    // Fill default values
    this.crud.entities = this.crud.entities || [];

    for (let i = 0; i < this.crud.entities.length; i++) {
      this.crud.entities[i].seedAmount = this.crud.entities[i].seedAmount || 10;
      this.crud.entities[i].fields = this.crud.entities[i].fields || [];
      this.crud.entities[i].relations = this.crud.entities[i].relations || {};
    }

    this.entities = this.crud.entities;
  }

  lookupEntity (entity) {
    // entity can be string or object
    let name = entity;
    if (typeof entity === 'object') {
      // relation object
      name = entity.entity;
    }

    const filtered = this.entities.filter(entity => {
      return entity.name === name;
    });

    if (!filtered.length) {
      throw new Error(`Entity with name ${name} is not defined`);
    }

    return filtered[0];
  }

  toTableCase (string) {
    // form LocationTypes to location_types
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '_' + letter.toLowerCase();
      }
    }, '');
  }

  toDashCase (string) {
    // form LocationTypes to location-types
    return string.split('').reduce((acc, letter, ind) => {
      if (letter === letter.toLowerCase() || ind === 0) {
        return acc + letter.toLowerCase();
      } else {
        return acc + '-' + letter.toLowerCase();
      }
    }, '');
  }

  toCamelCase (string) {
    // form LocationType to locationType
    return string[0].toLowerCase() + string.slice(1);
  }

  fieldToCamelUppercase (string) {
    // form location_type to LocationType
    return string.split('_').map(word => {
      return word[0].toUpperCase() + word.slice(1);
    }).join('');
  }
}

module.exports = BaseController;
