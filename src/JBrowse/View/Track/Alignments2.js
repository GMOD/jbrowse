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
                orientationType: 'fr',

                hideDuplicateReads: true,
                hideQCFailingReads: true,
                hideSecondary: true,
                hideSupplementary: true,
                hideUnmapped: true,
                hideUnsplicedReads: false,
                hideMissingMatepairs: false,
                hideIncorrectAlignments: false,
                hideForwardStrand: false,
                hideReverseStrand: false,
                useXS: false,
                useTS: false,
                useReverseTemplate: false,
                useReverseTemplateOption: true,
                viewAsPairs: false,
                viewAsSpans: false,
                maxInsertSize: 50000,
                readCloudLogScale: true,
                showInterchromosomalArcs: true,
                showLargeArcs: true,

                histograms: {
                    description: 'coverage depth',
                    binsPerBlock: 200
                },

                style: {
                    showLabels: false
                }
            }
        );
        return c;
    },

    _trackType: function() {
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

        c.children.push({
            label: 'Color by default',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.defaultColor,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.defaultColor = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by XS tag (RNA-seq orientation)',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.useXS,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.useXS = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        c.children.push({
            label: 'Color by TS tag (RNA-seq orientation)',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.useTS,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.useTS = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color mate pair as flipped (RNA-seq orientation)',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.useReverseTemplate,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.useReverseTemplate = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        c.children.push({
            label: 'Color by mapping quality',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorByMAPQ,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.colorByMAPQ = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by orientation',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorByOrientation,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.colorByOrientation = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by insert size',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorBySize,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.colorBySize = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by orientation and insert size',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorByOrientationAndSize,
            onClick: function(event) {
                thisB.clearColorConfig()
                thisB.config.colorByOrientationAndSize = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
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

        return Promise.all([ this.inherited(arguments), this._alignmentsFilterTrackMenuOptions(), displayOptions ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift({ type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    },
    clearColorConfig() {
        Object.assign(this.config, {
            defaultColor: false,
            useTS: false,
            useXS: false,
            useReverseTemplate: false,
            colorByMAPQ: false,
            colorByOrientation: false,
            colorBySize: false,
            colorByOrientationAndSize: false
        })
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

        if(this.config.viewAsPairs || this.config.viewAsSpans
            || (this.config.colorByOrientationAndSize || this.config.colorBySize && !this.insertSizeStats)) {
            let supermethod = this.getInherited(arguments)
            const blockLen = args.rightBase - args.leftBase
            let min
            let max

            // when we use paired arc the insert size can be large and therefore we request a number of neighboring blocks
            if(this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
                const numNeighboringBlockFetches = 6
                // fetch at least maxInsertSize, but possibly more
                min = Math.max(0, args.leftBase - Math.min(Math.max(blockLen * numNeighboringBlockFetches, this.config.maxInsertSize), 100000))
                max = args.rightBase + Math.min(Math.max(blockLen * numNeighboringBlockFetches, this.config.maxInsertSize), 100000)
            } else {
                // otherwise we just request based on maxInsertSize
                min = Math.max(0, args.leftBase - this.config.maxInsertSize)
                max = args.rightBase + this.config.maxInsertSize
            }


            var cachePromise = new Promise((resolve, reject) => {
                this.store.getFeatures({
                    ref: this.refSeq.name,
                    start: min,
                    end: max,
                    viewAsPairs: this.config.viewAsPairs,
                    viewAsSpans: this.config.viewAsSpans,
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
        if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
            this.config.viewAsSpans = true
            this.config.viewAsPairs = false
        } else if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedAlignment'
            || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            this.config.viewAsPairs = true
            this.config.viewAsSpans = false
        } else {
            this.config.viewAsPairs = false
            this.config.viewAsSpans = false
        }

        // determine if alternate color scheme in use, otherwise make default
        var elts = ['defaultColor', 'useXS', 'useTS', 'useReverseTemplate', 'colorByOrientation', 'colorBySize', 'colorByOrientationAndSize', 'colorByMAPQ']
        var none = true
        for(var i = 0; i < elts.length; i++) {
            if(this.config[elts[i]]) {
                none = false
            }
        }
        if(none) {
            this.config.defaultColor = true
        }

    },

    renderClickMap() {
        if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc'
        || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            return
        } else {
            this.inherited(arguments)
        }
    }
});
});
