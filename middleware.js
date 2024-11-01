
const express = process.env.USE_LOCAL_EXPRESS ? require('..') : require('express');
const app = express();

// number of middleware

let n = parseInt(process.env.MW || '1', 10);
console.log('  %s middleware', n);

while (n--) {
  app.use(function(req, res, next){
    next();
  });
}

app.use(function(req, res){
  res.send('Hello World')
});

app.listen(3333);
