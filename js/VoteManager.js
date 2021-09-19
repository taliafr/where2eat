socket = io.connect("localhost:3000");
room = undefined;
numOfRestaurants = 0;
canvas = document.querySelector("#confetti-canvas");

foodCats = ["American", "Cajun", "Caribbean", "Chinese", "Czech", "Danish", "English", "German",
"Greek", "Indian", "Indonesian", "Italian", "Japanese", "Korean", "Malaysian", "Mexican", "Pakistani",
"Persian", "Portuguese", "Russian", "South Indian", "Spanish", "Taiwanese", "Turkish", "Ukrainian",
"Vietnamese"];

socket.on("roomCode", roomID => {
  room = roomID;
  document.querySelector("#room-code").innerHTML = room;
});
socket.on("numUsers", num => {
  document.querySelector("#num-users").innerHTML = num;
});
socket.on("error", errorCode => {
  switchScreen("welcome");
});

//create a new room
function createRoom() {
  socket.emit("createRoom", document.querySelector("#max-price").value);
  switchScreen("first-wait");
  document.querySelector("#start-category-button").style.display = "inline-block";
}

//join a room
function joinRoom() {
  var roomID = document.querySelector("#room-id").value;
  socket.emit("joinRoom", roomID);
  document.querySelector("#room-code").innerHTML = roomID;
  switchScreen("first-wait");
}

//start category vote
function startCategoryVote() {
  socket.emit("startCategoryVote");
}

function sendVote(voteType) {
  if(voteType == 0) {
    vote = {}
    vote.categories = []
    vote.restrictions = [];

    foodCats.forEach(c => {
      if(getCheck("category-" + c.replace(" ", "_"))) {
        vote.categories.push(c);
      }
    });

    if(vote.categories.length == 0) {
      document.querySelector("#food-type-warning").style.display = "block";
      document.querySelector("#food-type-header").scrollIntoView();
      return;
    } else {
      document.querySelector("#food-type-warning").style.display = "none";
    }

    if(getCheck("restriction-vegetarian")) { vote.restrictions.push("Vegetarian"); }
    if(getCheck("restriction-vegan")) { vote.restrictions.push("Vegan"); }
    if(getCheck("restriction-gluten-free")) { vote.restrictions.push("Gluten-free"); }
    if(getCheck("restriction-halal")) { vote.restrictions.push("Halal"); }
    if(getCheck("restriction-kosher")) { vote.restrictions.push("Kosher"); }

    socket.emit("categoryVote", vote);
  } else {
    vote = []

    for(i = 0; i < numOfRestaurants; i++) {
      if(!(i in vote)) {
        vote[i] = 0;
      }

      if(getCheck("restaurant-" + i)) {
        vote[i] += 1;
      }
    }

    console.log(vote);

    socket.emit("restaurantVote", vote);
  }

  switchScreen("wait");
}

socket.on("startCategoryVote", function() {
  foodList = document.querySelector("#food-type-list");
  foodList.innerHTML = "";

  foodCats.forEach(c => {
    var newCat = document.createElement("div");
    newCat.classList.add("item");
    var newCatCheck = document.createElement("input");
    newCatCheck.id = "check-category-" + c.replace(" ", "_");
    newCatCheck.type = "checkbox";
    newCat.setAttribute("onClick", "checkToggle('category-" + c.replace(" ", "_") + "')");
    var newCatName = document.createElement("div");
    newCatName.classList.add("item-name");
    newCatName.innerHTML = c;
    newCat.append(newCatCheck);
    newCat.append(newCatName);

    foodList.append(newCat);
  })

  switchScreen("food-type-vote");
});

socket.on("startRestaurauntVote", restaurants => {
  restaurantList = document.querySelector("#restaurant-list");
  restaurantList.innerHTML = "";

  var id = 0;
  restaurants.forEach(r => {
    var newRest = document.createElement("div");
    newRest.classList.add("item");
    var newRestCheck = document.createElement("input");
    newRestCheck.id = "check-restaurant-" + id;
    newRestCheck.type = "checkbox";
    newRest.setAttribute("onClick", "checkToggle('restaurant-" + id +"')");
    var newRestName = document.createElement("div");
    newRestName.classList.add("item-name");
    newRestName.innerHTML = r.name;
    var newRestDesc = document.createElement("div");
    newRestDesc.classList.add("item-desc");
    newRestDesc.innerHTML = r.rating + "★ - " + r.total_ratings + " ratings <br>" + r.address;
    newRest.append(newRestCheck);
    newRest.append(newRestName);
    newRest.append(newRestDesc);

    id++;
    restaurantList.append(newRest);
  });

  numOfRestaurants = id;

  switchScreen("restaurant-vote");

  if(restaurants.length == 0) {
    switchScreen("no-matches");
  }
});

socket.on("restaurantPicked", r => {
  document.querySelector("#picked-name").innerHTML = r.name;
  document.querySelector("#picked-desc").innerHTML = r.rating + "★ - " + r.total_ratings + " ratings <br>" + r.address;

  var myConfetti = confetti.create(canvas, {
    resize: true,
    useWorker: true
  });
  myConfetti({
    particleCount: 250,
    spread: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
  });

  switchScreen("restaurant-picked");
});
