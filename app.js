var express       = require('express');
var session       = require('express-session');
var ejs           = require('ejs');
var bodyParser    = require('body-parser');
var request       = require('request');
var crypto        = require('crypto');
var querystring   = require('querystring');

var app           = express();

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/bower_components'));

app.use(session({
  secret: process.env.SESSION_SECRET,     
  resave: true,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  var loggedIn = !!req.session.strava_access_token;
  res.render('index', {notice: '', loggedIn: loggedIn});
});

app.get('/sign_in_with_strava', function(req, res) {
  var state = crypto.randomBytes(24).toString('hex');
  req.session.stravaState = state;
  res.redirect('https://strava.com/oauth/authorize?client_id=' + process.env.STRAVA_OAUTH_CLIENT_ID + '&redirect_uri=http://localhost:3000/oauth/strava&response_type=code&approval_prompt=force&state=' + state);

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
    var gmap = {src: "http://maps.google.com/maps/api/js?libraries=geometry&key=" + process.env.GOOGLE_MAPS_API_KEY}
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
  res.redirect('https://runkeeper.com/apps/authorize?client_id=' + process.env.RUNKEEPER_OAUTH_CLIENT_ID + '&redirect_uri=http://localhost:3000/oauth/runkeeper&response_type=code&state=' + state);
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
      redirect_uri: 'http://localhost:3000/oauth/runkeeper'
    }
    request.post('https://runkeeper.com/apps/token', {form: body}, function(error, httpResponse, responseBody) {
        var responseBody = JSON.parse(responseBody);
        req.session.runkeeper_access_token = responseBody.access_token;
        // console.log(responseBody);
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
    var gmap = {src: "http://maps.google.com/maps/api/js?libraries=geometry&key=" + process.env.GOOGLE_MAPS_API_KEY}
    res.render('rk_map', gmap);
  } else {
    res.redirect('/');
  }
});

app.get('/api/rk_activities', function(req, res) {
  // var activities = [];
  // var url = 'https://api.runkeeper.com';
  // var options = {
  //   url: url + '/fitnessActivities?pageSize=100&access_token=' + req.session.runkeeper_access_token
  // };
  // request.get(options, function(error, httpResponse, responseBody) {
  //   var responseBody = JSON.parse(responseBody);
  //   console.log(responseBody.next);
  // });

  var getRKActivities = function(activities, pageURI, accessToken) {
    var url = 'https://api.runkeeper.com';
    // var urlQueries = '&access_token=' + req.session.runkeeper_access_token
    // var url = 'https://www.strava.com/api/v3/athlete/activities?per_page=200&access_token=' + accessToken + '&page=';
    var options = {
      url: url + pageURI + '&access_token=' + req.session.runkeeper_access_token
    };
    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      var nextURI = responseBody.next;
      console.log(nextURI);
      var pathedActivities = responseBody.items.filter(function(item) {
        return item.has_path;
      });
      console.log(pathedActivities.length);

      Array.prototype.push.apply(activities, pathedActivities);
      console.log(activities.length);
      if (!nextURI) {
        // console.log(activities)
        // var coordinates = [];
        // activities.forEach(function(activity) {
        //   // console.log(activity.uri);
        //   var options = {
        //     url: url + activity.uri + '?access_token=' + req.session.runkeeper_access_token
        //   }
        //   request.get(options, function(error, httpResponse, responseBody) {
        //     var responseBody = JSON.parse(responseBody);
        //     var path = responseBody.path;
        //     console.log(path);
        //     coordinates.push(path);
        //   })
        // });
        // console.log(coordinates.length);
        res.json(activities);
      } else {
        getRKActivities(activities, nextURI, accessToken);
      }
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
  // console.log(req.params.id);
  var options = {
    url: 'https://api.runkeeper.com/fitnessActivities/' + req.params.id + '?access_token=' + req.session.runkeeper_access_token
  };
  request.get(options, function(error, httpResponse, responseBody) {
    var responseBody = JSON.parse(responseBody);
    var path = responseBody.path;
    // console.log(path);
    // coordinates.push(path);
    res.json(path);
  });
});


app.listen(3000);