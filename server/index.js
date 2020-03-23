const express = require('express');
const path = require('path');
const GeneratorController = require('./controllers/Generator');

const port = process.env.APP_PORT || 3600;

const app = express();

// controllers
let generator = new GeneratorController();

app.get('/', function(req, res) {
  console.log('API CRUD Generator Server home');
  res.status(200)
    .send({
      server: 'API CRUD Generator',
      status: 'Success'
    });
});


app.get('/generators/generate', generator.generate.bind(generator));

app.listen(port, function() {
  console.log(`API CRUD Generator Server is listening to port ${port}`);
});