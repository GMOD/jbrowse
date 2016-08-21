define([
        'dojo/_base/declare',
        'dojo/_base/lang',
        'dojo/_base/array',
        'dojo/dom-construct',
        'dojo/dom-geometry',
        'dojo/on',
        'dojo/query',
        'dojo/request/xhr',
        'JBrowse/has',
        'dijit/Dialog',
        'dijit/form/Select',
        'dijit/form/RadioButton',
        'dijit/form/Button',
        'JBrowse/View/Track/BlockBased',
        'JBrowse/View/Track/_YScaleMixin',
        'JBrowse/View/Track/_ExportMixin',
        'JBrowse/View/Track/_FeatureDetailMixin',
        'JBrowse/View/Track/_TrackDetailsStatsMixin',
        'JBrowse/Util',
        'JBrowse/View/GranularRectLayout',
        'JBrowse/Model/ArrayRepr'
    ],
    function (declare,
              lang,
              array,
              dom,
              domGeom,
              on,
              query,
              xhr,
              has,
              dijitDialog,
              dijitSelect,
              dijitRadioButton,
              dijitButton,
              BlockBased,
              YScaleMixin,
              ExportMixin,
              FeatureDetailMixin,
              TrackDetailsStatsMixin,
              Util,
              Layout,
              ArrayRepr) {

        var CommentFeatures = declare([BlockBased, YScaleMixin, ExportMixin, FeatureDetailMixin, TrackDetailsStatsMixin], {
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
            constructor: function (args) {
                //number of histogram bins per block
                this.numBins = lang.getObject('histogram.binsPerBlock', false, this.config) || 25;

                this.defaultPadding = 5;
                this.padding = this.defaultPadding;

                this.glyphHeightPad = 1;
                this.levelHeightPad = 2;
                this.labelPad = 1;

                // if calculated feature % width would be less than minFeatWidth, then set width to minFeatWidth instead
                this.minFeatWidth = 1;

                this.trackPadding = args.trackPadding;

                this.heightCache = {}; // cache for the heights of some
                                       // feature elements, indexed by the
                                       // complete cassName of the feature

                this.showLabels = this.config.style.showLabels;

                this._setupEventHandlers();

                this.newFeats = [];
            },

            /**
             * Returns object holding the default configuration for comment track.
             * @private
             */
            _defaultConfig: function () {
                var _this = this;
                function callback(changes) {
                    var ids = Object.keys(changes);
                    for (var i = 0; i < ids.length; i++) {
                        var div = query('.feature.' + ids[i]);
                        div.addClass('hasComments');
                        if (div[0]) {
                            div[0].feature.set('class_css', 'hasComments');
                        }
                    }
                }
                describeThreads(callback);
                window.setInterval(function () {
                    describeThreads(callback);
                }, 3700);
                return Util.deepUpdate(
                    lang.clone(this.inherited(arguments)),
                    {
                        maxFeatureScreenDensity: 0.5,

                        // maximum height of the track, in pixels
                        maxHeight: 1000,

                        style: {
                            arrowheadClass: 'arrowhead',

                            className: "feature2",

                            // not configured by users
                            _defaultHistScale: 4,
                            _defaultLabelScale: 30,
                            _defaultDescriptionScale: 120,

                            minSubfeatureWidth: 6,
                            maxDescriptionLength: 70,
                            showLabels: true,

                            label: 'name,id',
                            description: 'note, description',

                            centerChildrenVertically: true  // by default use feature child centering
                        },
                        hooks: {
                            create: function (track, feat) {
                                return document.createElement('div');
                            }
                        },
                        events: {
                            click: function () {
                                var name = this.feature.get('name');
                                reload(this.feature.get('thread_id'));
                                query('#wrapper').removeClass('toggled');
                                query('.sidebar-brand')[0].textContent = name;
                                query('.feature.' + this.feature.get('thread_id')).removeClass('hasComments');
                                this.feature.set('class_css', '');
                            }
                        },
                        menuTemplate: [
                            {
                                label: 'Delete Thread Link',
                                action: function () {
                                    var thread = this;
                                    _this.updateComment({
                                        feature: this.feature,
                                        action: "remove"
                                    }, function () {
                                        thread.feature.set('thread_id', 'hidden');
                                        thread.track.redraw();
                                    });
                                },
                                iconClass: 'dijitIconDelete'
                            },
                            {
                                label: 'Change Associated Thread',
                                action: function () {
                                    var thread_id = prompt("Enter thread Id to load");
                                    var name = prompt("Give a new title to thread");
                                    var thread = this;
                                    _this.updateComment({
                                        feature: this.feature,
                                        thread_id: thread_id,
                                        name: name,
                                        action: "update"
                                    }, function () {
                                        thread.feature.set('thread_id', thread_id);
                                        thread.feature.set('name', name);
                                        thread.track.redraw();
                                    });
                                },
                                iconClass: 'dijitIconTask'
                            },
                            {
                                label: 'Update Range',
                                action: function () {
                                    var start = prompt("Enter starting point", 500);
                                    var end = prompt("Enter Ending point", 1000);
                                    var thread = this;
                                    _this.updateComment({
                                        feature: this.feature,
                                        start: start,
                                        end: end,
                                        action: "update"
                                    }, function () {
                                        thread.feature.set('start', start);
                                        thread.feature.set('end', end);
                                        thread.track.redraw();
                                    });
                                },
                                iconClass: 'dijitIconTask'
                            }
                        ]
                    });
            },

            updateComment: function (args, callback) {
                if (args.feature) {
                    var start_o = args.feature.get('start');
                    var end_o = args.feature.get('end');
                    var seq_id_o = args.feature.get('seq_id');
                    var thread_id_o = args.feature.get('thread_id');
                    var name_o = args.feature.get('name');
                    var oldFeature = [0, start_o, end_o, seq_id_o, thread_id_o, name_o];
                }
                var newFeature = [0, args.start || start_o, args.end || end_o, "ctgA", args.thread_id || thread_id_o || 'tempId', args.name || name_o];
                xhr("/updateThread", {
                    handleAs: "json",
                    method: 'POST',
                    data: {
                        old: oldFeature,
                        new: newFeature,
                        action: args.action
                    }
                }).then(function (data) {
                    callback(data);
                });
            },

            /**
             * Make life easier for event handlers by handing them some things
             */
            wrapHandler: function (handler) {
                var track = this;
                return function (event) {
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

            endZoom: function (destScale, destBlockBases) {
                this.clear();
            },

            updateStaticElements: function (coords) {
                this.inherited(arguments);
                this.updateYScaleFromViewDimensions(coords);
                this.updateFeatureLabelPositions(coords);
            },

            updateFeatureLabelPositions: function (coords) {
                var showLabels = this.browser._showLabels;
                if (!('x' in coords))
                    return;

                array.forEach(this.blocks, function (block, blockIndex) {


                    // calculate the view left coord relative to the
                    // block left coord in units of pct of the block
                    // width
                    if (!block || !this.label)
                        return;
                    var viewLeft = 100 * ( (this.label.offsetLeft + (showLabels ? this.label.offsetWidth : 0)) - block.domNode.offsetLeft ) / block.domNode.offsetWidth + 2;

                    // if the view start is unknown, or is to the
                    // left of this block, we don't have to worry
                    // about adjusting the feature labels
                    if (!viewLeft)
                        return;

                    var blockWidth = block.endBase - block.startBase;

                    array.forEach(block.domNode.childNodes, function (featDiv) {
                        if (!featDiv.label) return;
                        var labelDiv = featDiv.label;
                        var feature = featDiv.feature;

                        // get the feature start and end in terms of block width pct
                        var minLeft = parseInt(feature.get('start'));
                        minLeft = 100 * (minLeft - block.startBase) / blockWidth;
                        var maxLeft = parseInt(feature.get('end'));
                        maxLeft = 100 * ( (maxLeft - block.startBase) / blockWidth
                                - labelDiv.offsetWidth / block.domNode.offsetWidth
                            );

                        // move our label div to the view start if the start is between the feature start and end
                        labelDiv.style.left = Math.max(minLeft, Math.min(viewLeft, maxLeft)) + '%';

                    }, this);
                }, this);
            },

            fillBlock: function (args) {
                var blockIndex = args.blockIndex;
                var block = args.block;
                var leftBase = args.leftBase;
                var rightBase = args.rightBase;
                var scale = args.scale;
                var containerStart = args.containerStart;
                var containerEnd = args.containerEnd;

                var region = {ref: this.refSeq.name, start: leftBase, end: rightBase};

                this.store.getGlobalStats(
                    dojo.hitch(this, function (stats) {

                        var density = stats.featureDensity;
                        var histScale = this.config.style.histScale || density * this.config.style._defaultHistScale;
                        var featureScale = this.config.style.featureScale || density / this.config.maxFeatureScreenDensity; // (feat/bp) / ( feat/px ) = px/bp )

                        // only update the label once for each block size
                        var blockBases = Math.abs(leftBase - rightBase);
                        if (this._updatedLabelForBlockSize != blockBases) {
                            if (this.store.getRegionFeatureDensities && scale < histScale) {
                                this.setLabel(this.key + ' <span class="feature-density">per '
                                    + Util.addCommas(Math.round(blockBases / this.numBins))
                                    + ' bp</span>');
                            } else {
                                this.setLabel(this.key);
                            }
                            this._updatedLabelForBlockSize = blockBases;
                        }

                        // if our store offers density histograms, and we are zoomed out far enough, draw them
                        if (this.store.getRegionFeatureDensities && scale < histScale) {
                            this._fillType = 'histograms';
                            this.fillHistograms(args);
                        }
                        // if we have no histograms, check the predicted density of
                        // features on the screen, and display a message if it's
                        // bigger than maxFeatureScreenDensity
                        else if (scale < featureScale) {
                            this.fillTooManyFeaturesMessage(
                                blockIndex,
                                block,
                                scale
                            );
                            args.finishCallback();
                        }
                        else {
                            // if we have transitioned to viewing features, delete the
                            // y-scale used for the histograms
                            this.removeYScale();
                            this._fillType = 'features';
                            this.fillFeatures(dojo.mixin({stats: stats}, args));
                        }
                    }),
                    dojo.hitch(this, 'fillBlockError', blockIndex, block)
                );
            },

            destroy: function () {
                this._clearLayout();
                this.inherited(arguments);
            },

            cleanupBlock: function (block) {
                if (block) {
                    // discard the layout for this range
                    if (this.layout)
                        this.layout.discardRange(block.startBase, block.endBase);

                    if (block.featureNodes)
                        for (var name in block.featureNodes) {
                            var featDiv = block.featureNodes[name];
                            array.forEach(
                                'track,feature,callbackArgs,_labelScale,_descriptionScale'.split(','),
                                function (a) {
                                    Util.removeAttribute(featDiv, a);
                                }
                            );
                            if ('label' in featDiv) {
                                array.forEach(
                                    'track,feature,callbackArgs'.split(','),
                                    function (a) {
                                        Util.removeAttribute(featDiv.label, a);
                                    }
                                );
                                Util.removeAttribute(featDiv, 'label');
                            }
                        }
                }

                this.inherited(arguments);
            },


            /**
             * arguments:
             * @param args.block div to be filled with info
             * @param args.leftBlock div to the left of the block to be filled
             * @param args.rightBlock div to the right of the block to be filled
             * @param args.leftBase starting base of the block
             * @param args.rightBase ending base of the block
             * @param args.scale pixels per base at the current zoom level
             * @param args.containerStart don't make HTML elements extend further left than this
             * @param args.containerEnd don't make HTML elements extend further right than this. 0-based.
             */
            fillFeatures: function (args) {
                var blockIndex = args.blockIndex;
                var block = args.block;
                var leftBase = args.leftBase;
                var rightBase = args.rightBase;
                var scale = args.scale;
                var stats = args.stats;
                var containerStart = args.containerStart;
                var containerEnd = args.containerEnd;
                var finishCallback = args.finishCallback;

                this.scale = scale;

                block.featureNodes = {};

                //determine the glyph height, arrowhead width, label text dimensions, etc.
                if (!this.haveMeasurements) {
                    this.measureStyles();
                    this.haveMeasurements = true;
                }

                var labelScale = this.config.style.labelScale || stats.featureDensity * this.config.style._defaultLabelScale;
                var descriptionScale = this.config.style.descriptionScale || stats.featureDensity * this.config.style._defaultDescriptionScale;

                var curTrack = this;
                var featCallback = dojo.hitch(this, function (feature) {
                    var uniqueId = feature.id();
                    if (!this._featureIsRendered(uniqueId)) {
                        /* feature render, adding to block, centering refactored into addFeatureToBlock() */
                        // var filter = this.browser.view.featureFilter;
                        if (this.filterFeature(feature)) {
                            this.addFeatureToBlock(feature, uniqueId, block, scale, labelScale, descriptionScale,
                                containerStart, containerEnd);
                            window.setTimeout(function () {
                                try {
                                    query('body').onclick(function () {
                                        query('#wrapper').addClass('toggled');
                                    });
                                    query('.comment').onclick(function (e) {
                                        e.stopPropagation(); //this call will cancel the execution bubble
                                    });
                                }
                                catch (e) {
                                    console.error(e);
                                }
                            }, 2000);
                        }
                    }
                });

                var deco = new ArrayRepr([
                    {
                        attributes: [
                            "Start",
                            "End",
                            "Seq_id",
                            "thread_id",
                            "name",
                            "class_css"
                        ]
                    }
                ]);

                for (var i = 0; i < this.newFeats.length; i++) {
                    var cfeat = this.newFeats[i];

                    this.store._decorate_feature(deco.accessors(), cfeat, id);
                    var id = cfeat.get('thread_id');
                    if (cfeat.get('start') > block.startBase && cfeat.get('start') < block.endBase) {
                        if (!this._featureIsRendered(id)) {
                            this.addFeatureToBlock(cfeat, id, block, scale, labelScale, descriptionScale, containerStart, containerEnd);
                        }
                    }
                }

                this.store.getFeatures({
                        ref: this.refSeq.name,
                        start: leftBase,
                        end: rightBase
                    },
                    featCallback,
                    function (args) {
                        curTrack.heightUpdate(curTrack._getLayout(scale).getTotalHeight(),
                            blockIndex);
                        if (args && args.maskingSpans) {
                            //note: spans have to be inverted
                            var invSpan = [];
                            invSpan[0] = {start: leftBase};
                            var i = 0;
                            for (var span in args.maskingSpans) {
                                if (args.maskingSpans.hasOwnProperty(span)) {
                                    span = args.maskingSpans[span];
                                    invSpan[i].end = span.start;
                                    i++;
                                    invSpan[i] = {start: span.end};
                                }
                            }
                            invSpan[i].end = rightBase;
                            if (invSpan[i].end <= invSpan[i].start) {
                                invSpan.splice(i, 1);
                            }
                            if (invSpan[0].end <= invSpan[0].start) {
                                invSpan.splice(0, 1);
                            }
                            curTrack.maskBySpans(invSpan, args.maskingSpans);
                        }
                        finishCallback();
                    },
                    function (error) {
                        console.error(error, error.stack);
                        curTrack.fillBlockError(blockIndex, block, error);
                        finishCallback();
                    }
                );
            },

            /**
             *  Creates feature div, adds to block, and centers subfeatures.
             *  Overridable by subclasses that need more control over the substructure.
             */
            addFeatureToBlock: function (feature, uniqueId, block, scale, labelScale, descriptionScale,
                                         containerStart, containerEnd) {
                var featDiv = this.renderFeature(feature, uniqueId, block, scale, labelScale, descriptionScale,
                    containerStart, containerEnd);
                if (!featDiv)
                    return null;

                block.domNode.appendChild(featDiv);
                if (this.config.style.centerChildrenVertically)
                    this._centerChildrenVertically(featDiv);
                return featDiv;
            },


            fillBlockTimeout: function (blockIndex, block) {
                this.inherited(arguments);
                block.featureNodes = {};
            },


            /**
             * Returns true if a feature is visible and rendered someplace in the blocks of this track.
             * @private
             */
            _featureIsRendered: function (uniqueId) {
                var blocks = this.blocks;
                for (var i = 0; i < blocks.length; i++) {
                    if (blocks[i] && blocks[i].featureNodes && blocks[i].featureNodes[uniqueId])
                        return true;
                }
                return false;
            },

            measureStyles: function () {
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
                this.glyphHeight = Math.round(glyphBox.h);
                this.padding = this.defaultPadding + glyphBox.w;
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

            hideAll: function () {
                this._clearLayout();
                return this.inherited(arguments);
            },

            getFeatDiv: function (feature) {
                var id = this.getId(feature);
                if (!id)
                    return null;

                for (var i = 0; i < this.blocks.length; i++) {
                    var b = this.blocks[i];
                    if (b && b.featureNodes) {
                        var f = b.featureNodes[id];
                        if (f)
                            return f;
                    }
                }

                return null;
            },

            getId: function (f) {
                return f.id();
            },

            renderFeature: function (feature, uniqueId, block, scale, labelScale, descriptionScale, containerStart, containerEnd) {
                //featureStart and featureEnd indicate how far left or right
                //the feature extends in bp space, including labels
                //and arrowheads if applicable

                var featureEnd = feature.get('end');
                var featureStart = feature.get('start');
                if (typeof featureEnd == 'string')
                    featureEnd = parseInt(featureEnd);
                if (typeof featureStart == 'string')
                    featureStart = parseInt(featureStart);
                // layoutStart: start genome coord (at current scale) of horizontal space need to render feature,
                //       including decorations (arrowhead, label, etc) and padding
                var layoutStart = featureStart;
                // layoutEnd: end genome coord (at current scale) of horizontal space need to render feature,
                //       including decorations (arrowhead, label, etc) and padding
                var layoutEnd = featureEnd;

                //     JBrowse now draws arrowheads within feature genome coord bounds
                //     For WebApollo we're keeping arrow outside of feature genome coord bounds,
                //           because otherwise arrow can obscure edge-matching, CDS/UTR transitions, small inton/exons, etc.
                //     Would like to implement arrowhead change in WebApollo plugin, but would need to refactor HTMLFeature more to allow for that
                if (this.config.style.arrowheadClass) {
                    switch (feature.get('strand')) {
                        case 1:
                        case '+':
                            layoutEnd += (this.plusArrowWidth / scale);
                            break;
                        case -1:
                        case '-':
                            layoutStart -= (this.minusArrowWidth / scale);
                            break;
                    }
                }

                var levelHeight = this.glyphHeight + this.glyphHeightPad;

                // if the label extends beyond the feature, use the
                // label end position as the end position for layout
                var name = this.getFeatureLabel(feature);
                var description = scale > descriptionScale && this.getFeatureDescription(feature);
                if (description && description.length > this.config.style.maxDescriptionLength)
                    description = description.substr(0, this.config.style.maxDescriptionLength + 1).replace(/(\s+\S+|\s*)$/, '') + String.fromCharCode(8230);

                // add the label div (which includes the description) to the
                // calculated height of the feature if it will be displayed
                if (this.showLabels && scale >= labelScale && name) {
                    layoutEnd = Math.max(layoutEnd, layoutStart + ('' + name).length * this.labelWidth / scale);
                    levelHeight += this.labelHeight + this.labelPad;
                }
                if (this.showLabels && description) {
                    layoutEnd = Math.max(layoutEnd, layoutStart + ('' + description).length * this.labelWidth / scale);
                    levelHeight += this.labelHeight + this.labelPad;
                }

                layoutEnd += Math.max(1, this.padding / scale);

                var top = this._getLayout(scale)
                    .addRect(uniqueId,
                        layoutStart,
                        layoutEnd,
                        levelHeight);

                if (top === null) {
                    // could not lay out, would exceed our configured maxHeight
                    // mark the block as exceeding the max height
                    this.markBlockHeightOverflow(block);
                    return null;
                }

                var featDiv = this.config.hooks.create();

                this._connectFeatDivHandlers(featDiv);
                // NOTE ANY DATA SET ON THE FEATDIV DOM NODE NEEDS TO BE
                // MANUALLY DELETED IN THE cleanupBlock METHOD BELOW
                featDiv.track = this;
                featDiv.feature = feature;
                featDiv.layoutEnd = layoutEnd;

                // border values used in positioning boolean subfeatures, if any.
                featDiv.featureEdges = {
                    s: Math.max(featDiv.feature.get('start'), containerStart),
                    e: Math.min(featDiv.feature.get('end'), containerEnd)
                };

                // (callbackArgs are the args that will be passed to callbacks
                // in this feature's context menu or left-click handlers)
                featDiv.callbackArgs = [this, featDiv.feature, featDiv];

                // save the label scale and description scale in the featDiv
                // so that we can use them later
                featDiv._labelScale = labelScale;
                featDiv._descriptionScale = descriptionScale;

                block.featureNodes[uniqueId] = featDiv;

                // record whether this feature protrudes beyond the left and/or right side of the block
                if (layoutStart < block.startBase) {
                    if (!block.leftOverlaps) block.leftOverlaps = [];
                    block.leftOverlaps.push(uniqueId);
                }
                if (layoutEnd > block.endBase) {
                    if (!block.rightOverlaps) block.rightOverlaps = [];
                    block.rightOverlaps.push(uniqueId);
                }

                var thread_id = feature.get('thread_id');
                var class_css = feature.get('class_css');

                dojo.addClass(featDiv, "feature");
                dojo.addClass(featDiv, "comment");
                dojo.addClass(featDiv, thread_id);
                dojo.addClass(featDiv, class_css);
                var className = this.config.style.className;
                if (className == "{type}") {
                    className = feature.get('type');
                }
                var strand = feature.get('strand');
                switch (strand) {
                    case 1:
                    case '+':
                        dojo.addClass(featDiv, "plus-" + className);
                        break;
                    case -1:
                    case '-':
                        dojo.addClass(featDiv, "minus-" + className);
                        break;
                    default:
                        dojo.addClass(featDiv, className);
                }
                var phase = feature.get('phase');
                if ((phase !== null) && (phase !== undefined))
//            featDiv.className = featDiv.className + " " + featDiv.className + "_phase" + phase;
                    dojo.addClass(featDiv, className + "_phase" + phase);

                // check if this feature is highlighted
                var highlighted = this.isFeatureHighlighted(feature, name);

                // add 'highlighted' to the feature's class if its name
                // matches the objectName of the global highlight and it's
                // within the highlighted region
                if (highlighted)
                    dojo.addClass(featDiv, 'highlighted');

                // Since some browsers don't deal well with the situation where
                // the feature goes way, way offscreen, we truncate the feature
                // to exist betwen containerStart and containerEnd.
                // To make sure the truncated end of the feature never gets shown,
                // we'll destroy and re-create the feature (with updated truncated
                // boundaries) in the transfer method.
                var displayStart = Math.max(featureStart, containerStart);
                var displayEnd = Math.min(featureEnd, containerEnd);
                var blockWidth = block.endBase - block.startBase;
                var featwidth = Math.max(this.minFeatWidth, (100 * ((displayEnd - displayStart) / blockWidth)));
                featDiv.style.cssText =
                    "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;"
                    + "top:" + top + "px;"
                    + " width:" + featwidth + "%;"
                    + (this.config.style.featureCss ? this.config.style.featureCss : "");

                // Store the containerStart/End so we can resolve the truncation
                // when we are updating static elements
                featDiv._containerStart = containerStart;
                featDiv._containerEnd = containerEnd;

                if (this.config.style.arrowheadClass) {
                    var ah = document.createElement("div");
                    var featwidth_px = featwidth / 100 * blockWidth * scale;

                    switch (strand) {
                        case 1:
                        case '+':
                            ah.className = "plus-" + this.config.style.arrowheadClass;
                            ah.style.cssText = "right: " + (-this.plusArrowWidth) + "px";
                            featDiv.appendChild(ah);
                            break;
                        case -1:
                        case '-':
                            ah.className = "minus-" + this.config.style.arrowheadClass;
                            ah.style.cssText = "left: " + (-this.minusArrowWidth) + "px";
                            featDiv.appendChild(ah);
                            break;
                    }
                }

                // fill in the template parameters in the featDiv and also for the labelDiv (see below)
                var context = lang.mixin({track: this, feature: feature, callbackArgs: [this, feature]});
                if (featDiv.title) {
                    featDiv.title = this.template(feature, this._evalConf(context, featDiv.title, "label"));
                }

                if (( name || description ) && this.showLabels && scale >= labelScale) {
                    var classes = '"feature-name ' + thread_id + '"';
                    var labelDiv = dojo.create('div', {
                        className: "feature-label" + ( highlighted ? ' highlighted' : '' ),
                        innerHTML: ( name ? '<div class=' + classes + '>' + name + '</div>' : '' )
                        + ( description ? ' <div class="feature-description">' + description + '</div>' : '' )
                        + ('<span class="disqus-comment-count" data-disqus-identifier=' + thread_id + '>' + '' + '</span>'),
                        style: {
                            top: (top + this.glyphHeight + 2) + "px",
                            left: (100 * (layoutStart - block.startBase) / blockWidth) + '%'
                        }
                    }, block.domNode);

                    this._connectFeatDivHandlers(labelDiv);

                    if (featDiv.title) labelDiv.title = featDiv.title;
                    featDiv.label = labelDiv;


                    // NOTE: ANY DATA ADDED TO THE labelDiv MUST HAVE A
                    // CORRESPONDING DELETE STATMENT IN cleanupBlock BELOW
                    labelDiv.feature = feature;
                    labelDiv.track = this;
                    // (callbackArgs are the args that will be passed to callbacks
                    // in this feature's context menu or left-click handlers)
                    labelDiv.callbackArgs = [this, featDiv.feature, featDiv];
                }

                if (featwidth > this.config.style.minSubfeatureWidth) {
                    this.handleSubFeatures(feature, featDiv, displayStart, displayEnd, block);
                }

                // render the popup menu if configured
                if (this.config.menuTemplate) {
                    window.setTimeout(dojo.hitch(this, '_connectMenus', featDiv), 50 + Math.random() * 150);
                }

                if (typeof this.config.hooks.modify == 'function') {
                    this.config.hooks.modify(this, feature, featDiv);
                }

                return featDiv;
            },

            handleSubFeatures: function (feature, featDiv,
                                         displayStart, displayEnd, block) {
                var subfeatures = feature.get('subfeatures');
                if (subfeatures) {
                    for (var i = 0; i < subfeatures.length; i++) {
                        this.renderSubfeature(feature, featDiv,
                            subfeatures[i],
                            displayStart, displayEnd, block);
                    }
                }
            },

            /**
             * Get the height of a div.  Caches div heights based on
             * classname.
             */
            _getHeight: function (theDiv) {
                if (this.config.disableHeightCache) {
                    return theDiv.offsetHeight || 0;
                }
                else {
                    var c = this.heightCache[theDiv.className];
                    if (c)
                        return c;
                    c = theDiv.offsetHeight || 0;
                    this.heightCache[theDiv.className] = c;
                    return c;
                }
            },

            /**
             * Vertically centers all the child elements of a feature div.
             * @private
             */
            _centerChildrenVertically: function (/**HTMLElement*/ featDiv) {
                if (featDiv.childNodes.length > 0) {
                    var parentHeight = this._getHeight(featDiv);
                    for (var i = 0; i < featDiv.childNodes.length; i++) {
                        var child = featDiv.childNodes[i];
                        // only operate on child nodes that can be styled,
                        // i.e. HTML elements instead of text nodes or whatnot
                        if (child.style) {
                            // cache the height of elements, for speed.
                            var h = this._getHeight(child);
                            dojo.style(child, {marginTop: '0', top: ((parentHeight - h) / 2) + 'px'});
                            // recursively center any descendants
                            if (child.childNodes.length > 0) {
                                this._centerChildrenVertically(child);
                            }
                        }
                    }
                }
            },

            /**
             * Connect our configured event handlers to a given html element,
             * usually a feature div or label div.
             */
            _connectFeatDivHandlers: function (/** HTMLElement */ div) {
                for (var event in this.eventHandlers) {
                    this.own(on(div, event, this.eventHandlers[event]));
                }
                // if our click handler has a label, set that as a tooltip
                if (this.eventHandlers.click && this.eventHandlers.click.label)
                    div.setAttribute('title', this.eventHandlers.click.label);
            },

            _connectMenus: function (featDiv) {
                // don't actually make the menu until the feature is
                // moused-over.  pre-generating menus for lots and lots of
                // features at load time is way too slow.
                var refreshMenu = lang.hitch(this, '_refreshMenu', featDiv);
                this.own(on(featDiv, 'mouseover', refreshMenu));
                if (featDiv.label) {
                    this.own(on(featDiv.label, 'mouseover', refreshMenu));
                }
            },

            _refreshMenu: function (featDiv) {
                // if we already have a menu generated for this feature,
                // give it a new lease on life
                if (!featDiv.contextMenu) {
                    featDiv.contextMenu = this._makeFeatureContextMenu(featDiv, this.config.menuTemplate);
                }

                // give the menu a timeout so that it's cleaned up if it's not used within a certain time
                if (featDiv.contextMenuTimeout) {
                    window.clearTimeout(featDiv.contextMenuTimeout);
                }
                var timeToLive = 30000; // clean menus up after 30 seconds
                featDiv.contextMenuTimeout = window.setTimeout(function () {
                    if (featDiv.contextMenu) {
                        featDiv.contextMenu.destroyRecursive();
                        Util.removeAttribute(featDiv, 'contextMenu');
                    }
                    Util.removeAttribute(featDiv, 'contextMenuTimeout');
                }, timeToLive);
            },

            /**
             * Make the right-click dijit menu for a feature.
             */
            _makeFeatureContextMenu: function (featDiv, menuTemplate) {
                // interpolate template strings in the menuTemplate
                menuTemplate = this._processMenuSpec(
                    dojo.clone(menuTemplate),
                    featDiv
                );

                // render the menu, start it up, and bind it to right-clicks
                // both on the feature div and on the label div
                var menu = this._renderContextMenu(menuTemplate, featDiv);
                menu.startup();
                menu.bindDomNode(featDiv);
                if (featDiv.label)
                    menu.bindDomNode(featDiv.label);

                return menu;
            },

            renderSubfeature: function (feature, featDiv, subfeature, displayStart, displayEnd, block) {
                var subStart = subfeature.get('start');
                var subEnd = subfeature.get('end');
                var featLength = displayEnd - displayStart;
                var type = subfeature.get('type');
                var className;
                if (this.config.style.subfeatureClasses) {
                    className = this.config.style.subfeatureClasses[type];
                    // if no class mapping specified for type, default to subfeature.get('type')
                    if (className === undefined) {
                        className = type;
                    }
                    // if subfeatureClasses specifies that subfeature type explicitly maps to null className
                    //     then don't render the feature
                    else if (className === null) {
                        return null;
                    }
                }
                else {
                    // if no config.style.subfeatureClasses to specify subfeature class mapping, default to subfeature.get('type')
                    className = type;
                }

                // a className of 'hidden' causes things to not even be rendered
                if (className == 'hidden')
                    return null;

                var subDiv = document.createElement("div");
                // used by boolean tracks to do positiocning
                subDiv.subfeatureEdges = {s: subStart, e: subEnd};

                dojo.addClass(subDiv, "subfeature");
                // check for className to avoid adding "null", "plus-null", "minus-null"
                if (className) {
                    switch (subfeature.get('strand')) {
                        case 1:
                        case '+':
                            dojo.addClass(subDiv, "plus-" + className);
                            break;
                        case -1:
                        case '-':
                            dojo.addClass(subDiv, "minus-" + className);
                            break;
                        default:
                            dojo.addClass(subDiv, className);
                    }
                }

                // if the feature has been truncated to where it doesn't cover
                // this subfeature anymore, just skip this subfeature
                if (subEnd <= displayStart || subStart >= displayEnd)
                    return null;

                if (Util.is_ie6) subDiv.appendChild(document.createComment());

                subDiv.style.cssText = "left: " + (100 * ((subStart - displayStart) / featLength)) + "%;"
                    + "width: " + (100 * ((subEnd - subStart) / featLength)) + "%;";
                featDiv.appendChild(subDiv);

                block.featureNodes[subfeature.id()] = subDiv;

                return subDiv;
            },

            _getLayout: function (scale) {

                //determine the glyph height, arrowhead width, label text dimensions, etc.
                if (!this.haveMeasurements) {
                    this.measureStyles();
                    this.haveMeasurements = true;
                }

                // create the layout if we need to, and we can
                if (( !this.layout || this.layout.pitchX != 4 / scale ) && scale)
                    this.layout = new Layout({
                        pitchX: 4 / scale,
                        pitchY: this.config.layoutPitchY || (this.glyphHeight + this.glyphHeightPad),
                        maxHeight: this.getConf('maxHeight')
                    });


                return this.layout;
            },
            _clearLayout: function () {
                delete this.layout;
            },

            clear: function () {
                delete this.layout;
                this.inherited(arguments);
            },

            /**
             *   indicates a change to this track has happened that may require a re-layout
             *   clearing layout here, and relying on superclass BlockBased.changed() call and
             *   standard _changedCallback function passed in track constructor to trigger relayout
             */
            changed: function () {
                this._clearLayout();
                this.inherited(arguments);
            },

            _exportFormats: function () {
                return [{name: 'GFF3', label: 'GFF3', fileExt: 'gff3'}, {
                    name: 'BED',
                    label: 'BED',
                    fileExt: 'bed'
                }, {name: 'SequinTable', label: 'Sequin Table', fileExt: 'sqn'}];
            },

            _trackMenuOptions: function () {
                var o = this.inherited(arguments);
                var track = this;

                o.push.apply(o, [{
                    type: 'dijit/MenuSeparator'
                }, {
                    label: 'Start New Thread',
                    type: 'dijit/MenuItem',
                    onClick: function () {
                        var name = prompt("Enter title for thread");
                        var start = prompt("Enter start position");
                        var end = prompt("Enter End position");
                        track.updateComment({
                            start: start,
                            end: end,
                            name: name,
                            action: "insert"
                        }, function (res) {
                            var thread_id = res.id;
                            startThread('http://jbrowse.org/v2/' + thread_id, thread_id, name);
                            track.newFeats.push([0, start, end, "ctgA", thread_id, name]);
                            track.redraw();
                        });
                    }
                }]);
                for (var i = 0; i < o.length; i++) {
                    if (
                        o[i].label == "Edit config" ||
                        o[i].label == "About this track" ||
                        o[i].label == "Save track data"
                    ) {
                        delete o[i];
                    }
                }

                return o;
            }
        });

        return CommentFeatures;
    });

/*

 Copyright (c) 2007-2010 The Evolutionary Software Foundation

 CommentFeatures track is implemented by Pubudu Dodangoda <pubudu.dodan@gmail.com>
 based on HTMLFetaures track Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

 This package and its accompanying libraries are free software; you can
 redistribute it and/or modify it under the terms of the LGPL (either
 version 2.1, or at your option, any later version) or the Artistic
 License 2.0.  Refer to LICENSE for the full license text.

 */
