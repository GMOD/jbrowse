define([],
      function() {
/**
 * @class
 */
function Animation(subject, callback, time) {
    //subject: what's being animated
    //callback: function to call at the end of the animation
    //time: time for the animation to run
    if (subject === undefined) return;
    //don't want a zoom and a slide going on at the same time
    if ("animation" in subject) subject.animation.stop();
    this.index = 0;
    this.time = time;
    this.subject = subject;
    this.callback = callback;

    var myAnim = this;
    this.animFunction = function() { myAnim.animate(); };
    // number of milliseconds between frames (e.g., 33ms at 30fps)
    this.animID = setTimeout(this.animFunction, 33);

    this.frames = 0;

    subject.animation = this;
}

Animation.prototype.animate = function () {
    if (this.finished) {
	this.stop();
	return;
    }

    // number of milliseconds between frames (e.g., 33ms at 30fps)
    var nextTimeout = 33;
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
};

Animation.prototype.stop = function() {
    clearTimeout(this.animID);
    delete this.subject.animation;
    this.callback.call(this.subject,this);
};
return Animation;
});