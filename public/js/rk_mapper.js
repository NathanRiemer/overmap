var map = 0;
$(document).ready(function() {
  // var map = initialize();
  $.ajax({
    url: '/api/rk_activities',
    type: 'get',
    dataType: 'json'
  }).done(function(activities) {
    // console.log(activities);
    // console.log(activities.length);
    initialize(activities);
    // activities.forEach(getPath);
  });

});

var getPath = function(activity) {
  $.ajax({
    url: '/api/rk' + activity.uri,
    type: 'get',
    dataType: 'json'
  }).done(function(path) {
    // console.log(path);
    var gCoords = convertPath(path);
    var gPath = new google.maps.Polyline({
      path: gCoords,
      strokeColor: '#FF0000',
      strokeOpacity: .5,
      strokeWeight: 2
    });
    gPath.setMap(map);
  });
};

var convertPath = function(rkPath) {
  var gCoords = rkPath.map(function(rkCoord) {
    var gCoord = {
      lat: rkCoord.latitude,
      lng: rkCoord.longitude
    };
    return gCoord;
  });
  return gCoords;
};

var initialize = function(activities) {
  var myLatlng = new google.maps.LatLng(40.79055, -73.96400);

  var myOptions = {
      zoom: 10,
      center: myLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
  }
  map = new google.maps.Map(document.getElementById("map"), myOptions);
  // return map;

  activities.forEach(getPath);

      

  // var decodedLevels = decodeLevels("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");

  // activities.forEach(function(path){
  //   var decodedPath = google.maps.geometry.encoding.decodePath(path);
  //   var setRegion = new google.maps.Polyline({
  //     path: decodedPath,
  //     levels: decodedLevels,
  //     strokeColor: "#FF0000",
  //     strokeOpacity: 0.5,
  //     strokeWeight: 2,
  //     map: map
  //   });
  // });
};

// var decodeLevels = function (encodedLevelsString) {
//   var decodedLevels = [];

//   for (var i = 0; i < encodedLevelsString.length; ++i) {
//       var level = encodedLevelsString.charCodeAt(i) - 63;
//       decodedLevels.push(level);
//   }
//   return decodedLevels;
// };