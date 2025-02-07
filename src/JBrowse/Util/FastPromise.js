/**
 * Very minimal and fast implementation of a promise, used in
 * performance-critical code.  Dojo Deferred is too heavy for some
 * uses.
 */

define([], function () {
  var fastpromise = function () {
    this.callbacks = []
  }

  fastpromise.prototype.then = function (callback) {
    if ('value' in this) callback(this.value)
    else this.callbacks.push(callback)
  }

  fastpromise.prototype.resolve = function (value) {
    this.value = value
    var c = this.callbacks
    delete this.callbacks
    for (var i = 0; i < c.length; i++) c[i](this.value)
  }

  return fastpromise
})
