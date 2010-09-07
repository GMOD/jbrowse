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
    this.callback(this);
};

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
    this.subject.setX(newX);
};

function Zoomer(scale, toScroll, callback, time, zoomLoc) {
    Animation.call(this, toScroll, callback, time);
    this.toZoom = toScroll.zoomContainer;
    var cWidth = this.toZoom.clientWidth;

    this.initialWidth = cWidth;

    // the container width when zoomFraction is 0
    this.width0 = cWidth * Math.min(1, scale);
    // the container width when zoomFraction is 1
    var width1 = cWidth * Math.max(1, scale);
    this.distance = width1 - this.width0;
    this.zoomingIn = scale > 1;
    //this.zoomLoc = zoomLoc;
    this.center =
        (toScroll.getX() + (toScroll.elem.clientWidth * zoomLoc))
        / toScroll.scrollContainer.clientWidth;

    // initialX and initialLeft can differ when we're scrolling
    // using scrollTop and scrollLeft
    this.initialX = this.subject.getX();
    this.initialLeft = parseInt(this.toZoom.style.left);
};

Zoomer.prototype = new Animation();

Zoomer.prototype.step = function(pos) {
    var zoomFraction = this.zoomingIn ? pos : 1 - pos;
    var newWidth =
        ((zoomFraction * zoomFraction) * this.distance) + this.width0;
    var newLeft = (this.center * this.initialWidth) - (this.center * newWidth);
    this.toZoom.style.width = newWidth + "px";
    this.toZoom.style.left = (this.initialLeft + newLeft) + "px";
    var forceRedraw = this.toZoom.offsetTop;
    this.subject.updateTrackLabels(this.initialX - newLeft);
};

function GenomeView(elem, stripeWidth, refseq, zoomLevel) {
    //all coordinates are interbase

    //measure text width for the max zoom level
    var widthTest = document.createElement("div");
    widthTest.className = "sequence";
    widthTest.style.visibility = "hidden";
    var widthText = "12345678901234567890123456789012345678901234567890";
    widthTest.appendChild(document.createTextNode(widthText));
    elem.appendChild(widthTest);
    this.charWidth = widthTest.clientWidth / widthText.length;
    this.seqHeight = widthTest.clientHeight;
    elem.removeChild(widthTest);

    // measure the height of some arbitrary text in whatever font this
    // shows up in (set by an external CSS file)
    var heightTest = document.createElement("div");
    heightTest.className = "pos-label";
    heightTest.style.visibility = "hidden";
    heightTest.appendChild(document.createTextNode("42"));
    elem.appendChild(heightTest);
    this.posHeight = heightTest.clientHeight;
    // Add an arbitrary 50% padding between the position labels and the
    // topmost track
    this.topSpace = 1.5 * this.posHeight;
    elem.removeChild(heightTest);

    //the reference sequence
    this.ref = refseq;
    //current scale, in pixels per bp
    this.pxPerBp = zoomLevel;
    //width, in pixels, of the vertical stripes
    this.stripeWidth = stripeWidth;
    //the page element that the GenomeView lives in
    this.elem = elem;

    // the scrollContainer is the element that changes position
    // when the user scrolls
    this.scrollContainer = document.createElement("div");
    this.scrollContainer.id = "container";
    this.scrollContainer.style.cssText =
        "position: absolute; left: 0px; top: 0px;";
    elem.appendChild(this.scrollContainer);

    // we have a separate zoomContainer as a child of the scrollContainer.
    // they used to be the same element, but making zoomContainer separate
    // enables it to be narrower than this.elem.
    this.zoomContainer = document.createElement("div");
    this.zoomContainer.id = "zoomContainer";
    this.zoomContainer.style.cssText =
        "position: absolute; left: 0px; top: 0px; height: 100%;";
    this.scrollContainer.appendChild(this.zoomContainer);

    //width, in pixels of the "regular" (not min or max zoom) stripe
    this.regularStripe = stripeWidth;
    //width, in pixels, of stripes at full zoom (based on the sequence
    //character width)
    //The number of characters per stripe is somewhat arbitrarily set
    //at stripeWidth / 10
    this.fullZoomStripe = this.charWidth * (stripeWidth / 10);

    this.overview = dojo.byId("overview");
    this.overviewBox = dojo.marginBox(this.overview);

    this.tracks = [];
    this.uiTracks = [];
    this.trackIndices = {};

    //set up size state (zoom levels, stripe percentage, etc.)
    this.sizeInit();

    //distance, in pixels, from the beginning of the reference sequence
    //to the beginning of the first active stripe
    //  should always be a multiple of stripeWidth
    this.offset = 0;
    //largest value for the sum of this.offset and this.getX()
    //this prevents us from scrolling off the right end of the ref seq
    this.maxLeft = this.bpToPx(this.ref.end) - this.dim.width;
    //smallest value for the sum of this.offset and this.getX()
    //this prevents us from scrolling off the left end of the ref seq
    this.minLeft = this.bpToPx(this.ref.start);
    //distance, in pixels, between each track
    this.trackPadding = 20;
    //extra margin to draw around the visible area, in multiples of the visible area
    //0: draw only the visible area; 0.1: draw an extra 10% around the visible area, etc.
    this.drawMargin = 0.2;
    //slide distance (pixels) * slideTimeMultiple + 200 = milliseconds for slide
    //1=1 pixel per millisecond average slide speed, larger numbers are slower
    this.slideTimeMultiple = 0.8;
    this.trackHeights = [];
    this.trackTops = [];
    this.trackLabels = [];
    this.waitElems = [dojo.byId("moveLeft"), dojo.byId("moveRight"),
                      dojo.byId("zoomIn"), dojo.byId("zoomOut"),
                      dojo.byId("bigZoomIn"), dojo.byId("bigZoomOut"),
                      document.body, elem];
    this.prevCursors = [];
    this.locationThumb = document.createElement("div");
    this.locationThumb.className = "locationThumb";
    this.overview.appendChild(this.locationThumb);
    this.locationThumbMover = new dojo.dnd.move.parentConstrainedMoveable(this.locationThumb, {area: "margin", within: true});
    dojo.connect(this.locationThumbMover, "onMoveStop", this, "thumbMoved");

    var view = this;

    var cssScroll = dojo.isIE;

    if (cssScroll) {
        view.x = -parseInt(view.scrollContainer.style.left);
        view.y = -parseInt(view.scrollContainer.style.top);
        view.getX = function() {
            return view.x;
        };
        view.getY = function() {
            return view.y;
        };
        view.getPosition = function() {
	    return { x: view.x, y: view.y };
        };
        view.rawSetX = function(x) {
            view.scrollContainer.style.left = -x + "px"; view.x = x;
        };
        view.setX = function(x) {
	    view.x = Math.max(Math.min(view.maxLeft - view.offset, x),
                              view.minLeft - view.offset);
            view.x = Math.round(view.x);
	    view.updateTrackLabels(view.x);
	    view.showFine();
            view.scrollContainer.style.left = -view.x + "px";
        };
        view.rawSetY = function(y) {
            view.scrollContainer.style.top = -y + "px"; view.y = y;
        };
        view.setY = function(y) {
            view.y = Math.min((y < 0 ? 0 : y),
                              view.containerHeight
                              - view.dim.height);
            view.y = Math.round(view.y);
            view.updatePosLabels(view.y);
            view.scrollContainer.style.top = -view.y + "px";
        };
        view.rawSetPosition = function(pos) {
            view.scrollContainer.style.left = -pos.x + "px";
            view.scrollContainer.style.top = -pos.y + "px";
        };
        view.setPosition = function(pos) {
            view.x = Math.max(Math.min(view.maxLeft - view.offset, pos.x),
                              view.minLeft - view.offset);
            view.y = Math.min((pos.y < 0 ? 0 : pos.y),
                              view.containerHeight - view.dim.height);
            view.x = Math.round(view.x);
            view.y = Math.round(view.y);

            view.updateTrackLabels(view.x);
            view.updatePosLabels(view.y);
	    view.showFine();

            view.scrollContainer.style.left = -view.x + "px";
            view.scrollContainer.style.top = -view.y + "px";
        };
    } else {
	view.x = view.elem.scrollLeft;
	view.y = view.elem.scrollTop;
        view.getX = function() {
	    return view.x;
	};
        view.getY = function() {
	    return view.y;
	};
        view.getPosition = function() {
	    return { x: view.x, y: view.y };
        };
        view.rawSetX = function(x) {
            view.elem.scrollLeft = x; view.x = x;
        };
        view.setX = function(x) {
	    view.x = Math.max(Math.min(view.maxLeft - view.offset, x),
			      view.minLeft - view.offset);
            view.x = Math.round(view.x);
	    view.updateTrackLabels(view.x);
	    view.showFine();

            view.elem.scrollLeft = view.x;
        };
        view.rawSetY = function(y) {
            view.elem.scrollTop = y; view.y = y;
        };
        view.rawSetPosition = function(pos) {
            view.elem.scrollLeft = pos.x; view.x = pos.x;
            view.elem.scrollTop = pos.y; view.y = pos.y;
        };

        view.setY = function(y) {
            view.y = Math.min((y < 0 ? 0 : y),
                              view.containerHeight
                              - view.dim.height);
            view.y = Math.round(view.y);
            view.updatePosLabels(view.y);
            view.elem.scrollTop = view.y;
        };
        view.setPosition = function(pos) {
            view.x = Math.max(Math.min(view.maxLeft - view.offset, pos.x),
                              view.minLeft - view.offset);
            view.y = Math.min((pos.y < 0 ? 0 : pos.y),
                              view.containerHeight - view.dim.height);
            view.x = Math.round(view.x);
            view.y = Math.round(view.y);

            view.updateTrackLabels(view.x);
            view.updatePosLabels(view.y);
	    view.showFine();

            view.elem.scrollLeft = view.x;
            view.elem.scrollTop = view.y;
	};
    }

    view.dragEnd = function(event) {
	dojo.forEach(view.dragEventHandles, dojo.disconnect);

	view.dragging = false;
        view.elem.style.cursor = "url(\"openhand.cur\"), move";
        document.body.style.cursor = "default";
        dojo.stopEvent(event);
	view.showCoarse();

        view.scrollUpdate();
	view.showVisibleBlocks(true);
    };

    var htmlNode = document.body.parentNode;
    var bodyNode = document.body;
    //stop the drag if we mouse out of the view
    view.checkDragOut = function(event) {
        if (!(event.relatedTarget || event.toElement)
            || (htmlNode === (event.relatedTarget || event.toElement))
            || (bodyNode === (event.relatedTarget || event.toElement)))
            view.dragEnd(event);
    };

    view.dragMove = function(event) {
	view.setPosition({
		x: view.winStartPos.x - (event.clientX - view.dragStartPos.x),
		y: view.winStartPos.y - (event.clientY - view.dragStartPos.y)
            });
        dojo.stopEvent(event);
    };

    view.mouseDown = function(event) {
        if ("animation" in view) {
            if (view.animation instanceof Zoomer) {
                dojo.stopEvent(event);
                return;

            } else {
                view.animation.stop();
            }
        }
	if (Util.isRightButton(event)) return;
        dojo.stopEvent(event);
	if (event.shiftKey || event.ctrlKey) return;
	view.dragEventHandles =
	    [
	     dojo.connect(document.body, "mouseup", view.dragEnd),
	     dojo.connect(document.body, "mousemove", view.dragMove),
	     dojo.connect(document.body, "mouseout", view.checkDragOut)
	     ];

	view.dragging = true;
	view.dragStartPos = {x: event.clientX,
			     y: event.clientY};
	view.winStartPos = view.getPosition();

	document.body.style.cursor = "url(\"closedhand.cur\"), move";
	view.elem.style.cursor = "url(\"closedhand.cur\"), move";
    };

    dojo.connect(view.elem, "mousedown", view.mouseDown);

    dojo.connect(view.elem, "dblclick", function(event) {
	    if (view.dragging) return;
	    if ("animation" in view) return;
	    var zoomLoc = (event.pageX - dojo.coords(view.elem, true).x) / view.dim.width;
	    if (event.shiftKey) {
		view.zoomOut(event, zoomLoc, 2);
	    } else {
		view.zoomIn(event, zoomLoc, 2);
	    }
	    dojo.stopEvent(event);
	});

    view.afterSlide = function() {
	view.showCoarse();
        view.scrollUpdate();
	view.showVisibleBlocks(true);
    };

    view.zoomCallback = function() { view.zoomUpdate(); };

    var wheelScrollTimeout = null;
    var wheelScrollUpdate = function() {
	view.showVisibleBlocks(true);
	wheelScrollTimeout = null;
    };

    view.wheelScroll = function(e) {
	var oldY = view.getY();
        // arbitrary 60 pixel vertical movement per scroll wheel event
	var newY = Math.min(Math.max(0, oldY - 60 * Util.wheel(e)),
			    view.containerHeight - view.dim.height);
	view.setY(newY);

	//the timeout is so that we don't have to run showVisibleBlocks
	//for every scroll wheel click (we just wait until so many ms
	//after the last one).
	if (wheelScrollTimeout)
	    clearTimeout(wheelScrollTimeout);
        // 100 milliseconds since the last scroll event is an arbitrary
        // cutoff for deciding when the user is done scrolling
        // (set by a bit of experimentation)
	wheelScrollTimeout = setTimeout(wheelScrollUpdate, 100);
	dojo.stopEvent(e);
    };

    dojo.connect(view.scrollContainer, "mousewheel",
                 view.wheelScroll, false);

    dojo.connect(view.scrollContainer, "DOMMouseScroll",
                 view.wheelScroll, false);

    var trackDiv = document.createElement("div");
    trackDiv.className = "track";
    trackDiv.style.height = this.posHeight + "px";
    trackDiv.id = "static_track";
    this.staticTrack = new StaticTrack("static_track", "pos-label", this.posHeight);
    this.staticTrack.setViewInfo(function(height) {}, this.stripeCount,
                                 trackDiv, undefined, this.stripePercent,
                                 this.stripeWidth, this.pxPerBp);
    this.zoomContainer.appendChild(trackDiv);
    this.waitElems.push(trackDiv);

    var gridTrackDiv = document.createElement("div");
    gridTrackDiv.className = "track";
    gridTrackDiv.style.cssText = "top: 0px; height: 100%;";
    gridTrackDiv.id = "gridtrack";
    var gridTrack = new GridTrack("gridtrack");
    gridTrack.setViewInfo(function(height) {}, this.stripeCount,
                          gridTrackDiv, undefined, this.stripePercent,
                          this.stripeWidth, this.pxPerBp);
    this.zoomContainer.appendChild(gridTrackDiv);

    this.uiTracks = [this.staticTrack, gridTrack];

    dojo.forEach(this.uiTracks, function(track) {
        track.showRange(0, this.stripeCount - 1,
                        Math.round(this.pxToBp(this.offset)),
                        Math.round(this.stripeWidth / this.pxPerBp),
                        this.pxPerBp);
    }, this);

    this.zoomContainer.style.paddingTop = this.topSpace + "px";

    this.addOverviewTrack(new StaticTrack("overview_loc_track", "overview-pos", this.overviewPosHeight));

    document.body.style.cursor = "url(\"closedhand.cur\")";
    document.body.style.cursor = "default";

    this.showFine();
    this.showCoarse();
}

/* moves the view by (distance times the width of the view) pixels */
GenomeView.prototype.slide = function(distance) {
    if (this.animation) this.animation.stop();
    this.trimVertical();
    // slide for an amount of time that's a function of the distance being
    // traveled plus an arbitrary extra 200 milliseconds so that
    // short slides aren't too fast (200 chosen by experimentation)
    new Slider(this,
               this.afterSlide,
               Math.abs(distance) * this.dim.width * this.slideTimeMultiple + 200,
               distance * this.dim.width);
};

GenomeView.prototype.highlightRegions = function(regionList) {
};

GenomeView.prototype.setLocation = function(refseq, startbp, endbp) {
    if (startbp === undefined) startbp = this.minVisible();
    if (endbp === undefined) endbp = this.maxVisible();
    if ((startbp < refseq.start) || (startbp > refseq.end))
        startbp = refseq.start;
    if ((endbp < refseq.start) || (endbp > refseq.end))
        endbp = refseq.end;

    if (this.ref != refseq) {
	this.ref = refseq;
	var removeTrack = function(track) {
            if (track.div && track.div.parentNode)
                track.div.parentNode.removeChild(track.div);
	};
	dojo.forEach(this.tracks, removeTrack);
        dojo.forEach(this.uiTracks, function(track) { track.clear(); });
	this.overviewTrackIterate(removeTrack);

	this.addOverviewTrack(new StaticTrack("overview_loc_track", "overview-pos", this.overviewPosHeight));
        this.sizeInit();
        this.setY(0);
        this.containerHeight = this.topSpace;
    }
    this.pxPerBp = Math.min(this.dim.width / (endbp - startbp), this.charWidth);
    this.curZoom = Util.findNearest(this.zoomLevels, this.pxPerBp);
    if (Math.abs(this.pxPerBp - this.zoomLevels[this.zoomLevels.length - 1]) < 0.2) {
        //the cookie-saved location is in round bases, so if the saved
        //location was at the highest zoom level, the new zoom level probably
        //won't be exactly at the highest zoom (which is necessary to trigger
        //the sequence track), so we nudge the zoom level to be exactly at
        //the highest level if it's close.
        //Exactly how close is arbitrary; 0.2 was chosen to be close
        //enough that people wouldn't notice if we fudged that much.
        console.log("nudging zoom level from %d to %d", this.pxPerBp, this.zoomLevels[this.zoomLevels.length - 1]);
        this.pxPerBp = this.zoomLevels[this.zoomLevels.length - 1];
    }
    this.stripeWidth = (this.stripeWidthForZoom(this.curZoom) / this.zoomLevels[this.curZoom]) * this.pxPerBp;
    this.instantZoomUpdate();

    this.centerAtBase((startbp + endbp) / 2, true);
};

GenomeView.prototype.stripeWidthForZoom = function(zoomLevel) {
    if ((this.zoomLevels.length - 1) == zoomLevel) {
        return this.fullZoomStripe;
    } else if (0 == zoomLevel) {
        return this.minZoomStripe;
    } else {
        return this.regularStripe;
    }
};

GenomeView.prototype.instantZoomUpdate = function() {
    this.scrollContainer.style.width =
        (this.stripeCount * this.stripeWidth) + "px";
    this.zoomContainer.style.width =
        (this.stripeCount * this.stripeWidth) + "px";
    this.maxOffset =
        this.bpToPx(this.ref.end) - this.stripeCount * this.stripeWidth;
    this.maxLeft = this.bpToPx(this.ref.end) - this.dim.width;
    this.minLeft = this.bpToPx(this.ref.start);
};

GenomeView.prototype.centerAtBase = function(base, instantly) {
    base = Math.min(Math.max(base, this.ref.start), this.ref.end);
    if (instantly) {
	var pxDist = this.bpToPx(base);
	var containerWidth = this.stripeCount * this.stripeWidth;
	var stripesLeft = Math.floor((pxDist - (containerWidth / 2)) / this.stripeWidth);
	this.offset = stripesLeft * this.stripeWidth;
	this.setX(pxDist - this.offset - (this.dim.width / 2));
	this.trackIterate(function(track) { track.clear(); });
	this.showVisibleBlocks(true);
        this.showCoarse();
    } else {
	var startbp = this.pxToBp(this.x + this.offset);
	var halfWidth = (this.dim.width / this.pxPerBp) / 2;
	var endbp = startbp + halfWidth + halfWidth;
	var center = startbp + halfWidth;
	if ((base >= (startbp  - halfWidth))
	    && (base <= (endbp + halfWidth))) {
	    //we're moving somewhere nearby, so move smoothly
            if (this.animation) this.animation.stop();
            var distance = (center - base) * this.pxPerBp;
	    this.trimVertical();
            // slide for an amount of time that's a function of the
            // distance being traveled plus an arbitrary extra 200
            // milliseconds so that short slides aren't too fast
            // (200 chosen by experimentation)
            new Slider(this, this.afterSlide,
                       Math.abs(distance) * this.slideTimeMultiple + 200,
		       distance);
	} else {
	    //we're moving far away, move instantly
	    this.centerAtBase(base, true);
	}
    }
};

GenomeView.prototype.minVisible = function() {
    return this.pxToBp(this.x + this.offset);
};

GenomeView.prototype.maxVisible = function() {
    return this.pxToBp(this.x + this.offset + this.dim.width);
};

GenomeView.prototype.showFine = function() {
    this.onFineMove(this.minVisible(), this.maxVisible());
};
GenomeView.prototype.showCoarse = function() {
    this.onCoarseMove(this.minVisible(), this.maxVisible());
};

GenomeView.prototype.onFineMove = function() {};
GenomeView.prototype.onCoarseMove = function() {};

GenomeView.prototype.thumbMoved = function(mover) {
    var pxLeft = parseInt(this.locationThumb.style.left);
    var pxWidth = parseInt(this.locationThumb.style.width);
    var pxCenter = pxLeft + (pxWidth / 2);
    this.centerAtBase(((pxCenter / this.overviewBox.w) * (this.ref.end - this.ref.start)) + this.ref.start);
};

GenomeView.prototype.checkY = function(y) {
    return Math.min((y < 0 ? 0 : y), this.containerHeight - this.dim.height);
};

GenomeView.prototype.updatePosLabels = function(newY) {
    if (newY === undefined) newY = this.getY();
    this.staticTrack.div.style.top = newY + "px";
};

GenomeView.prototype.updateTrackLabels = function(newX) {
    if (newX === undefined) newX = this.getX();
    for (var i = 0; i < this.trackLabels.length; i++)
        this.trackLabels[i].style.left = newX + "px";
};

GenomeView.prototype.showWait = function() {
    var oldCursors = [];
    for (var i = 0; i < this.waitElems.length; i++) {
        oldCursors[i] = this.waitElems[i].style.cursor;
        this.waitElems[i].style.cursor = "wait";
    }
    this.prevCursors.push(oldCursors);
};

GenomeView.prototype.showDone = function() {
    var oldCursors = this.prevCursors.pop();
    for (var i = 0; i < this.waitElems.length; i++) {
        this.waitElems[i].style.cursor = oldCursors[i];
    }
};

GenomeView.prototype.pxToBp = function(pixels) {
    return pixels / this.pxPerBp;
};

GenomeView.prototype.bpToPx = function(bp) {
    return bp * this.pxPerBp;
};

GenomeView.prototype.sizeInit = function() {
    this.dim = {width: this.elem.clientWidth,
                height: this.elem.clientHeight};
    this.overviewBox = dojo.marginBox(this.overview);

    //scale values, in pixels per bp, for all zoom levels
    this.zoomLevels = [1/500000, 1/200000, 1/100000, 1/50000, 1/20000, 1/10000, 1/5000, 1/2000, 1/1000, 1/500, 1/200, 1/100, 1/50, 1/20, 1/10, 1/5, 1/2, 1, 2, 5, this.charWidth];
    //make sure we don't zoom out too far
    while (((this.ref.end - this.ref.start) * this.zoomLevels[0])
           < this.dim.width) {
        this.zoomLevels.shift();
    }
    this.zoomLevels.unshift(this.dim.width / (this.ref.end - this.ref.start));

    //width, in pixels, of stripes at min zoom (so the view covers
    //the whole ref seq)
    this.minZoomStripe = this.regularStripe * (this.zoomLevels[0] / this.zoomLevels[1]);

    this.curZoom = 0;
    while (this.pxPerBp > this.zoomLevels[this.curZoom])
        this.curZoom++;
    this.maxLeft = this.bpToPx(this.ref.end) - this.dim.width;

    delete this.stripePercent;
    //25, 50, 100 don't work as well due to the way scrollUpdate works
    var possiblePercents = [20, 10, 5, 4, 2, 1];
    for (var i = 0; i < possiblePercents.length; i++) {
        // we'll have (100 / possiblePercents[i]) stripes.
        // multiplying that number of stripes by the minimum stripe width
        // gives us the total width of the "container" div.
        // (or what that width would be if we used possiblePercents[i]
        // as our stripePercent)
        // That width should be wide enough to make sure that the user can
        // scroll at least one page-width in either direction without making
        // the container div bump into the edge of its parent element, taking
        // into account the fact that the container won't always be perfectly
        // centered (it may be as much as 1/2 stripe width off center)
        // So, (this.dim.width * 3) gives one screen-width on either side,
        // and we add a regularStripe width to handle the slightly off-center
        // cases.
        // The minimum stripe width is going to be halfway between
        // "canonical" zoom levels; the widest distance between those
        // zoom levels is 2.5-fold, so halfway between them is 0.7 times
        // the stripe width at the higher zoom level
        if (((100 / possiblePercents[i]) * (this.regularStripe * 0.7))
            > ((this.dim.width * 3) + this.regularStripe)) {
            this.stripePercent = possiblePercents[i];
            break;
        }
    }

    if (this.stripePercent === undefined) {
	console.warn("stripeWidth too small: " + this.stripeWidth + ", " + this.dim.width);
	this.stripePercent = 1;
    }

    var oldX;
    var oldStripeCount = this.stripeCount;
    if (oldStripeCount) oldX = this.getX();
    this.stripeCount = Math.round(100 / this.stripePercent);

    this.scrollContainer.style.width =
        (this.stripeCount * this.stripeWidth) + "px";
    this.zoomContainer.style.width =
        (this.stripeCount * this.stripeWidth) + "px";

    var blockDelta = undefined;
    if (oldStripeCount && (oldStripeCount != this.stripeCount)) {
        blockDelta = Math.floor((oldStripeCount - this.stripeCount) / 2);
        var delta = (blockDelta * this.stripeWidth);
        var newX = this.getX() - delta;
        this.offset += delta;
        this.updateTrackLabels(newX);
        this.rawSetX(newX);
    }

    this.trackIterate(function(track, view) {
                          track.sizeInit(view.stripeCount,
                                         view.stripePercent,
                                         blockDelta);
                      });

    var newHeight = parseInt(this.scrollContainer.style.height);
    newHeight = (newHeight > this.dim.height ? newHeight : this.dim.height);

    this.scrollContainer.style.height = newHeight + "px";
    this.containerHeight = newHeight;

    var refLength = this.ref.end - this.ref.start;
    var posSize = document.createElement("div");
    posSize.className = "overview-pos";
    posSize.appendChild(document.createTextNode(Util.addCommas(this.ref.end)));
    posSize.style.visibility = "hidden";
    this.overview.appendChild(posSize);
    // we want the stripes to be at least as wide as the position labels,
    // plus an arbitrary 20% padding so it's clear which grid line
    // a position label corresponds to.
    var minStripe = posSize.clientWidth * 1.2;
    this.overviewPosHeight = posSize.clientHeight;
    this.overview.removeChild(posSize);
    for (var n = 1; n < 30; n++) {
	//http://research.att.com/~njas/sequences/A051109
        // JBrowse uses this sequence (1, 2, 5, 10, 20, 50, 100, 200, 500...)
        // as its set of zoom levels.  That gives nice round numbers for
        // bases per block, and it gives zoom transitions that feel about the
        // right size to me. -MS
	this.overviewStripeBases = (Math.pow(n % 3, 2) + 1) * Math.pow(10, Math.floor(n/3));
	this.overviewStripes = Math.ceil(refLength / this.overviewStripeBases);
	if ((this.overviewBox.w / this.overviewStripes) > minStripe) break;
	if (this.overviewStripes < 2) break;
    }

    var overviewStripePct = 100 / (refLength / this.overviewStripeBases);
    var overviewHeight = 0;
    this.overviewTrackIterate(function (track, view) {
	    track.clear();
	    track.sizeInit(view.overviewStripes,
			   overviewStripePct);
            track.showRange(0, view.overviewStripes - 1,
                            0, view.overviewStripeBases,
                            view.overviewBox.w /
                            (view.ref.end - view.ref.start));
	});
    this.updateOverviewHeight();
};

GenomeView.prototype.overviewTrackIterate = function(callback) {
    var overviewTrack = this.overview.firstChild;
    do {
        if (overviewTrack && overviewTrack.track)
	    callback(overviewTrack.track, this);
    } while (overviewTrack && (overviewTrack = overviewTrack.nextSibling));
};

GenomeView.prototype.updateOverviewHeight = function(trackName, height) {
    var overviewHeight = 0;
    this.overviewTrackIterate(function (track, view) {
	    overviewHeight += track.height;
	});
    this.overview.style.height = overviewHeight + "px";
    this.overviewBox = dojo.marginBox(this.overview);
};

GenomeView.prototype.addOverviewTrack = function(track) {
    var refLength = this.ref.end - this.ref.start;

    var overviewStripePct = 100 / (refLength / this.overviewStripeBases);
    var trackDiv = document.createElement("div");
    trackDiv.className = "track";
    trackDiv.style.height = this.overviewBox.h + "px";
    trackDiv.style.left = (((-this.ref.start) / refLength) * this.overviewBox.w) + "px";
    trackDiv.id = "overviewtrack_" + track.name;
    trackDiv.track = track;
    var view = this;
    var heightUpdate = function(height) {
        view.updateOverviewHeight();
    };
    track.setViewInfo(heightUpdate, this.overviewStripes, trackDiv,
		      undefined,
		      overviewStripePct,
		      this.overviewStripeBases,
                      this.pxPerBp);
    this.overview.appendChild(trackDiv);
    this.updateOverviewHeight();

    return trackDiv;
};

GenomeView.prototype.trimVertical = function(y) {
    if (y === undefined) y = this.getY();
    var trackBottom;
    var trackTop = this.topSpace;
    var bottom = y + this.dim.height;
    for (var i = 0; i < this.tracks.length; i++) {
        if (this.tracks[i].shown) {
            trackBottom = trackTop + this.trackHeights[i];
            if (!((trackBottom > y) && (trackTop < bottom))) {
                this.tracks[i].hideAll();
            }
            trackTop = trackBottom + this.trackPadding;
        }
    }
};

GenomeView.prototype.zoomIn = function(e, zoomLoc, steps) {
    if (this.animation) return;
    if (zoomLoc === undefined) zoomLoc = 0.5;
    if (steps === undefined) steps = 1;
    steps = Math.min(steps, (this.zoomLevels.length - 1) - this.curZoom);
    if (0 == steps) return;

    this.showWait();
    var pos = this.getPosition();
    this.trimVertical(pos.y);

    var scale = this.zoomLevels[this.curZoom + steps] / this.pxPerBp;
    var fixedBp = this.pxToBp(pos.x + this.offset + (zoomLoc * this.dim.width));
    this.curZoom += steps;
    this.pxPerBp = this.zoomLevels[this.curZoom];
    this.maxLeft = (this.pxPerBp * this.ref.end) - this.dim.width;

    for (var track = 0; track < this.tracks.length; track++)
	this.tracks[track].startZoom(this.pxPerBp,
				     fixedBp - ((zoomLoc * this.dim.width)
                                                / this.pxPerBp),
				     fixedBp + (((1 - zoomLoc) * this.dim.width)
                                                / this.pxPerBp));
	//YAHOO.log("centerBp: " + centerBp + "; estimated post-zoom start base: " + (centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp)) + ", end base: " + (centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp)));

    var thisObj = this;
    // Zooms take an arbitrary 700 milliseconds, which feels about right
    // to me, although if the zooms were smoother they could probably
    // get faster without becoming off-putting. -MS
    new Zoomer(scale, this,
               function() {thisObj.zoomUpdate(zoomLoc, fixedBp);},
               700, zoomLoc);
};

GenomeView.prototype.zoomOut = function(e, zoomLoc, steps) {
    if (this.animation) return;
    if (steps === undefined) steps = 1;
    steps = Math.min(steps, this.curZoom);
    if (0 == steps) return;

    this.showWait();
    var pos = this.getPosition();
    this.trimVertical(pos.y);
    if (zoomLoc === undefined) zoomLoc = 0.5;
    var scale = this.zoomLevels[this.curZoom - steps] / this.pxPerBp;
    var edgeDist = this.bpToPx(this.ref.end) - (this.offset + pos.x + this.dim.width);
        //zoomLoc is a number on [0,1] that indicates
        //the fixed point of the zoom
    zoomLoc = Math.max(zoomLoc, 1 - (((edgeDist * scale) / (1 - scale)) / this.dim.width));
    edgeDist = pos.x + this.offset - this.bpToPx(this.ref.start);
    zoomLoc = Math.min(zoomLoc, ((edgeDist * scale) / (1 - scale)) / this.dim.width);
    var fixedBp = this.pxToBp(pos.x + this.offset + (zoomLoc * this.dim.width));
    this.curZoom -= steps;
    this.pxPerBp = this.zoomLevels[this.curZoom];

    for (var track = 0; track < this.tracks.length; track++)
	this.tracks[track].startZoom(this.pxPerBp,
				     fixedBp - ((zoomLoc * this.dim.width)
                                                / this.pxPerBp),
				     fixedBp + (((1 - zoomLoc) * this.dim.width)
                                                / this.pxPerBp));

	//YAHOO.log("centerBp: " + centerBp + "; estimated post-zoom start base: " + (centerBp - ((zoomLoc * this.dim.width) / this.pxPerBp)) + ", end base: " + (centerBp + (((1 - zoomLoc) * this.dim.width) / this.pxPerBp)));
    this.minLeft = this.pxPerBp * this.ref.start;

    var thisObj = this;
    // Zooms take an arbitrary 700 milliseconds, which feels about right
    // to me, although if the zooms were smoother they could probably
    // get faster without becoming off-putting. -MS
    new Zoomer(scale, this,
               function() {thisObj.zoomUpdate(zoomLoc, fixedBp);},
               700, zoomLoc);
};

GenomeView.prototype.zoomUpdate = function(zoomLoc, fixedBp) {
    var eWidth = this.elem.clientWidth;
    var centerPx = this.bpToPx(fixedBp) - (zoomLoc * eWidth) + (eWidth / 2);
    this.stripeWidth = this.stripeWidthForZoom(this.curZoom);
    this.scrollContainer.style.width =
        (this.stripeCount * this.stripeWidth) + "px";
    this.zoomContainer.style.width =
        (this.stripeCount * this.stripeWidth) + "px";
    var centerStripe = Math.round(centerPx / this.stripeWidth);
    var firstStripe = (centerStripe - ((this.stripeCount) / 2)) | 0;
    this.offset = firstStripe * this.stripeWidth;
    this.maxOffset = this.bpToPx(this.ref.end) - this.stripeCount * this.stripeWidth;
    this.maxLeft = this.bpToPx(this.ref.end) - this.dim.width;
    this.minLeft = this.bpToPx(this.ref.start);
    this.zoomContainer.style.left = "0px";
    this.setX((centerPx - this.offset) - (eWidth / 2));
    dojo.forEach(this.uiTracks, function(track) { track.clear(); });
    for (var track = 0; track < this.tracks.length; track++)
	this.tracks[track].endZoom(this.pxPerBp, Math.round(this.stripeWidth / this.pxPerBp));
    //YAHOO.log("post-zoom start base: " + this.pxToBp(this.offset + this.getX()) + ", end base: " + this.pxToBp(this.offset + this.getX() + this.dim.width));
    this.showVisibleBlocks(true);
    this.showDone();
    this.showCoarse();
};

GenomeView.prototype.scrollUpdate = function() {
    var x = this.getX();
    var numStripes = this.stripeCount;
    var cWidth = numStripes * this.stripeWidth;
    var eWidth = this.dim.width;
    //dx: horizontal distance between the centers of
    //this.scrollContainer and this.elem
    var dx = (cWidth / 2) - ((eWidth / 2) + x);
    //If dx is negative, we add stripes on the right, if positive,
    //add on the left.
    //We remove stripes from the other side to keep cWidth the same.
    //The end goal is to minimize dx while making sure the surviving
    //stripes end up in the same place.

    var dStripes = (dx / this.stripeWidth) | 0;
    if (0 == dStripes) return;
    var changedStripes = Math.abs(dStripes);

    var newOffset = this.offset - (dStripes * this.stripeWidth);

    if (this.offset == newOffset) return;
    this.offset = newOffset;

    this.trackIterate(function(track) { track.moveBlocks(dStripes); });

    var newX = x + (dStripes * this.stripeWidth);
    this.updateTrackLabels(newX);
    this.rawSetX(newX);
    var firstVisible = (newX / this.stripeWidth) | 0;
};

GenomeView.prototype.trackHeightUpdate = function(trackName, height) {
    var y = this.getY();
    if (! trackName in this.trackIndices) return;
    var track = this.trackIndices[trackName];
    if (Math.abs(height - this.trackHeights[track]) < 1) return;

    //console.log("trackHeightUpdate: " + trackName + " " + this.trackHeights[track] + " -> " + height);
    // if the bottom of this track is a above the halfway point,
    // and we're not all the way at the top,
    if ((((this.trackTops[track] + this.trackHeights[track]) - y)
         <  (this.dim.height / 2))
        && (y > 0) ) {
        // scroll so that lower tracks stay in place on screen
        this.setY(y + (height - this.trackHeights[track]));
        //console.log("track " + trackName + ": " + this.trackHeights[track] + " -> " + height + "; y: " + y + " -> " + this.getY());
    }
    this.trackHeights[track] = height;
    this.tracks[track].div.style.height = (height + this.trackPadding) + "px";
    var nextTop = this.trackTops[track];
    if (this.tracks[track].shown) nextTop += height + this.trackPadding;
    for (var i = track + 1; i < this.tracks.length; i++) {
        this.trackTops[i] = nextTop;
        this.tracks[i].div.style.top = nextTop + "px";
        if (this.tracks[i].shown)
            nextTop += this.trackHeights[i] + this.trackPadding;
    }
    this.containerHeight = Math.max(nextTop, this.getY() + this.dim.height);
    this.scrollContainer.style.height = this.containerHeight + "px";
};

GenomeView.prototype.showVisibleBlocks = function(updateHeight, pos, startX, endX) {
    if (pos === undefined) pos = this.getPosition();
    if (startX === undefined) startX = pos.x - (this.drawMargin * this.dim.width);
    if (endX === undefined) endX = pos.x + ((1 + this.drawMargin) * this.dim.width);
    var leftVisible = Math.max(0, (startX / this.stripeWidth) | 0);
    var rightVisible = Math.min(this.stripeCount - 1,
                               (endX / this.stripeWidth) | 0);

    var bpPerBlock = Math.round(this.stripeWidth / this.pxPerBp);

    var startBase = Math.round(this.pxToBp((leftVisible * this.stripeWidth)
                                           + this.offset));
    var containerStart = Math.round(this.pxToBp(this.offset));
    var containerEnd =
        Math.round(this.pxToBp(this.offset
                               + (this.stripeCount * this.stripeWidth)));

    this.trackIterate(function(track, view) {
                          track.showRange(leftVisible, rightVisible,
                                          startBase, bpPerBlock,
                                          view.pxPerBp,
                                          containerStart, containerEnd);
                      });
};

GenomeView.prototype.addTrack = function(track) {
    var trackNum = this.tracks.length;
    var labelDiv = document.createElement("div");
    labelDiv.className = "track-label dojoDndHandle";
    labelDiv.id = "label_" + track.name;
    this.trackLabels.push(labelDiv);
    var trackDiv = document.createElement("div");
    trackDiv.className = "track";
    trackDiv.id = "track_" + track.name;
    trackDiv.track = track;
    var view = this;
    var heightUpdate = function(height) {
        view.trackHeightUpdate(track.name, height);
    };
    track.setViewInfo(heightUpdate, this.stripeCount, trackDiv, labelDiv,
		      this.stripePercent, this.stripeWidth,
                      this.pxPerBp);

    labelDiv.style.position = "absolute";
    labelDiv.style.top = "0px";
    labelDiv.style.left = this.getX() + "px";
    trackDiv.appendChild(labelDiv);

    return trackDiv;
};

GenomeView.prototype.trackIterate = function(callback) {
    var i;
    for (i = 0; i < this.uiTracks.length; i++)
        callback(this.uiTracks[i], this);
    for (i = 0; i < this.tracks.length; i++)
        callback(this.tracks[i], this);
};

/* this function must be called whenever tracks in the GenomeView
 * are added, removed, or reordered
 */
GenomeView.prototype.updateTrackList = function() {
    var tracks = [];
    // after a track has been dragged, the DOM is the only place
    // that knows the new ordering
    var containerChild = this.zoomContainer.firstChild;
    do {
        // this test excludes UI tracks, whose divs don't have a track property
        if (containerChild.track) tracks.push(containerChild.track);
    } while ((containerChild = containerChild.nextSibling));
    this.tracks = tracks;

    var newIndices = {};
    var newHeights = new Array(this.tracks.length);
    for (var i = 0; i < tracks.length; i++) {
        newIndices[tracks[i].name] = i;
        if (tracks[i].name in this.trackIndices) {
            newHeights[i] = this.trackHeights[this.trackIndices[tracks[i].name]];
        } else {
            newHeights[i] = 0;
        }
        this.trackIndices[tracks[i].name] = i;
    }
    this.trackIndices = newIndices;
    this.trackHeights = newHeights;
    var nextTop = this.topSpace;
    for (var i = 0; i < this.tracks.length; i++) {
        this.trackTops[i] = nextTop;
        this.tracks[i].div.style.top = nextTop + "px";
        if (this.tracks[i].shown)
            nextTop += this.trackHeights[i] + this.trackPadding;
    }
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
