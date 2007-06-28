//utility stuff, should move
var is_ie = navigator.appVersion.indexOf('MSIE') >= 0;
var is_ie6 = navigator.appVersion.indexOf('MSIE 6') >= 0;
function addCommas(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

Object.extend(Event, {
	wheel:function (event){
		var delta = 0;
		if (!event) event = window.event;
		if (event.wheelDelta) {
			delta = event.wheelDelta/120; 
			if (window.opera) delta = -delta;
		} else if (event.detail) { delta = -event.detail/3;	}
		return Math.round(delta); //Safari Round
	}
});

function Animation(subject, callback, time) {
    //subject: what's being animated
    //callback: function to call at the end of the animation
    //time: time for the animation to run
    if (subject === undefined) return;
    if ("animation" in subject) subject.animation.stop();
    this.index = 0;
    this.startTime = (new Date()).getTime();
    this.time = time;
    this.subject = subject;
    this.callback = callback;

    var myAnim = this;
    this.animID = setInterval(function() { myAnim.animate() }, 33);
    //this.animFunction = function() { myAnim.animate(); };
    //this.animID = setTimeout(this.animFunction, 33);

    subject.animation = this;
}

Animation.prototype.animate = function () {
    if (this.finished) {
	this.stop();
	return;
    }
    var elapsed = (new Date()).getTime() - this.startTime;
    if (elapsed < this.time) {
        this.step(elapsed / this.time);
    } else {
	this.step(1);
        this.finished = true;
    }
    //this.animID = setTimeout(this.animFunction, 33);
}

Animation.prototype.stop = function() {
    clearInterval(this.animID);
    delete this.subject.animation;
    this.callback(this);
}    

function Slider(view, callback, time, distance) {
    Animation.call(this, view, callback, time)
    this.slideStart = view.getX();
    this.slideDistance = distance;
}

Slider.prototype = new Animation();

Slider.prototype.step = function(pos) {
    var newX = (this.slideStart -
                (this.slideDistance * 
                 //cos will go from 1 to -1, we want to go from 0 to 1
                 ((-0.5 * Math.cos(pos * Math.PI)) + 0.5))) | 0;

    newX = Math.max(Math.min(this.subject.maxLeft - this.subject.offset, newX), 
                         this.subject.minLeft - this.subject.offset);
    this.subject.updateTrackLabels(newX);
    this.subject.rawSetX(newX);
}

function Zoomer(scale, toScroll, callback, time, zoomLoc) {
    Animation.call(this, toScroll, callback, time);
    this.toZoom = toScroll.container;
    var cWidth = this.toZoom.clientWidth;

    this.zero = cWidth * Math.min(1, scale);
    this.one = cWidth * Math.max(1, scale);
    this.mult = this.one - this.zero;
    this.zoomingIn = scale > 1;
    this.zoomLoc = zoomLoc;
    //keep our own version of x that won't get rounded
    this.x = this.subject.getX();
}

Zoomer.prototype = new Animation();

Zoomer.prototype.step = function(pos) {
    var zoomFraction = this.zoomingIn ? pos : 1 - pos;
    var eWidth = this.subject.elem.clientWidth;
    var center =
        (this.x + (eWidth * this.zoomLoc)) / this.subject.container.clientWidth;
    var newWidth = ((zoomFraction * zoomFraction) * this.mult) + this.zero;
    var newLeft = (center * newWidth) - (eWidth * this.zoomLoc);
    newLeft = Math.min(newLeft, newWidth - eWidth);
    this.subject.offset += this.x - newLeft;
    this.toZoom.style.width = newWidth + "px";
    this.subject.updateTrackLabels(newLeft | 0);
    this.subject.rawSetX(newLeft);
    this.x = newLeft;
}

function GenomeView(elem, stripeWidth, startbp, endbp, zoomLevel) {
    //all coordinates are interbase


    //measure text width for the max zoom level
    var widthTest = document.createElement("div");
    widthTest.className = "sequence";
    widthTest.style.display = "none";
    var widthText = "12345678901234567890123456789012345678901234567890" 
    widthTest.appendChild(document.createTextNode(widthText));
    elem.appendChild(widthTest);
    this.charWidth = Element.getWidth(widthTest) / widthText.length;
    this.seqHeight = Element.getHeight(widthTest);
    elem.removeChild(widthTest);

    var heightTest = document.createElement("div");
    heightTest.className = "pos-label";
    heightTest.style.display = "none";
    heightTest.appendChild(document.createTextNode("42"));
    elem.appendChild(heightTest);
    this.posHeight = Element.getHeight(heightTest);
    elem.removeChild(heightTest);

    //starting bp of the reference sequence
    this.startbp = startbp;
    //ending bp of the reference sequence
    this.endbp = endbp;
    //current scale, in pixels per bp
    this.pxPerBp = zoomLevel;
    //width, in pixels, of the vertical stripes
    this.stripeWidth = stripeWidth;
    //the page element that the GenomeView lives in
    this.elem = elem;

    this.container = document.createElement("div");
    this.container.id = "container";
    this.container.style.cssText =
        "background-color: white;" +
        "position: absolute; left: 0px; top: 0px;";
    elem.appendChild(this.container);

    //width, in pixels of the "regular" (not min or max zoom) stripe
    this.regularStripe = stripeWidth;
    //width, in pixels, of stripes at full zoom (based on the sequence
    //character width)
    this.fullZoomStripe = this.charWidth * (stripeWidth / 10);

    //set up size state (zoom levels, stripe percentage, etc.)
    this.sizeInit();

    this.tracks = [];
    //distance, in pixels, from the beginning of the reference sequence
    //to the beginning of the first active stripe
    this.offset = 0;
    //largest value for the sum of this.offset and this.getX()
    //this prevents us from scrolling off the right end of the ref seq
    this.maxLeft = this.bpToPx(this.endbp) - this.dim.width;
    //smallest value for the sum of this.offset and this.getX()
    //this prevents us from scrolling off the left end of the ref seq
    this.minLeft = this.bpToPx(this.startbp);
    //distance, in pixels, between each track
    this.trackPadding = 20;
    this.trackHeights = [];
    this.trackTops = []
    this.trackLabels = [];
    this.waitElems = [$("moveLeft"), $("moveRight"),
                      $("zoomIn"), $("zoomOut"),
                      document.body, elem];
    this.prevCursors = [];
    this.colorArray =
        ["#000000", "#000033", "#000066", "#000099", "#0000CC", "#0000FF",
         "#003300", "#003333", "#003366", "#003399", "#0033CC", "#0033FF",
         "#006600", "#006633", "#006666", "#006699", "#0066CC", "#0066FF"];

    var view = this;

    if (is_ie6) {
        view.getX = function() { return -parseInt(view.container.style.left); }
        view.getY = function() { return -parseInt(view.container.style.top); }
        view.getPosition = function() {
            return {x: -parseInt(view.container.style.left),
                    y: -parseInt(view.container.style.top)};
        }
        view.rawSetX = function(x) { view.container.style.left = x; }
        view.setX = function(x) {
            view.container.style.left =
                (-Math.max(Math.min(view.maxLeft - view.offset, x), 
                           view.minLeft - view.offset)) + "px";
        }
        view.setY = function(y) {
            view.container.style.top = -Math.min((y < 0 ? 0 : y),
						 view.container.clientHeight
						 - view.dim.height) + "px";
        }
        view.setPosition = function(pos) {
            view.container.style.left =
                (-Math.max(Math.min(view.maxLeft - view.offset, pos.x), 
                           view.minLeft - view.offset)) + "px";
            view.container.style.top =
                (-Math.min((pos.y < 0 ? 0 : pos.y),
			   view.container.clientHeight - view.dim.height)) + "px";
        }
    } else {
        view.getX = function() { return view.elem.scrollLeft; }
        view.getY = function() { return view.elem.scrollTop; }
        view.getPosition = function() {
            return {x: view.elem.scrollLeft,
                    y: view.elem.scrollTop};
        }
        view.rawSetX = function(x) { view.elem.scrollLeft = x; }
        view.setX = function(x) {
            view.elem.scrollLeft =
                Math.max(Math.min(view.maxLeft - view.offset, x), 
                         view.minLeft - view.offset);
        }
        view.rawSetY = function(y) { view.elem.scrollTop = y; }
        view.setY = function(y) {
	    view.elem.scrollTop = Math.min((y < 0 ? 0 : y),
					   view.container.clientHeight
					   - view.dim.height);
        }
        view.setPosition = function(pos) {
            view.elem.scrollLeft =
                Math.max(Math.min(view.maxLeft - view.offset, pos.x),
                         view.minLeft - view.offset);
            view.elem.scrollTop =
                Math.min((pos.y < 0 ? 0 : pos.y),
		         view.container.clientHeight - view.dim.height);
        }
    }

    view.dragEnd = function(event) {
        Event.stopObserving(view.elem, "mouseup", view.dragEnd);
        Event.stopObserving(view.elem, "mousemove", view.dragMove);
        Event.stopObserving(document.body, "mouseout", view.checkDragOut)
        view.elem.style.cursor = "url(\"openhand.cur\"), move";
        document.body.style.cursor = "default";
        Event.stop(event);
        view.scrollUpdate();
        view.heightUpdate();
	view.showVisibleBlocks();
    }

    var htmlNode = document.body.parentNode;
    var bodyNode = document.body;
    //stop the drag if we mouse out of the view
    view.checkDragOut = function(event) {
        if (!(event.relatedTarget || event.toElement)
            || (htmlNode === (event.relatedTarget || event.toElement))
            || (bodyNode === (event.relatedTarget || event.toElement)))
            view.dragEnd(event);
    }

    view.dragMove = function(event) {
        var deltaX = Event.pointerX(event) - view.dragStartPos.x;
        var deltaY = Event.pointerY(event) - view.dragStartPos.y;
        view.setPosition({x: view.winStartPos.x - deltaX,
                          y: view.winStartPos.y - deltaY});
        Event.stop(event);
	view.updatePosLabels();
	view.updateTrackLabels();
        view.showVisibleBlocks();
    }

    view.dragStart = function(event) {
        if (!Event.isLeftClick(event)) return;
        if ("animation" in view) view.animation.stop();
        Event.observe(view.elem, "mouseup", view.dragEnd);
        Event.observe(view.elem, "mousemove", view.dragMove);
        Event.observe(document.body, "mouseout", view.checkDragOut)

        view.dragStartPos = {x: Event.pointerX(event), 
                             y: Event.pointerY(event)};
        view.winStartPos = view.getPosition();

        document.body.style.cursor = "url(\"closedhand.cur\"), move";
        view.elem.style.cursor = "url(\"closedhand.cur\"), move";
        Event.stop(event);
    }

    Event.observe(view.elem, "mousedown", view.dragStart);

    var afterSlide = function() {
        view.scrollUpdate();
        view.heightUpdate();
	view.showVisibleBlocks();
    };

    Event.observe("moveLeft", "click", 
                  function() {
                      if (view.animation) view.animation.stop();
		      var slideStart = view.getX();
		      var distance = view.dim.width * 0.9;
		      view.showVisibleBlocks(slideStart - distance,
					     slideStart + view.dim.width);
                      new Slider(view, afterSlide,
                                 distance * 1.2, distance);
                  });
    Event.observe("moveRight", "click",
                  function() {
                      if (view.animation) view.animation.stop();
		      var slideStart = view.getX();
		      var distance = -view.dim.width * 0.9;
		      view.showVisibleBlocks(slideStart,
					     slideStart + view.dim.width - distance);
                      new Slider(view, afterSlide, 
                                 distance * -1.2, distance);
                  });

    var zoomIn = this.zoomIn.bind(this);
    Event.observe("zoomIn", "click", zoomIn);

    var zoomOut = this.zoomOut.bind(this);
    Event.observe("zoomOut", "click", zoomOut);

    view.wheelScroll = function(e) {
        //remains of an experiment with scroll wheel zooming
        //it's nice, but working around firefox bugs is tricky
        //var zoomLoc = (Event.pointerX(e) - view.getX()) / view.dim.width;
        //var zoomLoc = 0.5;
        //in firefox, e.clientX is in twips!  relative to the element that the event fired on!  it's two kinds of crazy in one.
        //zoomLoc = (((e.clientX / 15) + Position.page(Event.element(e))[0])) / view.dim.width;
        //console.log((e.clientX / 15), Position.page(Event.element(e))[0], Position.page(view.elem)[0], view.getX(), view.dim.width);
        //console.log("pointerX: %d, getX: %d, view.dim.width: %d, zoomLoc: %d", Event.pointerX(e), view.getX(), view.dim.width, zoomLoc);
        //console.log("clientX: %d, element x: %d, element width: %d", e.clientX, Position.page(Event.element(e))[0], Event.element(e).clientWidth);
        //if (Event.wheel(e) > 0)
        //    zoomIn(e, zoomLoc);
        //else
        //    zoomOut(e, zoomLoc);
	var oldY = view.getY();
	var newY = Math.min(Math.max(0, oldY - 50 * Event.wheel(e)), 
			    view.container.clientHeight - view.dim.height);
	view.updatePosLabels(newY);
	view.setY(newY);
	view.showVisibleBlocks();
	view.heightUpdate();
	//view.updateTrackLabels();
	Event.stop(e);
    }

    Event.observe(view.container, "mousewheel", view.wheelScroll, false);

    Event.observe(view.container, "DOMMouseScroll", view.wheelScroll, false);

    Event.observe(view.elem, "doubleclick", function (event) {console.log("doubleclick");});

    var zooms = [zoomOut, zoomOut, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomIn, zoomIn];

    var thisZoom;

    var profile = function() {
        zooms[thisZoom++]();
        if (thisZoom < zooms.length) {
            setTimeout(profile, 3000);
        } else {
            $('profTime').appendChild(document.createTextNode(" " + (new Date().getTime() - startTime) / 1000));
	    thisZoom = 0;
	}
    }
    
    var startTime;

    Event.observe("profile", "click", function() {
            thisZoom = 0;
            startTime = new Date().getTime();
            
            setTimeout(profile, 2000);
        });

    Event.observe(window, "resize", function() { view.sizeInit(); });

    this.makeStripes();

    this.container.style.paddingTop = this.topSpace() + "px";
}

GenomeView.prototype.updatePosLabels = function(newY) {
    if (newY === undefined) newY = this.getY();
    var stripe;
    for (var i = 0; i < this.stripeCount; i++) {
	stripe = this.stripes[i];
	stripe.posLabel.style.top = newY + "px";
	if ("seqNode" in stripe)
	    stripe.seqNode.style.top = (newY + (1.2 * this.posHeight)) + "px";
    }
}

GenomeView.prototype.updateTrackLabels = function(newX) {
    if (newX === undefined) newX = this.getX();
    for (var i = 0; i < this.trackLabels.length; i++)
        this.trackLabels[i].style.left = newX + "px";

//     var trackTop = this.topSpace() - this.getY();
//     for (var i = 0; i < this.trackLabels.length; i++) {
// 	trackTop += this.trackHeights[i] + this.trackPadding;
// 	this.trackLabels[i].style.top = trackTop + "px";
// 	    //Position.page(this.tracks[i].div)[1] + "px";
//     }
}

GenomeView.prototype.showWait = function() {
    var oldCursors = [];
    for (var i = 0; i < this.waitElems.length; i++) {
        oldCursors[i] = this.waitElems[i].style.cursor;
        this.waitElems[i].style.cursor = "wait";
    }
    this.prevCursors.push(oldCursors);
}

GenomeView.prototype.showDone = function() {
    var oldCursors = this.prevCursors.pop();
    for (var i = 0; i < this.waitElems.length; i++) {
        this.waitElems[i].style.cursor = oldCursors[i];
    }
}

GenomeView.prototype.pxToBp = function(pixels) {
    return pixels / this.pxPerBp;
    //return (pixels / this.pxPerBp) + this.startbp;
}

GenomeView.prototype.bpToPx = function(bp) {
    return bp * this.pxPerBp;
    //return (bp - this.startbp) * this.pxPerBp;
}

GenomeView.prototype.sizeInit = function() {
    this.dim = {width: this.elem.clientWidth, 
                height: this.elem.clientHeight};//Element.getDimensions(elem);

    //scale values, in pixels per bp, for all zoom levels
    this.zoomLevels = [1/500000, 1/200000, 1/100000, 1/50000, 1/20000, 1/10000, 1/5000, 1/2000, 1/1000, 1/500, 1/200, 1/100, 1/50, 1/20, 1/10, 1/5, 1/2, 1, 2, 5, this.charWidth];
    //make sure we don't zoom out too far
    while (((this.endbp - this.startbp) * this.zoomLevels[0]) 
           < this.dim.width) {
        this.zoomLevels.shift();
    }
    this.zoomSteps = [];
    this.zoomLevels.unshift(this.dim.width / (this.endbp - this.startbp));

    //width, in pixels, of stripes at min zoom (so the view covers
    //the whole ref seq)
    this.minZoomStripe = this.regularStripe * (this.zoomLevels[0] / this.zoomLevels[1]);
    
    this.curZoom = 0;
    while (this.pxPerBp > this.zoomLevels[this.curZoom])
        this.curZoom++;
    this.pxPerBp = this.zoomLevels[this.curZoom];
    this.maxLeft = this.bpToPx(this.endbp) - this.dim.width;

    delete this.stripePercent;
    //25, 50, 100 don't work as well due to the way scrollUpdate works
    var possiblePercents = [20, 10, 5, 4, 2, 1];
    for (var i = 0; i < possiblePercents.length; i++) {
        if (((100 / possiblePercents[i]) * this.stripeWidth)
            > (this.dim.width * 5)) {
            this.stripePercent = possiblePercents[i];
            break;
        }
    }

    if (this.stripePercent === undefined)
        throw new RangeError("stripeWidth too small: " + stripeWidth + ", " + this.dim.width);

    this.stripeCount = Math.round(100 / this.stripePercent);

    this.container.style.width = (this.stripeCount * this.stripeWidth) + "px";

    var newHeight = parseInt(this.container.style.height);
    newHeight = (newHeight > this.dim.height ? newHeight : this.dim.height);

    this.container.style.height = newHeight + "px";

    if (this.stripes) {
	for (var track = 0; track < this.tracks.length; track++)
	    this.tracks[track].sizeInit(this.stripeCount, this.stripePercent);

        for (var i = this.stripeCount - 1; i < this.stripes.length; i++) {
            if (this.stripes[i]) {
                this.container.removeChild(this.stripes[i]);
                this.stripes[i] = undefined;
            }
        }
        this.stripes.length = this.stripeCount;
        for (var i = 0; i < this.stripes.length; i++) {
            if (this.stripes[i]) {
                this.stripes[i].style.left = (i * this.stripePercent) + "%";
                this.stripes[i].style.width = this.stripePercent + "%";
                this.stripes[i].style.height = newHeight + "px";
            } else {
                this.stripes[i] = this.makeStripe(this.pxToBp(i * this.stripeWidth + this.offset),
                                                  i * this.stripePercent);
                this.container.appendChild(this.stripes[i]);
            }
        }
        this.showVisibleBlocks();
	this.heightUpdate();
    }
}

GenomeView.prototype.zoomIn = function(e, zoomLoc) {
    if (this.animation) return;
    if (zoomLoc === undefined) zoomLoc = 0.5;
    if (this.curZoom < (this.zoomLevels.length - 1)) {
	this.showWait();
	var x = this.getX();
	for (var i = 0; i < this.stripeCount; i++) {
	    if ((((i + 1) * this.stripeWidth) < x)
		|| ((i * this.stripeWidth) > (x + this.dim.width))) {
		this.container.removeChild(this.stripes[i]);
		this.stripes[i] = undefined;
	    }
	}
	var scale = this.zoomLevels[this.curZoom + 1] / this.zoomLevels[this.curZoom];
	this.curZoom += 1;
	this.pxPerBp = this.zoomLevels[this.curZoom];
	this.maxLeft = this.bpToPx(this.endbp) - this.dim.width;
	zoomStart = (new Date()).getTime();
	new Zoomer(scale, this, this.zoomUpdate.bind(this), 700, zoomLoc);
    }
}

GenomeView.prototype.zoomOut = function(e, zoomLoc) {
    if (this.animation) return;
    if ((this.zoomLevels.length - 1) == this.curZoom) {
	for (var i = 0; i < this.stripeCount; i++)
	    this.stripes[i].seqNode.style.display = "none";
    }
    if (this.curZoom > 0) {
	this.showWait();
        if (zoomLoc === undefined) zoomLoc = 0.5;
        var x = this.getX();
        var scale = this.zoomLevels[this.curZoom - 1] / this.zoomLevels[this.curZoom];
        var edgeDist = this.bpToPx(this.endbp) - (this.offset + x + this.dim.width);
        //zoomLoc is a number on [0,1] that indicates
        //the fixed point of the zoom
        zoomLoc = Math.max(zoomLoc, 1 - (((edgeDist * scale) / (1 - scale)) / this.dim.width));
        edgeDist = x + this.offset - this.bpToPx(this.startbp);
        zoomLoc = Math.min(zoomLoc, ((edgeDist * scale) / (1 - scale)) / this.dim.width);
        this.curZoom -= 1;
        this.pxPerBp = this.zoomLevels[this.curZoom];
	this.minLeft = this.bpToPx(this.startbp);
	zoomStart = (new Date()).getTime();
	new Zoomer(scale, this, this.zoomUpdate.bind(this), 700, zoomLoc);
    }
}

GenomeView.prototype.zoomUpdate = function() {
    var x = this.getX();
    var eWidth = this.elem.clientWidth;
    var centerPx = ((eWidth / 2) + x + this.bpToPx(this.startBase));
    if ((this.zoomLevels.length - 1) == this.curZoom) {
        this.stripeWidth = this.fullZoomStripe;
    } else if (0 == this.curZoom) {
        this.stripeWidth = this.minZoomStripe;
    } else {
        this.stripeWidth = this.regularStripe;
    }
    this.container.style.width = (this.stripeCount * this.stripeWidth) + "px";
    var centerStripe = Math.round(centerPx / this.stripeWidth);
    var firstStripe = (centerStripe - ((this.stripeCount) / 2)) | 0;
    this.offset = firstStripe * this.stripeWidth;
    this.maxOffset = this.bpToPx(this.endbp) - this.stripeCount * this.stripeWidth;
    this.maxLeft = this.bpToPx(this.endbp) - this.dim.width;
    this.minLeft = this.bpToPx(this.startbp);
    this.setX((centerPx - this.offset) - (eWidth / 2));
    this.updateTrackLabels();
    this.clearStripes();
    this.makeStripes();
    this.container.style.paddingTop = this.topSpace() + "px";
    this.showVisibleBlocks();
    this.heightUpdate();
    this.showDone();
}    

GenomeView.prototype.scrollUpdate = function() {
    var x = this.getX();
    var cWidth = Element.getWidth(this.container);
    var eWidth = Element.getWidth(this.elem);
    //dx: horizontal distance between the centers of
    //this.container and this.elem
    var dx = (cWidth / 2) - ((eWidth / 2) + x);
    //If dx is negative, we add stripes on the right, if positive,
    //add on the left.
    //We remove stripes from the other side to keep cWidth the same.
    //The end goal is to minimize dx while making sure the surviving
    //stripes end up in the same place.

    var numStripes = this.stripes.length;
    var dStripes = (dx / this.stripeWidth) | 0;
    if (0 == dStripes) return;
    var changedStripes = Math.abs(dStripes);

    var newOffset = this.offset - (dStripes * this.stripeWidth)
    //newOffset = Math.min(this.maxOffset, newOffset)
    //newOffset = Math.max(0, newOffset);

    dStripes = ((this.offset - newOffset) / this.stripeWidth) | 0;

    if (this.offset == newOffset) return;
    this.offset = newOffset;
    this.startBase = Math.round(this.pxToBp(this.offset));

    var newStripes = new Array(numStripes);
    var track;
    for (var i = 0; i < numStripes; i++) {
        var newIndex = i + dStripes;
        if ((newIndex < 0) || (newIndex >= numStripes)) {
            //We're not keeping this stripe around, so delete
            //the old one and create a corresponding new one.

            //delete + create
            while (newIndex < 0) newIndex += numStripes;
            while (newIndex >= numStripes) newIndex -= numStripes;
            //alert("deleting: " + i + ", creating: " + newIndex);
            newStripes[newIndex] = 
                this.makeStripe(this.pxToBp(newIndex * this.stripeWidth
                                            + this.offset),
                                newIndex * this.stripePercent);
            this.container.removeChild(this.stripes[i]);
            if (dStripes > 0)
                this.container.insertBefore(newStripes[newIndex],
                                            this.stripes[0]);
            else
                this.container.appendChild(newStripes[newIndex]);
        } else {
            //move stripe
            newStripes[newIndex] = this.stripes[i];
            newStripes[newIndex].style.left =
                ((newIndex) * this.stripePercent) + "%";
            //alert("moving " + i + " to " + (newIndex));
        }
    }

    for (track = 0; track < this.tracks.length; track++)
	this.tracks[track].moveBlocks(dStripes);

    //TODO: re-add features from deleted stripes

    this.stripes = newStripes;
    var newX = x + (dStripes * this.stripeWidth);
    this.setX(newX);
    this.updateTrackLabels(newX);
    var firstVisible = (newX / this.stripeWidth) | 0;

}

GenomeView.prototype.showVisibleBlocks = function(startX, endX) {
    var pos = this.getPosition();
    if (startX === undefined) startX = pos.x;
    if (endX === undefined) endX = pos.x + this.dim.width;
    var leftVisible = Math.max(0, (startX / this.stripeWidth) | 0);
    var rightVisible = Math.min(this.stripeCount - 1,
                               Math.ceil(endX / this.stripeWidth));

    var top = this.getY();
    var bottom = top + this.dim.height;

    var trackNum, track, stripe, trackTop, trackBottom, trackHeight;
    var bpPerBlock = Math.round(this.stripeWidth / this.pxPerBp);
    for (trackNum = 0; trackNum < this.tracks.length; trackNum++) {
        track = this.tracks[trackNum];
	trackTop = Position.positionedOffset(track.div)[1];
        //trackTop = this.trackTops[track];
	trackBottom = trackTop + Element.getHeight(track.div);
        //this.trackHeights[track];
	//if track is visible,
	if ((trackBottom > top) && (trackTop < bottom)) {
            trackHeight =
                track.showRange(leftVisible, rightVisible,
                                this.stripes[leftVisible].startBase,
                                bpPerBlock,
                                this.pxPerBp);
            if (trackHeight > this.trackHeights[track])
                this.trackHeights[track] = trackHeight;
	    track.div.height = trackHeight + "px";

	}
    }
}

GenomeView.prototype.makeStripe = function(startBase, startPercent) {
    var stripe = document.createElement("div");
    stripe.className = "stripe";
    stripe.style.cssText =
    "left: " + startPercent
    + "%; width: " + (this.stripePercent) + "%;"
    + "height: " + this.dim.height + "px;";
    //+ "background-color: " + (i % 2 ? "#eee;" : "#fff;")
    //+ "background-color: white;"

    var y = this.getY();

    startBase = Math.round(startBase);
    stripe.startBase = startBase;
    stripe.endBase = stripe.startBase + Math.round(this.stripeWidth / this.pxPerBp);
    var posLabel = document.createElement("div");
    posLabel.className = "pos-label";
    posLabel.appendChild(document.createTextNode(addCommas(startBase)));
    posLabel.style.top = y + "px";
    stripe.appendChild(posLabel);
    stripe.posLabel = posLabel;

    if ((this.zoomLevels.length - 1) == this.curZoom) {
        var seqNode = document.createElement("div");
        seqNode.className = "sequence";
        seqNode.appendChild(
            document.createTextNode(
                this.getSeq(startBase, startBase + this.regularStripe / 10)));
        seqNode.style.cssText = "top: " + (y + (1.2 * this.posHeight)) + "px;";
        stripe.appendChild(seqNode);
        stripe.seqNode = seqNode;
    }

    return stripe;
}

GenomeView.prototype.getSeq = function(start, end) {
    var dummySeq = "ACCTGACCTGACCTGACCTGACCTGACCTGACCTGACCTGACCTGACCTG";
    dummySeq = dummySeq.substr(0, end - start);
    return dummySeq;
}

GenomeView.prototype.topSpace = function() {
    if ((this.zoomLevels.length - 1) == this.curZoom)
        return (1.5 * this.posHeight) + this.seqHeight;
    else
        return 1.5 * this.posHeight;
}

GenomeView.prototype.heightUpdate = function() {
    var lastTop = this.topSpace();
    var curHeight;
    for (var i = 0; i < this.tracks.length; i++) {
        curHeight = this.tracks[i].heightUpdate(lastTop);
	curHeight = Math.max(curHeight, Element.getHeight(this.trackLabels[i]));
	this.tracks[i].div.style.height = curHeight + "px";
	this.trackHeights[i] = curHeight + this.trackPadding;
	this.trackTops[i] = lastTop;
        lastTop += curHeight + this.trackPadding;
    }
    var newHeight = Math.max(lastTop, this.dim.height);
    this.container.style.height = newHeight + "px";
    for (var stripe = 0 ; stripe < this.stripes.length; stripe++)
        this.stripes[stripe].style.height = newHeight + "px";
    var maxY = newHeight - this.dim.height;
    if (this.getY() > maxY) {
	this.setY(maxY);
	this.updatePosLabels(maxY);
    }
}

GenomeView.prototype.clearStripes = function() {
    for (var i = 0; i < this.stripes.length; i++)
        if (this.stripes[i] !== undefined)
            this.container.removeChild(this.stripes[i]);
    for (var track = 0; track < this.tracks.length; track++)
	this.tracks[track].clear();
}

GenomeView.prototype.makeStripes = function() {
    var stripe;
    var x = this.getX();
    //var firstVisible = (x / this.stripeWidth) | 0;
    this.stripes = new Array(this.stripeCount);
    for (var i = 0; i < this.stripeCount; i++) {
        stripe = this.makeStripe(this.pxToBp((i * this.stripeWidth) + this.offset),
                                 i * this.stripePercent);
        this.stripes[i] = stripe;
        this.container.appendChild(stripe);
    }
    this.startBase = Math.round(this.pxToBp(this.offset));
    this.scrollUpdate();
    this.showVisibleBlocks();
    this.heightUpdate();
}

GenomeView.prototype.addTrack = function(name, featArray,
					 className, levelHeight,
					 refSeq, histScale) {
    var trackNum = this.tracks.length;
    var labelDiv = document.createElement("div");
    labelDiv.className = "track-label";
    this.trackLabels.push(labelDiv);
    var trackDiv = document.createElement("div");
    trackDiv.className = "track";
    trackDiv.id = "track_" + name;
    var track = new SimpleFeatureTrack(name, this.stripeCount,
				       trackDiv, labelDiv,
				       this.stripePercent, this.stripeWidth,
				       featArray, className, levelHeight, 
				       refSeq, histScale);
    this.tracks.push(track);
    var totalHeight = this.topSpace();
    for (var t = 0; t < this.trackHeights.length; t++)
        totalHeight += this.trackHeights[t];
    //trackDiv.style.top = totalHeight + "px";
    this.trackTops.push(totalHeight);
    var pos = this.getPosition();
    var bottom = pos.y + this.dim.height;

    //var elemPos = Position.page(this.elem);
    //console.log(elemPos);
    //labelDiv.style.left = elemPos[0] + "px";
    //labelDiv.style.top = totalHeight - pos.y + "px";
    labelDiv.style.top = "0px";
    labelDiv.style.left = pos.x + "px";
    labelDiv.style.backgroundColor = this.colorArray[this.tracks.length %
                                                     this.colorArray.length];
    trackDiv.appendChild(labelDiv);

    var leftVisible = Math.max(0, (pos.x / this.stripeWidth) | 0);
    var rightVisible = Math.min(this.stripeCount - 1,
				Math.ceil((pos.x + this.dim.width) 
					  / this.stripeWidth));

    var trackHeight;
    var bpPerBlock = Math.round(this.stripeWidth / this.pxPerBp);
    if (totalHeight < bottom) {
	for (var i = leftVisible; i <= rightVisible; i++) {
            trackHeight =
                this.tracks[trackNum].showRange(leftVisible, rightVisible,
                                                this.stripes[i].startBase,
                                                bpPerBlock, this.pxPerBp);
	}
    } else {
	trackHeight = 50;
    }
    this.trackHeights.push(trackHeight);
    trackDiv.style.height = trackHeight + "px";
    trackDiv.style.marginBottom = this.trackPadding + "px";
    totalHeight += trackHeight + this.trackPadding;
    totalHeight = Math.max(totalHeight, this.dim.height);
    for (var i = 0; i < this.stripeCount; i++)
        this.stripes[i].style.height = totalHeight + "px";
    this.container.style.height = totalHeight + "px";
    this.container.appendChild(trackDiv);

    //var tLabel = document.createElement("div");
    //tLabel.className = "track-label";
    //tLabel.style.cssText = "position:absolute; left: 0px;";

    Sortable.create("container", { tag: "div", only: "track", overlap: "vertical", constraint: false, handle: "track-label"});
                            //dropOnEmpty:true,containment:["firstlist","secondlist"],constraint:false
}
