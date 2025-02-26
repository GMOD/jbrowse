/**
 * Fast implementation of a promise, used in performance-critical code
 * that still needs to be able to reject promises.  Dojo Deferred is
 * too heavy for some uses.
 */

define([], function () {
  var fastpromise = function () {
    this.callbacks = []
    this.errbacks = []
  }

  fastpromise.prototype.then = function (callback, errback) {
    if ('value' in this) callback(this.value)
    else if ('error' in this) errback(this.error)
    else {
      this.callbacks.push(callback)
      this.errbacks.push(errback)
    }
  }

  fastpromise.prototype.resolve = function (value) {
    this.value = value
    delete this.errbacks
    var c = this.callbacks
    delete this.callbacks
    for (var i = 0; i < c.length; i++) c[i](this.value)
  }

  fastpromise.prototype.reject = function (error) {
    this.error = error
    delete this.callbacks
    var c = this.errbacks
    delete this.errbacks
    for (var i = 0; i < c.length; i++) c[i](error)
  }

  return fastpromise
})
