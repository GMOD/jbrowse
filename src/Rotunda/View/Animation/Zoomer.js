define(['dojo/_base/declare',
        'Rotunda/View/Animation'],
       function(declare,
                Animation) {

/**
 * @class
 */
return declare (Animation,
{
    constructor: function(rotunda, callback, time, newScale) {
        this.rotunda = rotunda
        this.oldScale = rotunda.scale
        this.newScale = newScale
        this.relativeScale = this.newScale / this.oldScale
        this.zoomingIn = this.relativeScale > 1
        this.deltaScale = Math.abs (this.newScale - this.oldScale)
        this.minScale = Math.min (this.oldScale, this.newScale)

        // kludge to slow down jerky zooms on Firefox
        if (dojo.isFF && this.zoomingIn && this.oldScale <= 8)
            this.frameDelay *= 2
    },

    step: function(pos) {
        var zoomFraction = this.zoomingIn ? pos : 1 - pos
        var z2 = zoomFraction * zoomFraction
        var curScaleFactor = (z2 * this.deltaScale + this.minScale) / this.oldScale
        var stretch = this.minScale >= this.rotunda.animationStretchScaleThreshold
	var xfactor = curScaleFactor, yfactor = curScaleFactor
	if (stretch) {
	    yfactor = this.rotunda.trackRadiusScale(curScaleFactor*this.oldScale) / this.rotunda.trackRadiusScale(this.oldScale)
	}
        this.rotunda.gTransformScale (this.spriteImage, xfactor, yfactor)
    },

    cleanup: function() {
	if (this.rotunda.useCanvasForAnimations)
	    this.rotunda.destroyAnimationCanvas()
    }
})

       })
