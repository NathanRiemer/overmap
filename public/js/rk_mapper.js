var map;
var totalActivities;
var mappedActivities = 0;
var totalKM = 0;
var totalMiles = 0;
$(document).ready(function() {
  $.ajax({
    url: '/api/rk_activities',
    type: 'get',
    dataType: 'json'
  }).done(function(activities) {
    initialize(activities);
  });

});

var getPath = function(activity) {
  $.ajax({
    url: '/api/rk' + activity.uri,
    type: 'get',
    dataType: 'json'
  }).done(function(activityDetail) {
    switch (activityDetail.type) {
      case "Running":
        strokeColor = '#FF0000';
        break;
      case "Cycling":
        strokeColor = '#FF00e6';
        break;
      case "Walking":
        strokeColor = '#00A1FF';
        break;
      default:
        strokeColor = '#FF8800';
    };
    var gCoords = convertPath(activityDetail.path);
    var gPath = new google.maps.Polyline({
      path: gCoords,
      strokeColor: strokeColor,
      strokeOpacity: .5,
      strokeWeight: 2
    });
    gPath.setMap(map);
    $('span.mapped').text(++mappedActivities);
    totalKM += activityDetail.total_km;
    totalMiles = totalKM * 0.621371;
    $('span.kilometers').text(totalKM);
    $('span.miles').text(totalMiles);
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
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: [
      {
        featureType: "all",
        stylers: [
          { saturation: -75 }
        ]
      },
      {
        featureType: "road.highway",
        stylers: [
          { weight: 0.1 },
          // { hue: "#ffa200" },
          // { saturation: -13 }
        ]
      },
      {
        featureType: "poi.park",
        stylers: [
          { saturation: 75 },
          { hue: "#77ff00" }
        ]
      },
      {
        featureType: "poi.business",
        elementType: "labels",
        stylers: [
          { visibility: "off" }
        ]
      }
    ]
  };
  map = new google.maps.Map(document.getElementById("map"), myOptions);
  totalActivities = activities.length;
  $('span.detected').text(totalActivities);
  activities.forEach(getPath);
};
