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

  console.log(req.session.strava_access_token);

  res.render('index', {notice: '', loggedIn: loggedIn});
});

app.get('/sign_in_with_strava', function(req, res) {
  var state = crypto.randomBytes(24).toString('hex');
  req.session.stravaState = state;
  console.log('state:', state);

  res.redirect('https://strava.com/oauth/authorize?client_id=' + process.env.STRAVA_OAUTH_CLIENT_ID + '&redirect_uri=http://localhost:3000/oauth/strava&response_type=code&approval_prompt=force&state=' + state);

});

app.get('/oauth/strava', function(req, res) {
  var state = req.session.stravaState;
  var code = req.query.code;

  console.log('code:', code);

  if (state === req.query.state) {
    console.log('states match!');

    var body = {
      client_id: process.env.STRAVA_OAUTH_CLIENT_ID,
      client_secret: process.env.STRAVA_OAUTH_CLIENT_SECRET,
      code: code,
      state: state
    }

    request.post('https://www.strava.com/oauth/token', {form: body}, function(error, httpResponse, responseBody) {
      // console.log(error);
      // console.log(httpResponse);
        // var httpResponse = querystring.parse(httpResponse);
        // console.log(responseBody);
        var responseBody = JSON.parse(responseBody);
        req.session.strava_access_token = responseBody.access_token;
        // console.log(req.session.strava_access_token);
        console.log('responseBody:', responseBody);
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
      // headers: {
      //   'User-Agent': 'OAuth Example App'
      // }
    };

    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      console.log('responseBody:', responseBody);

      res.render('show', responseBody);
    });
  } else {
    res.redirect('/');
  }

});

app.get('/map', function(req, res) {
  var loggedIn = !!req.session.strava_access_token;

  if (loggedIn) {
    res.render('map');
    // get info from strava api
    // var options = {
    //   url: 'https://www.strava.com/api/v3/athlete/activities?access_token=' + req.session.strava_access_token
    //   // headers: {
    //   //   'User-Agent': 'OAuth Example App'
    //   // }
    // };

    // request.get(options, function(error, httpResponse, responseBody) {
    //   var responseBody = JSON.parse(responseBody);
    //   console.log('responseBody:', responseBody);
    //   var pLines = responseBody.map(function(activity) {
    //     return activity.map.summary_polyline;
    //   });
    //   var wrapper = {stuff: pLines}
    //   res.render('map');
    // });
  } else {
    res.redirect('/');
  }
});

app.get('/api/activities', function(req, res) {
  var loggedIn = !!req.session.strava_access_token;

  if (loggedIn) {
    // get info from strava api
    var options = {
      url: 'https://www.strava.com/api/v3/athlete/activities?per_page=100&access_token=' + req.session.strava_access_token
      // headers: {
      //   'User-Agent': 'OAuth Example App'
      // }
    };

    request.get(options, function(error, httpResponse, responseBody) {
      var responseBody = JSON.parse(responseBody);
      console.log('responseBody:', responseBody);
      var pLines = responseBody.map(function(activity) {
        return activity.map.summary_polyline;
      });
      // var wrapper = {stuff: pLines}
      res.json(pLines);
    });
  } else {
    res.redirect('/');
  }
});



app.listen(3000);