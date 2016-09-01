const spawn = require('child_process').spawn

class ProcessPool {
  constructor (poolMax, queueMax) {
    this.poolMax = poolMax
    this.queueMax = queueMax
    this.active = [] // array of processes
    this.waiting = [] // array of {cb: callback, sc: script}
  }
  acquire (script, callback) {
    let worker
    if (this.active.length >= this.poolMax) { // max process concurrency exceded
      if (this.waiting.length >= this.queueMax) { // max size of waiting queue exceded
        var err = new Error('Waiting queue length exceded, aborting')
        return callback(err, null)
      }
      return this.waiting.push({cb: callback, sc: script})
    }
    worker = spawn('sh', [script], {})
    this.active.push(worker)
    process.nextTick(callback.bind(null, null, worker))
  }

  release (worker) {
    if (this.waiting.length > 0) {
      const wt = this.waiting.shift()
      const wk = spawn('sh', [wt.sc], {})
      process.nextTick(wt.cb.bind(null, null, wk))
    }
    this.active = this.active.filter(w => worker !== w) // remove worker from list of active processes
  }
}

module.exports = ProcessPool
