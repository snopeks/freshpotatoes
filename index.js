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

// Sequelize connection

var sequelize = new Sequelize('mainDB', null, null, {
    host: 'localhost',
    dialect: "sqlite",
    storage: './db/database.db',
});


// ROUTE HANDLER
function getFilmRecommendations(req, res) {

  //Set up response data
  var filmResponse = {
    films: [],
    recommendations: [],
    meta: {
      limit: 10,
      offset: 0
    }
  };
  console.log(filmResponse.films[0])

  //Get the base film by the req params
  var getFilmById = function(id){
    console.log("in function")
    sequelize.query(`SELECT * FROM films WHERE id = ${id}`, {type: sequelize.QueryTypes.SELECT})
      .then(function(film){
        if(film.length === 1){
          filmResponse.films.push(film[0])
          // sendResponse()
          getSimilarFilms(film)
        } else {
          console.log("can't find this film")
          res.status(404).send({message: "can't find this film"})
        }
      })
  }
  getFilmById(req.params.id)

  //get films related by genre and release date
  var getSimilarFilms = function(film){
    var parentReleaseDate = new Date(film[0].release_date)
    console.log(parentReleaseDate)
  }

  //send successful response
  var sendResponse = function(){res.status(200).json({
    recommendations: filmResponse.films,
    meta: filmResponse.meta
    });
  };

  console.log("film id", req.params.id)
  // sanitize req.params
}
// TODO: DONE db call#1: get the film that matches the id from the api request (e.g. Harry potter, genre: horror, releasedate: 2000)
// TODO: db call#2: from db grab genres and release dates that match the request (e.g. grab horror films released 15 years before and after 2000)
// TODO: return an array of films that fit this criteria
// TODO: find films within this array with min 5 reviews and min 4 stars using 3rd party api on each
// TODO: return filtered recommendations
module.exports = app;
