// VIEW

/**
 * @class
 */
function FeatureTrack( config, refSeq, browserParams ) {
    //config: object with:
    //            key:   display text track name
    //            label: internal track name (no spaces, odd characters)
    //            baseUrl: base URL to use for resolving relative URLs
    //                     contained in the track's configuration
    //            config: configuration info for this track
    //refSeq: object with:
    //         name:  refseq name
    //         start: refseq start
    //         end:   refseq end
    //browserParams: object with:
    //                changeCallback: function to call once JSON is loaded
    //                trackPadding: distance in px between tracks
    //                baseUrl: base URL for the URL in config

    Track.call(this, config.label, config.key,
               false, browserParams.changeCallback);
    this.fields = {};
    this.refSeq = refSeq;

    // TODO: this featureStore object should eventuallly be
    // instantiated by Browser and passed into this constructor, not
    // constructed here.
    var storeclass = config.backendVersion == 0 ? SeqFeatureStore.NCList_v0 : SeqFeatureStore.NCList;
    this.featureStore = new storeclass({
        urlTemplate: config.urlTemplate,
        baseUrl: config.baseUrl,
        refSeq: refSeq,
        track: this
    });

    // connect the store and track loadSuccess and loadFailed events
    // to eachother
    dojo.connect( this.featureStore, 'loadSuccess', this, 'loadSuccess' );
    dojo.connect( this.featureStore, 'loadFail',    this, 'loadFail' );

    this.featureStore.load();

    //number of histogram bins per block
    this.numBins = 25;
    this.histLabel = false;
    this.padding = 5;
    this.trackPadding = browserParams.trackPadding;

    this.config = config;
}

FeatureTrack.prototype = new Track("");

/**
 * Mixin: Track.YScaleMixin.
 */
dojo.mixin( FeatureTrack.prototype, Track.YScaleMixin );

FeatureTrack.prototype.loadSuccess = function(trackInfo, url) {

    var defaultConfig = {
        style: {
            className: "feature2"
        },
        scaleThresh: {
            hist: 4,
            label: 50,
            subfeature: 80
        },
        hooks: {
            create: function(track, feat ) {
                var featDiv;
                var featUrl = track.featureUrl(feat);
                if (featUrl) {
                    featDiv = document.createElement("a");
                    featDiv.href = featUrl;
                    featDiv.target = "_new";
                } else {
                    featDiv = document.createElement("div");
                }
                return featDiv;
            }
        },
        events: {
        }
    };

    if (! this.config.style.linkTemplate) {
        defaultConfig.events.click =
            function(track, elem, feat, event) {
	        alert( "clicked on feature\n" +
                       "start: " + (Number( feat.get('start') )+1) +
	               ", end: " + Number( feat.get('end') ) +
	               ", strand: " + feat.get('strand') +
	               ", label: " + feat.get('name') +
	               ", ID: " + feat.get('id') );
            };
    }

    Util.deepUpdate(defaultConfig, this.config);
    this.config = defaultConfig;

    this.config.hooks.create = this.evalHook(this.config.hooks.create);
    this.config.hooks.modify = this.evalHook(this.config.hooks.modify);

    this.eventHandlers = {};
    for (var event in this.config.events) {
        this.eventHandlers[event] =
            this.wrapHandler(this.evalHook(this.config.events[event]));
    }

    this.setLoaded();
};

FeatureTrack.prototype.evalHook = function(hook) {
    if (! ("string" == typeof hook)) return hook;
    var result;
    try {
         result = eval("(" + hook + ")");
    } catch (e) {
        console.log("eval failed for hook on track "
                    + this.name + ": " + hook);
    }
    return result;
};

/**
 * Make life easier for event handlers by handing them some things
 */
FeatureTrack.prototype.wrapHandler = function(handler) {
    var track = this;
    return function(event) {
        event = event || window.event;
        if (event.shiftKey) return;
        var elem = (event.currentTarget || event.srcElement);
        //depending on bubbling, we might get the subfeature here
        //instead of the parent feature
        if (!elem.feature) elem = elem.parentElement;
        if (!elem.feature) return; //shouldn't happen; just bail if it does
        handler(track, elem, elem.feature, event);
    };
};

FeatureTrack.prototype.setViewInfo = function(genomeView, numBlocks,
                                              trackDiv, labelDiv,
                                              widthPct, widthPx, scale) {
    Track.prototype.setViewInfo.apply(this, arguments );
    this.setLabel(this.key);
};

/**
 * Return an object with some statistics about the histograms we will
 * draw for a given block size in base pairs.
 * @private
 */
FeatureTrack.prototype._histDimensions = function( blockSizeBp ) {

    // bases in each histogram bin that we're currently rendering
    var bpPerBin = blockSizeBp / this.numBins;
    var pxPerCount = 2;
    var logScale = false;
    var stats = this.featureStore.histograms.stats;
    var statEntry;
    for (var i = 0; i < stats.length; i++) {
        if (stats[i].basesPerBin >= bpPerBin) {
            //console.log("bpPerBin: " + bpPerBin + ", histStats bases: " + this.histStats[i].bases + ", mean/max: " + (this.histStats[i].mean / this.histStats[i].max));
            logScale = ((stats[i].mean / stats[i].max) < .01);
            pxPerCount = 100 / (logScale ?
                                Math.log(stats[i].max) :
                                stats[i].max);
            statEntry = stats[i];
            break;
        }
    }

    return {
        bpPerBin: bpPerBin,
        pxPerCount: pxPerCount,
        logScale: logScale,
        stats: statEntry
    };
};

FeatureTrack.prototype.fillHist = function(blockIndex, block,
                                           leftBase, rightBase,
                                           stripeWidth) {

    var dims = this._histDimensions( Math.abs( rightBase - leftBase ) );

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
	    binDiv.className = track.config.style.className + "-hist";;
            binDiv.style.cssText =
                "left: " + ((bin / track.numBins) * 100) + "%; "
                + "height: "
                + (dims.pxPerCount * ( dims.logScale ? Math.log(hist[bin]) : hist[bin]))
                + "px;"
                + "bottom: " + track.trackPadding + "px;"
                + "width: " + (((1 / track.numBins) * 100) - (100 / stripeWidth)) + "%;"
                + (track.config.style.histCss ?
                   track.config.style.histCss : "");
            if (Util.is_ie6) binDiv.appendChild(document.createComment());
            block.appendChild(binDiv);
        }

        track.heightUpdate( dims.pxPerCount * ( dims.logScale ? Math.log(maxBin) : maxBin ),
                            blockIndex );
        track.makeHistogramYScale( Math.abs(rightBase-leftBase) );
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
    var histogramMeta = this.featureStore.histograms.meta[0];
    for (var i = 0; i < this.featureStore.histograms.meta.length; i++) {
        if (dims.bpPerBin >= this.featureStore.histograms.meta[i].basesPerBin)
            histogramMeta = this.featureStore.histograms.meta[i];
    }

    // number of bins in the server-supplied histogram for each current bin
    var binCount = dims.bpPerBin / histogramMeta.basesPerBin;
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
        this.featureStore.histogram( leftBase, rightBase,
                                     this.numBins, makeHistBlock);
    }
};

FeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
    if (destScale < (this.featureStore.density * this.config.scaleThresh.hist)) {
        this.setLabel(this.key + "<br>per " + Math.round(destBlockBases / this.numBins) + "bp");
    } else {
        this.setLabel(this.key);
    }
    this.clear();
};

FeatureTrack.prototype.updateViewDimensions = function( coords ) {
    Track.prototype.updateViewDimensions.apply( this, arguments );
    this.updateYScaleFromViewDimensions( coords );
};

FeatureTrack.prototype.fillBlock = function(blockIndex, block,
                                            leftBlock, rightBlock,
                                            leftBase, rightBase,
                                            scale, stripeWidth,
                                            containerStart, containerEnd) {
    //console.log("scale: %d, histScale: %d", scale, this.histScale);
    if (this.featureStore.histograms &&
        (scale < (this.featureStore.density * this.config.scaleThresh.hist)) ) {
	this.fillHist(blockIndex, block, leftBase, rightBase, stripeWidth,
                      containerStart, containerEnd);
    } else {

        // if we have transitioned to viewing features, delete the
        // y-scale used for the histograms
        if( this.yscale ) {
            this._removeYScale();
        }

	this.fillFeatures(blockIndex, block, leftBlock, rightBlock,
                          leftBase, rightBase, scale,
                          containerStart, containerEnd);
    }
};

/**
 * Creates a Y-axis scale for the feature histogram.  Must be run after
 * the histogram bars are drawn, because it sometimes must use the
 * track height to calculate the max value if there are no explicit
 * histogram stats.
 * @param {Number} blockSizeBp the size of the blocks in base pairs.
 * Necessary for calculating histogram stats.
 */
FeatureTrack.prototype.makeHistogramYScale = function( blockSizeBp ) {
    var dims = this._histDimensions( blockSizeBp);
    if( dims.logScale ) {
        console.error("Log histogram scale axis labels not yet implemented.");
        return;
    }
    var maxval = dims.stats ? dims.stats.max : this.height/dims.pxPerCount;
    maxval = dims.logScale ? log(maxval) : maxval;

    // if we have a scale, and it has the same characteristics
    // (including pixel height), don't redraw it.
    if( this.yscale && this.yscale_params
        && this.yscale_params.maxval == maxval
        && this.yscale_params.height == this.height
        && this.yscale_params.blockbp == blockSizeBp
      ) {
        return;
      } else {
          this._removeYScale();
          this.makeYScale({ min: 0, max: maxval });
          this.yscale_params = {
              height: this.height,
              blockbp: blockSizeBp,
              maxval: maxval
          };
      }
};

/**
 * Delete the Y-axis scale if present.
 * @private
 */
FeatureTrack.prototype._removeYScale = function() {
    if( !this.yscale )
        return;
    this.yscale.parentNode.removeChild( this.yscale );
    delete this.yscale_params;
    delete this.yscale;
};

FeatureTrack.prototype.cleanupBlock = function(block) {
    if (block && block.featureLayout) block.featureLayout.cleanup();
};

/**
 * Called when sourceBlock gets deleted.  Any child features of
 * sourceBlock that extend onto destBlock should get moved onto
 * destBlock.
 */
FeatureTrack.prototype.transfer = function(sourceBlock, destBlock, scale,
                                           containerStart, containerEnd) {

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
	    if ( sourceSlot.layoutEnd > destLeft
		 && sourceSlot.feature.get('start') < destRight ) {

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

    this.featureStore.iterate(startBase, endBase, featCallback,
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
        this.config.style.className
        + " plus-" + this.config.style.className
        + " plus-" + this.config.style.className + "1";
    if (this.config.style.featureCss)
        heightTest.style.cssText = this.config.style.featureCss;
    heightTest.style.visibility = "hidden";
    if (Util.is_ie6) heightTest.appendChild(document.createComment("foo"));
    document.body.appendChild(heightTest);
    glyphBox = dojo.marginBox(heightTest);
    this.glyphHeight = Math.round(glyphBox.h + 2);
    this.padding += glyphBox.w;
    document.body.removeChild(heightTest);

    //determine the width of the arrowhead, if any
    if (this.config.style.arrowheadClass) {
        var ah = document.createElement("div");
        ah.className = "plus-" + this.config.style.arrowheadClass;
        if (Util.is_ie6) ah.appendChild(document.createComment("foo"));
        document.body.appendChild(ah);
        glyphBox = dojo.marginBox(ah);
        this.plusArrowWidth = glyphBox.w;
        ah.className = "minus-" + this.config.style.arrowheadClass;
        glyphBox = dojo.marginBox(ah);
        this.minusArrowWidth = glyphBox.w;
        document.body.removeChild(ah);
    }
};

FeatureTrack.prototype.renderFeature = function(feature, uniqueId, block, scale,
                                                containerStart, containerEnd) {
    //featureStart and featureEnd indicate how far left or right
    //the feature extends in bp space, including labels
    //and arrowheads if applicable

    var featureEnd = feature.get('end');
    var featureStart = feature.get('start');
    if( typeof featureEnd == 'string' )
        featureEnd = parseInt(featureEnd);
    if( typeof featureStart == 'string' )
        featureStart = parseInt(featureStart);


    var levelHeight = this.glyphHeight + 2;

    // if the label extends beyond the feature, use the
    // label end position as the end position for layout
    var name = feature.get('name');
    var labelScale = this.featureStore.density * this.config.scaleThresh.label;
    if (name && (scale > labelScale)) {
	featureEnd = Math.max(featureEnd,
                              featureStart + ((name ? name.length : 0)
				              * (this.nameWidth / scale) ) );
        levelHeight += this.nameHeight;
    }
    featureEnd += Math.max(1, this.padding / scale);

    var top = block.featureLayout.addRect(uniqueId,
                                          featureStart,
                                          featureEnd,
                                          levelHeight);

    var featDiv = this.config.hooks.create(this, feature );
    for (var event in this.eventHandlers) {
        featDiv["on" + event] = this.eventHandlers[event];
    }
    featDiv.feature = feature;
    featDiv.layoutEnd = featureEnd;

    block.featureNodes[uniqueId] = featDiv;

    var strand = feature.get('strand');
    switch (strand) {
    case 1:
    case '+':
        featDiv.className = "plus-" + this.config.style.className; break;
    case 0:
    case '.':
    case null:
    case undefined:
        featDiv.className = this.config.style.className; break;
    case -1:
    case '-':
        featDiv.className = "minus-" + this.config.style.className; break;
    }

    var phase = feature.get('phase');
    if ((phase !== null) && (phase !== undefined))
        featDiv.className = featDiv.className + " " + featDiv.className + "_phase" + phase;

    // Since some browsers don't deal well with the situation where
    // the feature goes way, way offscreen, we truncate the feature
    // to exist betwen containerStart and containerEnd.
    // To make sure the truncated end of the feature never gets shown,
    // we'll destroy and re-create the feature (with updated truncated
    // boundaries) in the transfer method.
    var displayStart = Math.max( feature.get('start'), containerStart );
    var displayEnd = Math.min( feature.get('end'), containerEnd );
    var minFeatWidth = 1;
    var blockWidth = block.endBase - block.startBase;
    var featwidth = Math.max(minFeatWidth, (100 * ((displayEnd - displayStart) / blockWidth)));
    featDiv.style.cssText =
        "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;"
        + "top:" + top + "px;"
        + " width:" + featwidth + "%;"
        + (this.config.style.featureCss ? this.config.style.featureCss : "");

    if ( this.config.style.arrowheadClass ) {
        var ah = document.createElement("div");
        var featwidth_px = featwidth/100*blockWidth*scale;
        switch (strand) {
        case 1:
        case '+':
            if( featwidth_px > this.plusArrowWidth*1.1 ) {
                ah.className = "plus-" + this.config.style.arrowheadClass;
                ah.style.cssText = "position: absolute; right: 0px; top: 0px; z-index: 100;";
                featDiv.appendChild(ah);
            }
            break;
        case -1:
        case '-':
            if( featwidth_px > this.minusArrowWidth*1.1 ) {
                ah.className = "minus-" + this.config.style.arrowheadClass;
                ah.style.cssText =
                    "position: absolute; left: 0px; top: 0px; z-index: 100;";
                featDiv.appendChild(ah);
            }
            break;
        }
    }

    if (name && (scale > labelScale)) {
        var labelDiv;
        var featUrl = this.featureUrl(feature);
        if (featUrl) {
            labelDiv = document.createElement("a");
            labelDiv.href = featUrl;
            labelDiv.target = featDiv.target;
        } else {
            labelDiv = document.createElement("div");
        }
        for (event in this.eventHandlers) {
            labelDiv["on" + event] = this.eventHandlers[event];
        }

        labelDiv.className = "feature-label";
        labelDiv.appendChild(document.createTextNode(name));
        labelDiv.style.cssText =
            "left: "
            + (100 * (featureStart - block.startBase) / blockWidth)
            + "%; "
            + "top: " + (top + this.glyphHeight) + "px;";
	featDiv.label = labelDiv;
        labelDiv.feature = feature;
        block.appendChild(labelDiv);
    }

    if( featwidth > minFeatWidth ) {
        var subfeatures = feature.get('subfeatures');
        if( subfeatures ) {
            for (var i = 0; i < subfeatures.length; i++) {
                this.renderSubfeature(feature, featDiv,
                                      subfeatures[i],
                                      displayStart, displayEnd);
            }
        }
    }

    if (this.config.hooks.modify) {
        this.config.hooks.modify(this, feature, featDiv);
    }

    //ie6 doesn't respect the height style if the div is empty
    if (Util.is_ie6) featDiv.appendChild(document.createComment());
    //TODO: handle event-handler-related IE leaks
    return featDiv;
};

FeatureTrack.prototype.featureUrl = function(feature) {
    var urlValid = true;
    if (this.config.style.linkTemplate) {
        var href = this.config.style.linkTemplate.replace(
                /\{([^}]+)\}/g,
               function(match, group) {
                   var val = feature.get( group.toLowerCase() );
                   if (val !== undefined)
                       return val;
                   else
                       urlValid = false;
                   return 0;
               });
        if( urlValid )
            return href;
    }
    return undefined;
};

FeatureTrack.prototype.renderSubfeature = function(feature, featDiv, subfeature,
                                                   displayStart, displayEnd) {
    var subStart = subfeature.get('start');
    var subEnd = subfeature.get('end');
    var featLength = displayEnd - displayStart;

    var subDiv = document.createElement("div");

    if( this.config.style.subfeatureClasses ) {
        var type = subfeature.get('type');
        subDiv.className = this.config.style.subfeatureClasses[type] || this.config.style.className + '-' + type;
        switch ( subfeature.get('strand') ) {
            case 1:
            case '+':
                subDiv.className += " plus-" + subDiv.className; break;
            case -1:
            case '-':
                subDiv.className += " minus-" + subDiv.className; break;
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
