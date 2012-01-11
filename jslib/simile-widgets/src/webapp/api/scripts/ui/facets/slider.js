 
Exhibit.SliderFacet.slider = function(div, facet, precision) {
    this._div = div;
    this._facet = facet;
    this._prec = precision || .1;
    this._maxRange = {min: parseFloat(Exhibit.Util.round(facet._maxRange.min-precision/2, this._prec)),  // round down
		   max: parseFloat(Exhibit.Util.round(facet._maxRange.max+precision/2, this._prec))}; // round up
    this._horizontal = this._facet._settings.horizontal;

    this._scaleFactor = null; // scale factor used for determining value from slider position
    this._slider1 = {};
    this._slider2 = {};

    this._dom = SimileAjax.DOM.createDOMFromString(
        div,
        '<div class="exhibit-slider-bar" id="bar">' +
	    '<div id="slider1"></div>' +
	    '<div id="slider2"></div>' +
	    (this._facet._settings.histogram? '<div class="exhibit-slider-histogram" id="histogram"></div>':'') +
	'</div>' +
	'<div class="exhibit-slider-display">' +
	(this._facet._settings.inputText? '<input type="text" id="minDisplay"></input> - <input type="text" id="maxDisplay"></input> '
	      : '<span id="minDisplay"></span> - <span id="maxDisplay"></span>')  +
	'</div>'
    );

    // sizing
    var horizontal = this._horizontal;
    var histogram = this._dom.histogram;

    if (horizontal && histogram) {             // horizontal and histogram
	this._dom.bar.style.height = '14px';
	this._dom.bar.style.width = '150px'
    }
    else if (horizontal && !histogram) {       // horizontal and no histogram
	this._dom.bar.style.height = '1px';
	this._dom.bar.style.width = '150px'
    }
    else if (!horizontal && histogram) {      // vertical and histogram
	this._dom.bar.style.height = '150px';
	this._dom.bar.style.width = '14px'
    }
    else {                                    // vertical and no histogram
	this._dom.bar.style.height = '150px';
	this._dom.bar.style.width = '1px'
    }

    if (this._facet._settings.height) {
	this._dom.bar.style.height = this._facet._settings.height+'px';
    }
    if (this._facet._settings.width) {
	this._dom.bar.style.width = this._facet._settings.width+'px';
    }
        
    if(histogram) {
	this._dom.histogram.style.height = this._dom.bar.offsetHeight+'px';
	this._dom.histogram.style.width = this._dom.bar.offsetWidth+'px';
    }

    if (horizontal) {
	this._scaleFactor = (this._maxRange.max - this._maxRange.min)/this._dom.bar.offsetWidth;
    } else {
	this._scaleFactor = (this._maxRange.max - this._maxRange.min)/this._dom.bar.offsetHeight;
    }

    // init sliders
    this._slider1 = new Exhibit.SliderFacet.slider.slider(this._dom.slider1, this);
    this._slider2 = new Exhibit.SliderFacet.slider.slider(this._dom.slider2, this);
    this._setSlider(this._slider1, this._maxRange.min);
    this._setSlider(this._slider2, this._maxRange.max);

    this._registerDragging();
    

    if (this._facet._settings.inputText) {
	this._registerInputs();
    }
    
};

// If you call this, it's up to you to notifyFacet if necessary
Exhibit.SliderFacet.slider.prototype.resetSliders = function(){ 
    this._setSlider(this._slider1, this._maxRange.min);
    this._setSlider(this._slider2, this._maxRange.max);
};

// If you call this, it's up to you to notifyFacet if necessary
Exhibit.SliderFacet.slider.prototype._setSlider = function(slider, value) {
    if (value > this._maxRange.max) {
	value = this._maxRange.max
    }
    else if (value < this._maxRange.min) {
	value = this._maxRange.min
    }

    value = parseFloat(Exhibit.Util.round(value, this._prec));

    slider.value = value;
    
    if (this._horizontal) {
	slider.div.style.left = ((value-this._maxRange.min)/this._scaleFactor-slider.offset) + 'px';
    } else {
	slider.div.style.top = ((value-this._maxRange.min)/this._scaleFactor-slider.offset) + 'px';
    }

    this._setDisplays(slider);
};

// If you call this, it's up to you to notifyFacet if necessary
Exhibit.SliderFacet.slider.prototype._setMin = function(value) {
    var slider = this._slider1.value < this._slider2.value? this._slider1 : this._slider2;
    var other = (slider == this._slider1)? this._slider2 : this._slider1;

    value = parseFloat(value);
    if (isNaN(value)) {
	return;
    }

    if (value > other.value) {
	value = other.value;
    }

    this._setSlider(slider, value);
};

// If you call this, it's up to you to notifyFacet if necessary
Exhibit.SliderFacet.slider.prototype._setMax = function(value) {
    var slider = this._slider1.value > this._slider2.value? this._slider1 : this._slider2;
    var other = (slider == this._slider1)? this._slider2 : this._slider1;

    value = parseFloat(value);
    if (isNaN(value)) {
	return;
    }

    if (value < other.value) {
	value = other.value;
    }

    this._setSlider(slider, value);
};

// Updates displays based on slider's value (i.e., slider's value should have changed recently)
Exhibit.SliderFacet.slider.prototype._setDisplays = function(slider) {
    var other = (slider == this._slider1)? this._slider2 : this._slider1;

    var min = Math.min(slider.value, other.value);
    var max = Math.max(slider.value, other.value);

    if (this._facet._settings.inputText) {
	this._dom.minDisplay.value = min;
	this._dom.maxDisplay.value = max;
    } else {
	this._dom.minDisplay.innerHTML = min;
	this._dom.maxDisplay.innerHTML = max;
    }
};

Exhibit.SliderFacet.slider.slider = function(div, self) { // individual slider handle that can be dragged
    var barEl = self._dom.bar;

    this.div = div; // containing div of handle

    if (self._horizontal) {
	this.div.className = "exhibit-slider-handle"; 
	this.div.style.backgroundImage = 'url("'+Exhibit.urlPrefix+'images/slider-handle.png")';
	this.offset = this.div.offsetWidth/2;
	this.min = -this.offset; // slider's middle can reach left edge of bar
	this.max = barEl.offsetWidth - this.offset; //slider's middle can reach right edge of bar
    } else {
	this.div.className = "exhibit-slider-handle2"; 
	this.div.style.backgroundImage = 'url("'+Exhibit.urlPrefix+'images/slider-handle2.png")';
	this.offset = this.div.offsetHeight/2;
	this.min = -this.offset; // slider's middle can reach left edge of bar
	this.max = barEl.offsetHeight - this.offset; //slider's middle can reach right edge of bar
    }

    if (self._facet._settings.histogram) {
	this.div.style.top = (barEl.offsetHeight-4)+'px';
    }
};


Exhibit.SliderFacet.slider.prototype._registerDragging = function() {
    var self = this;

    var startDrag = function(slider) {
	return function(e) {
	    e = e || window.event;
	    
	    var onMove = self._horizontal? onDragH(e, slider) : onDragV(e, slider);
	    
	    if (document.attachEvent) {
		document.attachEvent('onmousemove', onMove);
		document.attachEvent('onmouseup', endDrag(slider, onMove));
	    } else {
		document.addEventListener('mousemove', onMove, false);
		document.addEventListener('mouseup', endDrag(slider, onMove), false);
	    }

	    SimileAjax.DOM.cancelEvent(e);
	    return false;
	};
    };

    var onDragH = function(e, slider) {
	var origX = e.screenX;
	var origLeft = parseInt(slider.div.style.left);
	var min = slider.min;
	var max = slider.max;

	return function(e) {
	    e = e || window.event

	    var dx = e.screenX - origX;
	    var newLeft = origLeft + dx;
	    if (newLeft < min) {
		newLeft = min;
	    }
	    if (newLeft > max) {
		newLeft = max;
	    }
	    slider.div.style.left = newLeft + 'px';

	    //setTimeout keeps setDisplay from slowing down the dragging
	    //I'm not entirely sure why, but I think it might have something to do with it putting the call in a new environment
	    setTimeout(function(){ var position = parseInt(slider.div.style.left) + slider.offset;
		                   slider.value = parseFloat(Exhibit.Util.round(position*self._scaleFactor+self._maxRange.min, self._prec));
				   self._setDisplays(slider); }, 0);
	};
    };

    var onDragV = function(e, slider) {
	var origY = e.screenY;
	var origTop = parseInt(slider.div.style.top);
	var min = slider.min;
	var max = slider.max;

	return function(e) {
	    e = e || window.event

	    var dy = e.screenY - origY;
	    var newTop = origTop + dy;
	    if (newTop < min) {
		newTop = min;
	    }
	    if (newTop > max) {
		newTop = max;
	    }
	    slider.div.style.top = newTop + 'px';

	    //setTimeout keeps setDisplay from slowing down the dragging
	    //I'm not entirely sure why, but I think it might have something to do with it putting the call in a new environment
	    setTimeout(function(){ var position = parseInt(slider.div.style.top) + slider.offset;
		                   slider.value = parseFloat(Exhibit.Util.round(position*self._scaleFactor+self._maxRange.min, self._prec));
				   self._setDisplays(slider); }, 0);
	};
    };

    var endDrag = function(slider, moveListener) {
	return function(e) {
	    
	    if(document.detachEvent) {
		document.detachEvent('onmousemove', moveListener);
		document.detachEvent('onmouseup', arguments.callee);
	    } else {
		document.removeEventListener('mousemove', moveListener, false);
		document.removeEventListener('mouseup', arguments.callee, false); //remove this function
	    }

	    self._notifyFacet();
	};
    };

    var attachListeners = function(slider) {
	if (document.attachEvent) {
	    slider.div.attachEvent('onmousedown', startDrag(slider));
	} else {
	    slider.div.addEventListener('mousedown', startDrag(slider), false);
	}
    };

    attachListeners(this._slider1);
    attachListeners(this._slider2);
	
};


Exhibit.SliderFacet.slider.prototype._notifyFacet = function() {
    var val1 = this._slider1.value;
    var val2 = this._slider2.value;
    this._facet.changeRange( {min: Math.min(val1, val2), max: Math.max(val1, val2)} );
};


Exhibit.SliderFacet.slider.prototype.updateHistogram = function(data) {
    // data ([numbers]): the values to graphed (essentially specifies the relative height of each bar)
    // data.length = # of bars
    
    var n = data.length;
    var histogram = this._dom.histogram; //data = [0,1,2]; n = 4;

    var maxVal = Math.max.apply(Math, data); //find the max of an array
    if (!maxVal) {
	return; //nothing to draw
    }

    if (this._horizontal) {
	var width = histogram.offsetWidth/n;  // width of each bar
	var maxHeight = histogram.offsetHeight;
	var ratio = maxHeight/maxVal;
	
	histogram.innerHTML = ''; //clear histogram
	
	for (var i=0; i<n; i++){ // create new bars
	    var height = Math.ceil(data[i]*ratio); //ceil instead of round
	    //ensures any nonzero bar will show something
	    
	    var bar = document.createElement('div');
	    histogram.appendChild(bar);
	    bar.style.width = width+'px';
	    bar.style.height = height+'px';
	    bar.style.display = height? '' : 'none'; //IE, even with font-size:0, 
	                                             //will still render divs with height:0
	                                             //as several pixels tall
	    bar.style.position = 'absolute';
	    bar.style.top = (maxHeight-height)+'px';
	    bar.style.left = i*width+'px';
	    
	}
    } else {                                   // vertical (height and width are essentially flipped)
	var width = histogram.offsetHeight/n;  // width of each bar
	var maxHeight = histogram.offsetWidth;
	var ratio = maxHeight/maxVal;
	
	histogram.innerHTML = ''; //clear histogram
	
	for (var i=0; i<n; i++){ // create new bars
	    var height = Math.round(data[i]*ratio);
	    
	    var bar = document.createElement('div');
	    bar.style.height = width;
	    bar.style.width = height;
	    bar.style.position = 'absolute';
	    bar.style.left = 0;
	    bar.style.top = i*width;
	    
	    histogram.appendChild(bar);
	}
    }

};

Exhibit.SliderFacet.slider.prototype._registerInputs = function() {
    var self = this;

    if (document.attachEvent) {
	this._dom.minDisplay.attachEvent('onchange', function(e) {self._setMin(this.value); self._notifyFacet()});
	this._dom.maxDisplay.attachEvent('onchange', function(e) {self._setMax(this.value); self._notifyFacet()});
    } else {
	this._dom.minDisplay.addEventListener('change', function(e) {self._setMin(this.value); self._notifyFacet()}, false);
	this._dom.maxDisplay.addEventListener('change', function(e) {self._setMax(this.value); self._notifyFacet()}, false);
    }
};