var map;
var totalActivities;
var mappedActivities = 0;
var totalKM = 0;
var totalMiles = 0;

var activitiesBreakdown = {
  running: {
    count: 0,
    kilometers: 0
  },
  walking: {
    count: 0,
    kilometers: 0
  },
  cycling: {
    count: 0,
    kilometers: 0
  },

};

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
        $('#details .running .activities').text(++activitiesBreakdown.running.count);
        activitiesBreakdown.running.kilometers += activityDetail.total_km;
        $('#details .running .miles').text((activitiesBreakdown.running.kilometers * 0.621371).toFixed(0));
        break;
      case "Cycling":
        strokeColor = '#FF00e6';
        $('#details .cycling .activities').text(++activitiesBreakdown.cycling.count);
        activitiesBreakdown.cycling.kilometers += activityDetail.total_km;
        $('#details .cycling .miles').text((activitiesBreakdown.cycling.kilometers * 0.621371).toFixed(0));
        break;
      case "Walking":
        strokeColor = '#00A1FF';
        $('#details .walking .activities').text(++activitiesBreakdown.walking.count);
        activitiesBreakdown.walking.kilometers += activityDetail.total_km;
        $('#details .walking .miles').text((activitiesBreakdown.walking.kilometers * 0.621371).toFixed(0));
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
    // $('#info span.mapped').text(++mappedActivities);
    $('#progressBar').progress('increment');
    totalKM += activityDetail.total_km;
    totalMiles = totalKM * 0.621371;
    $('#info span.kilometers').text(totalKM.toFixed(0));
    $('#info span.miles').text(totalMiles.toFixed(0));
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
  $('#info span.detected').text(totalActivities);
  $('#progressBar').progress({total: totalActivities});
  activities.forEach(getPath);
};