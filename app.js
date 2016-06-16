var express       = require('express');
var session       = require('express-session');
var ejs           = require('ejs');
// var bodyParser    = require('body-parser');
var request       = require('request');
var crypto        = require('crypto');
// var querystring   = require('querystring');

var redis = require('redis');
var redisStore = require('connect-redis')(session);
var client = redis.createClient(process.env.REDIS_URL);


var app           = express();

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));

// app.use(session({
//   secret: process.env.SESSION_SECRET,     
//   resave: true,
//   saveUninitialized: true
// }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new redisStore({client: client}),
  saveUninitialized: false,
  resave: false
}));

app.set('view engine', 'ejs');

var currentHost = process.env.OVERMAP_HOST;

app.get('/', function(req, res) {
  var loggedInStrava = !!req.session.strava_access_token;
  var loggedInRK = !!req.session.runkeeper_access_token;
  var loggedInUA = !!req.session.ua_access_token;
  res.render('index', {notice: '', loggedInStrava: loggedInStrava, loggedInRK: loggedInRK, loggedInUA: loggedInUA});
});

app.get('/sign_in_with_strava', function(req, res) {
  var state = crypto.randomBytes(24).toString('hex');
  req.session.stravaState = state;
  res.redirect('https://strava.com/oauth/authorize?client_id=' + process.env.STRAVA_OAUTH_CLIENT_ID + '&redirect_uri=' + currentHost + '/oauth/strava&response_type=code&approval_prompt=force&state=' + state);

});

app.get('/oauth/strava', function(req, res) {
  var state = req.session.stravaState;
  var code = req.query.code;
  if (state === req.query.state) {
    var body = {
      client_id: process.env.STRAVA_OAUTH_CLIENT_ID,
      client_secret: process.env.STRAVA_OAUTH_CLIENT_SECRET,
      code: code,
      state: state
    }
    request.post('https://www.strava.com/oauth/token', {form: body}, function(error, httpResponse, responseBody) {
        var responseBody = JSON.parse(responseBody);
        req.session.strava_access_token = responseBody.access_token;
        res.redirect('/');
    });
  } else {
    //abort
    res.redirect('/');
  }
});

app.get('/profile', function(req, res) {
  var loggedIn = !!req.session.strava_access_token;

  if (loggedIn) {
    // get info from strava api
    var options = {
      url: 'https://www.strava.com/api/v3/athlete?access_token=' + req.session.strava_access_token
    };

    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      res.render('show', responseBody);
    });
  } else {
    res.redirect('/');
  }

});

app.get('/map', function(req, res) {
  var loggedIn = !!req.session.strava_access_token;

  if (loggedIn) {
    var gmap = {src: "https://maps.google.com/maps/api/js?libraries=geometry&key=" + process.env.GOOGLE_MAPS_API_KEY}
    res.render('map', gmap);
  } else {
    res.redirect('/');
  }
});

app.get('/api/activities', function(req, res) {
  var getActivities = function(lines, pageNumber, accessToken) {
    var url = 'https://www.strava.com/api/v3/athlete/activities?per_page=200&access_token=' + accessToken + '&page=';
    var options = {
      url: url + pageNumber
    };
    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      var pLines = responseBody.map(function(activity) {
        return activity.map.summary_polyline;
      });
      Array.prototype.push.apply(lines, pLines);
      if (pLines.length < 200) {
        res.json(lines);
      } else {
        getActivities(lines, ++pageNumber, accessToken);
      }
    });
  };

  var loggedIn = !!req.session.strava_access_token;

  if (loggedIn) {
    var lines = [];
    var pageNumber = 1;
    getActivities(lines, pageNumber, req.session.strava_access_token);
  } else {
    res.redirect('/');
  }
});

// Runkeeper
app.get('/sign_in_with_runkeeper', function(req, res) {
  var state = crypto.randomBytes(24).toString('hex');
  req.session.rkState = state;
  res.redirect('https://runkeeper.com/apps/authorize?client_id=' + process.env.RUNKEEPER_OAUTH_CLIENT_ID + '&redirect_uri=' + currentHost + '/oauth/runkeeper&response_type=code&state=' + state);
});

app.get('/oauth/runkeeper', function(req, res) {
  var state = req.session.rkState;
  var code = req.query.code;
  if (state === req.query.state) {
    var body = {
      grant_type: 'authorization_code',
      client_id: process.env.RUNKEEPER_OAUTH_CLIENT_ID,
      client_secret: process.env.RUNKEEPER_OAUTH_CLIENT_SECRET,
      code: code,
      redirect_uri: currentHost + '/oauth/runkeeper'
    }
    request.post('https://runkeeper.com/apps/token', {form: body}, function(error, httpResponse, responseBody) {
        var responseBody = JSON.parse(responseBody);
        req.session.runkeeper_access_token = responseBody.access_token;
        res.redirect('/');
    });
  } else {
    //abort
    res.redirect('/');
  }
});

app.get('/rk_map', function(req, res) {
  var loggedIn = !!req.session.runkeeper_access_token;

  if (loggedIn) {
    var gmap = {src: "https://maps.google.com/maps/api/js?libraries=geometry&key=" + process.env.GOOGLE_MAPS_API_KEY}
    res.render('rk_map', gmap);
  } else {
    res.redirect('/');
  }
});

app.get('/api/rk_activities', function(req, res) {
  var getRKActivities = function(activities, pageURI, accessToken) {
    var url = 'https://api.runkeeper.com';
    var options = {
      url: url + pageURI + '&access_token=' + req.session.runkeeper_access_token
    };
    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      var nextURI = responseBody.next;
      var pathedActivities = responseBody.items.filter(function(item) {
        return item.has_path;
      });

      Array.prototype.push.apply(activities, pathedActivities);
      // Comment out to reduce API calls.
      if (!nextURI) {
        res.json(activities);
      } else {
        getRKActivities(activities, nextURI, accessToken);
      }
      // temporary
      // res.json(activities);
    });
  };

  var loggedIn = !!req.session.runkeeper_access_token;

  if (loggedIn) {
    var activities = [];
    var pageURI = '/fitnessActivities?pageSize=100&page=0';
    getRKActivities(activities, pageURI, req.session.runkeeper_access_token);
  } else {
    res.redirect('/');
  }
});

app.get('/api/rk/fitnessActivities/:id', function(req, res) {
  var options = {
    url: 'https://api.runkeeper.com/fitnessActivities/' + req.params.id + '?access_token=' + req.session.runkeeper_access_token
  };
  request.get(options, function(error, httpResponse, responseBody) {
    var responseBody = JSON.parse(responseBody);
    var activity = {
      path: responseBody.path,
      type: responseBody.type,
      total_km: responseBody.total_distance / 1000.0
    };
    res.json(activity);
  });
});


// Under Armour
app.get('/sign_in_with_ua', function(req, res) {
  // var state = crypto.randomBytes(24).toString('hex');
  // req.session.uaState = state;
  res.redirect('https://www.mapmyfitness.com/v7.1/oauth2/authorize/?client_id=' + process.env.UA_OAUTH_CLIENT_ID + '&redirect_uri=' + currentHost + '/oauth/ua&response_type=code');
});

app.get('/oauth/ua', function(req, res) {
  var code = req.query.code;
  var body = {
    grant_type: 'authorization_code',
    client_id: process.env.UA_OAUTH_CLIENT_ID,
    client_secret: process.env.UA_OAUTH_CLIENT_SECRET,
    code: code
  };
  var headers = {'api-key': process.env.UA_OAUTH_CLIENT_ID};
  request.post('https://api.ua.com/v7.1/oauth2/uacf/access_token', {form: body, headers: headers}, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      console.log(responseBody);
      req.session.ua_access_token = responseBody.access_token;
      req.session.ua_user_id = responseBody.user_id;
      req.session.ua_refresh_token = responseBody.refresh_token;
      res.redirect('/');
  });
});

app.get('/ua_map', function(req, res) {
  var loggedIn = !!req.session.ua_access_token;

  if (loggedIn) {
    var gmap = {src: "https://maps.google.com/maps/api/js?libraries=geometry&key=" + process.env.GOOGLE_MAPS_API_KEY}
    res.render('ua_map', gmap);
  } else {
    res.redirect('/');
  }
});

app.get('/api/ua_activities', function(req, res) {
  // var url = 'https://api.ua.com/v7.1/workout/?user=' + req.session.ua_user_id;
  // var headers = {'api-key': process.env.UA_OAUTH_CLIENT_ID, 'authorization': 'Bearer ' + req.session.ua_access_token}
  // var options = {url: url, headers: headers};
  // request.get(options, function(error, httpResponse, responseBody) {
  //   var responseBody = JSON.parse(responseBody);
  //   console.log(responseBody);
  //   res.json(responseBody);
  // });

  var getUAActivities = function(activities, pageURI, accessToken) {
    var url = 'https://api.ua.com';
    var headers = {'api-key': process.env.UA_OAUTH_CLIENT_ID, 'authorization': 'Bearer ' + req.session.ua_access_token}
    var options = {
      url: url + pageURI,
      headers: headers
    };
    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      if (responseBody._links.next) {
        var nextURI = responseBody._links.next[0].href;
      } else {
        var nextURI = false;
      }
      var routeIDs = responseBody._embedded.workouts.map(function(workout) { 
        return workout._links.route[0].id; 
      });
      // var pathedActivities = responseBody.items.filter(function(item) {
      //   return item.has_path;
      // });

      Array.prototype.push.apply(activities, routeIDs);
      // Comment out to reduce API calls.
      if (!nextURI) {
        res.json(activities);
      } else {
        getUAActivities(activities, nextURI, accessToken);
      }
      // temporary
      // res.json(activities);
    });
  };

  var loggedIn = !!req.session.ua_access_token;

  if (loggedIn) {
    var activities = [];
    var pageURI = '/v7.1/workout/?limit=20&offset=0&user=' + req.session.ua_user_id;
    getUAActivities(activities, pageURI, req.session.ua_access_token);
  } else {
    res.redirect('/');
  }
});

app.get('/api/ua/route/:id', function(req, res) {
  var options = {
    url: 'https://api.ua.com/v7.1/route/' + req.params.id + '/?field_set=detailed',
    headers: {'api-key': process.env.UA_OAUTH_CLIENT_ID, 'authorization': 'Bearer ' + req.session.ua_access_token}
  };
  request.get(options, function(error, httpResponse, responseBody) {
    var responseBody = JSON.parse(responseBody);
    // var activity = {
    //   path: responseBody.path,
    //   type: responseBody.type,
    //   total_km: responseBody.total_distance / 1000.0
    // };
    res.json(responseBody);
  });
});


app.listen(process.env.PORT || 3000);