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
  res.status(404).send({message: '404 page not found'});
})

// Sequelize connection

const sequelize = new Sequelize('mainDB', null, null, {
    host: 'localhost',
    dialect: 'sqlite',
    storage: './db/database.db',
});


//Define the models
const Genre = sequelize.define('genre',
  {
    id: {type: Sequelize.INTEGER, primaryKey: true},
    name: {type: Sequelize.STRING, allowNull: false}
  },
  {
    timestamps: false
  }
)
const Film = sequelize.define('film',
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
  let filmResponse = {
    recommendations: [],
    meta: {
      limit: 10,
      offset: 0
    }
  };
  let matchingFilms;
  Film.findById(req.params.id)
    .then((film) => {
      if(film === null){
        res.status(422).send({message: "film doesn't exist"})
      }
      //get the film data
      let filmObject = film.dataValues
      return filmObject

    })
    .then((filmObject) => {
      //select other films in the same genre released
      //within 15 years before and after the parent film release date
      Film.belongsTo(Genre, {foreignKey: 'genre_id'});
      let releaseDate = new Date(filmObject.release_date);
      let maxRange = `${releaseDate.getFullYear() + 15}-${releaseDate.getMonth()}-${releaseDate.getDate()}`;
      let minRange = `${releaseDate.getFullYear() - 15}-${releaseDate.getMonth()}-${releaseDate.getDate()}`;
      return Film.findAll({
        include: [
          {
            model: Genre
          }
        ],
        attributes: ['id', 'title', ['release_date', 'releaseDate']],
        where: {
          genre_id: filmObject.genre_id,
          release_date: {
            $between: [minRange, maxRange]
          }
        }
      })
    })
    .then((relatedFilms) => {
      let filmIds = [];
      matchingFilms = relatedFilms.map(function(i){
        return i.dataValues;
      })
      relatedFilms.forEach((film) => {
        filmIds.push(film.id);
      })
      return filmIds;
    })
    .then((filmIds) => {
      request(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${filmIds}`, function(err, response, body){
        //sort out avg ratings and reviews from body
        let allMovieReviews = JSON.parse(response.body);
        allMovieReviews.forEach((movie) => {
          //look at each movie and find the ones with at least 5 reviews
          if(movie.reviews.length >= 5){
            let avgRating = 0;
            movie.reviews.forEach((review, i) => {
              //start calculating avg rating by summing the review ratings
              avgRating += review.rating;

              if(i === movie.reviews.length -1){
                //once we've added all the ratings, average them out to two decimals!
                avgRating = Number(Math.round((avgRating/movie.reviews.length)+'e2')+'e-2');
                if(avgRating >= 4.0){
                  //if the avg rating for a film is equal to or greater than 4,
                  // add the # of reviews and avg rating values to the correct matching film data
                  matchingFilms.find((film, i) => {
                    if(film.id === movie.film_id){
                        //add the rating, # of reviews, and update genre field on this movie
                        matchingFilms[i].averageRating = avgRating;
                        matchingFilms[i].reviews = movie.reviews.length;
                        matchingFilms[i].genre = matchingFilms[i].genre.name;
                        //add the fully updated film to our recommendations array
                        filmResponse.recommendations.push(matchingFilms[i]);
                        return true
                    }
                  })
                  console.log('average is at least 4!')
                  
                } else {
                  console.log('average is not good enough')
                }
              }
            })
          }
        }) //END OF allMovieReviews.forEach
        //ready to send back the best recommendations!
        sendRecommendations()
      })
    }) //END OF request to get 3rd party reviews

  // send successful response
  let sendRecommendations = () => {res.status(200).json(filmResponse)};
}
// TODO: DONE db call#1: get the film that matches the id from the api request (e.g. Harry potter, genre: horror, releasedate: 2000)
// TODO: DONE db call#2: from db grab genres and release dates that match the request (e.g. grab horror films released 15 years before and after 2000)
// TODO: DONE find films within this array with min 5 reviews and min 4 stars using 3rd party api on each
// TODO: DONE return filtered recommendations
// TODO: DONE work on passing the tests and error handling
  // TODO: enable limit and offset
// TODO: DONE need to add genre name to response.

module.exports = app;
