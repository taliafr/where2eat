const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3002;
const nanoid = require("nanoid/generate");
const path = require("path");
const fetch = require("cross-fetch");

app.use(express.static(path.join(__dirname, "./")));

var votes = {};
var rooms = {};

async function getRestaurants(query, roomID, num, maxPrice) {
  console.log(query);

  var request = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" + query + " near me&opennow&maxprice=" + maxPrice + "&location=" + rooms[roomID].lat + "," + rooms[roomID].long + "&key=AIzaSyDhvS8Taz5XMYMB4SQsTgzeCYZqHNUTRVM";
  console.log(request);
  const res = await fetch(request);
  const restaurants = await res.json();
  var viableRestaurants = [];

  console.log(restaurants);

  restaurants.results.forEach(r => {
    var rest = {};
    rest.name = r.name;
    rest.rating = r.rating;
    rest.address = r.formatted_address;
    rest.total_ratings = r.user_ratings_total;
    rest.price_level = r.price_level
    //rest.photo_reference = r.photos.photo_reference;
    viableRestaurants.push(rest);
  });

  viableRestaurants.sort((a, b) => {
    return b.rating - a.rating;
  });

  return viableRestaurants.slice(0, num);
}

function kick(room) {
  delete rooms[room];
  delete votes[room];
  console.log("deleted " + room);
  io.sockets.adapter.rooms.get(room).forEach(s => {
    io.sockets.sockets.get(s).leave(room);
    io.sockets.sockets.get(s).room = undefined;
  });
}

io.on("connection", (socket) => {
  console.log("user connected");
  socket.room = undefined;

  //room joining
  socket.on("joinRoom", id => {
    //if room does not exist, send error code 0
    if(rooms[id] == undefined) {
      io.to(socket.id).emit("error", 0);
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
    uniqid = nanoid("1234567890ABCDEFHJKLMNPQRSTUVWXYZ", 6);
    socket.join(uniqid);
    socket.room = uniqid;
    socket.creator = true;

    rooms[uniqid] = {}
    rooms[uniqid].ip = socket.request.connection.remoteAddress;

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

      var maxRestaurants = 6;
      var count = 0;
      Object.keys(votes[id].categories).forEach(async function(category) {
        if(rooms[id].lat == undefined) {
          console.log(rooms[id].ip);
          const resIP = await (await fetch("https://api.ipgeolocation.io/ipgeo?apiKey=c070307a906c4ce2848980030f21b8cc&ip=" + rooms[id].ip)).json();
          console.log(resIP);
          rooms[id].lat = resIP.latitude;
          rooms[id].long = resIP.longitude;
        }

        var portion = (votes[id].categories[category] / votes[id].weightedvc) * maxRestaurants;

        console.log(portion);

        if(options.length < maxRestaurants) {
          viableRestaurants = await getRestaurants(restrictionsString + category + " restaurants", id, Math.ceil(portion), votes[id].maxPrice);
          for(i = 0; i < viableRestaurants.length; i++) {
            if(options.length >= maxRestaurants) {
              break;
            }

            if(options.length == 0) {
              options.push(viableRestaurants[i]);
            } else {
              safeToAdd = true;
              options.forEach(option => {
                if(viableRestaurants[i].name == option.name) {
                  safeToAdd = false;
                }
              });
              if(safeToAdd) { options.push(viableRestaurants[i]); }
            }
          }
        }

        count++;
        if(count == Object.keys(votes[id].categories).length) {
          votes[id].restaurants = options;
          io.to(socket.room).emit("startRestaurauntVote", options);

          //kick everyone if no suggestions
          if(options.length == 0) { kick(socket.room); }
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
      var maxKey = 0;
      var maxVal = 0;
      var maxKeys = [];
      Object.keys(votes[id].restaurantIDs).forEach(restaurant => {
        restaurantVotes = votes[id].restaurantIDs[restaurant];
        if(restaurantVotes == maxVal) {
          maxKeys.push(maxKey);
          maxKey = restaurant;
          maxKeys.push(restaurant);
        }
        if(restaurantVotes > maxVal) {
          maxKey = restaurant;
          maxVal = restaurantVotes;
          maxKeys = [];
        }
      });

      if(maxKeys.length != 0) {
        console.log(maxKeys);
        maxKey = maxKeys[Math.floor(Math.random() * maxKeys.length)];
      }

      console.log(votes[id].restaurants[maxKey]);

      //send the picked restaurant to everyone in the room
      io.to(socket.room).emit("restaurantPicked", votes[id].restaurants[maxKey]);

      //kick everyone out of the room and delete it
      kick(socket.room);
    }
  });

  socket.on("disconnect", () => {
    if(socket.room != undefined) {
      rooms[socket.room].users--;
      io.to(socket.room).emit("numUsers", rooms[socket.room].users);
      if(rooms[socket.room].users == 0) {
        delete rooms[socket.room];
        delete votes[socket.room];
        console.log("deleted " + socket.room);
      }
    }
    console.log("user disconnected");
  });
});

http.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
