/*
/*
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
*/

const schedule = require('node-schedule');
const axios = require('axios');

// test with each minute:
// */1 * * * *
// every hour at minute 0:
// 0 */1 * * *
// every 4 hours at minute 20 (start at midnight => 12h20, 4h20, 8h20, etc.):
// 20 */4 * * *
// every hour at minute 30:
// 30 */1 * * *


exports.start = () => {
  console.log('start scheduler');

  var testSchedule = schedule.scheduleJob('*/1 * * * *', function() {
    //exports.runTest();
  });


};

exports.runTest = () => {
  console.log('test date: ' + new Date());
};
