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

  // Check & set offset and limit
  if (req.query.offset && parseInt(req.query.offset) >= 0) {
    filmResponse.meta.offset = parseInt(req.query.offset);
  };
  if(req.query.limit && parseInt(req.query.limit) >= 0) {
    filmResponse.meta.limit = parseInt(req.query.limit);
  };

  Film.findById(req.params.id)
    .then((film) => {
      if(film === null){
        res.status(422).send({message: "film doesn't exist"});
        throw "invalid film id";
      };
      //get the film data
      let filmObject = film.dataValues;
      return filmObject;
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
      });
    })
    .then((relatedFilms) => {
      let filmIds = [];
      matchingFilms = relatedFilms.map(function(i) {
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

              if(i === movie.reviews.length -1) {
                //once we've added all the ratings, average them out to two decimals!
                avgRating = Number(Math.round((avgRating/movie.reviews.length)+'e2')+'e-2');
                if(avgRating >= 4.0){
                  //if the avg rating for a film is equal to or greater than 4,
                  // add the # of reviews and avg rating values to the correct matching film data
                  matchingFilms.find((film, i) => {
                    if(film.id === movie.film_id) {
                        //add the rating, # of reviews, and update genre field on this movie
                        matchingFilms[i].averageRating = avgRating;
                        matchingFilms[i].reviews = movie.reviews.length;
                        matchingFilms[i].genre = matchingFilms[i].genre.name;
                        //add the fully updated film to our recommendations array
                        filmResponse.recommendations.push(matchingFilms[i]);
                        return true;
                    };
                  });
                };
              };
            });
          };
        }) //END OF allMovieReviews.forEach
        //ready to send back the best recommendations!
        handleOffsetAndLimit()
    });
  }).catch((err) => { console.log(err)})
  //END OF request to get 3rd party reviews

  // handle offset and limit
  let handleOffsetAndLimit = () => {
    if (filmResponse.meta.offset > 0) {
      filmResponse.recommendations.splice(0, filmResponse.meta.offset);
    };
    if(filmResponse.recommendations.length > filmResponse.meta.limit) {
      filmResponse.recommendations.splice(filmResponse.meta.limit, filmResponse.recommendations.length - filmResponse.meta.limit)
    };
    // send successful response
    sendRecommendations();
  };
  let sendRecommendations = () => {res.status(200).json(filmResponse)};
}

module.exports = app;
