var express = require('express')
var helmet = require('helmet')
var bodyParser = require('body-parser')
var config = require('config')
var http = require('http')
spawn = require('child_process').spawn
var ProcessPool = require('./processPool')
var workers = new ProcessPool(1,10)

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
  var script = scripts[token]
  if (script) {
    workers.acquire(script, function (err, worker) {
      if (err) {
        return res.status(500).send({error: err})
      }
      if (worker) {
        var dhm = new Date(Date.now())
        console.log(dhm.toString())
        console.log('>>>>>>>>>>> ' + token)
        worker.stdout.on('data', function (data) {
          process.stdout.write('[' + token +'] ' + data)
        })
        worker.stderr.on('data', function (data) {
          process.stdout.write('[' + token +'] err: ' + data)
        })
        worker.on('error', function(err) {
          console.log('Failed to start child process: ' + script)
          workers.release(worker)
        })
        worker.on('close', function(code) {
          process.stdout.write('[' + token +'] child process exited with code ' + code + '\n')
          if (req.payload) {
            var options = {
              json: true,
              body: {state: 'success'},
              method: 'post',
              uri: req.payload.callback_url
            };
            console.log('sending callback response')
            http(options, function (err, response, body) {
              if (err) {
                console.error(err);
              }
              reply();
            })
          }
          console.log('<<<<<<<<<<< ' + token + '\n')
          workers.release(worker)
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
