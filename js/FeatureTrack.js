function FeatureTrack(trackMeta, url, refSeq, browserParams) {
    //trackMeta: object with:
    //            key:   display text track name
    //            label: internal track name (no spaces, odd characters)
    //url: URL of the track's JSON file
    //refSeq: object with:
    //         start: refseq start
    //         end:   refseq end
    //browserParams: object with:
    //                changeCallback: function to call once JSON is loaded
    //                trackPadding: distance in px between tracks
    //                baseUrl: base URL for the URL in trackMeta

    Track.call(this, trackMeta.label, trackMeta.key,
               false, browserParams.changeCallback);
    this.fields = {};
    this.features = new NCList();
    this.refSeq = refSeq;
    this.baseUrl = (browserParams.baseUrl ? browserParams.baseUrl : "");
    this.url = url;
    this.trackBaseUrl = (this.baseUrl + url).match(/^.+\//);
    //number of histogram bins per block
    this.numBins = 25;
    this.histLabel = false;
    this.padding = 5;
    this.trackPadding = browserParams.trackPadding;

    this.trackMeta = trackMeta;
    this.load(this.baseUrl + url);

    var thisObj = this;
}

FeatureTrack.prototype = new Track("");

FeatureTrack.prototype.loadSuccess = function(trackInfo) {
    var startTime = new Date().getTime();
    this.count = trackInfo.featureCount;
    this.fields = {};
    for (var i = 0; i < trackInfo.headers.length; i++) {
	this.fields[trackInfo.headers[i]] = i;
    }
    this.subFields = {};
    if (trackInfo.subfeatureHeaders) {
        for (var i = 0; i < trackInfo.subfeatureHeaders.length; i++) {
            this.subFields[trackInfo.subfeatureHeaders[i]] = i;
        }
    }
    this.features.importExisting(trackInfo.featureNCList,
                                 trackInfo.sublistIndex,
                                 trackInfo.lazyIndex,
                                 this.trackBaseUrl,
                                 trackInfo.lazyfeatureUrlTemplate);
    if (trackInfo.subfeatureArray)
        this.subfeatureArray = new LazyArray(trackInfo.subfeatureArray,
                                             this.trackBaseUrl);

    this.histScale = 4 * (trackInfo.featureCount / this.refSeq.length);
    this.labelScale = 50 * (trackInfo.featureCount / this.refSeq.length);
    this.subfeatureScale = 80 * (trackInfo.featureCount / this.refSeq.length);
    this.className = trackInfo.className;
    this.subfeatureClasses = trackInfo.subfeatureClasses;
    this.arrowheadClass = trackInfo.arrowheadClass;
    this.urlTemplate = trackInfo.urlTemplate;
    this.histogramMeta = trackInfo.histogramMeta;
    for (var i = 0; i < this.histogramMeta.length; i++) {
        this.histogramMeta[i].lazyArray =
            new LazyArray(this.histogramMeta[i].arrayParams, this.trackBaseUrl);
    }
    this.histStats = trackInfo.histStats;
    this.histBinBases = trackInfo.histBinBases;

    if (trackInfo.clientConfig) {
        var cc = trackInfo.clientConfig;
        var density = trackInfo.featureCount / this.refSeq.length;
        this.histScale = (cc.histScale ? cc.histScale : 4) * density;
        this.labelScale = (cc.labelScale ? cc.labelScale : 50) * density;
        this.subfeatureScale = (cc.subfeatureScale ? cc.subfeatureScale : 80)
                                   * density;
        if (cc.featureCss) this.featureCss = cc.featureCss;
        if (cc.histCss) this.histCss = cc.histCss;
        if (cc.featureCallback) {
            try {
                this.featureCallback = eval("(" + cc.featureCallback + ")");
            } catch (e) {
                console.log("eval failed for featureCallback on track " + this.name + ": " + cc.featureCallback);
            }
        }
    }

    //console.log((new Date().getTime() - startTime) / 1000);

    var fields = this.fields;
    if (! trackInfo.urlTemplate) {
        this.onFeatureClick = function(event) {
            event = event || window.event;
	    if (event.shiftKey) return;
	    var elem = (event.currentTarget || event.srcElement);
            //depending on bubbling, we might get the subfeature here
            //instead of the parent feature
            if (!elem.feature) elem = elem.parentElement;
            if (!elem.feature) return; //shouldn't happen; just bail if it does
            var feat = elem.feature;
	    alert("clicked on feature\nstart: " + feat[fields["start"]] +
	          ", end: " + feat[fields["end"]] +
	          ", strand: " + feat[fields["strand"]] +
	          ", label: " + feat[fields["name"]] +
	          ", ID: " + feat[fields["id"]]);
        };
    }

    this.setLoaded();
};

FeatureTrack.prototype.setViewInfo = function(genomeView, numBlocks,
                                              trackDiv, labelDiv,
                                              widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, [genomeView, numBlocks,
                                             trackDiv, labelDiv,
                                             widthPct, widthPx, scale]);
    this.setLabel(this.key);
};

FeatureTrack.prototype.fillHist = function(blockIndex, block,
                                           leftBase, rightBase,
                                           stripeWidth) {
    // bases in each histogram bin that we're currently rendering
    var bpPerBin = (rightBase - leftBase) / this.numBins;
    var pxPerCount = 2;
    var logScale = false;
    for (var i = 0; i < this.histStats.length; i++) {
        if (this.histStats[i].bases >= bpPerBin) {
            //console.log("bpPerBin: " + bpPerBin + ", histStats bases: " + this.histStats[i].bases + ", mean/max: " + (this.histStats[i].mean / this.histStats[i].max));
            logScale = ((this.histStats[i].mean / this.histStats[i].max) < .01);
            pxPerCount = 100 / (logScale
                                ? Math.log(this.histStats[i].max)
                                : this.histStats[i].max);
            break;
        }
    }
    var track = this;
    var makeHistBlock = function(hist) {
        var maxBin = 0;
        for (var bin = 0; bin < track.numBins; bin++) {
            if (typeof hist[bin] == 'number' && isFinite(hist[bin])) {
                maxBin = Math.max(maxBin, hist[bin]);
            }
        }
        var binDiv;
        for (var bin = 0; bin < track.numBins; bin++) {
            if (!(typeof hist[bin] == 'number' && isFinite(hist[bin])))
                continue;
            binDiv = document.createElement("div");
	    binDiv.className = track.className + "-hist";;
            binDiv.style.cssText =
                "left: " + ((bin / track.numBins) * 100) + "%; "
                + "height: "
                + (pxPerCount * (logScale ? Math.log(hist[bin]) : hist[bin]))
                + "px;"
                + "bottom: " + track.trackPadding + "px;"
                + "width: " + (((1 / track.numBins) * 100) - (100 / stripeWidth)) + "%;"
                + (track.histCss ? track.histCss : "");
            if (Util.is_ie6) binDiv.appendChild(document.createComment());
            block.appendChild(binDiv);
        }

        track.heightUpdate(pxPerCount * (logScale ? Math.log(maxBin) : maxBin),
                           blockIndex);
    };

    // The histogramMeta array describes multiple levels of histogram detail,
    // going from the finest (smallest number of bases per bin) to the
    // coarsest (largest number of bases per bin).
    // We want to use coarsest histogramMeta that's at least as fine as the
    // one we're currently rendering.
    // TODO: take into account that the histogramMeta chosen here might not
    // fit neatly into the current histogram (e.g., if the current histogram
    // is at 50,000 bases/bin, and we have server histograms at 20,000
    // and 2,000 bases/bin, then we should choose the 2,000 histogramMeta
    // rather than the 20,000)
    var histogramMeta = this.histogramMeta[0];
    for (var i = 0; i < this.histogramMeta.length; i++) {
        if (bpPerBin >= this.histogramMeta[i].basesPerBin)
            histogramMeta = this.histogramMeta[i];
    }

    // number of bins in the server-supplied histogram for each current bin
    var binCount = bpPerBin / histogramMeta.basesPerBin;
    // if the server-supplied histogram fits neatly into our current histogram,
    if ((binCount > .9)
        &&
        (Math.abs(binCount - Math.round(binCount)) < .0001)) {
        // we can use the server-supplied counts
        var firstServerBin = Math.floor(leftBase / histogramMeta.basesPerBin);
        binCount = Math.round(binCount);
        var histogram = [];
        for (var bin = 0; bin < this.numBins; bin++)
            histogram[bin] = 0;

        histogramMeta.lazyArray.range(
            firstServerBin,
            firstServerBin + (binCount * this.numBins),
            function(i, val) {
                // this will count features that span the boundaries of
                // the original histogram multiple times, so it's not
                // perfectly quantitative.  Hopefully it's still useful, though.
                histogram[Math.floor((i - firstServerBin) / binCount)] += val;
            },
            function() {
                makeHistBlock(histogram);
            }
        );
    } else {
        // make our own counts
        this.features.histogram(leftBase, rightBase,
                                this.numBins, makeHistBlock);
    }
};

FeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale < this.histScale) {
        this.setLabel(this.key + "<br>per " + Math.round(destBlockBases / this.numBins) + "bp");
    } else {
        this.setLabel(this.key);
    }
    this.clear();
};

FeatureTrack.prototype.fillBlock = function(blockIndex, block,
                                            leftBlock, rightBlock,
                                            leftBase, rightBase,
                                            scale, stripeWidth,
                                            containerStart, containerEnd) {
    //console.log("scale: %d, histScale: %d", scale, this.histScale);
    if (scale < this.histScale) {
	this.fillHist(blockIndex, block, leftBase, rightBase, stripeWidth,
                      containerStart, containerEnd);
    } else {
	this.fillFeatures(blockIndex, block, leftBlock, rightBlock,
                          leftBase, rightBase, scale,
                          containerStart, containerEnd);
    }
};

FeatureTrack.prototype.cleanupBlock = function(block) {
    if (block && block.featureLayout) block.featureLayout.cleanup();
};

FeatureTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
                                           containerStart, containerEnd) {
    //transfer(sourceBlock, destBlock) is called when sourceBlock gets deleted.
    //Any child features of sourceBlock that extend onto destBlock should get
    //moved onto destBlock.

    if (!(sourceBlock && destBlock)) return;
    if (!sourceBlock.featureLayout) return;

    var destLeft = destBlock.startBase;
    var destRight = destBlock.endBase;
    var blockWidth = destRight - destLeft;
    var sourceSlot;

    var overlaps = (sourceBlock.startBase < destBlock.startBase)
                       ? sourceBlock.featureLayout.rightOverlaps
                       : sourceBlock.featureLayout.leftOverlaps;

    for (var i = 0; i < overlaps.length; i++) {
	//if the feature overlaps destBlock,
	//move to destBlock & re-position
	sourceSlot = sourceBlock.featureNodes[overlaps[i].id];
	if (sourceSlot && ("label" in sourceSlot)) {
            sourceSlot.label.parentNode.removeChild(sourceSlot.label);
	}
	if (sourceSlot && sourceSlot.feature) {
	    if ((sourceSlot.layoutEnd > destLeft)
		&& (sourceSlot.feature[this.fields["start"]] < destRight)) {

                sourceBlock.removeChild(sourceSlot);
                delete sourceBlock.featureNodes[overlaps[i].id];

                var featDiv =
                    this.renderFeature(sourceSlot.feature, overlaps[i].id,
                                   destBlock, scale,
                                   containerStart, containerEnd);
                destBlock.appendChild(featDiv);
            }
        }
    }
};

FeatureTrack.prototype.fillFeatures = function(blockIndex, block,
                                               leftBlock, rightBlock,
                                               leftBase, rightBase, scale,
                                               containerStart, containerEnd) {
    //arguments:
    //block: div to be filled with info
    //leftBlock: div to the left of the block to be filled
    //rightBlock: div to the right of the block to be filled
    //leftBase: starting base of the block
    //rightBase: ending base of the block
    //scale: pixels per base at the current zoom level
    //containerStart: don't make HTML elements extend further left than this
    //containerEnd: don't make HTML elements extend further right than this
    //0-based

    var layouter = new Layout(leftBase, rightBase);
    block.featureLayout = layouter;
    block.featureNodes = {};
    block.style.backgroundColor = "#ddd";

    //are we filling right-to-left (true) or left-to-right (false)?
    var goLeft = false;
    if (leftBlock && leftBlock.featureLayout) {
        leftBlock.featureLayout.setRightLayout(layouter);
        layouter.setLeftLayout(leftBlock.featureLayout);
    }
    if (rightBlock && rightBlock.featureLayout) {
        rightBlock.featureLayout.setLeftLayout(layouter);
        layouter.setRightLayout(rightBlock.featureLayout);
        goLeft = true;
    }

    //determine the glyph height, arrowhead width, label text dimensions, etc.
    if (!this.haveMeasurements) {
        this.measureStyles();
        this.haveMeasurements = true;
    }

    var curTrack = this;
    var featCallback = function(feature, path) {
        //uniqueId is a stringification of the path in the NCList where
        //the feature lives; it's unique across the top-level NCList
        //(the top-level NCList covers a track/chromosome combination)
        var uniqueId = path.join(",");
        //console.log("ID " + uniqueId + (layouter.hasSeen(uniqueId) ? " (seen)" : " (new)"));
        if (layouter.hasSeen(uniqueId)) {
            //console.log("this layouter has seen " + uniqueId);
            return;
        }
        var featDiv =
            curTrack.renderFeature(feature, uniqueId, block, scale,
                                   containerStart, containerEnd);
        block.appendChild(featDiv);
    };

    var startBase = goLeft ? rightBase : leftBase;
    var endBase = goLeft ? leftBase : rightBase;


    this.features.iterate(startBase, endBase, featCallback,
                          function () {
                              block.style.backgroundColor = "";
                              curTrack.heightUpdate(layouter.totalHeight,
                                                    blockIndex);
                          });
};

FeatureTrack.prototype.measureStyles = function() {
    //determine dimensions of labels (height, per-character width)
    var heightTest = document.createElement("div");
    heightTest.className = "feature-label";
    heightTest.style.height = "auto";
    heightTest.style.visibility = "hidden";
    heightTest.appendChild(document.createTextNode("1234567890"));
    document.body.appendChild(heightTest);
    this.nameHeight = heightTest.clientHeight;
    this.nameWidth = heightTest.clientWidth / 10;
    document.body.removeChild(heightTest);

    //measure the height of glyphs
    var glyphBox;
    heightTest = document.createElement("div");
    //cover all the bases: stranded or not, phase or not
    heightTest.className =
        this.className
        + " plus-" + this.className
        + " plus-" + this.className + "1";
    if (this.featureCss) heightTest.style.cssText = this.featureCss;
    heightTest.style.visibility = "hidden";
    if (Util.is_ie6) heightTest.appendChild(document.createComment("foo"));
    document.body.appendChild(heightTest);
    glyphBox = dojo.marginBox(heightTest);
    this.glyphHeight = Math.round(glyphBox.h + 2);
    this.padding += glyphBox.w;
    document.body.removeChild(heightTest);

    //determine the width of the arrowhead, if any
    if (this.arrowheadClass) {
        var ah = document.createElement("div");
        ah.className = "plus-" + this.arrowheadClass;
        if (Util.is_ie6) ah.appendChild(document.createComment("foo"));
        document.body.appendChild(ah);
        glyphBox = dojo.marginBox(ah);
        this.plusArrowWidth = glyphBox.w;
        ah.className = "minus-" + this.arrowheadClass;
        glyphBox = dojo.marginBox(ah);
        this.minusArrowWidth = glyphBox.w;
        document.body.removeChild(ah);
    }
};

FeatureTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
                                                containerStart, containerEnd) {
    var fields = this.fields;
    //featureStart and featureEnd indicate how far left or right
    //the feature extends in bp space, including labels
    //and arrowheads if applicable
    var featureEnd = feature[fields["end"]];
    var featureStart = feature[fields["start"]];
    if (this.arrowheadClass) {
        switch (feature[fields["strand"]]) {
        case 1:
            featureEnd   += (this.plusArrowWidth / scale); break;
        case -1:
            featureStart -= (this.minusArrowWidth / scale); break;
        }
    }

    // if the label extends beyond the feature, use the
    // label end position as the end position for layout
    if (scale > this.labelScale) {
	featureEnd = Math.max(featureEnd,
                              feature[fields["start"]]
                              + (((fields["name"] && feature[fields["name"]])
				  ? feature[fields["name"]].length : 0)
				 * (this.nameWidth / scale)));
    }
    featureEnd += Math.max(1, this.padding / scale);

    var levelHeight =
        this.glyphHeight + 2 +
        (
            (fields["name"] && (scale > this.labelScale)) ? this.nameHeight : 0
        );

    var top = block.featureLayout.addRect(uniqueId,
                                          featureStart,
                                          featureEnd,
                                          levelHeight);

    var featDiv;
    var featUrl = this.featureUrl(feature);
    if (featUrl) {
        featDiv = document.createElement("a");
        featDiv.href = featUrl;
        featDiv.target = "_new";
    } else {
        featDiv = document.createElement("div");
        featDiv.onclick = this.onFeatureClick;
    }
    featDiv.feature = feature;
    featDiv.layoutEnd = featureEnd;

    block.featureNodes[uniqueId] = featDiv;

    switch (feature[fields["strand"]]) {
    case 1:
        featDiv.className = "plus-" + this.className; break;
    case 0:
    case null:
    case undefined:
        featDiv.className = this.className; break;
    case -1:
        featDiv.className = "minus-" + this.className; break;
    }

    if ((fields["phase"] !== undefined) && (feature[fields["phase"]] !== null))
        featDiv.className = featDiv.className + feature[fields["phase"]];

    // Since some browsers don't deal well with the situation where
    // the feature goes way, way offscreen, we truncate the feature
    // to exist betwen containerStart and containerEnd.
    // To make sure the truncated end of the feature never gets shown,
    // we'll destroy and re-create the feature (with updated truncated
    // boundaries) in the transfer method.
    var displayStart = Math.max(feature[fields["start"]],
                                containerStart);
    var displayEnd = Math.min(feature[fields["end"]],
                              containerEnd);
    var blockWidth = block.endBase - block.startBase;
    featDiv.style.cssText =
        "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;"
        + "top:" + top + "px;"
        + " width:" + (100 * ((displayEnd - displayStart) / blockWidth)) + "%;"
        + (this.featureCss ? this.featureCss : "");

    if (this.featureCallback) this.featureCallback(feature, fields, featDiv);

    if (this.arrowheadClass) {
        var ah = document.createElement("div");
        switch (feature[fields["strand"]]) {
        case 1:
            ah.className = "plus-" + this.arrowheadClass;
            ah.style.cssText = "left: 100%; top: 0px;";
            featDiv.appendChild(ah);
            break;
        case -1:
            ah.className = "minus-" + this.arrowheadClass;
            ah.style.cssText =
                "left: " + (-this.minusArrowWidth) + "px; top: 0px;";
            featDiv.appendChild(ah);
            break;
        }
    }

    if ((scale > this.labelScale)
        && fields["name"]
        && feature[fields["name"]]) {

        var labelDiv;
        if (featUrl) {
            labelDiv = document.createElement("a");
            labelDiv.href = featUrl;
            labelDiv.target = featDiv.target;
        } else {
            labelDiv = document.createElement("div");
	    labelDiv.onclick = this.onFeatureClick;
        }

        labelDiv.className = "feature-label";
        labelDiv.appendChild(document.createTextNode(feature[fields["name"]]));
        labelDiv.style.cssText =
            "left: "
            + (100 * (feature[fields["start"]] - block.startBase) / blockWidth)
            + "%; "
            + "top: " + (top + this.glyphHeight) + "px;";
	featDiv.label = labelDiv;
        labelDiv.feature = feature;
        block.appendChild(labelDiv);
    }

    if (fields["subfeatures"]
        && (scale > this.subfeatureScale)
        && feature[fields["subfeatures"]]
        && feature[fields["subfeatures"]].length > 0) {

        for (var i = 0; i < feature[fields["subfeatures"]].length; i++) {
            this.renderSubfeature(feature, featDiv,
                                  feature[fields["subfeatures"]][i],
                                  displayStart, displayEnd);
        }
    }

    //ie6 doesn't respect the height style if the div is empty
    if (Util.is_ie6) featDiv.appendChild(document.createComment());
    //TODO: handle event-handler-related IE leaks
    return featDiv;
};

FeatureTrack.prototype.featureUrl = function(feature) {
    var urlValid = true;
    var fields = this.fields;
    if (this.urlTemplate) {
        var href = this.urlTemplate.replace(/\{([^}]+)\}/g,
        function(match, group) {
            if(feature[fields[group]] != undefined)
                return feature[fields[group]];
            else
                urlValid = false;
            return 0;
        });
        if(urlValid) return href;
    }
    return undefined;
};

FeatureTrack.prototype.renderSubfeature = function(feature, featDiv, subfeature,
                                                   displayStart, displayEnd) {
    var subStart = subfeature[this.subFields["start"]];
    var subEnd = subfeature[this.subFields["end"]];
    var featLength = displayEnd - displayStart;

    var subDiv = document.createElement("div");

    if (this.subfeatureClasses) {
        var className = this.subfeatureClasses[subfeature[this.subFields["type"]]];
        switch (subfeature[this.subFields["strand"]]) {
        case 1:
            subDiv.className = "plus-" + className; break;
        case 0:
        case null:
        case undefined:
            subDiv.className = className; break;
        case -1:
            subDiv.className = "minus-" + className; break;
        }

    }

    // if the feature has been truncated to where it doesn't cover
    // this subfeature anymore, just skip this subfeature
    if ((subEnd <= displayStart) || (subStart >= displayEnd)) return;

    if (Util.is_ie6) subDiv.appendChild(document.createComment());
    subDiv.style.cssText =
        "left: " + (100 * ((subStart - displayStart) / featLength)) + "%;"
        + "top: 0px;"
        + "width: " + (100 * ((subEnd - subStart) / featLength)) + "%;";
    if (this.featureCallback)
        this.featureCallback(subfeature, this.subFields, subDiv);
    featDiv.appendChild(subDiv);
};

/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
