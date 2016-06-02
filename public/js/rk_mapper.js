$(document).ready(function() {
  $.ajax({
    url: '/api/rk_activities',
    type: 'get',
    dataType: 'json'
  }).done(function(activities) {
    console.log(activities);
    console.log(activities.length);
    // initialize(activities);
  });

});

var initialize = function(activities) {
  var myLatlng = new google.maps.LatLng(40.79055, -73.96400);

  var myOptions = {
      zoom: 10,
      center: myLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
  }
  var map = new google.maps.Map(document.getElementById("map"), myOptions);
      

  var decodedLevels = decodeLevels("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");

  activities.forEach(function(path){
    var decodedPath = google.maps.geometry.encoding.decodePath(path);
    var setRegion = new google.maps.Polyline({
      path: decodedPath,
      levels: decodedLevels,
      strokeColor: "#FF0000",
      strokeOpacity: 0.5,
      strokeWeight: 2,
      map: map
    });
  });
};

var decodeLevels = function (encodedLevelsString) {
  var decodedLevels = [];

  for (var i = 0; i < encodedLevelsString.length; ++i) {
      var level = encodedLevelsString.charCodeAt(i) - 63;
      decodedLevels.push(level);
  }
  return decodedLevels;
};