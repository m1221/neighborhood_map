var MakePlace = function(place){
    this.name = place.name;
    this.visibility = ko.observable(true);
    this.marker = place.marker; // already a ko.observable
    // and it has some ko.observables inside of it:
    //      marker().toggleStatus()
    //      marker().infoWindow()
}

var viewModel = function() {
    var self = this;

    /* VIEWMODEL SETUP AND FUNCTIONS */
    
    //set name of page header
    self.neighborhood = ko.observable(new MakePlace(model.neighborhood));
    
    // create the observableArray that will hold all places
    self.mainList = ko.observableArray([]);
    
    // add our places to our main place list
    model.searchLocations.forEach(function(obj, index){
        self.mainList.push( new MakePlace(obj));
    });
    
    // define a sort by name function - code from knockoutjs doc
    self.mainList.sort(function sortByName(left, right){
        return left.name == right.name ? 0 : (left.name < right.name ? -1 : 1);
    });
    
    // if a name is clicked on, toggle the place's marker
    self.toggleSelected = function(){
        map.toggleMarker.apply(this.marker());
    }
    
    
    /* SEARCH FUNCTIONALITY
    *  Filtering is automatic.
    *  -self.currentSearch is bound to the input field in the web app.
    *  -self.delayedSearch is updated 300ms after self.currentSearch stops changing.
    *  -When self.delayedSearch is updated, a function runs to compare the text in 
    *   the input field to the names of the places.
    */
    
    /* Search functionality utility method(s)*/
    
    //  This for-loop searches&removes space strings (" ") from an array
    //  Credit to Rob W for the code
    // http://stackoverflow.com/questions/9792927/javascript-array-search-and-remove-string#9792947
    var removeSpaces = function(arr){
        for (var p = arr.length-1; p >= 0; p--){
            if (arr[p] === ""){
                arr.splice(p,1);
            }
        }
    };
    
    // checkSearch checks for matches between search terms and words in place names
    var checkSearch = function(searchArr, placeName){
        var len = searchArr.length;
        for (var j = 0; j < searchArr.length; j++){
            if (new RegExp(searchArr[j], "i").test(placeName) ){
                return true;
            }
        }
    }
    
    // searchCompareSub iterates through each place in the placeList() and 
    // toggles its visibility accordingly
    var searchCompareSub = function(searchArr, place){
        if (checkSearch(searchArr, place.name)){
            place.marker().setVisible(true);
            place.visibility(true);
        }else{
            place.marker().setVisible(false);
            place.visibility(false);
        }    
    }
    
    // searchCompare toggles the visiblity of place names in the view-list depending
    // on if the words in a place's name match with the words in the search field
    var searchCompare = function (){
        // If the input field is empty, all place names are displayed on the page.
        // Else, words from the input field are compared to words from place names
        
        if (self.delayedSearch() == ""){
            self.mainList().forEach(function(place){
                place.marker().setVisible(true);
                place.visibility(true);
            });
        } else {
            
            // searchArray is an array composed of the different word(s) in the user input field.
            var searchArray = self.delayedSearch().split(" ");
            removeSpaces(searchArray);
            
            // searchCompareSub checks for matches and toggles visiblity
            self.mainList().forEach(function(place){
                searchCompareSub(searchArray, place);
            });
        }
    }

    /* SEARCH OBSERVABLES */
    
    // currentSearch is bound to input field in the html page    
    self.currentSearch = ko.observable(""); 
    
    // the value of delayedSearch is updated 300ms after the most recent update to currentSearch
    self.delayedSearch = ko.pureComputed(self.currentSearch).extend({rateLimit: { method: "notifyWhenChangesStop", timeout: 300 } });
    
    // notifyWhenChangeStops triggers delayedSearch.subscribe to run searchCompare
    self.delayedSearch.subscribe(searchCompare);
    
    /* WIKIPEDIA REQUEST (1 request total, for neighborhood) */
    
    self.sendWikiRequest = function(){
        var neighborhood = (function(){
            return self.neighborhood().name.split(" ").join("%20"); 
        })();
        var url = "https://en.wikipedia.org/w/api.php//w/api.php?action=query&prop=info&format=json&inprop=url%7Cdisplaytitle&titles=" + neighborhood;
        $.ajax({
            async: true,
            cache: true,
            dataType: "jsonp",
            error: (function(){
                alert("error with wikipedia request!");
            }),
            success: (function(data){
                // find the id of the page
                var key;
                for(name in data.query.pages){
                    key = name;
                }
                
                // make string from wikipedia data
                var string = "<div class='iWMain'><h4>" + data.query.pages[key].title + "</h4>";
                    string +="<a href='" + data.query.pages[key].fullurl + "' target='_blank'>Wiki</a></div>";

                self.neighborhood().marker().infoWindow().setContent(string);
            }),
            url: url
        }).fail(function(){
            alert('Error with wikipedia request');
        });
    }
    self.sendWikiRequest();
    
    /* YELP REQUESTS */
    self.yelpCounter = 0;
    self.sendYelpRequests = function(){
        // yelp requests are spaced out by 800ms
        // a yelp request is sent for each place in mainList()
        // after all requests are sent, the setInterval function is cleared
        
        var yelpCounter = 0;
        var len = self.mainList().length;
        var mainList = self.mainList();
        
        var yelpInterval = window.setInterval(function(){
            self.makeYelpRequest(mainList[yelpCounter]);
            yelpCounter ++;            
            if(yelpCounter == len){
                window.clearInterval(yelpInterval);
            }
            
        },800, len, mainList);
            
    };
    
    // makeYelpRequest is used by sendYelpRequests
    // makeYelpRequest sends an ajax request for a 'place' in mainList()
    self.makeYelpRequest = function(place){
        // the following variables are used to make search&oauth parameters
        var place = place,
            url = "https://api.yelp.com/v2/search?",
            term = place.name,
            location = self.neighborhood().name,
            radius_filter = 2500;
            
        // search&oauth parameters are made here
        var newParameters = self.makeYelpParameters(url, term, location, radius_filter);
        // and then they are put in our settings file for $.ajax
        var settings = {
            async: true,
            cache: true,
            crossDomain: true,
            data: newParameters,
            dataType: "jsonp",
            error: yelpError,
            jsonpCallback: 'cb', 
            method: "GET",
            url: url
    
        };
        
        // yelp ajax with success and failure callbacks (done and fail)
        $.ajax(settings).done(function(data){
            place.yelp = {
                url: data.businesses[0].url,
                mobile_url: data.businesses[0].mobile_url,
                rating: data.businesses[0].rating,
                snippet_text: data.businesses[0].snippet_text
            };
            self.editInfoWindow(place);
        }).fail(function(){
            window.setTimeout(function(){
                console.log('Resending Yelp request for', newParameters.term);
                $.ajax(settings).done(function(data){
                    place.yelp = {
                        url: data.businesses[0].url,
                        mobile_url: data.businesses[0].mobile_url,
                        rating: data.businesses[0].rating,
                        snippet_text: data.businesses[0].snippet_text
                    };
                    self.editInfoWindow(place);
                }).fail(function(){
                    console.log('Yelp request error for ', settings.newParameters.term);
                });
            }, 1100);
        });
    };
    // makeYelpParameters is used by function makeYelpRequest
    // makeYelpParameters is used to make the oauth info required for yelp rqs 
    self.makeYelpParameters = function(url, term, location, radius_filter){
        var httpMethod = "GET",
            url = url,
            parameters= {
                term: term,
                location: location,
                radius_filter: radius_filter,
                limit: 1,
                oauth_consumer_key: "9WsbRQcfLq_Z3fWZYQttJw",
                oauth_token: "TPtwabXguRiUI98uQFLRn7oUs2CLSpju",
                oauth_nonce: nonce_generate(),
                oauth_timestamp: Math.floor(Date.now() / 1000),
                oauth_signature_method: "HMAC-SHA1",
                callback: "cb"
            },
        consumerSecret = "3dyID2d3LQstHE0We2mHbp4Mohc",
        tokenSecret = "POcBqtP_C7-RAbrQrj2eXi-lvik",
        encodedSignature = oauthSignature.generate(httpMethod, url, parameters, consumerSecret, tokenSecret);
    
        parameters.oauth_signature = encodedSignature;

        return parameters;
    };
    
    // editInfoWindow updates the info windows of our markers with yelp response data
    self.editInfoWindow = function(place){
        
        var name = place.name,
            rating = place.yelp.rating,
            yelpURL = place.yelp.url,
            mobileURL = place.yelp.mobile_url,
            review = place.yelp.snippet_text;
            
        var content = "";
        content += "<div class='iWMain'> ";
        
        content += "<div class='iWTop'> ";
        content += "<h4>" + name +"</h4>";
        content += "<div><a href='" + yelpURL + "' target='_blank'>Yelp Page</a></div>";
        content += "<div>Rating: " + rating + "</div></div>";
        
        content += "<div class='iWdescripH'> What 1 reviewer says: </div>";
        content += "<div class='iWdescrip'>" + review + "</div>";

        content += "</div>";
        
        place.marker().infoWindow().setContent(content);
    };
    
    self.sendYelpRequests();
};