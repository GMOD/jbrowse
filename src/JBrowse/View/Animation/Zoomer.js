define(['JBrowse/View/Animation'], function (Animation) {
  /**
   * @class
   */
  function Zoomer(scale, toScroll, callback, time, zoomLoc) {
    Animation.call(this, toScroll, callback, time)
    this.toZoom = toScroll.zoomContainer
    var cWidth = this.toZoom.clientWidth

    this.initialWidth = cWidth

    // the container width when zoomFraction is 0
    this.width0 = cWidth * Math.min(1, scale)
    // the container width when zoomFraction is 1
    var width1 = cWidth * Math.max(1, scale)
    this.distance = width1 - this.width0
    this.zoomingIn = scale > 1
    //this.zoomLoc = zoomLoc;
    this.center =
      (toScroll.getX() + toScroll.elem.clientWidth * zoomLoc) /
      toScroll.scrollContainer.clientWidth

    // initialX and initialLeft can differ when we're scrolling
    // using scrollTop and scrollLeft
    this.initialX = this.subject.getX()
    this.initialLeft = parseInt(this.toZoom.style.left)
  }

  Zoomer.prototype = new Animation()

  Zoomer.prototype.step = function (pos) {
    var zoomFraction = this.zoomingIn ? pos : 1 - pos
    var newWidth = zoomFraction * zoomFraction * this.distance + this.width0
    var newLeft = this.center * this.initialWidth - this.center * newWidth
    this.toZoom.style.width = newWidth + 'px'
    this.toZoom.style.left = this.initialLeft + newLeft + 'px'
    var forceRedraw = this.toZoom.offsetTop

    if (this.subject.updateStaticElements)
      this.subject.updateStaticElements({ x: this.initialX - newLeft })
  }

  return Zoomer
})
