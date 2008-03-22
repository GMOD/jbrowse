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
    //this.animID = setInterval(function() { myAnim.animate() }, 33);
    this.animFunction = function() { myAnim.animate(); };
    this.animID = setTimeout(this.animFunction, 33);

    this.frames = 0;

    subject.animation = this;
}

Animation.prototype.animate = function () {
    if (this.finished) {
	this.stop();
	return;
    }

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
	YAHOO.log("final timeout: " + nextTimeout);
    }
    this.animID = setTimeout(this.animFunction, nextTimeout);
}

Animation.prototype.stop = function() {
    clearTimeout(this.animID);
    delete this.subject.animation;
    this.callback(this);
}    

function Slider(view, callback, time, distance) {
    Animation.call(this, view, callback, time);
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

var gview;

function GenomeView(elem, stripeWidth, startbp, endbp, zoomLevel) {
    //all coordinates are interbase

    gview = this;

    //measure text width for the max zoom level
    var widthTest = document.createElement("div");
    widthTest.className = "sequence";
    widthTest.style.visibility = "hidden";
    var widthText = "12345678901234567890123456789012345678901234567890" 
    widthTest.appendChild(document.createTextNode(widthText));
    elem.appendChild(widthTest);
    this.charWidth = widthTest.clientWidth / widthText.length;
    this.seqHeight = widthTest.clientHeight;
    elem.removeChild(widthTest);

    var heightTest = document.createElement("div");
    heightTest.className = "pos-label";
    heightTest.style.visibility = "hidden";
    heightTest.appendChild(document.createTextNode("42"));
    elem.appendChild(heightTest);
    this.posHeight = heightTest.clientHeight;
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
    //The number of characters per stripe is somewhat arbitrarily set
    //at stripeWidth / 10
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
    this.trackPadding = 30;
    //extra margin to draw around the visible area, in multiples of the visible area
    //0: draw only the visible area; 0.1: draw an extra 10% around the visible area, etc.
    this.drawMargin = 0.2;
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

    var cssScroll = false; //Util.is_ie6;

    if (cssScroll) {
        view.getX = function() { return -parseInt(view.container.style.left); }
        view.getY = function() { return -parseInt(view.container.style.top); }
        view.getPosition = function() {
            return {x: -parseInt(view.container.style.left),
                    y: -parseInt(view.container.style.top)};
        }
        view.rawSetX = function(x) { view.container.style.left = -x; }
        view.setX = function(x) {
            view.container.style.left =
                (-Math.max(Math.min(view.maxLeft - view.offset, x), 
                           view.minLeft - view.offset)) + "px";
        }
        view.rawSetY = function(y) { view.container.style.top = -y; }
        view.setY = function(y) {
            view.container.style.top = -Math.min((y < 0 ? 0 : y),
						 view.container.clientHeight
						 - view.dim.height) + "px";
        }
        view.rawSetPosition = function(pos) {
            view.container.style.left = -pos.x + "px";
            view.container.style.top = -pos.y + "px";
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
	view.x = view.elem.scrollLeft;
	view.y = view.elem.scrollTop;
        view.getX = function() { 
	    return view.x; //view.elem.scrollLeft;
	}
        view.getY = function() {
	    return view.y; //view.elem.scrollTop;
	}
        view.getPosition = function() {
	    return { x: view.x, y: view.y };
            //return {x: view.elem.scrollLeft,
            //        y: view.elem.scrollTop};
        }
        view.rawSetX = function(x) { view.elem.scrollLeft = x; view.x = x; }
        view.setX = function(x) {
	    view.x = Math.max(Math.min(view.maxLeft - view.offset, x), 
			      view.minLeft - view.offset);
            view.elem.scrollLeft = view.x;
        }
        view.rawSetY = function(y) { view.elem.scrollTop = y; view.y = y; }
        view.setY = function(y) {
	    view.y = Math.min((y < 0 ? 0 : y),
			      view.container.clientHeight
			      - view.dim.height);
	    view.elem.scrollTop = view.y
        }
        view.rawSetPosition = function(pos) {
            view.elem.scrollLeft = pos.x; view.x = pos.x;
            view.elem.scrollTop = pos.y; view.y = pos.y;
        }
        view.setPosition = function(pos) {
	    view.x = Math.max(Math.min(view.maxLeft - view.offset, pos.x),
			      view.minLeft - view.offset);
            view.elem.scrollLeft = view.x;
	    view.y = Math.min((pos.y < 0 ? 0 : pos.y),
			      view.container.clientHeight - view.dim.height);
            view.elem.scrollTop = view.y;
        }
    }

    view.dragEnd = function(event) {
        YAHOO.util.Event.removeListener(view.elem, "mouseup", view.dragEnd);
        YAHOO.util.Event.removeListener(view.elem, "mousemove", view.dragMove);
        YAHOO.util.Event.removeListener(document.body, "mouseout", view.checkDragOut)
        //YAHOO.util.Event.addListener(view.elem, "scroll", view.scrollHandler);

	view.dragging = false;
        view.elem.style.cursor = "url(\"openhand.cur\"), move";
        document.body.style.cursor = "default";
        YAHOO.util.Event.stopEvent(event);
        view.scrollUpdate();
        //view.heightUpdate();
	view.showVisibleBlocks(true);
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
        var x = view.winStartPos.x - (event.clientX - view.dragStartPos.x);
        var y = view.winStartPos.y - (event.clientY - view.dragStartPos.y);

        var pos = {
                x: Math.max(Math.min(view.maxLeft - view.offset, x),
                            view.minLeft - view.offset),
                y: Math.min((y < 0 ? 0 : y),
                            view.container.clientHeight - view.dim.height)
            };
	view.updateTrackLabels(pos.x);
	view.updatePosLabels(pos.y);
        view.rawSetPosition(pos);
        YAHOO.util.Event.stopEvent(event);
        //view.showVisibleBlocks(true, pos);
    }

    view.mouseDown = function(event) {
        if ("animation" in view) view.animation.stop();
	if (Util.isRightButton(event)) return;
        YAHOO.util.Event.stopEvent(event);
	if (event.shiftKey) return;
        //don't follow clicks on the scrollbar
        //if ((YAHOO.util.Event.getPageX(event) - YAHOO.util.Dom.getX(view.elem))
        //    > view.dim.width) return;
	YAHOO.util.Event.addListener(view.elem, "mouseup", view.dragEnd);
	YAHOO.util.Event.addListener(view.elem, "mousemove", view.dragMove);
	YAHOO.util.Event.addListener(document.body, "mouseout", view.checkDragOut);
	//YAHOO.util.Event.removeListener(view.elem, "scroll", view.scrollHandler);

	view.dragging = true;
	view.dragStartPos = {x: event.clientX, 
			     y: event.clientY};
	view.winStartPos = view.getPosition();
	
	document.body.style.cursor = "url(\"closedhand.cur\"), move";
	view.elem.style.cursor = "url(\"closedhand.cur\"), move";
    }

    view.mouseup = function(event) {
	if (event.shiftKey) {
            if ("animation" in view) view.animation.stop();
	    var zoomLoc = (YAHOO.util.Event.getPageX(event) - YAHOO.util.Dom.getX(view.elem)) / view.dim.width;
	    if (Util.isRightButton(event)) {
		view.zoomOut(event, zoomLoc);
	    } else {
		view.zoomIn(event, zoomLoc);
	    }
	    YAHOO.util.Event.stopEvent(event);
	}
    }

    YAHOO.util.Event.addListener(view.elem, "contextmenu", function(event) {
	    if (event.shiftKey)
		YAHOO.util.Event.stopEvent(event);
	});
    YAHOO.util.Event.addListener(view.elem, "mousedown", view.mouseDown);
    YAHOO.util.Event.addListener(view.elem, "mouseup", view.mouseup);

    if (typeof(foo) == 'undefined') 
        new YAHOO.widget.LogReader("myLogger");
    else
        YAHOO.widget.Logger.enableBrowserConsole();

    view.scrollHandler = function() {
        //view.showVisibleBlocks(true);
        //if (!view.dragging) view.heightUpdate();
    };

    var afterSlide = function() {
        view.scrollUpdate();
        //view.heightUpdate();
	view.showVisibleBlocks(true);
        YAHOO.util.Event.addListener(view.elem, "scroll", view.scrollHandler);
    };

    YAHOO.util.Event.addListener("moveLeft", "click", function(event) {
            if (view.animation) view.animation.stop();
            //var slideStart = view.getX();
            var distance = view.dim.width * 0.9;
            //distance = Math.min(view.minLeft + view.offset, distance);
	    var pos = view.getPosition();
	    view.trimVertical(pos.y);
//             view.showVisibleBlocks(false, pos,
//                                    pos.x - distance,
//                                    pos.x + view.dim.width);
            YAHOO.util.Event.removeListener(view.elem, "scroll", view.scrollHandler);
            YAHOO.util.Event.stopEvent(event);
            new Slider(view, afterSlide,
                       distance * 1.2, distance);
        });
    YAHOO.util.Event.addListener("moveRight", "click", function(event) {
            if (view.animation) view.animation.stop();
            var distance = -view.dim.width * 0.9;
            //distance = Math.max(this.subject.maxLeft - this.subject.offset,
            //                    distance);
	    var pos = view.getPosition();
	    view.trimVertical(pos.y);
//             view.showVisibleBlocks(false, pos,
//                                    pos.x,
//                                    pos.x + view.dim.width - distance);
            YAHOO.util.Event.removeListener(view.elem, "scroll", view.scrollHandler);
            YAHOO.util.Event.stopEvent(event);
            new Slider(view, afterSlide, 
                       distance * -1.2, distance);
        });

    function killEvent(event) {
        YAHOO.util.Event.stopEvent(event);
    }

    YAHOO.util.Event.addListener("zoomIn", "mouseup", killEvent);
    YAHOO.util.Event.addListener("zoomOut", "mouseup", killEvent);
    YAHOO.util.Event.addListener("moveLeft", "mouseup", killEvent);
    YAHOO.util.Event.addListener("moveRight", "mouseup", killEvent);

    var zoomIn = function(event) {
        view.zoomIn();
        if (event) YAHOO.util.Event.stopEvent(event);
    };
    var zoomOut = function(event) {
        view.zoomOut();
        if (event) YAHOO.util.Event.stopEvent(event);
    };
    YAHOO.util.Event.addListener("zoomIn", "click", zoomIn);

    YAHOO.util.Event.addListener("zoomOut", "click", zoomOut);

    view.zoomCallback = function() {view.zoomUpdate()};

    var wheelScrollTimeout = null;
    var wheelScrollUpdate = function() {
	view.showVisibleBlocks(true);
	wheelScrollTimeout = null;
    }

    view.wheelScroll = function(e) {
        //remains of an experiment with scroll wheel zooming
        //it's nice, but working around firefox bugs is tricky
        //var zoomLoc = (Event.pointerX(e) - view.getX()) / view.dim.width;
        //var zoomLoc = 0.5;
        //in firefox, e.clientX is in twips!  relative to the element that the event fired on!  it's two kinds of crazy in one.
        //zoomLoc = (((e.clientX / 15) + Position.page(Event.element(e))[0])) / view.dim.width;
        //YAHOO.log((e.clientX / 15), Position.page(Event.element(e))[0], Position.page(view.elem)[0], view.getX(), view.dim.width);
        //YAHOO.log("pointerX: %d, getX: %d, view.dim.width: %d, zoomLoc: %d", Event.pointerX(e), view.getX(), view.dim.width, zoomLoc);
        //YAHOO.log("clientX: %d, element x: %d, element width: %d", e.clientX, Position.page(Event.element(e))[0], Event.element(e).clientWidth);
        //if (Util.wheel(e) > 0)
        //    zoomIn(e, zoomLoc);
        //else
        //    zoomOut(e, zoomLoc);
	var oldY = view.getY();
	var newY = Math.min(Math.max(0, oldY - 60 * Util.wheel(e)), 
			    view.container.clientHeight - view.dim.height);
	view.updatePosLabels(newY);
	view.setY(newY);
	if (wheelScrollTimeout)
	    clearTimeout(wheelScrollTimeout);
	wheelScrollTimeout = setTimeout(wheelScrollUpdate, 100);
	//view.showVisibleBlocks(true);
	//view.heightUpdate();
	//view.updateTrackLabels();
	YAHOO.util.Event.stopEvent(e);
    }

    YAHOO.util.Event.addListener(view.container, "mousewheel", view.wheelScroll, false);

    YAHOO.util.Event.addListener(view.container, "DOMMouseScroll", view.wheelScroll, false);

    YAHOO.util.Event.addListener(view.elem, "doubleclick", function (event) {YAHOO.log("doubleclick");});

    var zooms = [zoomOut, zoomOut, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomOut, zoomIn, zoomIn, zoomIn];

    var thisZoom;

    var profile = function() {
        zooms[thisZoom++]();
        if (thisZoom < zooms.length) {
            setTimeout(profile, 3000);
        } else {
            $('myLogger').appendChild(document.createTextNode(" " + (new Date().getTime() - startTime) / 1000));
	    thisZoom = 0;
	}
    }
    
    var startTime;

    YAHOO.util.Event.addListener("profile", "click", function() {
            thisZoom = 0;
            startTime = new Date().getTime();
            
            setTimeout(profile, 2000);
        });

    YAHOO.util.Event.addListener(window, "resize", function() { view.sizeInit(); });

    this.makeStripes();

    var trackDiv = document.createElement("div");
    trackDiv.className = "track";
    trackDiv.style.top = "0px";
    trackDiv.style.position = "absolute";
    trackDiv.style.zIndex = 20;
    trackDiv.id = "static_track";
    this.staticTrack = new StaticTrack("static_track");
    this.staticTrack.setViewInfo(this.stripeCount, trackDiv, undefined,
                                 this.stripePercent, this.stripeWidth);
    this.staticTrack.showRange(0, this.stripeCount - 1, this.stripes[0].startBase, Math.round(this.stripeWidth / this.pxPerBp), this.pxPerBp);
    this.container.appendChild(trackDiv);

    this.setX((this.container.offsetWidth / 2) - (this.dim.width / 2));

    this.container.style.paddingTop = this.topSpace() + "px";

    document.body.style.cursor = "url(\"closedhand.cur\")";
    document.body.style.cursor = "default";

    YAHOO.util.Event.addListener(view.elem, "scroll", view.scrollHandler);
}

GenomeView.prototype.checkY = function(y) {
    return Math.min((y < 0 ? 0 : y), this.container.clientHeight - this.dim.height);
}

GenomeView.prototype.updatePosLabels = function(newY) {
    if (newY === undefined) newY = this.getY();
    this.staticTrack.div.style.top = newY + "px";
    return;
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
    this.containerHeight = newHeight;

    if (this.stripes) {
        this.staticTrack.sizeInit(this.stripeCount, this.stripePercent);
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
                //this.stripes[i].style.height = newHeight + "px";
            } else {
                this.stripes[i] = this.makeStripe(this.pxToBp(i * this.stripeWidth + this.offset),
                                                  i * this.stripePercent);
                this.container.appendChild(this.stripes[i]);
            }
        }
        this.showVisibleBlocks(true);
	//this.heightUpdate();
    }
}

GenomeView.prototype.trimVertical = function(y) {
    if (y === undefined) y = this.getY();
    var trackTop, trackBottom, trackHeight;
    var trackTop = this.topSpace();
    var bottom = y + this.dim.height;
    this.trackIterate(function(track, gv) {
            trackBottom = trackTop + track.height;
            if (!((trackBottom > y) && (trackTop < bottom))) {
		track.hideAll();
	    }
            trackTop = trackBottom + gv.trackPadding;
        });
}

GenomeView.prototype.zoomIn = function(e, zoomLoc) {
    if (this.animation) return;
    if (zoomLoc === undefined) zoomLoc = 0.5;
    if (this.curZoom < (this.zoomLevels.length - 1)) {
	this.showWait();
	var pos = this.getPosition();
	//this.showVisibleBlocks(false, pos, pos.x, pos.x + this.dim.width);
	this.trimVertical(pos.y);
	for (var i = 0; i < this.stripeCount; i++) {
	    if ((((i + 1) * this.stripeWidth) < pos.x)
		|| ((i * this.stripeWidth) > (pos.x + this.dim.width))) {
		this.container.removeChild(this.stripes[i]);
		this.stripes[i] = undefined;
	    }
	}
	var scale = this.zoomLevels[this.curZoom + 1] / this.zoomLevels[this.curZoom];
	var centerBp = this.pxToBp(pos.x + this.offset + (zoomLoc * this.dim.width));
	this.curZoom += 1;
	this.pxPerBp = this.zoomLevels[this.curZoom];
	this.maxLeft = this.bpToPx(this.endbp) - this.dim.width;

	for (var track = 0; track < this.tracks.length; track++)
	    this.tracks[track].startZoom(this.pxPerBp,
					 centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp),
					 centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp));
	//YAHOO.log("centerBp: " + centerBp + "; estimated post-zoom start base: " + (centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp)) + ", end base: " + (centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp)));

	//zoomStart = (new Date()).getTime();
        YAHOO.util.Event.removeListener(this.elem, "scroll", this.scrollHandler);
	new Zoomer(scale, this, this.zoomCallback, 700, zoomLoc);
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
	var pos = this.getPosition();
	this.trimVertical(pos.y);
        if (zoomLoc === undefined) zoomLoc = 0.5;
        var scale = this.zoomLevels[this.curZoom - 1] / this.zoomLevels[this.curZoom];
        var edgeDist = this.bpToPx(this.endbp) - (this.offset + pos.x + this.dim.width);
        //zoomLoc is a number on [0,1] that indicates
        //the fixed point of the zoom
        zoomLoc = Math.max(zoomLoc, 1 - (((edgeDist * scale) / (1 - scale)) / this.dim.width));
        edgeDist = pos.x + this.offset - this.bpToPx(this.startbp);
        zoomLoc = Math.min(zoomLoc, ((edgeDist * scale) / (1 - scale)) / this.dim.width);
	var centerBp = this.pxToBp(pos.x + this.offset + (zoomLoc * this.dim.width));
        this.curZoom -= 1;
        this.pxPerBp = this.zoomLevels[this.curZoom];

	for (var track = 0; track < this.tracks.length; track++)
	    this.tracks[track].startZoom(this.pxPerBp,
					 centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp),
					 centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp));

	//YAHOO.log("centerBp: " + centerBp + "; estimated post-zoom start base: " + (centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp)) + ", end base: " + (centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp)));
	this.minLeft = this.bpToPx(this.startbp);
	//zoomStart = (new Date()).getTime();
        YAHOO.util.Event.removeListener(this.elem, "scroll", this.scrollHandler);
	new Zoomer(scale, this, this.zoomCallback, 700, zoomLoc);
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
    for (var track = 0; track < this.tracks.length; track++)
	this.tracks[track].endZoom(this.pxPerBp, Math.round(this.stripeWidth / this.pxPerBp));
    //YAHOO.log("post-zoom start base: " + this.pxToBp(this.offset + this.getX()) + ", end base: " + this.pxToBp(this.offset + this.getX() + this.dim.width));
    this.makeStripes();
    this.container.style.paddingTop = this.topSpace() + "px";
    this.containerHeight = 0;
    this.showVisibleBlocks(true);
    //this.heightUpdate();
    YAHOO.util.Event.addListener(this.elem, "scroll", this.scrollHandler);
    this.showDone();
}    

GenomeView.prototype.scrollUpdate = function() {
    var x = this.getX();
    var numStripes = this.stripeCount;
    var cWidth = numStripes * this.stripeWidth;
    var eWidth = this.dim.width;
    //dx: horizontal distance between the centers of
    //this.container and this.elem
    var dx = (cWidth / 2) - ((eWidth / 2) + x);
    //If dx is negative, we add stripes on the right, if positive,
    //add on the left.
    //We remove stripes from the other side to keep cWidth the same.
    //The end goal is to minimize dx while making sure the surviving
    //stripes end up in the same place.

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

    this.staticTrack.moveBlocks(dStripes);
    for (track = 0; track < this.tracks.length; track++)
	this.tracks[track].moveBlocks(dStripes);

    this.stripes = newStripes;
    var newX = x + (dStripes * this.stripeWidth);
    this.updateTrackLabels(newX);
    this.rawSetX(newX);
    var firstVisible = (newX / this.stripeWidth) | 0;

}

GenomeView.prototype.showVisibleBlocks = function(updateHeight, pos, startX, endX) {
    if (pos === undefined) pos = this.getPosition();
    if (startX === undefined) startX = pos.x - (this.drawMargin * this.dim.width);
    if (endX === undefined) endX = pos.x + ((1 + this.drawMargin) * this.dim.width);
    var leftVisible = Math.max(0, (startX / this.stripeWidth) | 0);
    var rightVisible = Math.min(this.stripeCount - 1,
                               (endX / this.stripeWidth) | 0);

    var top = pos.y - (this.drawMargin * this.dim.height);
    var bottom = pos.y + ((1 + this.drawMargin) * this.dim.height);
    var middle = top + ((bottom - top) / 2);

    var trackTop, trackBottom, trackHeight;
    var bpPerBlock = Math.round(this.stripeWidth / this.pxPerBp);
    var trackTop = this.topSpace();
    var oldBottom = trackTop;
    var middleDelta;

    this.staticTrack.showRange(leftVisible, rightVisible,
			       this.stripes[leftVisible].startBase,
			       bpPerBlock,
			       this.pxPerBp);
    this.trackIterate(function(track, gv) {
            trackBottom = trackTop + track.height;
	    oldBottom += track.height + gv.trackPadding;
            //if track is within the draggable range,
            if ((trackBottom > top) && (trackTop < bottom)) {
		//show blocks for the track
                trackHeight =
                    track.showRange(leftVisible, rightVisible,
                                    gv.stripes[leftVisible].startBase,
                                    bpPerBlock,
                                    gv.pxPerBp);
		//trackHeight = Math.max(trackHeight, track.label.offsetHeight);
		if (updateHeight) {
		    if ((middleDelta === undefined) && (oldBottom > middle))
			middleDelta = trackTop - (oldBottom - track.height - gv.trackPadding);
			
		    if (track.height != trackHeight) {
			//YAHOO.log("updating height for track " + track.name);
			track.div.style.height = trackHeight + "px";
			track.height = trackHeight;
			trackBottom = trackTop + trackHeight;
		    }
		}
                //if (trackHeight > track.height) {
		    //YAHOO.log("increasing height for track " + track.name + " from " + track.height + " to " + trackHeight);
                //    track.div.style.height = trackHeight + "px";
                //    track.height = trackHeight;
                //}
	    } else {
		//track.hideAll();
	    }
            trackTop = trackBottom + gv.trackPadding;
        });
    //if (trackTop > parseInt(this.container.style.height))
    if (updateHeight) {
	trackTop = Math.max(trackTop - this.topSpace(), this.dim.height);
	if (trackTop != this.containerHeight) {
	    this.container.style.height = trackTop + "px";
	    this.containerHeight = trackTop;
	}
	var y = this.getY();
	if (y > 0) {
	    y = this.checkY(this.getY() + middleDelta);
	    this.updatePosLabels(y);
	    this.setY(y);
	}
    }
}

GenomeView.prototype.makeStripe = function(startBase, startPercent) {
    var stripe = document.createElement("div");
    stripe.className = "stripe";
    stripe.style.cssText =
    "left: " + startPercent
    + "%; width: " + (this.stripePercent) + "%;";
    //+ "height: " + this.dim.height + "px;";
    //+ "background-color: " + (i % 2 ? "#eee;" : "#fff;")
    //+ "background-color: white;"

    var y = this.getY();

    startBase = Math.round(startBase);
    stripe.startBase = startBase;
    stripe.endBase = stripe.startBase + Math.round(this.stripeWidth / this.pxPerBp);
//     var posLabel = document.createElement("div");
//     posLabel.className = "pos-label";
//     posLabel.appendChild(document.createTextNode(Util.addCommas(startBase)));
//     posLabel.style.top = "0px";// y + "px";
//     stripe.appendChild(posLabel);
//     stripe.posLabel = posLabel;

    if ((this.zoomLevels.length - 1) == this.curZoom) {
        var seqNode = document.createElement("div");
        seqNode.className = "sequence";
        seqNode.appendChild(
            document.createTextNode(
                this.getSeq(startBase, startBase + this.regularStripe / 10)));
        //seqNode.style.cssText = "top: " + (y + (1.2 * this.posHeight)) + "px;";
	seqNode.style.cssText = "top: " +(1.2 * this.posHeight) + "px;";
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
    var top = this.topSpace();
    var lastTop = top;
    var curHeight;
    //for (var i = 0; i < this.tracks.length; i++) {
    this.trackIterate(function(track, gv) {
            curHeight = track.heightUpdate();
            curHeight = Math.max(curHeight, track.label.offsetHeight);
            track.div.style.height = curHeight + "px";
            track.height = curHeight;
            //this.trackHeights[i] = curHeight + this.trackPadding;
            //this.trackTops[i] = lastTop;
            lastTop += curHeight + gv.trackPadding;
        });
    var newHeight = Math.max(lastTop, this.dim.height) - top;
    var oldHeight = this.containerHeight;
    this.container.style.height = newHeight + "px";
    this.containerHeight = newHeight;
    if (newHeight < oldHeight) this.showVisibleBlocks(true);
    //YAHOO.log("newHeight: " + newHeight + ", container height: " + this.container.style.height + ", elem scrollheight: " + this.elem.scrollHeight);
    //for (var stripe = 0 ; stripe < this.stripes.length; stripe++)
        //this.stripes[stripe].style.height = newHeight + "px";
    var maxY = newHeight - this.dim.height + top;
    if (this.getY() > maxY) {
	this.updatePosLabels(maxY);
	this.setY(maxY);
    }
}

GenomeView.prototype.clearStripes = function() {
    for (var i = 0; i < this.stripes.length; i++)
        if (this.stripes[i] !== undefined)
            this.container.removeChild(this.stripes[i]);
    this.staticTrack.clear();
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
    //this.scrollUpdate();
    //this.showVisibleBlocks(true);
    //this.heightUpdate();
}

GenomeView.prototype.addTrack = function(track) {
    var trackNum = this.tracks.length;
    var labelDiv = document.createElement("div");
    labelDiv.className = "track-label";
    labelDiv.id = "label_" + track.name;
    this.trackLabels.push(labelDiv);
    var trackDiv = document.createElement("div");
    trackDiv.className = "track";
    trackDiv.id = "track_" + track.name;
    trackDiv.track = track;
    track.setViewInfo(this.stripeCount, trackDiv, labelDiv,
		      this.stripePercent, this.stripeWidth);
    this.tracks.push(track);
    var totalHeight = this.topSpace();
    this.trackIterate(function(mytrack, gv) { 
            totalHeight += mytrack.height + gv.trackPadding;
        });
    //for (var t = 0; t < this.trackHeights.length; t++)
    //    totalHeight += this.trackHeights[t];
    //trackDiv.style.top = totalHeight + "px";
    this.trackTops.push(totalHeight);
    var pos = this.getPosition();
    var bottom = pos.y + this.dim.height;

    //var elemPos = Position.page(this.elem);
    //YAHOO.log(elemPos);
    //labelDiv.style.left = elemPos[0] + "px";
    //labelDiv.style.top = totalHeight - pos.y + "px";
    labelDiv.style.top = "0px";
    labelDiv.style.left = pos.x + "px";
    labelDiv.style.backgroundColor = this.colorArray[this.tracks.length %
                                                     this.colorArray.length];
    trackDiv.appendChild(labelDiv);

//     var leftVisible = Math.max(0, ((pos.x - this.dim.width) / this.stripeWidth) | 0);
//     var rightVisible = Math.min(this.stripeCount - 1,
// 				Math.ceil((pos.x + (2 * this.dim.width)) 
// 					  / this.stripeWidth));
    var leftVisible = Math.max(0, ((pos.x) / this.stripeWidth) | 0);
    var rightVisible = Math.min(this.stripeCount - 1,
				Math.ceil((pos.x + this.dim.width) 
					  / this.stripeWidth));

    var bpPerBlock = Math.round(this.stripeWidth / this.pxPerBp);
    //if (totalHeight < bottom) {
        track.height =
            track.showRange(leftVisible, rightVisible,
                            this.stripes[leftVisible].startBase,
                            bpPerBlock, this.pxPerBp);
    //} else {
    //track.height = 50;
    //}
    this.container.appendChild(trackDiv);
    track.height = Math.max(track.height, labelDiv.offsetHeight);
    //this.trackHeights.push(track.height);
    trackDiv.style.height = track.height + "px";
    trackDiv.style.marginBottom = this.trackPadding + "px";
    totalHeight += track.height + this.trackPadding;
    totalHeight = Math.max(totalHeight, this.dim.height);
    //for (var i = 0; i < this.stripeCount; i++)
    //    this.stripes[i].style.height = totalHeight + "px";
    this.containerHeight = totalHeight - this.topSpace()
    this.container.style.height = this.containerHeight + "px";

    var trackDD = new YAHOO.util.DDProxy(trackDiv, "tracks", {padding: [this.trackPadding / 2, 0, this.trackPadding / 2, 0], scroll: false});
    trackDD.trackPadding = this.trackPadding;
    trackDD.genomeView = this;
    trackDD.resizeFrame = false;
    trackDD.setHandleElId(labelDiv.id);
    //should factor this stuff into a DDProxy subclass
    trackDD.startDrag = function(x, y) {
        var gvrgn = YAHOO.util.Dom.getRegion(this.genomeView.elem);
        this.insertPoint = document.createElement("div");
        this.insertPoint.style.position = "absolute";
        this.insertPoint.style.left = gvrgn.left + "px";
        this.insertPoint.style.width = (gvrgn.right - gvrgn.left) + "px";
        this.insertPoint.style.height = (this.trackPadding / 2) + "px";
        this.insertPoint.style.backgroundColor = "#aaa";
        this.insertPoint.style.zIndex = 900;
        this.insertPoint.style.visibility = "hidden";
        document.body.insertBefore(this.insertPoint, document.body.firstChild);
        labelPos = YAHOO.util.Dom.getXY(labelDiv);
        this.setDelta(x - labelPos[0], y - labelPos[1]);
	var dragEl = this.getDragEl();
	dragEl.innerHTML = labelDiv.innerHTML;
	dragEl.className = labelDiv.className;
	dragEl.style.backgroundColor = labelDiv.style.backgroundColor;
        dragEl.style.width = "";
	//trackDiv.style.backgroundColor = "#aaa";
	labelDiv.style.visibility = "hidden";
        this.marked = trackDiv.nextSibling;
    }
    trackDD.onDragOver = function(e, id) {
	var over = YAHOO.util.Dom.get(id);
	var pt = YAHOO.util.DragDropMgr.interactionInfo.point;
	var rgn = YAHOO.util.Dom.getRegion(over);
	if (((pt.y - rgn.top) / (rgn.bottom - rgn.top)) < 0.5) {
	    if (over.previousSibling !== trackDiv) {
                this.insertPoint.style.top = (rgn.top - (this.trackPadding * 0.75)) + "px";
                this.insertPoint.style.visibility = "visible";
                this.marked = over;
	    } else {
                this.insertPoint.style.visibility = "hidden";
                this.marked = trackDiv.nextSibling;
            }
	} else {
	    if (over.nextSibling !== trackDiv) {
                this.insertPoint.style.top = (rgn.bottom + (this.trackPadding * 0.25)) + "px";
                this.insertPoint.style.visibility = "visible";
                this.marked = over.nextSibling;
	    } else {
                this.insertPoint.style.visibility = "hidden";
                this.marked = trackDiv.nextSibling;
            }
	}
	//YAHOO.util.Dom.get(id).style.backgroundColor = "#ddd";
	//trackDiv.style.top = "0px";
	//trackDiv.style.left = "0px";
    }

    trackDD.endDrag = function() {
        var srcEl = this.getEl();
        var proxy = this.getDragEl();
        
        trackDiv.parentNode.insertBefore(trackDiv, this.marked);
        this.insertPoint.parentNode.removeChild(this.insertPoint);

        // Show the proxy element and animate it to the src element's location
        YAHOO.util.Dom.setStyle(proxy, "visibility", "");
        var a = new YAHOO.util.Motion( 
            proxy, { 
                points: { 
                    to: YAHOO.util.Dom.getXY(labelDiv)
                }
            }, 
            0.2, 
            YAHOO.util.Easing.easeOut 
        )
        var proxyid = proxy.id;
        var thisid = this.id;

        // Hide the proxy and show the source element when finished with the animation
        a.onComplete.subscribe(function() {
                proxy.style.visibility = "hidden";
                labelDiv.style.visibility = "";
                //trackDiv.style.backgroundColor = "";
            });
        setTimeout(function() { a.animate(); }, 0);
    };

    //var tLabel = document.createElement("div");
    //tLabel.className = "track-label";
    //tLabel.style.cssText = "position:absolute; left: 0px;";

    //Sortable.create("container", { tag: "div", only: "track", overlap: "vertical", constraint: false, handle: "track-label"});
                            //dropOnEmpty:true,containment:["firstlist","secondlist"],constraint:false
}

GenomeView.prototype.trackIterate = function(callback) {
    var containerChild = this.container.firstChild;
    do {
        if (containerChild.track) callback(containerChild.track, this);
    } while (containerChild = containerChild.nextSibling);
}
