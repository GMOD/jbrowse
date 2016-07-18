define(['dojo/_base/declare',
        'Rotunda/View/Animation'],
       function(declare,
                Animation) {

/**
 * @class
 */
return declare (Animation,
{
    constructor: function(rotunda, callback, time, radians) {
        this.rotunda = rotunda
        this.degrees = (radians - rotunda.rotate) * 180 / Math.PI
    },

    step: function(pos) {
        this.rotunda.gTransformRotate (this.spriteImage, this.degrees * pos)
    },

    cleanup: function() {
	if (this.rotunda.useCanvasForAnimations)
	    this.rotunda.destroyAnimationCanvas()
    }
})
       });
