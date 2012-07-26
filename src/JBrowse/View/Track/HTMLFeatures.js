define( [
            'dojo/_base/declare',
            'dijit/Menu',
            'dijit/Dialog',
            'dijit/PopupMenuItem',
            'dijit/MenuItem',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/YScaleMixin',
            'JBrowse/Util',
            'JBrowse/View/Layout'
        ],
      function( declare,
                dijitMenu,
                dijitDialog,
                dijitPopupMenuItem,
                dijitMenuItem,
                BlockBased,
                YScaleMixin,
                Util,
                Layout
              ) {

var HTMLFeatures = declare( BlockBased,

 /**
  * @lends JBrowse.View.Track.HTMLFeatures.prototype
  */
{

    /**
     * A track that draws discrete features using `div` elements.
     * @constructs
     * @extends JBrowse.View.Track.BlockBased
     * @param args.config {Object} track configuration. Must include key, label
     * @param args.refSeq {Object} reference sequence object with name, start,
     *   and end members.
     * @param args.changeCallback {Function} optional callback for
     *   when the track's data is loaded and ready
     * @param args.trackPadding {Number} distance in px between tracks
     */
    constructor: function( args ) {
        var config = args.config;
        BlockBased.call( this, config.label, config.key,
                         false, args.changeCallback);
        this.fields = {};
        this.refSeq = args.refSeq;

        //number of histogram bins per block
        this.numBins = 25;
        this.histLabel = false;
        this.padding = 5;
        this.trackPadding = args.trackPadding;

        this.config = config;


        // this featureStore object should eventually be
        // instantiated by Browser and passed into this constructor, not
        // constructed here.
        this.featureStore = args.store;

        // connect the store and track loadSuccess and loadFailed events
        // to eachother
        dojo.connect( this.featureStore, 'loadSuccess', this, 'loadSuccess' );
        dojo.connect( this.featureStore, 'loadFail',    this, 'loadFail' );
    },

    /**
     * Request that the track load its data.  The track will call its own
     * loadSuccess() function when it is loaded.
     */
    load: function() {
        this.featureStore.load();
    },


    loadSuccess: function(trackInfo, url) {

        var defaultConfig = {
            style: {
                className: "feature2",
                histScale: 4,
                labelScale: 50,
                subfeatureScale: 80
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

        this.labelScale = this.featureStore.density * this.config.style.labelScale;
        this.subfeatureScale = this.featureStore.density * this.config.style.subfeatureScale;

        this.setLoaded();
    },

    evalHook: function(hook) {
        if (! ("string" == typeof hook)) return hook;
        var result;
        try {
            result = eval("(" + hook + ")");
        } catch (e) {
            console.log("eval failed for hook on track "
                        + this.name + ": " + hook);
        }
        return result;
    },

    /**
     * Make life easier for event handlers by handing them some things
     */
    wrapHandler: function(handler) {
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
    },

    setViewInfo: function(genomeView, numBlocks,
                          trackDiv, labelDiv,
                          widthPct, widthPx, scale) {
        BlockBased.prototype.setViewInfo.apply(this, arguments );
        this.setLabel(this.key);
    },

    /**
     * Return an object with some statistics about the histograms we will
     * draw for a given block size in base pairs.
     * @private
     */
    _histDimensions: function( blockSizeBp ) {

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
    },

    fillHist: function( blockIndex, block, leftBase, rightBase, stripeWidth ) {

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
	        binDiv.className = "hist "+track.config.style.className + "-hist";
                binDiv.style.cssText =
                    "left: " + ((bin / track.numBins) * 100) + "%; "
                    + "height: "
                    + ((dims.pxPerCount * ( dims.logScale ? Math.log(hist[bin]) : hist[bin]))-2)
                    + "px;"
                    + "bottom: " + track.trackPadding + "px;"
                    + "width: " + (((1 / track.numBins) * 100) - (100 / stripeWidth)) + "%;"
                    + (track.config.style.histCss ?
                       track.config.style.histCss : "");
                binDiv.setAttribute('value',hist[bin]);
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
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
    },

    updateStaticElements: function( coords ) {
        BlockBased.prototype.updateStaticElements.apply( this, arguments );
        this.updateYScaleFromViewDimensions( coords );
        this.updateFeatureLabelPositions( coords );
    },

    updateFeatureLabelPositions: function( coords ) {
        if( ! 'x' in coords || this.scale < this.labelScale )
            return;

        dojo.query( '.block', this.div )
            .forEach( function(block) {
                          // calculate the view left coord relative to the
                          // block left coord in units of pct of the block
                          // width
                          var viewLeft = 100 * ( coords.x - block.offsetLeft ) / block.offsetWidth + 2;

                          // if the view start is unknown, or is to the
                          // left of this block, we don't have to worry
                          // about adjusting the feature labels
                          if( ! viewLeft )
                              return;

                          var blockWidth = block.endBase - block.startBase;

                          dojo.query('.feature',block)
                              .forEach( function(featDiv) {
                                            if( ! featDiv.label ) return;
                                            var labelDiv = featDiv.label;
                                            var feature = featDiv.feature;

                                            // get the feature start and end in terms of block width pct
                                            var minLeft = parseInt( feature.get('start') );
                                            minLeft = 100 * (minLeft - block.startBase) / blockWidth;
                                            var maxLeft = parseInt( feature.get('end') );
                                            maxLeft = 100 * ( (maxLeft - block.startBase) / blockWidth
                                                              - labelDiv.offsetWidth / block.offsetWidth
                                                            );

                                            // move our label div to the view start if the start is between the feature start and end
                                            labelDiv.style.left = Math.max( minLeft, Math.min( viewLeft, maxLeft ) ) + '%';

                                        },this);
                      },this);
    },

    fillBlock: function(blockIndex, block, leftBlock, rightBlock, leftBase, rightBase, scale, stripeWidth, containerStart, containerEnd) {

        // only update the label once for each block size
        var blockBases = Math.abs( leftBase-rightBase );
        if( this._updatedLabelForBlockSize != blockBases ){
            if ( scale < (this.featureStore.density * this.config.style.histScale)) {
                this.setLabel(this.key + "<br>per " + Util.addCommas( Math.round( blockBases / this.numBins)) + " bp");
            } else {
                this.setLabel(this.key);
            }
            this._updatedLabelForBlockSize = blockBases;
        }

        //console.log("scale: %d, histScale: %d", scale, this.histScale);
        if (this.featureStore.histograms &&
            (scale < (this.featureStore.density * this.config.style.histScale)) ) {
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
    },

    /**
     * Creates a Y-axis scale for the feature histogram.  Must be run after
     * the histogram bars are drawn, because it sometimes must use the
     * track height to calculate the max value if there are no explicit
     * histogram stats.
     * @param {Number} blockSizeBp the size of the blocks in base pairs.
     * Necessary for calculating histogram stats.
     */
    makeHistogramYScale: function( blockSizeBp ) {
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
    },

    /**
     * Delete the Y-axis scale if present.
     * @private
     */
    _removeYScale: function() {
        if( !this.yscale )
            return;
        this.yscale.parentNode.removeChild( this.yscale );
        delete this.yscale_params;
        delete this.yscale;
    },

    cleanupBlock: function(block) {
        if (block && block.featureLayout)
            block.featureLayout.cleanup();
    },

    /**
     * Called when sourceBlock gets deleted.  Any child features of
     * sourceBlock that extend onto destBlock should get moved onto
     * destBlock.
     */
    transfer: function(sourceBlock, destBlock, scale, containerStart, containerEnd) {

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
    },

    /**
     * arguments:
     * @param block div to be filled with info
     * @param leftBlock div to the left of the block to be filled
     * @param rightBlock div to the right of the block to be filled
     * @param leftBase starting base of the block
     * @param rightBase ending base of the block
     * @param scale pixels per base at the current zoom level
     * @param containerStart don't make HTML elements extend further left than this
     * @param containerEnd don't make HTML elements extend further right than this. 0-based.
     */
    fillFeatures: function(blockIndex, block, leftBlock, rightBlock, leftBase, rightBase, scale, containerStart, containerEnd) {

        this.scale = scale;

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
    },

    measureStyles: function() {
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
    },

    renderFeature: function(feature, uniqueId, block, scale, containerStart, containerEnd) {
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
        if (name && (scale >= this.labelScale)) {
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
        featDiv.className = (featDiv.className ? featDiv.className + " " : "") + "feature";

        block.featureNodes[uniqueId] = featDiv;

        var strand = feature.get('strand');
        switch (strand) {
        case 1:
        case '+':
            featDiv.className = featDiv.className + " plus-" + this.config.style.className; break;
        case -1:
        case '-':
            featDiv.className = featDiv.className + " minus-" + this.config.style.className; break;
        default:
            featDiv.className = featDiv.className + " " + this.config.style.className; break;
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

        if (name && (scale >= this.labelScale)) {
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
            labelDiv.style.top  = (top + this.glyphHeight) + "px";
            labelDiv.style.left = (100 * (featureStart - block.startBase) / blockWidth)+'%';
	    featDiv.label = labelDiv;
            labelDiv.feature = feature;
            block.appendChild(labelDiv);
        }

        if( featwidth > minFeatWidth && scale >= this.subfeatureScale ) {
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

        /* Temi / AP adding right menu click
           AP new schema menuTemplate: an array where everything except
           children, popup and url are passed on as properties to a new
           dijit.Menu object

           menuTemplate : [   // array of menu items, first level
             {
               "label" : "Demo label",
               // skip for no icons "iconClass" : "dijitIconSearch",
               "children" : [
               {
                 "label" : "Check gene on databases",
                // AP children is recursive for nested menus
                // NB but if it has children that 'url' will not work (since it is no longer a menuItem but a menu) 
                 "children" : [
                 {
                   "label" : "Query trin",
                   "iconClass" : "dijitIconBookmark",
                   "url" : "http://wiki.trin.org.au/{name}-{start}-{end}"
                 },
                 {
                 "label" : "Query example.com",
                 "iconClass" : "dijitIconSearch", // example icon
                 "url" : "http://example.com/{name}-{start}-{end}",
                 }
                 ]
               },
               {
                 "label" : "2nd child of demo"
               },
               {
                 "label" : "3rd child: this is a track"
               }
             ]
             },
             {
               "label" : "Open dialog popup",
               "iconClass" : "dijitIconDatabase",
               "dialog": "true",  // popup a dialog box instead of a new window
               // this one is from the same host so it is ok:
               "url" : "/geogeneticsWizard/data/chado/sample/1/geojson/" // this returns a json (in our setup)
               // proxy script needed for cross domain posting:
               "url" : "/cgi-bin/js_proxy.cgi?url=http://example.org"  // this returns html
             }
         ]
         */

        // render the popup menu if present
        if( this.config.menuTemplate ) {
            var menu = this._renderMenuItems( feature, this.config.menuTemplate );
            menu.startup();
            menu.bindDomNode( featDiv );
            if( labelDiv )
                menu.bindDomNode( labelDiv );
        }

        return featDiv;
    },

    _renderMenuItems: function( feature, menuTemplate, parent ) {
        if ( !parent )
            parent = new dijitMenu();

        for ( key in menuTemplate ) {
            var value = menuTemplate [ key ];
            var that = this;
            var initObject = {};
            for ( prop in value ) {
                initObject[ prop ] = value [ prop ];
            }
            initObject[ 'onClick' ] = function () {
                var url ;
                if ( this.url ) {
                    url = that.template( feature , this.url );
                    if ( this.dialog !== 'true'){
                        window.open( url );
                    } else {
                        dojo.xhrGet({
                            url: url,
                            load: function ( data ) {
                                var dialog = new dijitDialog({
                                                                  title:'url',
                                                                  content : data
                                                              });
                                dialog.show();
                            }
                        });
                    }
                }
            };
            if ( value.children ) {
                var child = new dijitMenu ();
                parent.addChild( child );
                parent.addChild( new dijitPopupMenuItem ( {
                                                               popup : child,
                                                               label : value.label
                                                           } ) );
                this._renderMenuItems( feature, value.children , child );
            }else{
                var child = new dijitMenuItem (initObject);
                parent.addChild(child);
            }
        }
        return parent;
    },

    featureUrl: function(feature) {
        return this.template ( feature , this.config.style.linkTemplate ) ;
    },

    template: function( feature, template ) {
        var urlValid = true;
        if ( template ) {
            var href = template.replace(
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
    },

    renderSubfeature: function(feature, featDiv, subfeature, displayStart, displayEnd) {
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
    }
});

/**
 * Mixin: JBrowse.View.Track.YScaleMixin.
 */
dojo.extend( HTMLFeatures, YScaleMixin );

return HTMLFeatures;
});

/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
