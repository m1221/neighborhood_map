var map;

function initializeMap(){
    
    /* makeMap creates our map on the screen */
    function makeMap(){
        var lat = model.neighborhood.location.lat,
            lng = model.neighborhood.location.lng;
    
        var mapOptions = {
            center: {lat: lat, lng: lng},
            zoom: 13,
            backgroundColor: "yellow",
            mapTypeControl: true,
            zoomControl: true,
            zoomControlOptions : {
                style: google.maps.ZoomControlStyle.DEFAULT
            }
        };
    
        map = new google.maps.Map(document.getElementById("mapDiv"), mapOptions);
        
        // this function is only used for mobile
        // it toggles the view between the list and the map
        map.toggleMap = function(){
            $("ul").toggleClass("toDisappear");
            $("#mapDiv").toggleClass("toDisappear");
        };

    }
    
    
    function sendGoogleRequests(){
        // lat and lng represent the center of the map
        var lat = model.neighborhood.location.lat,
            lng = model.neighborhood.location.lng;
    
        // service is the google object will send the google place request
        var service = new google.maps.places.PlacesService(map);
    
        // googleCounter tracks how many responses have been received
        var googleCounter = 0;
    
        // handleCallback will receive google data and update our model with it
        var handleCallback = function(placeIndex, result){
            // put the positional data in variables
            var lat = result.geometry.location.lat(),
                lng = result.geometry.location.lng();
        
            // update model with google place information
            model.searchLocations[placeIndex].name = result.name;
            model.searchLocations[placeIndex].address = result.formatted_address;
            model.searchLocations[placeIndex].location = {lat: lat, lng: lng};
        };

        /* The google requests are made in this forEach loop.
         *
         */
        model.searchLocations.forEach(function(place, placeIndex){
            var placeIndex = placeIndex;
        
            // build the first argument for the google request
            var mapRequest = {
                    location: {lat: lat, lng: lng},
                    radius: 2000,
                    query: place.name
            };
            // build the second argument for the google request
            function googleCB(results, status){
                googleCounter ++;
                if(status == google.maps.places.PlacesServiceStatus.OK){
                    handleCallback(placeIndex, results[0])
                } else{
                    alert("Error: ", status);
                    console.log("Error: ", status);
                }
            
                // When all responses have been received, we will create our map markers.
                if (googleCounter == model.searchLocations.length){
                    createMapMarkers();
                    
                    ko.applyBindings(viewModel);
                    // what is the difference between
                    // new viewModel()
                    //     viewModel
                    //?????
                }
            }
            // sends the request to google
            service.textSearch(mapRequest, googleCB);
        });

    }
    
    function createMapMarkers(){
        var fillColor;
        
        // zPos is used by handleWindowZ. its element structure is {name: "", infoWindow: obj}
        var zPos = [];
        
        // handleWindowZ ensures that the mostly recently opened infoWindow appears on top
        map.handleWindowZ = function(marker){
            var zCheck = function(){
                var len = zPos.length;
                for (var i = 0; i < len; i++){
                    if (marker.title == zPos[i].name){return [true, i]}
                }
                return false;
            }();
            var inZPos = zCheck[0],
                index = zCheck[1];
            
            if (inZPos){
                zPos.splice(index,1);
                zPos.push({name: marker.title, infoWindow: marker.infoWindow});
                
                zPos.forEach(function(obj, index){
                    obj.infoWindow().setZIndex(index);
                });
            } else{
                zPos.push({name: marker.title, infoWindow: marker.infoWindow});
                zPos.forEach(function(obj, index){
                    obj.infoWindow().setZIndex(index);
                });
            }

        }
        
        // function iconSelect is used to change/set the icons for the markers
        map.iconSelect = function(){
            if (this.type == "restaurant"){
                if (this.toggleState()) {fillColor = "red"} else {fillColor = "blue";}
                return {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: fillColor,
                    fillOpacity: 0.2,
                    strokeColor:"blue",
                    strokeWeight: 1,
                    scale: 6
                }
            } else if (this.type == "neighborhood"){
                if (this.toggleState()) {return "smileyOn.png"} else {return "smileyOff.png";}
                
            }
        }

        // toggleMarker handles all visual effects when:
        // a marker is clicked OR it's name is clicked
        map.toggleMarker = function(){
            
            // if the marker's toggleState() is true, it is 'selected'
            if (this.toggleState()){
                this.toggleState(false); // set the marker as 'unselected'
                this.setIcon(map.iconSelect.apply(this));
                this.infoWindow().close();
            } else{
                // this declaration is to avoid a problem setTimeout has with 'this'
                var marker = this; 
                
                this.toggleState(true); // set the marker as 'selected'
                this.setIcon(map.iconSelect.apply(this));
                
                // bounce the marker for 500ms
                this.setAnimation(google.maps.Animation.BOUNCE);
                window.setTimeout(function(){
                    marker.setAnimation(null);
                }, 500);
                
                this.infoWindow().open(map, marker); // open the infowindow
                map.handleWindowZ(this); // bring map to the forefront
            }
        }
        
        // makeMarker creates a single marker
        // pay close attention to the ko.observables declared here
        function makeMarker(place){
            var marker = new google.maps.Marker({
                map: map,
                title: place.name,
                position: place.location,
                type: place.type,
                address: place.address,
                // 
                animation: null,
                // toggleState is an observable so that the styling of the names will update
                toggleState: ko.observable(false), 
                visible: true
                
            });

            marker.setIcon(map.iconSelect.apply(marker));
            
            // create an info window for the marker
            marker.infoWindow = ko.observable( new google.maps.InfoWindow({content: marker.title}) );
            
            // add a listener for the marker
            marker.addListener('click', map.toggleMarker);
            
            return ko.observable(marker);
 
        }
        
        //create a map marker for the neighborhood place
        model.neighborhood.marker = makeMarker(model.neighborhood);
        
        // create the map markers for the locations
        model.searchLocations.forEach(function(place){
            // make a marker object and attach the marker object to the model
            place.marker = makeMarker(place);
            
        });
    }
    
    makeMap();
    sendGoogleRequests();
}


window.addEventListener("load", initializeMap);
