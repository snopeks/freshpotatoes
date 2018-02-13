const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('*', function(req, res) {
  res.status(404).send({message: "404 page not found"});
})
// Sequelize

var sequelize = new Sequelize('mainDB', null, null, {
    host: 'localhost',
    dialect: "sqlite",
    storage: './db/database.db',
});


// ROUTE HANDLER
function getFilmRecommendations(req, res) {

  console.log("here")
  res.status(500).send('working on it!');
  console.log("film id", req.params.id)
  // sanitize req.params
}
// db call#1: get the film that matches the id from the api request (e.g. Harry potter, genre: horror, releasedate: 2000)
// db call#2: from db grab genres and release dates that match the request (e.g. grab horror films released 15 years before and after 2000)
// return an array of films that fit this criteria
// find films within this array with min 5 reviews and min 4 stars using 3rd party api on each
// return filtered recommendations
module.exports = app;
