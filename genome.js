// Depends:   prototype.js (1.5.0)

var container;
var dragWindow;

var dragStartX;
var dragStartY;
var winStartX;
var winStartY;

var slideStart;
var slideIndex;
var slideSteps;
var slideID = undefined;
var slideDistance;

var curAnim;

var is_ie6, is_ie;

var dragMove;
var slide;
var slideStarter;

function init() {
    is_ie6 = navigator.appVersion.indexOf('MSIE 6') >= 0;
    is_ie = navigator.appVersion.indexOf('MSIE') >= 0;

    var zoomSteps = 15;

    dragMove = scrollDragMove;
    slide = scrollSlide;
    slideStarter = scrollSlideStarter
    Zoomer.prototype.zoom = scrollZoom;
    if (is_ie) {
        dragMove = posDragMove;
        slide = posSlide;
        slideStarter = posSlideStarter
        Zoomer.prototype.zoom = posZoom;
        zoomSteps = 3;
    }

    dragWindow = $("dragWindow");
    container = $("container");
    Event.observe(dragWindow, "mousedown", dragStart);

    Event.observe("moveLeft", "click", slideStarter(40, 800));
    Event.observe("moveRight", "click", slideStarter(40, -800));
    Event.observe("stepLeft", "click", slideStarter(20, 400));
    Event.observe("stepRight", "click", slideStarter(20, -400));

    Event.observe("zoomIn", "click", zoomStarter(5, "container",
                                                 dragWindow, zoomSteps));
    Event.observe("zoomOut", "click", zoomStarter(1/5, "container",
                                                  dragWindow, zoomSteps));

    Event.observe("makeDivs", "click", makeDivs);


    makeDivs();
}

function Zoomer(scale, toZoom, toScroll, steps) {
    this.toZoom = toZoom;
    this.toScroll = toScroll;

    this.zero = toZoom.scrollWidth * Math.min(1, scale);
    this.one = toZoom.scrollWidth * Math.max(1, scale);
    this.mult = this.one - this.zero;
    this.zoomingIn = scale > 1;
    this.steps = steps
}

function posZoom(index) {
    var zoomFraction = (this.zoomingIn ? index : (this.steps - index)) / this.steps;
    var center =
        (-parseInt(this.toZoom.style.left)
         + ((this.toScroll.offsetWidth - 2) / 2))
        / this.toZoom.scrollWidth;
    newWidth = ((zoomFraction * zoomFraction) * this.mult) + this.zero;
    newLeft = (this.toScroll.offsetWidth / 2) - (center * newWidth);
    newLeft = Math.min(newLeft, 0);
    this.toZoom.style.width = newWidth + "px";
    this.toZoom.style.left = newLeft + "px";
}

function scrollZoom(index) {
    var zoomFraction = (this.zoomingIn ? index : (this.steps - index)) / this.steps;
    var center =
        (this.toScroll.scrollLeft
         + ((this.toScroll.offsetWidth - 2) / 2))
        / this.toZoom.scrollWidth;
    newWidth = ((zoomFraction * zoomFraction) * this.mult) + this.zero;
    newLeft = (center * newWidth)  - (this.toScroll.offsetWidth / 2);
    newLeft = Math.min(newLeft, newWidth - this.toScroll.offsetWidth);
    this.toZoom.style.width = newWidth + "px";
    this.toScroll.scrollLeft = newLeft;
}

function zoomStarter(scale, toZoomID, toScroll, steps) {
    return function() {
        if (undefined != curAnim) clearInterval(curAnim);
        var index = 1;
        var zoomer = new Zoomer(scale, $(toZoomID), toScroll, steps);
        var zoom = function() {
            if (index <= steps) {
                zoomer.zoom(index);
                index++;
            } else {
                clearInterval(curAnim);
                curAnim = undefined;
            }
        }
        curAnim = setInterval(zoom, 25);
    }
}

function featureClick(ev) {
    var elem = Event.element(ev);
    alert("element ID: " + elem.db_id);
    Event.stop(ev);
}

classNames = ["feature", "topbracket", "hourglass", "bottombracket", "ibeam", "dblhelix", "helix", "loops", "plus-pacman", "plus-cds1", "plus-cds2", "plus-cds3", "minus-cds1", "minus-cds2", "minus-cds3"];

function makeDivs() {
    var oldContainer = $("container");
    container = document.createElement("div");
    container.id = "container";
    container.className = "container";

    var numDivs = parseInt($("numDivs").value);
    container.style.cssText = "left: 0px; top: 0px; width: " + (numDivs + 30) + "px; height: 700px";
    container.appendChild(document.createTextNode(" "));


    var elem;
    var shift = 0;
    for (i = 0; i < numDivs; i++) {
        elem = document.createElement("div");
        elem.id = i;
        elem.db_id = "feature_" + i;
        Event.observe(elem, "click", featureClick);
        elem.className = classNames[(i % 30) % classNames.length];
	var width = (70 / (numDivs / 30)) + "%";
	if ("hourglass" == elem.className) width = "0px";
        //if ("longarrow" == elem.className) {
        //    width = "0px";
	if (0 == (i % 90)) shift += 10;
        elem.style.cssText =
           "left: " + (((i % 30) + (i) + shift) / (numDivs / 100))
            + "%; top: " + ((i % 30) * 25) + "px; "
            + "width: " + width;
//             + "background-color: rgb("
//             + Math.round((Math.random() * 105) + (i % 150)) + ", "
//             + Math.round((Math.random() * 105) + (i % 150)) + ", "
//             + Math.round((Math.random() * 105) + (i % 150)) + ");";
        //if the div is empty, IE6 ignores the height you specify
        if (is_ie6) elem.appendChild(document.createComment(""));
              
        container.appendChild(elem);
    }
    dragWindow.replaceChild(container, oldContainer);
}

function scrollSlideStarter(steps, distance) {
    return function() {
        slideStart = dragWindow.scrollLeft;
        slideIndex = 0;
        slideSteps = steps;
        slideDistance = distance;
        if (undefined != slideID) clearInterval(slideID);
        slideID = setInterval(slide, 25);
    }
}

function posSlideStarter(steps, distance) {
    return function() {
        slideStart = parseInt(container.style.left);
        //slideStart = dragWindow.offsetLeft;
        slideIndex = 0;
        slideSteps = steps;
        slideDistance = distance;
        if (undefined != slideID) clearInterval(slideID);
        slideID = setInterval(slide, 25);
    }
}

function posSlide() {
    if (slideIndex <= slideSteps) {
	//var x = (2 * (slideIndex / slideSteps)) - 1;
        container.style.left =
	//    slideStart - (slideDistance * (3/4) * ((2/3) + x - ((x^3)/3)));
	    ((slideStart +
	     (slideDistance * 
	      //cos will go from 1 to -1, we want to go from 0 to 1
	      ((-0.5 * Math.cos((slideIndex / slideSteps) * Math.PI)) + 0.5)))
	     //truncate
	     | 0) + "px";
        slideIndex += 1;
    } else {
        clearInterval(slideID);
        slideID = undefined;
    }
}

function scrollSlide() {
    if (slideIndex <= slideSteps) {
	//var x = (2 * (slideIndex / slideSteps)) - 1;
        dragWindow.scrollLeft =
	//    slideStart - (slideDistance * (3/4) * ((2/3) + x - ((x^3)/3)));
	    ((slideStart -
	     (slideDistance * 
	      //cos will go from 1 to -1, we want to go from 0 to 1
	      ((-0.5 * Math.cos((slideIndex / slideSteps) * Math.PI)) + 0.5)))
	     //truncate
	     | 0);
        slideIndex += 1;
    } else {
        clearInterval(slideID);
        slideID = undefined;
    }
}

function checkDragOut(ev) {
    if ("HTML" == (ev.relatedTarget || ev.toElement).tagName) {
        dragEnd(ev);
    }
}

function dragStart(event) {
    if (!Event.isLeftClick(event)) return;
    Event.observe(dragWindow, "mouseup", dragEnd);
    Event.observe(dragWindow, "mousemove", dragMove);
    Event.observe(document.body, "mouseout", checkDragOut)

    dragStartX = Event.pointerX(event);
    dragStartY = Event.pointerY(event);

    if (is_ie) {
        winStartX = parseInt(container.style.left);
        winStartY = parseInt(container.style.top);
    } else {
        winStartX = dragWindow.scrollLeft;
        winStartY = dragWindow.scrollTop;
    }

    document.body.style.cursor = "url(\"closedhand.cur\"), move";
    dragWindow.style.cursor = "url(\"closedhand.cur\"), move";
}

function dragEnd(event) {
    Event.stopObserving(dragWindow, "mouseup", dragEnd);
    Event.stopObserving(dragWindow, "mousemove", dragMove);
    Event.stopObserving(document.body, "mouseout", checkDragOut)
    dragWindow.style.cursor = "url(\"openhand.cur\"), move";
    document.body.style.cursor = "default";
}

function posDragMove(e) {
    var deltaX = Event.pointerX(e) - dragStartX;
    var deltaY = Event.pointerY(e) - dragStartY;

    container.style.left = (winStartX + deltaX) + "px";
    container.style.top  = (winStartY + deltaY) + "px";
}

function scrollDragMove(e) {
    var deltaX = Event.pointerX(e) - dragStartX;
    var deltaY = Event.pointerY(e) - dragStartY;

    dragWindow.scrollLeft = (winStartX - deltaX);
    dragWindow.scrollTop = (winStartY - deltaY);
}
