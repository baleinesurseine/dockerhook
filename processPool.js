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
    if (this.active.length >= this.poolMax) {
      if (this.waiting.length >= this.queueMax) {
        var err = new Error('Queue length exceded')
        return callback(err, null)
      }
      console.log('put in queue')
      return this.waiting.push({cb: callback, sc: script})
    }
    worker = spawn('sh', [script], {})
    this.active.push(worker)
    process.nextTick(callback.bind(null, null, worker))
  }

  release (worker) {
    console.log('release worker')
    if (this.waiting.length > 0) {
      const wt = this.waiting.shift()
      const wk = spawn('sh', [wt.sc], {})
      console.log('spawn and dequeue')
      // wt.cb(wk)
      process.nextTick(wt.cb.bind(null, null, wk))
    }
    this.active = this.active.filter(w => worker !== w) // remove worker from list of active processes
  }
}

module.exports = ProcessPool
