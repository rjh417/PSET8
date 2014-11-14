/**
 * service.js
 *
 * Robert Hill
 * Computer Science 50
 * Problem Set 8
 *
 * Implements a shuttle service.
 */

// points variable
var points = 0;

// available shuttle seats
var availSeats = 0;

// default height
var HEIGHT = 0.8;

// default latitude
var LATITUDE = 42.3745615030193;

// default longitude
var LONGITUDE = -71.11803936751632;

// default heading
var HEADING = 1.757197490907891;

// default number of seats
var SEATS = 10;

// default velocity
var VELOCITY = 50;

// global reference to shuttle's marker on 2D map
var bus = null;

// global reference to 3D Earth
var earth = null;

// global reference to 2D map
var map = null;

// global reference to shuttle
var shuttle = null;

// object containing colors for each house
var houseColor =
{
    "Adams House": {color: "#0000FF"},  
    "Cabot House": {color: "FF0000"},
    "Currier House": {color: "#993300"},
    "Dunster House": {color: "#54632C"}, 
    "Eliot House": {color: "#006400"},
    "Kirkland House": {color: "#FF530D"},
    "Leverett House": {color: "#8B008B"},
    "Lowell House": {color: "#8B8682"},
    "Mather House": {color: "#8B0000"},
    "Pforzheimer House": {color: "#00008B"},
    "Quincy House": {color: "#8B0A50"},
    "Winthrop House": {color: "#808000"}
};

// load version 1 of the Google Earth API
google.load("earth", "1");

// load version 3 of the Google Maps API
google.load("maps", "3", {other_params: "sensor=false"});

// once the window has loaded
$(window).load(function() {

    // listen for keydown anywhere in body
    $(document.body).keydown(function(event) {
        return keystroke(event, true);
    });

    // listen for keyup anywhere in body
    $(document.body).keyup(function(event) {
        return keystroke(event, false);
    });

    // listen for click on Drop Off button
    $("#dropoff").click(function(event) {
        dropoff();
    });

    // listen for click on Pick Up button
    $("#pickup").click(function(event) {
        pickup();
    });
    
    // listen for click on velocity increase button
    $("#increase").click(function(event) {
    
        // if velocity is less than 100, increment by 5
        if (shuttle.velocity < 100)
        {
            shuttle.velocity += 5;
            $("#display").html("Shuttle speed is currently: "+shuttle.velocity);
        }
        // else let user know shuttle won't go faster than 100
        else
        {
            $("#display").html("For passenger safety, shuttle only goes to 100");
        }
    });
    
    // listen for click on velocity decrease button
    $("#decrease").click(function(event) {
        
        // if shuttle speed is greater than 0, decrement by 5
        if (shuttle.velocity > 0)
        {
            shuttle.velocity -= 5;
            $("#display").html("Shuttle speed is currently: "+shuttle.velocity);
        }
        else
        {
            // let user know shuttle can't go slower than 0
            $("#display").html("Shuttle can't go any slower");
        }
    });

    // load application
    load();
});

// unload application
$(window).unload(function() {
    unload();
});

/**
 * Renders seating chart.
 */
function chart()
{
    var html = "<ol start='0'>";
    for (var i = 0; i < shuttle.seats.length; i++)
    {
        if (shuttle.seats[i] == null)
        {
            html += "<li>Empty Seat</li>";
        }
        else
        {
            html += "<li style=color:" + houseColor[shuttle.seats[i].house].color+">" + shuttle.seats[i].name+" to "+ shuttle.seats[i].house+ "</li>";
        }
    }
    html += "</ol>";
    $("#chart").html(html);
}

/**
 * Drops up passengers if their stop is nearby.
 */
function dropoff()
{
    // variable to represent the maximum dropoff distance
    var dropDist = 30;
    
    // variable to determine if house is in range for dropping off passenger
    var noRange = true;
    
    // variable for total points available(all passengers minus freshman)
    var totalPoints = 99;
    
    // iterate through shuttle.seats
    for (var i = 0, n = shuttle.seats.length; i < n; i++)
    {
        // if a seat is occupied
        if(shuttle.seats[i] != null)
        {   
            // variables for house latitude and longitude
            var house = shuttle.seats[i].house;
            var lat = HOUSES[house].lat;
            var lng = HOUSES[house].lng;
          
            // determine shuttle distance from house
            var distance = shuttle.distance(lat, lng);
            
            // if distance is less than maximum distance for a dropoff
            if (distance < dropDist)
            {
                // set shuttle seat to null(empty the seat)
                shuttle.seats[i] = null;
               
                noRange = false;
                
                // redraw seating chart
                chart();
                
                // decrement seat
                availSeats--;
                
                // increment points total 
                points++;
                
                // if total points is reached, let player know all passengers have been
                // picked up and dropped off
                if (points == totalPoints)
                {
                    $("#announcements").html("All passengers have been picked up and dropped off");
                }
                else
                {
                    // announce player's point total
                    $("#announcements").html("Points: " + points);
                }
            }
        }
    }
    
    // if no house in range for dropoff, make announcement
    if(noRange)
    {
        $("#announcements").html("No house within range");
    }
}

/**
 * Called if Google Earth fails to load.
 */
function failureCB(errorCode) 
{
    // report error unless plugin simply isn't installed
    if (errorCode != ERR_CREATE_PLUGIN)
    {
        alert(errorCode);
    }
}

/**
 * Handler for Earth's frameend event.
 */
function frameend() 
{
    shuttle.update();
}

/**
 * Called once Google Earth has loaded.
 */
function initCB(instance) 
{
    // retain reference to GEPlugin instance
    earth = instance;

    // specify the speed at which the camera moves
    earth.getOptions().setFlyToSpeed(100);

    // show buildings
    earth.getLayerRoot().enableLayerById(earth.LAYER_BUILDINGS, true);

    // disable terrain (so that Earth is flat)
    earth.getLayerRoot().enableLayerById(earth.LAYER_TERRAIN, false);

    // prevent mouse navigation in the plugin
    earth.getOptions().setMouseNavigationEnabled(false);

    // instantiate shuttle
    shuttle = new Shuttle({
        heading: HEADING,
        height: HEIGHT,
        latitude: LATITUDE,
        longitude: LONGITUDE,
        planet: earth,
        seats: SEATS,
        velocity: VELOCITY
    });

    // synchronize camera with Earth
    google.earth.addEventListener(earth, "frameend", frameend);

    // synchronize map with Earth
    google.earth.addEventListener(earth.getView(), "viewchange", viewchange);

    // update shuttle's camera
    shuttle.updateCamera();

    // show Earth
    earth.getWindow().setVisibility(true);

    // render seating chart
    chart();

    // populate Earth with passengers and houses
    populate();
}

/**
 * Handles keystrokes.
 */
function keystroke(event, state)
{
    // ensure we have event
    if (!event)
    {
        event = window.event;
    }

    // left arrow
    if (event.keyCode == 37)
    {
        shuttle.states.turningLeftward = state;
        return false;
    }

    // up arrow
    else if (event.keyCode == 38)
    {
        shuttle.states.tiltingUpward = state;
        return false;
    }

    // right arrow
    else if (event.keyCode == 39)
    {
        shuttle.states.turningRightward = state;
        return false;
    }

    // down arrow
    else if (event.keyCode == 40)
    {
        shuttle.states.tiltingDownward = state;
        return false;
    }

    // A, a
    else if (event.keyCode == 65 || event.keyCode == 97)
    {
        shuttle.states.slidingLeftward = state;
        return false;
    }

    // D, d
    else if (event.keyCode == 68 || event.keyCode == 100)
    {
        shuttle.states.slidingRightward = state;
        return false;
    }
  
    // S, s
    else if (event.keyCode == 83 || event.keyCode == 115)
    {
        // clear announcements
        $("#announcements").html("");
        shuttle.states.movingBackward = state;     
        return false;
    }

    // W, w
    else if (event.keyCode == 87 || event.keyCode == 119)
    {
        // clear announcements
        $("#announcements").html("");
        shuttle.states.movingForward = state;    
        return false;
    }
  
    return true;
}

/**
 * Loads application.
 */
function load()
{
    // embed 2D map in DOM
    var latlng = new google.maps.LatLng(LATITUDE, LONGITUDE);
    map = new google.maps.Map($("#map").get(0), {
        center: latlng,
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        scrollwheel: false,
        zoom: 17,
        zoomControl: true
    });

    // prepare shuttle's icon for map
    bus = new google.maps.Marker({
        icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/bus.png",
        map: map,
        title: "you are here"
    });

    // embed 3D Earth in DOM
    google.earth.createInstance("earth", initCB, failureCB);
}

/**
 * Picks up nearby passengers.
 */
function pickup()
{
    // set global variables
    var features = earth.getFeatures();
    var noRange = true;
    var pickDistance = 15;
    
    // iterate through passengers array    
    for (var passenger in PASSENGERS)
    {
        // detemine latitude and longitude of passengers
        var lat = PASSENGERS[passenger].p.getGeometry().getLatitude();
        var lng = PASSENGERS[passenger].p.getGeometry().getLongitude();
        
        // determine shuttle distance from a passenger
        var distance = shuttle.distance(lat, lng);
        
        // determine if a passenger is within distance to pickup       
        if (distance < pickDistance)
        {
            // detemine if passenger is a freshman
            if (PASSENGERS[passenger].house in HOUSES == false)
            {
                $("#announcements").html("No freshman allowed on shuttle");
                noRange=false;
                break;
            }
            
            // detemine if there are available seats on the shuttle
            for (var j = 0, n = shuttle.seats.length; j < n; j++)
            {
                // if all seats are full make announcement
                if (availSeats == SEATS)
                {
                    $("#announcements").html("Shuttle is full");
                    noRange = false;
                    break;
                }
                
                // if there is an empty shuttle seat 
                if (shuttle.seats[j] == null)
                { 
                    // put passenger on shuttle
                    shuttle.seats[j] = PASSENGERS[passenger];
                    noRange = false;
                    availSeats++;
                    
                    // redraw chart
                    chart();
                    
                    // remove passenger placemark and marker
                    features.removeChild(PASSENGERS[passenger].p);
                    PASSENGERS[passenger].p = null;
                    PASSENGERS[passenger].m.setMap(null);
                    
                    // remove passenger passenger array
                    PASSENGERS.splice(passenger , 1);
                    
                    break;
                }
             }
         }
      }
      
      // if no passengers within pickup range, make announcement
      if (noRange == true)
         {
            $("#announcements").html("No passengers in range");
         }
}

/**
 * Populates Earth with passengers and houses.
 */
function populate()
{
    // mark houses
    for (var house in HOUSES)
    {
        // plant house on map
        new google.maps.Marker({
            icon: "https://google-maps-icons.googlecode.com/files/home.png",
            map: map,
            position: new google.maps.LatLng(HOUSES[house].lat, HOUSES[house].lng),
            title: house
        });
    }

    // get current URL, sans any filename
    var url = window.location.href.substring(0, (window.location.href.lastIndexOf("/")) + 1);

    // scatter passengers
    for (var i = 0; i < PASSENGERS.length; i++)
    {
        // pick a random building
        var building = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];

        // prepare placemark
        var placemark = earth.createPlacemark("");
        placemark.setName(PASSENGERS[i].name + " to " + PASSENGERS[i].house);

        // prepare icon
        var icon = earth.createIcon("");
        icon.setHref(url + "/img/" + PASSENGERS[i].username + ".jpg");

        // prepare style
        var style = earth.createStyle("");
        style.getIconStyle().setIcon(icon);
        style.getIconStyle().setScale(4.0);

        // prepare stylemap
        var styleMap = earth.createStyleMap("");
        styleMap.setNormalStyle(style);
        styleMap.setHighlightStyle(style);

        // associate stylemap with placemark
        placemark.setStyleSelector(styleMap);

        // prepare point
        var point = earth.createPoint("");
        point.setAltitudeMode(earth.ALTITUDE_RELATIVE_TO_GROUND);
        point.setLatitude(building.lat);
        point.setLongitude(building.lng);
        point.setAltitude(0.0);

        // associate placemark with point
        placemark.setGeometry(point);

        // add placemark to Earth
        earth.getFeatures().appendChild(placemark);

        // add marker to map
        var marker = new google.maps.Marker({
            icon: "https://maps.gstatic.com/intl/en_us/mapfiles/ms/micons/man.png",
            map: map,
            position: new google.maps.LatLng(building.lat, building.lng),
            title: PASSENGERS[i].name + " at " + building.name
        });

        // remember passenger's placemark and marker for pick-up's sake
        PASSENGERS[i].p = placemark;
        PASSENGERS[i].m = marker;
    }
}

/**
 * Handler for Earth's viewchange event.
 */
function viewchange() 
{
    // keep map centered on shuttle's marker
    var latlng = new google.maps.LatLng(shuttle.position.latitude, shuttle.position.longitude);
    map.setCenter(latlng);
    bus.setPosition(latlng);
}

/**
 * Unloads Earth.
 */
function unload()
{
    google.earth.removeEventListener(earth.getView(), "viewchange", viewchange);
    google.earth.removeEventListener(earth, "frameend", frameend);
}
