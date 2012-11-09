define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/dom-geometry',
            'dojo/on',
            'dojo/has',
            'dijit/Dialog',
            'dijit/form/Select',
            'dijit/form/RadioButton',
            'dijit/form/Button',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/YScaleMixin',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/FASTA'
        ],
      function( declare,
                lang,
                array,
                domGeom,
                on,
                has,
                dijitDialog,
                dijitSelect,
                dijitRadioButton,
                dijitButton,
                BlockBased,
                YScaleMixin,
                ExportMixin,
                Util,
                Layout,
                FASTAView
              ) {

var HTMLFeatures = declare( BlockBased, {
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
        //number of histogram bins per block
        this.numBins = 25;
        this.histLabel = false;
        this.padding = 5;
        this.trackPadding = args.trackPadding;

        this.heightCache = {}; // cache for the heights of some
                               // feature elements, indexed by the
                               // complete className of the feature

        // make a default click event handler
        if( ! (this.config.events||{}).click ) {
            this.config.events = this.config.events || {};
            this.config.events.click = (this.config.style||{}).linkTemplate
                    ? { action: "newWindow", url: this.config.style.linkTemplate }
                    : { action: "contentDialog",
                        title: '{type} {name}',
                        content: dojo.hitch( this, 'defaultFeatureDetail' ) };
        }

        // process the configuration to set up our event handlers
        this.eventHandlers = (function() {
            var handlers = dojo.clone( this.config.events || {} );
            // find conf vars that set events, like `onClick`
            for( var key in this.config ) {
                var handlerName = key.replace(/^on(?=[A-Z])/, '');
                if( handlerName != key )
                    handlers[ handlerName.toLowerCase() ] = this.config[key];
            }
            // interpret handlers that are just strings to be URLs that should be opened
            for( key in handlers ) {
                if( typeof handlers[key] == 'string' )
                    handlers[key] = { url: handlers[key] };
            }
            return handlers;
        }).call(this);
        this.eventHandlers.click = this._makeClickHandler( this.eventHandlers.click );
    }
} );

/**
 * Mixin: JBrowse.View.Track.YScaleMixin.
 */
HTMLFeatures.extend( YScaleMixin );

/**
 * Mixin: JBrowse.View.Track.ExportMixin.
 */
HTMLFeatures.extend( ExportMixin );

HTMLFeatures = declare( HTMLFeatures,
/**
 * @lends JBrowse.View.Track.HTMLFeatures.prototype
 */
{

    /**
     * Returns object holding the default configuration for HTML-based feature tracks.
     * @private
     */
    _defaultConfig: function() {
        return {
            description: true,
            style: {
                className: "feature2",
                histScale: 4,
                labelScale: 30,
                minSubfeatureWidth: 6,
                maxDescriptionLength: 70,
                descriptionScale: 170,
                showLabels: true
            },
            hooks: {
                create: function(track, feat ) {
                    return document.createElement('div');
                }
            },
            events: {},
            menuTemplate: [
                { label: 'View details',
                  title: '{type} {name}',
                  action: 'contentDialog',
                  iconClass: 'dijitIconTask',
                  content: dojo.hitch( this, 'defaultFeatureDetail' )
                }
            ]
        };
    },

    /**
     * Request that the track load its data.  The track will call its own
     * loadSuccess() function when it is loaded.
     */
    load: function() {
        var thisB = this;
        this.store.getGlobalStats( function( stats ) {
            // recall that scale is pixels per basepair
            var density = stats.featureDensity;
            thisB.labelScale = density * thisB.config.style.labelScale;
            thisB.showLabels = thisB.config.style.showLabels;
            thisB.descriptionScale = density * thisB.config.style.descriptionScale;;
        });
    },

    _shouldShowLabels: function( scale, stats ) {
        return this.showLabels && scale >= ((stats||{}).featureDensity || 0 ) * this.config.style.labelScale;
    },

    /**
     * Make a default feature detail page for the given feature.
     * @returns {HTMLElement} feature detail page HTML
     */
    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ featDiv, /** HTMLElement */ container ) {
        var fmt = dojo.hitch( this, '_fmtDetailField' );
        container = container || dojo.create('div', { className: 'detail feature-detail feature-detail-'+track.name, innerHTML: '' } );
        container.innerHTML += fmt( 'Name', f.get('name') );
        container.innerHTML += fmt( 'Type', f.get('type') );
        container.innerHTML += fmt( 'Description', f.get('note') );
        container.innerHTML += fmt(
            'Position',
            Util.assembleLocString({ start: f.get('start'),
                                     end: f.get('end'),
                                     ref: this.refSeq.name,
                                     strand: f.get('strand')
                                   })
        );
        container.innerHTML += fmt( 'Length', Util.addCommas(f.get('end')-f.get('start'))+' b' );

        // render any additional tags as just key/value
        var additionalTags = array.filter( f.tags(), function(t) { return ! {name:1,start:1,end:1,strand:1,note:1,subfeatures:1,type:1}[t.toLowerCase()]; });
        dojo.forEach( additionalTags.sort(), function(t) {
            container.innerHTML += fmt( t, f.get(t) );
        });

        // render the sequence underlying this feature if possible
        var field_container = dojo.create('div', { className: 'field_container feature_sequence' }, container );
        dojo.create( 'h2', { className: 'field feature_sequence', innerHTML: 'Region sequence' }, field_container );
        var valueContainerID = 'feature_sequence'+this._uniqID();
        var valueContainer = dojo.create(
            'div', {
                id: valueContainerID,
                innerHTML: '<div style="height: 12em">Loading...</div>',
                className: 'value feature_sequence'
            }, field_container);
        track.browser.getStore('refseqs', dojo.hitch(this,function( refSeqStore ) {
            valueContainer = dojo.byId(valueContainerID) || valueContainer;
            if( refSeqStore ) {
                refSeqStore.getRange( this.refSeq, f.get('start'), f.get('end'), dojo.hitch( this, function( start, end, seq ) {
                    valueContainer = dojo.byId(valueContainerID) || valueContainer;
                    valueContainer.innerHTML = '';
                    // the HTML is rewritten by the dojo dialog
                    // parser, but this callback may be called either
                    // before or after that happens.  if the fetch by
                    // ID fails, we have come back before the parse.
                    var textArea = new FASTAView({ width: 62, htmlMaxRows: 10 })
                                       .renderHTML(
                                           { ref:   this.refSeq.name,
                                             start: f.get('start'),
                                             end:   f.get('end'),
                                             strand: f.get('strand'),
                                             type: f.get('type')
                                           },
                                           f.get('strand') == -1 ? Util.revcom(seq) : seq,
                                           valueContainer
                                       );
                }));
            } else {
                valueContainer.innerHTML = '<span class="ghosted">reference sequences not loaded</span>';
            }
        }));

        // render any subfeatures this feature has
        var subfeatures = f.get('subfeatures');
        if( subfeatures && subfeatures.length ) {
            this._subfeaturesDetail( track, subfeatures, container );
        }

        return container;
    },

    _uniqID: function() {
        this._idCounter = this._idCounter || 0;
        return this._idCounter++;
    },

    _subfeaturesDetail: function( track, subfeatures, container ) {
            var field_container = dojo.create('div', { className: 'field_container subfeatures' }, container );
            dojo.create( 'h2', { className: 'field subfeatures', innerHTML: 'Subfeatures' }, field_container );
            var subfeaturesContainer = dojo.create( 'div', { className: 'value subfeatures' }, field_container );
            array.forEach( subfeatures || [], function( subfeature ) {
                    this.defaultFeatureDetail(
                        track,
                        subfeature,
                        null,
                        dojo.create('div', {
                                        className: 'detail feature-detail subfeature-detail feature-detail-'+track.name+' subfeature-detail-'+track.name,
                                        innerHTML: ''
                                    }, subfeaturesContainer )
                    );
            },this);
    },

    // _autoLinkText: function( text ) {
    //     return text
    //         // GO terms like GO:12345
    //         .replace(/\b(GO:\d{5,})\b/g, '<a href="http://amigo.geneontology.org/cgi-bin/amigo/term_details?term=$1">$1</a>');
    // },

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
        var stats = this.store.histograms.stats;
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
            for (bin = 0; bin < track.numBins; bin++) {
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
        var histogramMeta = this.store.histograms.meta[0];
        for (var i = 0; i < this.store.histograms.meta.length; i++) {
            if (dims.bpPerBin >= this.store.histograms.meta[i].basesPerBin)
                histogramMeta = this.store.histograms.meta[i];
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
            this.store.histogram( leftBase, rightBase,
                                         this.numBins, makeHistBlock);
        }
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
    },

    updateStaticElements: function( coords ) {
        this.inherited( arguments );
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
                          if( ! this.label )
                              return;
                          var viewLeft = 100 * ( (this.label.offsetLeft+this.label.offsetWidth) - block.offsetLeft ) / block.offsetWidth + 2;

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

        var region = { ref: this.refSeq.name, start: leftBase, end: rightBase };

        this.store.getRegionStats(
            region,
            dojo.hitch( this, function( stats ) {
                // only update the label once for each block size
                var blockBases = Math.abs( leftBase-rightBase );
                if( this._updatedLabelForBlockSize != blockBases ){
                    if ( this.store.histogram && scale < (stats.featureDensity * this.config.style.histScale)) {
                        this.setLabel(this.key + ' <span class="feature-density">per ' + Util.addCommas( Math.round( blockBases / this.numBins)) + ' bp</span>');
                    } else {
                        this.setLabel(this.key);
                    }
                    this._updatedLabelForBlockSize = blockBases;
                }

                //console.log("scale: %d, histScale: %d", scale, this.histScale);
                if( scale < stats.featureDensity * this.config.style.histScale ) {
                    // if our store offers density histograms, draw them
                    if( this.store.histograms ) {
                        this.fillHist(blockIndex, block, leftBase, rightBase, stripeWidth,
                                      containerStart, containerEnd);
                    }
                    // otherwise, display a zoomed-out-too-far message
                    else {
                        this.fillMessage( blockIndex, block, 'Too many features to show'+(scale >= this.browser.view.maxPxPerBp ? '': '; zoom in to see detail')+'.' );
                    }
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
            })
        );
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
        // garbage collect the layout
        if ( block && this.layout )
            this.layout.discardRange( block.startBase, block.endBase );
    },

    /**
     * Called when sourceBlock gets deleted.  Any child features of
     * sourceBlock that extend onto destBlock should get moved onto
     * destBlock.
     */
    transfer: function(sourceBlock, destBlock, scale, containerStart, containerEnd) {

        if (!(sourceBlock && destBlock)) return;

        var destLeft = destBlock.startBase;
        var destRight = destBlock.endBase;
        var blockWidth = destRight - destLeft;
        var sourceSlot;

        var overlaps = (sourceBlock.startBase < destBlock.startBase)
            ? sourceBlock.rightOverlaps
            : sourceBlock.leftOverlaps;
        overlaps = overlaps || [];

        for (var i = 0; i < overlaps.length; i++) {
	    //if the feature overlaps destBlock,
	    //move to destBlock & re-position
	    sourceSlot = sourceBlock.featureNodes[ overlaps[i] ];
	    if (sourceSlot && ("label" in sourceSlot)) {
                sourceSlot.label.parentNode.removeChild(sourceSlot.label);
	    }
	    if (sourceSlot && sourceSlot.feature) {
	        if ( sourceSlot.layoutEnd > destLeft
		     && sourceSlot.feature.get('start') < destRight ) {

                         sourceBlock.removeChild(sourceSlot);
                         delete sourceBlock.featureNodes[ overlaps[i] ];

                         var featDiv =
                             this.renderFeature(sourceSlot.feature, overlaps[i],
                                                destBlock, scale,
                                                containerStart, containerEnd, destBlock );
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

        block.featureNodes = {};
        block.style.backgroundColor = "#ddd";

        //determine the glyph height, arrowhead width, label text dimensions, etc.
        if (!this.haveMeasurements) {
            this.measureStyles();
            this.haveMeasurements = true;
        }

        var curTrack = this;
        var featCallback = dojo.hitch(this,function( feature ) {
            var uniqueId = feature._uniqueID;
            if( ! this._featureIsRendered( uniqueId ) ) {
                this.renderFeature( feature, uniqueId, block, scale,
                                    containerStart, containerEnd, block );
            }
        });

        // var startBase = goLeft ? rightBase : leftBase;
        // var endBase = goLeft ? leftBase : rightBase;

        this.store.getFeatures( { ref: this.refSeq.name,
                                  start: leftBase,
                                  end: rightBase
                                },
                                featCallback,
                                function () {
                                    block.style.backgroundColor = "";
                                    curTrack.heightUpdate(curTrack._getLayout(scale).getTotalHeight(),
                                                          blockIndex);
                                });
    },

    /**
     * Returns true if a feature is visible and rendered someplace in the blocks of this track.
     * @private
     */
    _featureIsRendered: function( uniqueId ) {
        var blocks = this.blocks;
        for( var i=0; i<blocks.length; i++ ) {
            if( blocks[i] && blocks[i].featureNodes && blocks[i].featureNodes[uniqueId])
                return true;
        }
        return false;
    },

    measureStyles: function() {
        //determine dimensions of labels (height, per-character width)
        var heightTest = document.createElement("div");
        heightTest.className = "feature-label";
        heightTest.style.height = "auto";
        heightTest.style.visibility = "hidden";
        heightTest.appendChild(document.createTextNode("1234567890"));
        document.body.appendChild(heightTest);
        this.labelHeight = heightTest.clientHeight;
        this.labelWidth = heightTest.clientWidth / 10;
        document.body.removeChild(heightTest);

        //measure the height of glyphs
        var glyphBox;
        heightTest = document.createElement("div");
        //cover all the bases: stranded or not, phase or not
        heightTest.className =
            "feature " + this.config.style.className
            + " plus-" + this.config.style.className
            + " plus-" + this.config.style.className + "1";
        if (this.config.style.featureCss)
            heightTest.style.cssText = this.config.style.featureCss;
        heightTest.style.visibility = "hidden";
        if (Util.is_ie6) heightTest.appendChild(document.createComment("foo"));
        document.body.appendChild(heightTest);
        glyphBox = domGeom.getMarginBox(heightTest);
        this.glyphHeight = glyphBox.h;
        this.padding += glyphBox.w;
        document.body.removeChild(heightTest);

        //determine the width of the arrowhead, if any
        if (this.config.style.arrowheadClass) {
            var ah = document.createElement("div");
            ah.className = "plus-" + this.config.style.arrowheadClass;
            if (Util.is_ie6) ah.appendChild(document.createComment("foo"));
            document.body.appendChild(ah);
            glyphBox = domGeom.position(ah);
            this.plusArrowWidth = glyphBox.w;
            this.plusArrowHeight = glyphBox.h;
            ah.className = "minus-" + this.config.style.arrowheadClass;
            glyphBox = domGeom.position(ah);
            this.minusArrowWidth = glyphBox.w;
            this.minusArrowHeight = glyphBox.h;
            document.body.removeChild(ah);
        }
    },

    renderFeature: function( feature, uniqueId, block, scale, containerStart, containerEnd, destBlock ) {
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
        var name = feature.get('name') || feature.get('ID');
        var description = this.config.description && scale > this.descriptionScale && ( feature.get('note') || feature.get('description') );
        if( description && description.length > this.config.style.maxDescriptionLength )
            description = description.substr(0, this.config.style.maxDescriptionLength+1 ).replace(/(\s+\S+|\s*)$/,'')+String.fromCharCode(8230);

        // add the label div (which includes the description) to the
        // calculated height of the feature if it will be displayed
        if( this._shouldShowLabels( scale, regionStats ) ) {
            if (name) {
	        featureEnd = Math.max(featureEnd, featureStart + (''+name).length * this.labelWidth / scale );
                levelHeight += this.labelHeight;
            }
            if( description ) {
                featureEnd = Math.max( featureEnd, featureStart + (''+description).length * this.labelWidth / scale );
                levelHeight += this.labelHeight;
            }
        }
        featureEnd += Math.max(1, this.padding / scale);

        var top = this._getLayout( scale ).addRect( uniqueId,
                                       featureStart,
                                       featureEnd,
                                       levelHeight);

        var featDiv = this.config.hooks.create(this, feature );
        this._connectFeatDivHandlers( featDiv );
        featDiv.track = this;
        featDiv.feature = feature;
        featDiv.layoutEnd = featureEnd;
        featDiv.className = (featDiv.className ? featDiv.className + " " : "") + "feature";
        // (callbackArgs are the args that will be passed to callbacks
        // in this feature's context menu or left-click handlers)
        featDiv.callbackArgs = [ this, featDiv.feature, featDiv ];

        block.featureNodes[uniqueId] = featDiv;

        // record whether this feature protrudes beyond the left and/or right side of the block
        if( featureStart < block.startBase ) {
            if( ! block.leftOverlaps ) block.leftOverlaps = [];
            block.leftOverlaps.push( uniqueId );
        }
        if( featureEnd > block.endBase ) {
            if( ! block.rightOverlaps ) block.rightOverlaps = [];
            block.rightOverlaps.push( uniqueId );
        }

        var strand = feature.get('strand');
        switch (strand) {
        case 1:
        case '+':
            featDiv.className = featDiv.className + " " + this.config.style.className + " plus-" + this.config.style.className; break;
        case -1:
        case '-':
            featDiv.className = featDiv.className + " " + this.config.style.className + " minus-" + this.config.style.className; break;
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
        var blockWidth = block.endBase - block.startBase;
        var featwidth = Math.max( 1, (100 * ((displayEnd - displayStart) / blockWidth)));
        featDiv.style.cssText =
            "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;"
            + "top:" + top + "px;"
            + " width:" + featwidth + "%;"
            + (this.config.style.featureCss ? this.config.style.featureCss : "");

        if ( this.config.style.arrowheadClass ) {
            var ah = document.createElement("div");
            var featwidth_px = featwidth/100*blockWidth*scale;

            // NOTE: arrowheads are hidden until they are centered by
            // _centerFeatureElements, so that they don't jump around
            // on the screen
            switch (strand) {
            case 1:
            case '+':
                if( featwidth_px > this.plusArrowWidth*1.1 ) {
                    ah.className = "plus-" + this.config.style.arrowheadClass;
                    ah.style.cssText = "visibility: hidden; position: absolute; right: 0px; top: 0px; z-index: 100;";
                    featDiv.appendChild(ah);
                }
                break;
            case -1:
            case '-':
                if( featwidth_px > this.minusArrowWidth*1.1 ) {
                    ah.className = "minus-" + this.config.style.arrowheadClass;
                    ah.style.cssText =
                        "visibility: hidden; position: absolute; left: 0px; top: 0px; z-index: 100;";
                    featDiv.appendChild(ah);
                }
                break;
            }
        }

        if (name && this.showLabels && scale >= this.labelScale) {
            var labelDiv = dojo.create( 'div', {
                    className: "feature-label",
                    innerHTML: '<div class="feature-name">'+name+'</div>'
                               +( description ? ' <div class="feature-description">'+description+'</div>' : '' ),
                    style: {
                        top: (top + this.glyphHeight + 2) + "px",
                        left: (100 * (featureStart - block.startBase) / blockWidth)+'%'
                    }
                }, block );

            this._connectFeatDivHandlers( labelDiv );

	    featDiv.label = labelDiv;
            featDiv.labelDiv = labelDiv;

            labelDiv.feature = feature;
            labelDiv.track = this;
            // (callbackArgs are the args that will be passed to callbacks
            // in this feature's context menu or left-click handlers)
            labelDiv.callbackArgs = [ this, featDiv.feature, featDiv ];
        }

        if( destBlock ) {
            destBlock.appendChild(featDiv);
        }

        // defer subfeature rendering and modification hooks into a
        // timeout so that navigation feels faster.
        window.setTimeout( dojo.hitch( this,
             function() {

                 if( featwidth > this.config.style.minSubfeatureWidth ) {
                     var subfeatures = feature.get('subfeatures');
                     if( subfeatures ) {
                         for (var i = 0; i < subfeatures.length; i++) {
                             this.renderSubfeature(feature, featDiv,
                                                   subfeatures[i],
                                                   displayStart, displayEnd);
                         }
                     }
                 }

                 //ie6 doesn't respect the height style if the div is empty
                 if (Util.is_ie6) featDiv.appendChild(document.createComment());
                 //TODO: handle event-handler-related IE leaks

                 /* Temi / AP adding right menu click
                  AP new schema menuTemplate: an array where everything except
                  children, popup and url are passed on as properties to a new
                  dijit.Menu object
                  */

                 // render the popup menu if configured
                 if( this.config.menuTemplate ) {
                     this._connectMenus( featDiv );
                 }
                 if( destBlock )
                     this._centerFeatureElements(featDiv);

                 if ( typeof this.config.hooks.modify == 'function' ) {
                     this.config.hooks.modify(this, feature, featDiv);
                 }

        }),50+Math.random()*50);

        return featDiv;
    },

    /**
     * Vertically centers all the child elements of a feature div.
     * @private
     */
    _centerFeatureElements: function( /**HTMLElement*/ featDiv ) {
        var getHeight = this.config.disableHeightCache
            ? function(child) { return child.offsetHeight || 0; }
            : function( child ) {
                var c = this.heightCache[ child.className ];
                if( c )
                    return c;
                c  = child.offsetHeight || 0;
                this.heightCache[ child.className ] = c;
                return c;
            };

        for( var i = 0; i< featDiv.childNodes.length; i++ ) {
            var child = featDiv.childNodes[i];
            // cache the height of elements, for speed.
            var h = getHeight.call(this,child);
            dojo.style( child, { marginTop: '0', top: ((this.glyphHeight-h)/2) + 'px', visibility: 'visible' });
         }
    },

    /**
     * Connect our configured event handlers to a given html element,
     * usually a feature div or label div.
     */
    _connectFeatDivHandlers: function( /** HTMLElement */ div  ) {
        for( var event in this.eventHandlers ) {
            on( div, event, this.eventHandlers[event] );
        }
        // if our click handler has a label, set that as a tooltip
        if( this.eventHandlers.click && this.eventHandlers.click.label )
            div.setAttribute( 'title', this.eventHandlers.click.label );
    },

    _connectMenus: function( featDiv ) {
        // don't actually make the menu until the feature is
        // moused-over.  pre-generating menus for lots and lots of
        // features at load time is way too slow.
        var refreshMenu = lang.hitch( this, '_refreshMenu', featDiv );
        on( featDiv,  'mouseover', refreshMenu );
        if( featDiv.labelDiv )
            on( featDiv.labelDiv,  'mouseover', refreshMenu );
        dojo.connect( featDiv.contextMenu, 'onMouseMove', refreshMenu );
    },

    _refreshMenu: function( featDiv ) {
        // if we already have a menu generated for this feature,
        // give it a new lease on life
        if( ! featDiv.contextMenu ) {
            featDiv.contextMenu = this._makeFeatureContextMenu( featDiv, this.config.menuTemplate );
        }

        // give the menu a timeout so that it's cleaned up if it's not used within a certain time
        if( featDiv.contextMenuTimeout ) {
            window.clearTimeout( featDiv.contextMenuTimeout );
        }
        var timeToLive = 30000; // clean menus up after 30 seconds
        featDiv.contextMenuTimeout = window.setTimeout( function() {
                                                            if( featDiv.contextMenu ) {
                                                                featDiv.contextMenu.destroyRecursive();
                                                                delete featDiv.contextMenu;
                                                            }
                                                            delete featDiv.contextMenuTimeout;
                                                        }, timeToLive );
    },

    /**
     * Make the right-click dijit menu for a feature.
     */
    _makeFeatureContextMenu: function( featDiv, menuTemplate ) {
        // interpolate template strings in the menuTemplate
        menuTemplate = this._processMenuSpec(
            dojo.clone( menuTemplate ),
            featDiv
        );

        // render the menu, start it up, and bind it to right-clicks
        // both on the feature div and on the label div
        var menu = this._renderContextMenu( menuTemplate, featDiv );
        menu.startup();
        menu.bindDomNode( featDiv );
        if( featDiv.labelDiv )
            menu.bindDomNode( featDiv.labelDiv );

        return menu;
    },

    renderSubfeature: function(feature, featDiv, subfeature, displayStart, displayEnd) {
        var subStart = subfeature.get('start');
        var subEnd = subfeature.get('end');
        var featLength = displayEnd - displayStart;

        var subDiv = document.createElement("div");

        var type = subfeature.get('type');
        subDiv.className = (this.config.style.subfeatureClasses||{})[type] || this.config.style.className + '-' + type;
        switch ( subfeature.get('strand') ) {
        case 1:
        case '+':
            subDiv.className += " plus-" + subDiv.className; break;
        case -1:
        case '-':
            subDiv.className += " minus-" + subDiv.className; break;
        }

        // if the feature has been truncated to where it doesn't cover
        // this subfeature anymore, just skip this subfeature
        if ((subEnd <= displayStart) || (subStart >= displayEnd)) return;

        if (Util.is_ie6) subDiv.appendChild(document.createComment());

        // NOTE: subfeatures are hidden until they are centered by
        // _centerFeatureElements, so that they don't jump around
        // on the screen
        subDiv.style.cssText =
            "visibility: hidden; left: " + (100 * ((subStart - displayStart) / featLength)) + "%;"
            + "top: 0px;"
            + "width: " + (100 * ((subEnd - subStart) / featLength)) + "%;";
        featDiv.appendChild(subDiv);
    },

    _getLayout: function( scale ) {
        // create the layout if we need to, and we can
        if( ( ! this.layout || this.layout.pitchX != 4/scale ) && scale )
            this.layout = new Layout({pitchX: 4/scale, pitchY: 4});

        return this.layout;
    },
    _clearLayout: function() {
        delete this.layout;
    },

    // when all the blocks are hidden, we also should recalculate our layout 
    changed: function() {
        this.inherited(arguments);
        this._clearLayout();
    },

    _exportFormats: function() {
        return [ 'GFF3', 'BED' ];
    },

    _trackMenuOptions: function() {
        var o = this.inherited(arguments);
        var track = this;

        o.push.apply(
            o,
            [
                { type: 'dijitMenuSeparator' },
                { label: 'Show labels',
                  type: 'dijitCheckedMenuItem',
                  checked: !!( 'showLabels' in this ? this.showLabels : this.config.style.showLabels ),
                  onClick: function(event) {
                      track.showLabels = this.checked;
                      track.changed();
                  }
                }
            ]
        );

        return o;
    }

});

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
