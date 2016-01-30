var model = {
    callbackStatuses: {
        googleMapsAPI: false,
        oauthSignature: false,
        jQuery: false,
        ko: false
    },
    neighborhood: {
        name: "Houston Heights",
        type: "neighborhood",
        location: {lat: 29.797929, lng: -95.399711}
    },
    searchLocations: [
        {
            name: "Dry Creek",
            type: "restaurant"
        },
        {
            name: "Asia Market Thai Lao Food",
            type: "restaurant"
        },
        {
            name: "Teotihuacan Mexican Cafe",
            type: "restaurant"
        },
        {
            name: "La Carreta",
            type: "restaurant"
        },
        {
            name: "Liberty Kitchen & Oyster",
            type: "restaurant"
        }
    ]
}


function googleSuccess(){
    model.callbackStatuses.googleMapsAPI = true;    
}
function googleError(){
    alert("Error: Unable to download Google Maps API. Please" 
    + " refresh the page.");
}

// used for yelp api oauth
function nonce_generate() {
	return (Math.floor(Math.random() * 1e12).toString());
}

// yelp error 
function yelpError(error){
    console.log("Yelp API Error: ", error);
}

// yelp api callback
function cb(){}



(function(){
    // notify user of any resource download problems
    function resourceCheck(resourceName){
        var checkCount = 0;
        var check = window.setInterval(function(){
            try {
                eval(resourceName);
                model.callbackStatuses[resourceName] = true;
                clearInterval(check);
            }
            catch(err) {
                if (checkCount > 30){
                    alert("Problem downloading " + resourceName);
                    console.log("Problem downloading " + resourceName);
                    clearInterval(check);
                }
                checkCount++;
            }
        }, 125);
        
    }
    resourceCheck("jQuery");
    resourceCheck("ko");
    resourceCheck("oauthSignature");
    
})();