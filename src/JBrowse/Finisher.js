define(['dojo/_base/declare'], function (declare) {
  return declare(null, {
    constructor: function (fun) {
      this.fun = fun
      this.count = 0
      this.finished = false
    },
    inc: function () {
      this.count++
    },
    dec: function () {
      this.count--
      this.finish()
    },
    finish: function () {
      if (this.count <= 0 && !this.finished) {
        this.fun()
        this.finished = true
      }
    },
  })
})
