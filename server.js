var express = require('express')
var helmet = require('helmet')
var bodyParser = require('body-parser')
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

app.set('port', process.env.PORT || process.argv[2] || 5000)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))


router.post('/:token', function (req, res, next) {
  var token = req.params.token
  var dhm = new Date(Date.now())
  console.log(dhm.toString())
  console.log('>>>>>>>>>>> ' + token)
  var script = scripts[token]
  if (script) {
    var run = spawn('sh', [script], {});
    run.stdout.on('data', function (data) {
      process.stdout.write('[' + token +'] ' + data);
    });
    run.stderr.on('data', function (data) {
      process.stdout.write('[' + token +'] err: ' + data);
    });
    run.on('error', (err) => {
      console.log('Failed to start child process: ' + script)
    })
    run.on('close', function (code) {
      process.stdout.write('[' + token +'] child process exited with code ' + code + '\n');
      if (req.payload) {
        var options = {
          json: true,
          body: {state: 'success'},
          method: 'post',
          uri: req.payload.callback_url
        };
        http(options, function (err, response, body) {
          if (err) {
            console.error(err);
          }
          reply();
        })
      }
      console.log('<<<<<<<<<<< ' + token + '\n')
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
