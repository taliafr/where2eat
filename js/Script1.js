// JavaScript source code

class Restaurant {
    constructor(name, rating, address, totalReviews, photoRef) {
        this.name = name;
        this.rating = rating;
        this.address = address;
        this.totalReviews = totalReviews;
        this.photoRef = photoRef;
    }


}

function makeMatch(userInput) {
    matchListDiet;
    choiceEthnic = userInput.getValue(1);
    choiceDiet = userInput.getValue(2);
    //If there are no diet choices, matchList is all the restaurants
    if (choiceDiet.length == 0) {
        matchListDiet = restaurantList;
    }
    //Iterates over the users' diet choices and lists restaurants that match those diet restrictions
    choiceDiet.forEach(diet => {
        restaurantList.forEach(retaurant => {
            if (restaurant.diets.indexOf(diet) != -1) {
                matchListDiet.append(restaurant);
            }
        })
    })

    //Ranks the restaurants by how many user's ethnic picks they match and the ratings
    matchListRank;
    for (let ethnic in choiceEthnic) {
        matchList.foreach(restaurant => {
            if (restaurant.ethnicity.indexOf(ethnic) != -1) {
                matchListRank[restaurant] = [choiceEthnic[ethnic], restaurant.rating];
            }

        })
    }




}
