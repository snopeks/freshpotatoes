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



var Genre = sequelize.define('genre',
  {
    id: {type: Sequelize.INTEGER, primaryKey: true},
    name: {type: Sequelize.STRING, allowNull: false}
  },
  {
    timestamps: false
  }
)
var Film = sequelize.define('film',
  {
    id: {type: Sequelize.INTEGER, primaryKey: true},
    title: {type: Sequelize.STRING, allowNull: false},
    release_date: {type: Sequelize.DATE, allowNull: false},
    tagline: {type: Sequelize.STRING, allowNull: false},
    revenue: {type: Sequelize.BIGINT, defaultValue: 0, allowNull: false},
    budget: {type: Sequelize.BIGINT, allowNull: false},
    runtime: {type: Sequelize.INTEGER, allowNull: false},
    original_language: {type: Sequelize.STRING, allowNull: false},
    status: {type: Sequelize.STRING, allowNull: false},
    genre_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: Genre,
        key: 'id'
      }
    }
  },
  {
    timestamps: false
  }
)

// ROUTE HANDLER
function getFilmRecommendations(req, res) {
  //Set up response data
  var filmResponse = {
    recommendations: [],
    meta: {
      limit: 10,
      offset: 0
    }
  };
  var parentData = {
    releaseDate: [],
    parentGenre: [],
  }
  Film.findById(req.params.id)
    .then(function(film){
      //get the film genre id and release date
      //and put into parent data object
      var filmObject = film.dataValues
      // var parentReleaseDate = new Date(filmObject.release_date)
      // console.log(parentReleaseDate)
      // parentData.releaseDate.push(parentReleaseDate)
      // parentData.parentGenre.push(filmObject.genre_id)
      return filmObject
    })
    .then(function(filmObject){
      //select other films in the same genre released
      //within 15 years before and after the parent range
      Film.belongsTo(Genre, {foreignKey: 'genre_id'})
      console.log("in the next promise",filmObject)
      var releaseDate = new Date(filmObject.release_date)
      console.log(releaseDate)
      var maxRange = `${releaseDate.getFullYear() + 15}-${releaseDate.getMonth()}-${releaseDate.getDate()}`
      var minRange = `${releaseDate.getFullYear() - 15}-${releaseDate.getMonth()}-${releaseDate.getDate()}`
      console.log(maxRange, minRange)
      Film.findAll({
        where: {
          genre_id: filmObject.genre_id,
          release_date: {
            $between: [minRange, maxRange]
          }
        }
      })
      .then(function(filteredFilms){
        console.log("in the result call")
        console.log(filteredFilms[0])

      })


    })

    console.log(parentData)




  //Get the base film by the req params
  // var getFilmById = function(id){
  //   console.log("in function")
  //   sequelize.query(`SELECT * FROM films WHERE id = ${id}`, {type: sequelize.QueryTypes.SELECT})
  //     .then(function(film){
  //       if(film.length === 1){
  //         filmResponse.films.push(film[0])
  //
  //         getSimilarFilms(film)
  //       } else {
  //         console.log("can't find this film")
  //         res.status(404).send({message: "can't find this film"})
  //       }
  //     })
  // }
  // getFilmById(req.params.id)

  //get films related by genre and release date
  // var getSimilarFilms = function(film){
  //   var parentReleaseDate = new Date(film[0].release_date)
  //   console.log(parentReleaseDate)
  //   sendResponse()
  // }

  // send successful response
  var sendResponse = function(){res.status(200).json({
    recommendations: filmResponse.recommendations,
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
