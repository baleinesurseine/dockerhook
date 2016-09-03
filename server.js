var express = require('express')
var helmet = require('helmet')
var bodyParser = require('body-parser')
var config = require('config')
var request = require('request')
var ProcessPool = require('./processPool')
var workers = new ProcessPool(1, process.env.WQUEUE || 10)

var scripts = {}

if (config.has('scripts')) {
  console.log('Configuration:')
  console.log(JSON.stringify(config.scripts, null, '\t'))
  scripts = config.scripts
} else {
  console.log('Error: config found, or missing scripts value')
}

var app = express()
app.use(helmet())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

var router = express.Router()

app.set('port', process.env.PORT || process.argv[2] || 5000)

router.post('/:token', function (req, res, next) {
  var token = req.params.token
  var script = token && scripts[token]
  if (script) {
    workers.acquire('sh', [script], function (err, worker) { // get new worker process to execute script
      if (err) {
        return res.status(500).send({error: 'Waiting queue length exceded'})
      }
      if (worker) {
        var dhm = new Date()
        console.log('>>>>>>>>>>> ' + token)
        console.log('[' + token + '] spawn process')
        console.log(dhm.toString())
        worker.stdout.pipe(process.stdout)
        worker.stderr.pipe(process.stderr)
        worker.on('error', function (err) {
          console.log('Failed to start child process: ' + script + ' with error: ' + err)
          workers.release(worker)
        })
        worker.on('close', function (code) {
          process.stdout.write('[' + token + '] child process exited with code ' + code)
          if (req.payload) {
            var options = {
              json: true,
              body: {state: 'success'},
              method: 'POST',
              url: req.payload.callback_url
            }
            console.log('sending callback response')
            request(options, function (err, response, body) {
              if (err) {
                console.error(err)
              }
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
  res.status(404).send('Ressource not found')
})

app.listen(app.get('port'), function () {
  console.log('Dockerhook server listening on port ' + app.get('port'))
})

module.exports = app
