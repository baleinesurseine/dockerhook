const spawn = require('child_process').spawn

class ProcessPool {
  constructor(poolMax) {
    this.poolMax = poolMax
    this.active = [] // array of processes
    this.waiting = [] // array of {cb: callback, sc: script}
  }
  acquire(script, callback) {
    let worker
    if (this.active.length >= this.poolMax) {
      return this.waiting.push({cb: callback, sc: script})
    }
    worker = spawn('sh', [script], {})
    this.active.push(worker)
    process.nextTick(callback.bind(null, null, worker))
  }

  release(worker) {
    if (this.waiting.length > 0) {
      const wt = this.waiting.shift()
      const wk = spawn('sh', [wt.sc], {})
      wt.cb(wk)
    }
    this.active = this.active.filter(w => worker !== w) // remove worker from list of active processes
  }
}

module.exports = ProcessPool
