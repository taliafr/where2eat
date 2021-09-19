const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;
const nanoid = require("nanoid/generate");
const cors = require("cors");
const path = require("path");
const fetch = require("cross-fetch");

app.use(express.static(path.join(__dirname, "../")));

async function getRestaurants(query, num, maxPrice) {
  const res = await fetch("https://maps.googleapis.com/maps/api/place/textsearch/json?query=" + query + "&maxprice=" + maxPrice + "&key=AIzaSyDhvS8Taz5XMYMB4SQsTgzeCYZqHNUTRVM");
  const restaurants = await res.json();
  var viableRestaurants = [];

  restaurants.results.forEach(r => {
    if(r.opening_hours != undefined && r.opening_hours.open_now) {
      var rest = {};
      rest.name = r.name;
      rest.rating = r.rating;
      rest.address = r.formatted_address;
      rest.total_ratings = r.user_ratings_total;
      //rest.photo_reference = r.photos.photo_reference;
      viableRestaurants.push(rest);
    }
  });

  viableRestaurants.sort((a, b) => {
    return b.rating - a.rating;
  });

  return viableRestaurants.slice(0, num);
}

var votes = {};
var rooms = {};

io.on("connection", (socket) => {
  console.log("user connected");
  socket.room = undefined;

  //room joining
  socket.on("joinRoom", id => {
    //if room does not exist, send error code 0
    if(rooms[id] == undefined) {
      console.log("slayyy");
      io.to(socket).emit("error", 0);
    } else {
      socket.join(id);
      socket.room = id;
      socket.creator = false;
      rooms[id].users++;

      console.log("Someone joined room " + socket.room);

      //send the number of users in the room
      io.to(socket.room).emit("numUsers", rooms[id].users);
    }
  });

  //room creation
  socket.on("createRoom", maxPrice => {
    //create unique ID and use it for room code
    uniqid = nanoid("1234567890", 6);
    socket.join(uniqid);
    socket.room = uniqid;
    socket.creator = true;

    rooms[uniqid] = {}

    console.log("Created room " + socket.room);

    //initialize votes for the room
    votes[uniqid] = {};
    votes[uniqid].maxPrice = maxPrice;
    votes[uniqid].restaurants = {};
    rooms[uniqid].users = 1;

    //send the room code
    io.to(socket.room).emit("roomCode", socket.room);
  });

  //starting the category vote
  socket.on("startCategoryVote", function() {
    if(socket.creator) {
      io.to(socket.room).emit("startCategoryVote");
    }
  });

  //getting votes for categories
  socket.on("categoryVote", vote => {
    id = socket.room;
    if(!("categories" in votes[id])) {
      //create categories key
      votes[id].categories = {};
      //create set of restrictions
      votes[id].restrictions = new Set();
      //set votecount to 0
      votes[id].votecount = 0;
      votes[id].weightedvc = 0;
    }

    //add category as a key or increase count of category
    vote.categories.forEach(category => {
      console.log(category);
      if(category in votes[id].categories) {
        votes[id].categories[category] += 1;
      } else {
        votes[id].categories[category] = 1;
      }
    });

    //add restrictions
    vote.restrictions.forEach(restriction => {
      votes[id].restrictions.add(restriction);
    });

    //increment the vote count
    votes[id].votecount += 1;
    votes[id].weightedvc += vote.categories.length;

    console.log("category vote received");

    //if all clients have voted, select viable restaurants
    if(votes[id].votecount == rooms[id].users) {
      options = [];

      restrictionsString = "";
      votes[id].restrictions.forEach(restriction => {
        restrictionsString += restriction + " ";
      });

      var maxRestaurants = 5;
      var count = 0;
      Object.keys(votes[id].categories).forEach(async function(category) {
        var portion = (votes[id].categories[category] / votes[id].weightedvc) * maxRestaurants;

        console.log(portion);

        if(options.length < maxRestaurants) {
          viableRestaurants = await getRestaurants(restrictionsString + category + " restaurants", Math.ceil(portion), votes[id].maxPrice);
          viableRestaurants.forEach(restaurant => {
            if(options.length == 0) {
              options.push(restaurant);
            } else {
              safeToAdd = true;
              options.forEach(option => {
                if(restaurant.name == option.name) {
                  safeToAdd = false;
                }
              });
              if(safeToAdd) { options.push(restaurant); }
            }
          });
        }

        count++;
        if(count == Object.keys(votes[id].categories).length) {
          votes[id].restaurants = options;
          io.to(socket.room).emit("startRestaurauntVote", options);
        }
      });
    }
  });

  //getting votes for restaurants
  socket.on("restaurantVote", vote => {
    id = socket.room;
    if(!("restaurantIDs" in votes[id])) {
      //create restaurants key
      votes[id].restaurantIDs = {};
      //set vote count to 0
      votes[id].votecount = 0;
    }

    //add restaurant as key or increase count of restaurant
    Object.keys(vote).forEach(restaurant => {
      if(vote[restaurant] == 1) {
        if(restaurant in votes[id].restaurantIDs) {
          votes[id].restaurantIDs[restaurant] += 1;
        } else {
          votes[id].restaurantIDs[restaurant] = 1;
        }
      }
    });

    //increment the vote count
    votes[id].votecount += 1;

    //if all clients have voted, choose the restaurant
    if(votes[id].votecount == rooms[id].users) {
      //calculate the restaurant with the max votes
      var maxKey = "";
      var maxVal = 0;
      Object.keys(votes[id].restaurantIDs).forEach(restaurant => {
        restaurantVotes = votes[id].restaurantIDs[restaurant];
        console.log(restaurantVotes);
        if(restaurantVotes > maxVal) {
          maxKey = restaurant;
          maxVal = restaurantVotes;
        }
      });

      console.log(votes[id].restaurants[maxKey]);

      //send the picked restaurant to everyone in the room
      io.to(socket.room).emit("restaurantPicked", votes[id].restaurants[maxKey]);
    }
  });

  socket.on("disconnect", () => {
    if(socket.room != undefined) {
      rooms[socket.room] -= 1;
    }
    console.log("user disconnected");
  });
});

http.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
