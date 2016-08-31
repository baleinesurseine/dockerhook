var express = require('express')
var helmet = require('helmet')
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var config = require('config')
var http = require('http')
spawn = require('child_process').spawn

var scripts = {}

if (config && config.scripts) {
  console.log(JSON.stringify(config.scripts, null, '\t'))
  scripts = config.scripts
} else {
  console.log('Error: no script')
}

var app = express()
app.use(helmet())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var router = express.Router()

mongoose.connect('localhost')
mongoose.connection.on('connected', function () {
  console.log('Mongoose connection open on ' + mongoose.connection.host + ':' + mongoose.connection.port)
})

mongoose.connection.on('disconnected', function () {
  console.log('Mongoose connection disconnected')
})

mongoose.connection.on('error', function (err) {
  console.log('Mongoose connection error: ' + err)
})

process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    console.log('Mongoose connection disconnected through app termination')
    process.exit(0)
  })
})

app.set('port', process.env.PORT || process.argv[2] || 5000)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))


router.post('/:token', function (req, res, next) {
  var token = req.params.token
  console.log(token)
  var script = scripts[token]
  if (script) {
    console.log(script)
    var run = spawn('sh', [ script ], {});
    run.stdout.on('data', function (data) {
      console.log('[' + token +'] stdout: ' + data);
    });
    run.stderr.on('data', function (data) {
      console.log('[' + token +'] stderr: ' + data);
    });
    run.on('close', function (code) {
      console.log('[' + token +'] child process exited with code ' + code);
      if (req.payload) {
        var options = {
          json: true,
          body: {state: 'success'},
          method: 'post',
          uri: req.payload.callback_url
        };
        http(options, function(err, response, body) {
          if (err) {
            console.error(err);
          }
          reply();
        })
      }
    })
  }
  return res.status(204).send()
})

app.use(router)

app.get('*', function (req, res, next) {
  var err = new Error()
  err.status = 404
  next(err)
})
app.use(function (err, req, res, next) {
  if (err.status !== 404) {
    return next()
  }
  res.status(404).send({error: err})
})

app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'))
})

module.exports = app
