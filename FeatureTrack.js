
function SimpleFeatureTrack(name, featArray, className, levelHeight, refSeq,
			    histScale, labelScale, padding) {
    //className: CSS class for the features
    //padding: min pixels between each feature horizontally

    Track.call(this, name);
    this.count = featArray.length;
    this.features = new NCList(featArray, featArray[0].length);
    //this.features.sort(function(a, b) {return a.start - b.start;});
    //this.features.sort(function(a, b) {return a[0] - b[0];});
    this.className = className;
    this.levelHeight = levelHeight;
    this.refSeq = refSeq;
    this.histScale = histScale;
    this.labelScale = labelScale;
    this.numBins = 25;
    this.histLabel = false;
    this.padding = padding;
}

SimpleFeatureTrack.prototype = new Track("");

SimpleFeatureTrack.prototype.setViewInfo = function(numBlocks, trackDiv,
                                                    labelDiv, widthPct,
                                                    widthPx) {
    Track.prototype.setViewInfo.apply(this, [numBlocks, trackDiv, labelDiv,
                                             widthPct, widthPx]);
    this.setLabel(this.name);
}

SimpleFeatureTrack.prototype.getFeatures = function(startBase, endBase) {
    var result = Array();
    var f = this.features;
    var i;
    try {
        for (i = 0, len = f.length; i < len; i++) {
            //if ((f[i].end >= startBase) && (f[i].start <= endBase))
            if ((f[i][1] >= startBase) && (f[i][0] <= endBase))
                result.push(f[i]);
        }
    } catch(e) {
        alert(e.message + "\ni: " + i + "\nf.length: " + f.length + "\n" + Object.toJSON(f[i]));
    }
    return result;
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
	binDiv.className = "hist-" + this.className;
        binDiv.style.cssText = 
            "left: " + ((bin / this.numBins) * 100) + "%; "
            + "height: " + (2 * hist[bin]) + "px;"
	    + "bottom: 0px;"// + this.trackPadding + "px;"
            + "width: " + (((1 / this.numBins) * 100) - (100 / stripeWidth)) + "%;";
        if (Util.is_ie6) binDiv.appendChild(document.createComment());
        block.appendChild(binDiv);
    }
    //TODO: come up with a better method for scaling than 2 px per count
    return 2 * maxBin;
}

SimpleFeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale < this.histScale) {
        this.setLabel(this.name + "<br>per " + Math.round(destBlockBases / this.numBins) + "bp");
    } else {
        this.setLabel(this.name);
    }
    this.clear();
}

SimpleFeatureTrack.prototype.fillBlock = function(block, leftBlock, rightBlock, leftBase, rightBase, scale, stripeWidth) {
    //console.log("scale: %d, histScale: %d", scale, this.histScale);
    if (scale < this.histScale) {
        //this.setLabel(this.name + "<br>per " + Math.round((rightBase - leftBase) / this.numBins) + "bp");
	return this.fillHist(block, leftBase, rightBase, stripeWidth);
    } else {
        //this.setLabel(this.name);
	return this.fillFeatures(block, leftBlock, rightBlock, 
				 leftBase, rightBase, scale);
    }
}

SimpleFeatureTrack.prototype.transfer = function(sourceBlock, destBlock) {
    //transfer(sourceBlock, destBlock) is called when sourceBlock gets deleted.
    //Any child features of sourceBlock that extend onto destBlock should get
    //moved onto destBlock.

    if (!(sourceBlock || destBlock)) return;

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
	if ((sourceSlot.parentNode === sourceBlock)
	    && (sourceSlot.feature[1] > destLeft)
	    && (sourceSlot.feature[0] < destRight)) {
            sourceSlot.style.left = 
		(100 * (sourceSlot.feature[0] - destLeft) / blockWidth) + "%";
	    destBlock.appendChild(sourceSlot);
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

    var slots = [];
    var needLeftSlots = false;

    //are we filling right-to-left (true) or left-to-right (false)?
    //this affects how we do layout
    var goLeft = false;

    var tmp;

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

    if (leftBlock !== undefined) {
        slots = leftBlock.rightSlots.concat();
        block.leftSlots = leftBlock.rightSlots;
        //curFeats.sort(function(a, b) {return a.start - b.start;});
    } else if (rightBlock !== undefined) {
        slots = rightBlock.leftSlots.concat();
        block.rightSlots = rightBlock.leftSlots;
        goLeft = true;
        //curFeats.sort(function(a, b) {return b.end - a.end;});
        //curFeats.sort(function(a, b) {return b[1] - a[1];});
    } else {
        needLeftSlots = true;
        //curFeats.sort(function(a, b) {return a.start - b.start;});
    }

    //var levels = Array(curFeats.length);

    var levelUnits = "px";

    var blockWidth = rightBase - leftBase;

    //var maxLevel = this.layout(curFeats, levels, slots, basePadding);
    var maxLevel = 0;

    //var callback = function(event) { alert("clicked on feature " + Event.element(event).feature.ID) };
    var callback = function(event) {
	event = event || window.event;
	if (event.shiftKey) return;
	var feat = YAHOO.util.Event.getTarget((event || window.event)).feature;
	alert("clicked on feature\nstart: " + feat[0] +
	      ", end: " + feat[1] +
	      ", strand: " + feat[2] +
	      ", ID: " + feat[3]);
    };

    var feature;
    var featDiv;
    var leftSlots = new Array();
    //for (var i = 0; i < curFeats.length; i++) {
    //    if (levels[i] === undefined) continue;
    //    feature = curFeats[i];
    var glyphHeight = this.levelHeight;
    var levelHeight = this.levelHeight;
    var className = this.className;
    var labelScale = this.labelScale;
    var basePadding = this.padding / scale;
    var basesPerLabelChar = this.nameWidth / scale;
    if (scale > labelScale) {
	levelHeight += this.nameHeight + (levelHeight >> 1);
	//basePadding = Math.max(basePadding, 150 / scale);
    }
    basePadding = Math.max(1, basePadding);
    var featCallback = function(feature) {
        featDiv = document.createElement("div");
	featDiv.feature = feature;

        //featDiv.setAttribute("fName", feature[3]);
        switch (feature[2]) {
        case 1:
            featDiv.className = "plus-" + className; break;
        case 0:
            featDiv.className = className; break;
        case -1:
            featDiv.className = "minus-" + className; break;
        }

        var level;

	var featureEnd = feature[1];
	//featureEnd is how far right the feature extends,
	//including its label if applicable
	if (scale > labelScale)
	    featureEnd = Math.max(featureEnd, 
				  feature[0] + (feature[3].length 
						* basesPerLabelChar));
        slotLoop: for (var j = 0; j < slots.length; j++) {
            if (feature === slots[j].feature) return; //does this catch all repeats?
	    //otherEnd is how far right the other feature extends,
	    //including its label if applicable
	    var otherEnd = slots[j].feature[1];
	    if (scale > labelScale) otherEnd = Math.max(otherEnd, slots[j].feature[0] + (slots[j].feature[3].length * basesPerLabelChar));

            if (((otherEnd + basePadding) >= feature[0])
                && ((slots[j].feature[0] - basePadding) <= featureEnd)) {
		//this feature overlaps
                continue;
            } else {
                slots[j] = featDiv;
                level = j;
                maxLevel = Math.max(j, maxLevel);
                break;
            }
        }
        if (level === undefined) {
            slots.push(featDiv);//feature);
            level = slots.length - 1;
        }
        maxLevel = Math.max(level, maxLevel);

        if (needLeftSlots) {
            if ((feature[0] - basePadding <= leftBase) 
                && (feature[1] + basePadding >= leftBase))
                leftSlots[level] = featDiv;//feature;
        }

        featDiv.style.cssText = 
            //"left: " + (100 * (feature.start - leftBase) / blockWidth) + "%; "
            "left: " + (100 * (feature[0] - leftBase) / blockWidth) + "%; "
        //+ "top: " + (levels[i] * this.levelHeight) + levelUnits + ";"
            + "top: " + (level * levelHeight) + levelUnits + ";"
            //+ " width: " + (100 * ((feature.end - feature.start) / blockWidth)) + "%;";
            + " width: " + (100 * ((feature[1] - feature[0]) / blockWidth)) + "%;";

        if (scale > labelScale) {
            var labelDiv = document.createElement("div");
            labelDiv.className = "feature-label";
            labelDiv.appendChild(document.createTextNode(feature[3]));
            labelDiv.style.cssText = 
                "left: " + (100 * (feature[0] - leftBase) / blockWidth) + "%; "
                + "top: " + ((level * levelHeight) + glyphHeight) + levelUnits + ";";
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

    //clear the last non-edge features out of slots
    //while keeping early non-edge features
    // e.g., keep features A and B but not C
    // (this is necessary when the user goes back and forth)
    // (we keep A because we just want to truncate slots; we
    //  keep everything down to and including B)
    //  A  --  |
    //  B    --|--
    //  C      |  --
    var tmpSlots = [];
    for (var i = slots.length - 1; i >= 0; i--) {
	var featureEnd = slots[i].feature[1];
	//featureEnd is how far right the feature extends,
	//including its label if applicable
	if (scale > labelScale)
	    featureEnd = Math.max(featureEnd, 
				  slots[i].feature[0] + (slots[i].feature[3].length 
							 * basesPerLabelChar));
        if ((slots[i].feature[0] - basePadding <= endBase) 
            && (featureEnd + basePadding >= endBase)) {
            tmpSlots = slots.slice(0, i + 1);
            break;
        }
    }
    slots = tmpSlots;

    if (leftBlock !== undefined) {
        block.rightSlots = slots;
    } else if (rightBlock !== undefined) {
        block.leftSlots = slots;
    } else {
        block.rightSlots = slots;
        block.leftSlots = leftSlots;

//         var leftOverlapping = [];
//         for (var i = 0, len = curFeats.length; i < len; i++) {
//             //if (curFeats[i].start <= leftBase)
//             if (curFeats[i][0] <= leftBase)
//                 leftOverlapping.push(i);
//         }
//         var leftSlots = Array(leftOverlapping.length);
//         for (var i = 0; i < leftOverlapping.length; i++)
//             leftSlots[i] = levels[leftOverlapping[i]];
//         block.leftSlots = leftSlots;
    }

    return ((maxLevel + 1) * levelHeight);
}

SimpleFeatureTrack.prototype.layout = function(features, levels, slots, basePadding) {
    var maxLevel = 0;
    featLoop: for (var i = 0; i < features.length; i++) {
        slotLoop: for (var j = 0; j < slots.length; j++) {
            if (features[i] === slots[j]) continue featLoop;
            //alert("i:" + i + ", j: " + j + "; " + slots[j].start + "-" + slots[j].end + ", " + features[i].start + "-" + features[i].end + ", basePadding: " + basePadding);
            //if (((slots[j].end + basePadding) >= features[i].start)
            //    && ((slots[j].start - basePadding) <= features[i].end)) {
            if (((slots[j][1] + basePadding) >= features[i][0])
                && ((slots[j][0] - basePadding) <= features[i][1])) {
                continue slotLoop;
            } else {
                slots[j] = features[i];
                levels[i] = j;
                maxLevel = Math.max(j, maxLevel);
                continue featLoop;
            }
        }
        if (levels[i] === undefined) {
            slots.push(features[i]);
            levels[i] = slots.length - 1;
        }
    }
    return maxLevel;
}
