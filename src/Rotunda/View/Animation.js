define(['dojo/_base/declare'
        ],
      function(declare) {
/**
 * @class
 */
return declare (null, {
    constructor: function(subject, callback, time) {
        //subject: what's being animated
        //callback: function to call at the end of the animation
        //time: time for the animation to run
	var animation = this

        //don't want a zoom and a slide going on at the same time
        if ("animation" in subject) subject.animation.stop();
        this.index = 0;
        this.time = time;
        this.subject = subject;
        this.callback = callback;

        // number of milliseconds between frames (e.g., 33ms at 30fps)
        this.frameDelay = 33
        
	var startAnimation = function (img) {
            animation.spriteImage = img
            animation.animFunction = function() { animation.animate() }
            animation.animID = setTimeout(animation.animFunction, animation.frameDelay)
            animation.frames = 0
            subject.animation = animation
	    subject.showWait()
	}

	if (subject.hideLabelsDuringAnimation)
	    rotunda.hideLabels()

	if (subject.useCanvasForAnimations)
	    subject.spritePromise.then (startAnimation)
	else
	    startAnimation()
    },

    animate: function() {
	var animation = this

        if (this.finished) {
            this.stop()
	    animation.subject.showDone()
            return
        }

        // number of milliseconds between frames (e.g., 33ms at 30fps)
        var nextTimeout = this.frameDelay
        var elapsed = 0;
        if (!("startTime" in this)) {
            this.startTime = (new Date()).getTime();
        } else {
            elapsed = (new Date()).getTime() - this.startTime;
            //set the next timeout to be the average of the
            //frame times we've achieved so far.
            //The goal is to avoid overloading the browser
            //and getting a jerky animation.
            nextTimeout = Math.max(33, elapsed / this.frames);
        }

        if (elapsed < this.time) {
            this.step(elapsed / this.time);
            this.frames++;
        } else {
            this.step(1);
            this.finished = true;
            //console.log("final timeout: " + nextTimeout);
        }
        this.animID = setTimeout(this.animFunction, nextTimeout);
    },

    stop: function() {
        clearTimeout(this.animID);
        delete this.subject.animation
        this.callback.call(this.subject,this)
	this.cleanup()
    },

    cleanup: function() { }
})
      });
