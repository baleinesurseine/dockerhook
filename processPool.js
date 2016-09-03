const spawn = require('child_process').spawn

class ProcessPool {
  constructor (poolMax, queueMax) {
    this.poolMax = poolMax
    this.queueMax = queueMax
    this.active = [] // array of active processes
    this.waiting = [] // array of script execution demands : {cb: callback, sc: script}
  }
  acquire () { // launch and return asynchrounously new child process runing script
    let command
    let args
    let callback
    var la = arguments.length
    if (la < 2) { throw new Error('ProcessPool.acquire(command[, args], callback) : function must have 2 or more parameters') }
    if (la >= 3) {
      callback = arguments[la - 1]
      command = arguments[0]
      args = arguments[1]
    } else {
      command = arguments[0]
      callback = arguments[1]
      args = []
    }
    if (!Array.isArray(args)) { throw new Error('ProcessPool.acquire(command[, args], callback) : args parameter must be an array') }
    let worker
    if (this.active.length >= this.poolMax) { // max process concurrency exceeded
      if (this.waiting.length >= this.queueMax) { // max size of waiting queue exceeded
        var err = new Error('Waiting queue length exceded, aborting')
        return callback(err, null)
      }
      return this.waiting.push({cb: callback, cm: command, args: args}) // push demand for script in the waiting queue
    }
    worker = spawn(command, args, {})
    this.active.push(worker)
    process.nextTick(callback.bind(null, null, worker)) // async callback
  }

  release (worker) {
    if (this.waiting.length > 0) {
      const wt = this.waiting.shift() // FIFO queue
      if (wt && wt.cm && wt.cb && wt.args) {
        const wk = spawn(wt.cm, wt.args, {})
        process.nextTick(wt.cb.bind(null, null, wk))
      }
    }
    this.active = this.active.filter(w => worker !== w) // remove worker from list of active processes
  }
}

module.exports = ProcessPool
