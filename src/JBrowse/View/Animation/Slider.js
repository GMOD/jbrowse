define(['JBrowse/View/Animation'], function (Animation) {
  /**
   * @class
   */
  function Slider(view, callback, time, distance) {
    Animation.call(this, view, callback, time)
    this.slideStart = view.getX()
    this.slideDistance = distance
  }

  Slider.prototype = new Animation()

  Slider.prototype.step = function (pos) {
    var newX =
      (this.slideStart -
        this.slideDistance *
          //cos will go from 1 to -1, we want to go from 0 to 1
          (-0.5 * Math.cos(pos * Math.PI) + 0.5)) |
      0

    newX = Math.max(
      Math.min(this.subject.maxLeft - this.subject.offset, newX),
      this.subject.minLeft - this.subject.offset,
    )
    this.subject.setX(newX)
  }

  return Slider
})
