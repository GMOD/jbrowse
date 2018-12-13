define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dijit/MenuItem',
            'JBrowse/View/Dialog/SetTrackHeight',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function(
            declare,
            array,
            MenuItem,
            Dialog,
            Util,
            CanvasFeatureTrack,
            AlignmentsMixin
        ) {

return declare( [ CanvasFeatureTrack, AlignmentsMixin ], {
    _defaultConfig: function() {
        var c = Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                glyph: 'JBrowse/View/FeatureGlyph/Alignment',
                maxFeatureGlyphExpansion: 0,
                maxFeatureScreenDensity: 15,

                // filters
                hideDuplicateReads: true,
                hideQCFailingReads: true,
                hideSecondary: true,
                hideSupplementary: true,
                hideUnmapped: true,
                hideUnsplicedReads: false,
                hideMissingMatepairs: false,
                hideImproperPairs: false,
                hideForwardStrand: false,
                hideReverseStrand: false,



                maxInsertSize: 50000,
                readCloudLogScale: true,
                showInterchromosomalArcs: true,
                orientationType: 'fr',
                showLargeArcs: true,

                histograms: {
                    description: 'coverage depth',
                    binsPerBlock: 200
                },

                style: {
                    showLabels: false,
                    colorSchemes: []
                }
            }
        );

      c.menuTemplate.push(
            {
                "iconClass": "dijitIconUndo",
                "url": function( track, feature ) {
                    return track.browser.makeCurrentViewURL(
                        { loc: track._nextSegmentViewLoc( feature, 0.8 ),
                          highlight: feature.get('next_segment_position'),
                          tracklist: 0
                        });
                },
                "action": "iframeDialog",
                title: "Open {next_segment_position} in a popup",
                disabled: function( track, feature ) {
                    return ! feature.get('next_segment_position') || feature.get('paired_feature');
                },
                "label": "Quick-view mate/next location"
            },
            {
                "iconClass": "dijitIconUndo",
                "url": function( track, feature ) {
                    return track.browser.makeCurrentViewURL(
                        { loc: track._nextSegmentViewLoc( feature ),
                          highlight: feature.get('next_segment_position')
                        });
                },
                "action": "newWindow",
                title: "Open {next_segment_position} in a new tab",
                disabled: function( track, feature ) {
                    return ! feature.get('next_segment_position') || feature.get('paired_feature');
                },
                "label": "Open mate/next location in new tab"
            }
        );
        return c;
    },

    _trackType: function() {
    },
    // make a locstring for a view of the given feature's next segment
    // (in a multi-segment read)
    _nextSegmentViewLoc: function( feature, factor ) {
        var nextLocStr = feature.get('next_segment_position');
        if( ! nextLocStr ) return undefined;

        var s = nextLocStr.split(':');
        var refName = s[0];
        var start = parseInt(s[1]);

        var visibleRegion = this.browser.view.visibleRegion();
        var visibleRegionSize = Math.round( (visibleRegion.end - visibleRegion.start + 1 )*(factor||1) );

        return Util.assembleLocString(
            { start: Math.round( start - visibleRegionSize/2 ),
              end: Math.round( start + visibleRegionSize/2 ),
              ref: refName
            });
    },

    _trackMenuOptions() {
        var thisB = this;
        var displayOptions = [];

        var m = {
            type: 'dijit/Menu',
            label: 'Track visualization types',
            children: []
        }
        var c = {
            type: 'dijit/Menu',
            label: 'Coloring options',
            children: []
        }


        displayOptions.push(m)
        displayOptions.push(c)

        m.children.push({
            label: 'View as unpaired',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/Alignment',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/Alignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View as pairs',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedAlignment',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View as arcs',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedArc'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        m.children.push({
            label: 'View as read cloud',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedReadCloud'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View coverage',
            type: 'dijit/RadioMenuItem',
            checked: false,
            onClick: function(event) {
                thisB.config.type = 'JBrowse/View/Track/SNPCoverage'
                thisB.config._oldAlignmentsHeight = thisB.config.style.height
                thisB.config.style.height = thisB.config._oldSnpCoverageHeight
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        this.config.style.colorSchemes.forEach(s => {
            c.children.push({
                label: s.name,
                type: 'dijit/RadioMenuItem',
                checked: !!s.selected,
                onClick: function(event) {
                    thisB.clearColorConfig()
                    s.selected = this.get('checked')
                    thisB.config.style.color = s.callback;
                    thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config])
                }
            })
        })

        if(this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            displayOptions.push({
                type: 'dijit/Menu',
                label: 'Read cloud options',
                children: [{
                    label: 'View log scale',
                    type: 'dijit/CheckedMenuItem',
                    checked: !!this.config.readCloudLogScale,
                    onClick: function(event) {
                        thisB.config.readCloudLogScale = this.get('checked');
                        thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                    }
                }, {
                    label: 'Set Y-scale size',
                    onClick: function(event) {
                        new Dialog({
                            title: 'Set read cloud Y-scale in terms of the maximum expected insert size',
                            msg: ' insert size (note: default estimated from sampling track data)',
                            maxHeight: Infinity,
                            height: thisB.config.readCloudYScaleMax || 50000,
                            setCallback: ret => {
                                thisB.config.readCloudYScaleMax = ret
                                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                            }
                        }).show()
                    }
                }]
            });
        }
        if(this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
            displayOptions.push({
                type: 'dijit/Menu',
                label: 'Paired arc options',
                children: [{
                    label: 'Show interchromosomal',
                    type: 'dijit/CheckedMenuItem',
                    checked: !!this.config.showInterchromosomalArcs,
                    onClick: function(event) {
                        thisB.config.showInterchromosomalArcs = this.get('checked');
                        thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                    }
                }, {
                    label: 'Show large arcs',
                    type: 'dijit/CheckedMenuItem',
                    checked: !!this.config.showLargeArcs,
                    onClick: function(event) {
                        thisB.config.showLargeArcs = this.get('checked');
                        thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                    }
                }]
            });
        }

        displayOptions.push({
            type: 'dijit/MenuItem',
            label: 'Re-estimate insert size stats',
            onClick: function(event) {
                thisB.insertSizeStats = null
                thisB.store.cleanStatsCache()
                thisB.redraw()
            }
        })
        return Promise.all([ this.inherited(arguments), this._alignmentsFilterTrackMenuOptions(), displayOptions ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift({ type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    },

    clearColorConfig() {
        this.config.style.colorSchemes.forEach(s => s.selected = false)
    },

    // override getLayout to access addRect method
    _getLayout() {
        var layout = this.inherited(arguments);
        if(this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud' ||
            this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
            layout = declare.safeMixin(layout, {
                addRect: function() {
                    this.pTotalHeight = this.maxHeight;
                    return 0;
                }
            });
        }
        return layout;
    },

    fillFeatures( args ) {
        const finishCallback = args.finishCallback
        const errorCallback = e => {
            console.error(e)
            this._handleError(e, args)
            finishCallback(e)
        }
        var currentScheme = this.config.style.colorSchemes.find(s => s.selected) || {}

        if(this._viewAsPairs || this._viewAsSpans || (currentScheme.insertStatsRequired && !this.insertSizeStats)) {
            let supermethod = this.getInherited(arguments)
            const blockLen = args.rightBase - args.leftBase
            let min
            let max

            if(this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
                // paired arc the insert size can be large and therefore we request a number of neighboring blocks
                const numNeighboringBlockFetches = 6
                min = Math.max(0, args.leftBase - Math.min(Math.max(blockLen * numNeighboringBlockFetches, this.config.maxInsertSize), 100000))
                max = args.rightBase + Math.min(Math.max(blockLen * numNeighboringBlockFetches, this.config.maxInsertSize), 100000)
            }
            else {
                // otherwise we just request based on maxInsertSize
                min = Math.max(0, args.leftBase - this.config.maxInsertSize)
                max = args.rightBase + this.config.maxInsertSize
            }


            var cachePromise = new Promise((resolve, reject) => {
                this.store.getFeatures({
                    ref: this.refSeq.name,
                    start: min,
                    end: max,
                    viewAsPairs: this._viewAsPairs,
                    viewAsSpans: this._viewAsSpans,
                    maxInsertSize: this.config.maxInsertSize
                }, () => {
                    /* do nothing except initialize caches on store backend */
                }, () => {
                    this.insertSizeStats = this.insertSizeStats || this.store.getInsertSizeStats()
                    resolve()
                }, reject)
            })
            cachePromise.then(() => {
                args.finishCallback = () => {
                    finishCallback()
                    this.store.cleanFeatureCache({
                        ref: this.refSeq.name,
                        start: min,
                        end: max
                    })
                }
                supermethod.call(this, args)
            }, errorCallback)
        } else {
            this.inherited(arguments);
        }
    },

    constructor() {
        // automatically set parameters for the track based on glyph types
        if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
            this._viewAsSpans = true
            this._viewAsPairs = false
            this.config.style.colorSchemes = this.alignmentColorSchemes.filter(s => s.arc)
        } else if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedAlignment' || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            this._viewAsPairs = true
            this._viewAsSpans = false
            this.config.style.colorSchemes = this.alignmentColorSchemes.filter(s => s.normal)
        } else {
            this._viewAsPairs = false
            this._viewAsSpans = false
            this.config.style.colorSchemes = this.alignmentColorSchemes.filter(s => s.normal)
        }


        this.insertSizeStats = this.config.insertSizeStats
    },

    renderClickMap() {
        if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc' || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            return
        } else {
            this.inherited(arguments)
        }
    },


    alignmentColorSchemes: [
        {
            name: 'Default coloring',
            callback: (feature, score, glyph, track) => glyph.defaultColor(feature, score, glyph, track),
            normal: true
        },
        {
            name: 'Color mate reversed (RNA-seq strandedness)',
            callback: (feature, score, glyph, track) => glyph.defaultColor(feature, score, glyph, track, true),
            normal: true
        },
        {
            name: 'Color by XS (RNA-seq strandedness)',
            callback: (feature, score, glyph, track) => glyph.useXS(feature, score, glyph, track),
            normal: true
        },
        {
            name: 'Color by TS (RNA-seq strandedness)',
            callback: (feature, score, glyph, track) => glyph.useTS(feature, score, glyph, track),
            normal: true

        },
        {
            name: 'Default coloring',
            callback: (feature, score, glyph, track) => glyph.colorArcs(feature, score, glyph, track),
            arc: true
        },
        {
            name: 'Color by mapping quality',
            callback: (feature, score, glyph, track) => glyph.colorByMAPQ(feature, score, glyph, track),
            normal: true
        },
        {
            name: 'Color by orientation',
            callback: (feature, score, glyph, track) => glyph.colorByOrientation(feature, score, glyph, track),
            normal: true,
            arc: true
        },
        {
            name: 'Color by insert size',
            callback: (feature, score, glyph, track) => glyph.colorBySize(feature, score, glyph, track),
            normal: true,
            arc: true
        },
        {
            name: 'Color by insert size and orientation',
            callback: (feature, score, glyph, track) => glyph.colorByOrientationAndSize(feature, score, glyph, track),
            normal: true,
            arc: true
        }
    ]

});
});
