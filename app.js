
/*
    Name: Joy Shi
    CS 132 Spring 2022
    Date: May 10th, 2022

    This is my app JS for my E-Commerce store, handling data requests.
*/

const express = require("express");
const globby = require("globby");
const fs = require("fs/promises");
const path = require("path");
const { response } = require("express");
const res = require("express/lib/response");

const multer = require("multer");

const SERVER_ERROR = "the server is not working. Please try again later!";
const SERVER_ERR_CODE = 500;
const CLIENT_ERR_CODE = 400;

const app = express();
// for application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module
app.use(express.static("public"));

/**
 * This API will eventually support the following endpoints:
 * GET /categories
 * GET /images
 * GET /menu
 * GET /menu/:categories
 * GET /:f/reviews
 * POST /contact
 * POST /addItem
 * POST /questions
 */
app.get("/images", async (req, res) => {
  try {
    let imgData = [];
    let imgs = await globby("public/imgs*/*.(jpeg|jpg)");
    for (let i = 0; i < imgs.length; i++) {
      let current = imgs[i].substring(7);
      imgData.push(current);
    }
    res.json(imgData);
  } catch (err) {
    if (DEBUG) {
      console.log(err);
    }
    res.status(500).send(SERVER_ERROR);
  }
});

app.get("/films", async (req, res, next) => {
  try {
    let films = await fs.readdir("films");
    films.shift();
    res.json(films);
  } catch (err) {
    res.status(SERVER_ERR_CODE);
    err.message = SERVER_ERROR;
    next(err);
  }
});

app.get("/strip", async (req, res, next) => {
  try {
    let filmsData = await getStripData();
    res.json(filmsData);
  } catch (err) {
    res.status(SERVER_ERR_CODE);
    err.message = SERVER_ERROR;
    next(err);
  }
});

app.get("/:f/reviews", async (req, res, next) => {
  let filmName = req.params.f;
  try {
    let reviewFile = "films/" + filmName + "/reviews.txt";
    let reviewTxt = await fs.readFile(reviewFile, "utf8");
    let reviewJson = reviewToJson(reviewTxt);
    res.send(reviewJson);
  } catch (err) {
    // only a 500 error case is appropriate in above try block
    res.status(SERVER_ERR_CODE);
    err.message = SERVER_ERROR;
    next(err);
  }
});

app.get("/all-themes"),
  async (req, res, next) => {
    let themes = await fs.readdir("films");
  };

function reviewToJson(reviews) {
  reviews = reviews.split("\n");
  let rtgs = [];
  let rvs = [];
  for (let i = 0; i < reviews.length; i++) {
    if (i % 2 == 0) {
      rtgs.push(reviews[i]);
    } else {
      rvs.push(reviews[i]);
    }
  }
  return { ratings: rtgs, reviews: rvs };
}

/**
 * Allows user to submit comments or requests to the site admin.
 */
app.post("/questions", async (req, res, next) => {
  let newMsg = processMsgParams(req.body.message);
  let contactFile = "contacts.txt";

  if (!newMsg) {
    res.status(CLIENT_ERR_CODE);
    next(
      Error("Required POST parameters for /msgs: message.")
    );
  }

  try {
    questions = await fs.readFile(contactFile, "utf8");
  } catch (err) {
    // only a 500 error case is appropriate in above try block
    if (err.code !== "ENOENT") {
      res.status(SERVER_ERR_CODE);
      err.message = SERVER_ERROR;
      next(err);
    }
  }

  try {
    await fs.writeFile(contactFile, newMsg.message + "\n", "utf8");
    res.type("text");
    res.send("Your question was received!");
  } catch (err) {
    res.status(SERVER_ERR_CODE);
    err.message = SERVER_ERROR;
    next(err);
  }
});

app.post("/:film/addReview", async (req, res, next) => {
  let newReview = processReviewParams(req.body.rating, req.body.review);
  let filmName = req.params.film;
  if (!newReview) {
    res.status(CLIENT_ERR_CODE);
    next(Error("Required POST parameters for /reviews: review and rating."));
  }

  let reviewFile = "films/" + filmName + "/reviews.txt";
  let reviews = [];

  try {
    reviews = await fs.readFile(reviewFile, "utf8");
  } catch (err) {
    // only a 500 error case is appropriate in above try block
    if (err.code !== "ENOENT") {
      res.status(SERVER_ERR_CODE);
      err.message = SERVER_ERROR;
      next(err);
    }
  }

  try {
    await fs.writeFile(
      reviewFile,
      reviews + newReview.rating + "\n" + newReview.review + "\n",
      "utf8"
    );
    res.type("text");
    res.send("Your review was received!");
  } catch (err) {
    res.status(SERVER_ERR_CODE);
    err.message = SERVER_ERROR;
    next(err);
  }
});

/**
 *
 * @param {String} name
 * @param {String} email
 * @param {String} message
 * @returns
 */
function processMsgParams(message) {
  let result = null;
  if (message) {
    result = {
      message: message,
      timestamp: new Date().toUTCString(),
    };
  }
  return result;
}

/**
 *
 * @param {String} rating
 * @param {String} review
 * @returns
 */
function processReviewParams(rating, review) {
  let result = null;
  if (rating && review) {
    result = {
      rating: rating,
      review: review,
    };
  }
  return result;
}

/*
 * Generates film strip data from the directories in format:
 * { films : [ { filmData }, { filmData }, { filmData }, ...] }
 */
async function getStripData() {
  let filmsData = [];
  let films = await fs.readdir("films");
  films.shift();
  for (let i = 0; i < films.length; i++) {
    let film = films[i];
    let filmData = await getFilmData("films/" + film);
    filmsData.push(filmData);
  }
  return { films: filmsData };
}

/*  
 * Generates film data from films/film-dir directory in format:
 *    {
        "name": string, 
        "year": int,
        "country": string,
        "director": string,
        "themes": string,
        "description": string,
        "cast": string,
        "price": double,
        "in-stock": boolean,
        "rating": double,
        "image": string,
        "citation": string
    }
 * Relies on film directory structure in the form:
 * film-dir/
 *   info.txt
 */

async function getFilmData(filmPath) {

  let contents = await fs.readFile(filmPath + "/info.txt", "utf8");

  let data = contents.split("\n");

  let imgPath = data[0];
  let imgCitation = data[1];
  let name = data[2];
  let year = data[3];
  let country = data[4];
  let director = data[5];
  let description = data[6];
  let cast = data[7];
  let price = data[8];
  let quantity = data[9];

  return {
    name: name,
    year: year,
    country: country,
    director: director,
    description: description,
    cast: cast,
    price: price,
    quantity: quantity,
    image: imgPath,
    citation: imgCitation,
  };
}


const PORT = process.env.PORT || 8000;
app.listen(PORT);
