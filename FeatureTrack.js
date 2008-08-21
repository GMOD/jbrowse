function SimpleFeatureTrack(trackMeta, refSeq, changeCallback, trackPadding) {
    //trackMeta: object with:
    //            key:   display text track name
    //            label: internal track name (no spaces, odd characters)
    //            url:   URL of the track's JSON file
    //refSeq: object with:
    //         start: refseq start
    //         end:   refseq end
    //changeCallback: function to call once JSON is loaded
    //trackPadding: distance in px between tracks

    Track.call(this, trackMeta.label, trackMeta.key, false, changeCallback);
    this.fields = {};
    this.features = new NCList();
    this.refSeq = refSeq;
    //number of histogram bins per block
    this.numBins = 25;
    this.histLabel = false;
    this.padding = 5;
    this.trackPadding = trackPadding;

    this.trackMeta = trackMeta;
    var curTrack = this;
    dojo.xhrGet({url: trackMeta.url, 
		 handleAs: "json",
		 load: function(o) { curTrack.loadSuccess(o); }
	});
}

SimpleFeatureTrack.prototype = new Track("");

SimpleFeatureTrack.prototype.loadSuccess = function(o) {
    var startTime = new Date().getTime();
    var trackInfo = o;
    this.count = trackInfo.featureCount;
    this.fields = {};
    for (var i = 0; i < trackInfo.map.length; i++) {
	this.fields[trackInfo.map[i]] = i;
    }
    this.features.importExisting(trackInfo.featureNCList, trackInfo.sublistIndex);
    this.histScale = 4 * (trackInfo.featureCount / this.refSeq.length);
    this.labelScale = 50 * (trackInfo.featureCount / this.refSeq.length);
    this.className = trackInfo.className;
    
    //console.log((new Date().getTime() - startTime) / 1000);

    var fields = this.fields;
    this.onFeatureClick = function(event) {
	event = event || window.event;
	if (event.shiftKey) return;
	var feat = (event.currentTarget || event.srcElement).feature;
	alert("clicked on feature\nstart: " + feat[fields["start"]] +
	      ", end: " + feat[fields["end"]] +
	      ", strand: " + feat[fields["strand"]] +
	      ", ID: " + feat[fields["name"]]);
    };

    this.setLoaded();
}

SimpleFeatureTrack.prototype.setViewInfo = function(numBlocks, trackDiv,
                                                    labelDiv, widthPct,
                                                    widthPx) {
    Track.prototype.setViewInfo.apply(this, [numBlocks, trackDiv, labelDiv,
                                             widthPct, widthPx]);
    this.setLabel(this.key);
}

SimpleFeatureTrack.prototype.fillHist = function(block, leftBase, rightBase,
						 stripeWidth) {
    var hist = this.features.histogram(leftBase, rightBase, this.numBins);
    //console.log(hist);
    var maxBin = 0;
    for (var bin = 0; bin < this.numBins; bin++)
	maxBin = Math.max(maxBin, hist[bin]);
    var binDiv;
    for (var bin = 0; bin < this.numBins; bin++) {
        binDiv = document.createElement("div");
	binDiv.className = this.className + "-hist";;
        binDiv.style.cssText = 
            "left: " + ((bin / this.numBins) * 100) + "%; "
            + "height: " + (2 * hist[bin]) + "px;"
	    + "bottom: " + this.trackPadding + "px;"
            + "width: " + (((1 / this.numBins) * 100) - (100 / stripeWidth)) + "%;";
        if (Util.is_ie6) binDiv.appendChild(document.createComment());
        block.appendChild(binDiv);
    }
    //TODO: come up with a better method for scaling than 2 px per count
    return 2 * maxBin;
}

SimpleFeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale < this.histScale) {
        this.setLabel(this.key + "<br>per " + Math.round(destBlockBases / this.numBins) + "bp");
    } else {
        this.setLabel(this.key);
    }
    this.clear();
}

SimpleFeatureTrack.prototype.fillBlock = function(block, leftBlock, rightBlock, leftBase, rightBase, scale, stripeWidth) {
    //console.log("scale: %d, histScale: %d", scale, this.histScale);
    if (scale < this.histScale) {
	return this.fillHist(block, leftBase, rightBase, stripeWidth);
    } else {
	return this.fillFeatures(block, leftBlock, rightBlock, 
				 leftBase, rightBase, scale);
    }
}

SimpleFeatureTrack.prototype.transfer = function(sourceBlock, destBlock) {
    //transfer(sourceBlock, destBlock) is called when sourceBlock gets deleted.
    //Any child features of sourceBlock that extend onto destBlock should get
    //moved onto destBlock.

    if (!(sourceBlock && destBlock)) return;

    var sourceSlots;
    if (sourceBlock.startBase < destBlock.startBase)
	sourceSlots = sourceBlock.rightSlots;
    else
	sourceSlots = sourceBlock.leftSlots;

    if (sourceSlots === undefined) return;

    var destLeft = destBlock.startBase;
    var destRight = destBlock.endBase;
    var blockWidth = destRight - destLeft;
    var sourceSlot;

    for (var i = 0; i < sourceSlots.length; i++) {
	//if the feature div in this slot is a child of sourceBlock,
	//and if the feature overlaps destBlock,
	//move to destBlock & re-position
	sourceSlot = sourceSlots[i];
	if (sourceSlot && (sourceSlot.parentNode === sourceBlock)) {
	    if ((sourceSlot.feature[1] > destLeft)
		&& (sourceSlot.feature[0] < destRight)) {
		var featLeft = (100 * (sourceSlot.feature[0] - destLeft) / blockWidth);
		sourceSlot.style.left = featLeft + "%";
		destBlock.appendChild(sourceSlot);
		if ("label" in sourceSlot) {
		    sourceSlot.label.style.left = featLeft + "%";
		    destBlock.appendChild(sourceSlot.label);
		}
	    }
	}
    }	    
}

SimpleFeatureTrack.prototype.fillFeatures = function(block, 
						     leftBlock, rightBlock,
						     leftBase, rightBase,
						     scale) {
    //arguments:
    //block: div to be filled with info
    //leftBlock: div to the left of the block to be filled
    //rightBlock: div to the right of the block to be filled
    //leftBase: starting base of the block
    //rightBase: ending base of the block
    //scale: pixels per base at the current zoom level
    //0-based
    //returns: height of the block, in pixels

    var start = this.fields["start"];
    var end = this.fields["end"];
    var strand = this.fields["strand"];
    var name = this.fields["name"];
    var phase = this.fields["phase"];

    var slots = [];

    //are we filling right-to-left (true) or left-to-right (false)?
    //this affects how we do layout
    var goLeft = false;

    //determine dimensions of labels (height, per-character width)
    if (!("nameHeight" in this)) {
	var heightTest = document.createElement("div");
	heightTest.className = "feature-label";
	heightTest.style.height = "auto";
	heightTest.style.visibility = "hidden";
	heightTest.appendChild(document.createTextNode("1234567890"));
	document.body.appendChild(heightTest);
	this.nameHeight = heightTest.clientHeight;
	this.nameWidth = heightTest.clientWidth / 10;
	document.body.removeChild(heightTest);
    }

    //determine the height of the glyph
    if (!("glyphHeight" in this)) {
	var heightTest = document.createElement("div");
	//cover all the bases: stranded or not, phase or not
	heightTest.className = this.className + " plus-" + this.className + " plus-" + this.className + "1";
	heightTest.style.visibility = "hidden";
	heightTest.appendChild(document.createComment("foo"));;
	document.body.appendChild(heightTest);
	this.glyphHeight = Math.round(heightTest.offsetHeight + 2);
	this.padding += heightTest.offsetWidth;
	document.body.removeChild(heightTest);
    }	

    startSlots = new Array();
    if (leftBlock && leftBlock.rightSlots) {
        slots = leftBlock.rightSlots.concat();
        block.leftSlots = startSlots;
    } else if (rightBlock && rightBlock.leftSlots) {
        slots = rightBlock.leftSlots.concat();
        block.rightSlots = startSlots;
        goLeft = true;
    } else {
	block.leftSlots = startSlots;
    }

    var levelUnits = "px";
    var blockWidth = rightBase - leftBase;
    var maxLevel = 0;

    var featDiv;
    var callback = this.onFeatureClick;
    var leftSlots = new Array();
    var glyphHeight = this.glyphHeight;
    var levelHeight = this.glyphHeight;
    var className = this.className;
    var labelScale = this.labelScale;
    var basePadding = Math.max(1, this.padding / scale);
    var basesPerLabelChar = this.nameWidth / scale;
    if (scale > labelScale) levelHeight += this.nameHeight;

    var featCallback = function(feature) {
        var level;
	//featureEnd is how far right the feature extends,
	//including its label if applicable
	var featureEnd = feature[end];
	if (scale > labelScale)
	    featureEnd = Math.max(featureEnd, 
				  feature[start] + (feature[name].length 
						* basesPerLabelChar));
	for (var j = 0; j < slots.length; j++) {
	    if (!slots[j]) continue;
            if (feature === slots[j].feature) {
		if (!startSlots[j]) startSlots[j] = slots[j];
		maxLevel = Math.max(j, maxLevel);
		return;
	    }
	}
        slotLoop: for (var j = 0; j < slots.length; j++) {
	    if (!slots[j]) {
		level = j;
		break;
	    }
	    var otherEnd = slots[j].feature[end];
	    if (scale > labelScale) otherEnd = Math.max(otherEnd, slots[j].feature[start] + (slots[j].feature[name].length * basesPerLabelChar));
            if (((otherEnd + basePadding) >= feature[start])
                && ((slots[j].feature[start] - basePadding) <= featureEnd)) {
		//this feature overlaps
                continue;
            } else {
                level = j;
                break;
            }
        }

        featDiv = document.createElement("div");
	featDiv.feature = feature;
	featDiv.layoutEnd = featureEnd;

        switch (feature[strand]) {
        case 1:
            featDiv.className = "plus-" + className; break;
        case 0:
	case null:
	case undefined:
            featDiv.className = className; break;
        case -1:
            featDiv.className = "minus-" + className; break;
        }

	if ((phase !== undefined) && (feature[phase] !== null))
	    featDiv.className = featDiv.className + feature[phase];

        if (level === undefined) {
	    //create a new slot
            slots.push(featDiv);
            level = slots.length - 1;
        } else {
	    //div goes into an existing slot
	    slots[level] = featDiv;
	}

        maxLevel = Math.max(level, maxLevel);

	if (!startSlots[level]) startSlots[level] = featDiv;

        featDiv.style.cssText = 
            "left: " + (100 * (feature[start] - leftBase) / blockWidth) + "%; "
            + "top: " + (level * levelHeight) + levelUnits + ";"
            + " width: " + (100 * ((feature[end] - feature[start]) / blockWidth)) + "%;";

        if (scale > labelScale) {
            var labelDiv = document.createElement("div");
            labelDiv.className = "feature-label";
            labelDiv.appendChild(document.createTextNode(feature[name]));
            labelDiv.style.cssText = 
                "left: " + (100 * (feature[start] - leftBase) / blockWidth) + "%; "
                + "top: " + ((level * levelHeight) + glyphHeight) + levelUnits + ";";
	    featDiv.label = labelDiv;
	    labelDiv.feature = feature;
	    labelDiv.onclick = callback;
            block.appendChild(labelDiv);
        }

	//ie6 doesn't respect the height style if the div is empty
        if (Util.is_ie6) featDiv.appendChild(document.createComment());
        featDiv.onclick = callback;
        //Event.observe measurably slower
        //TODO: handle IE leaks (
        //Event.observe(featDiv, "click", callback);
        block.appendChild(featDiv);
    }

    var startBase = goLeft ? rightBase : leftBase;
    var endBase = goLeft ? leftBase : rightBase;

    this.features.iterate(startBase, endBase, featCallback);

    if (goLeft)
	block.leftSlots = slots;
    else
	block.rightSlots = slots;

    return ((maxLevel + 1) * levelHeight);
}
