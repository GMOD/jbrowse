define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dijit/MenuItem',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function(
            declare,
            array,
            MenuItem,
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
                colorByOrientation: false,
                orientationType: 'fr',

                hideDuplicateReads: true,
                hideQCFailingReads: true,
                hideSecondary: true,
                hideSupplementary: true,
                hideUnmapped: true,
                hideUnsplicedReads: false,
                hideMissingMatepairs: false,
                hideForwardStrand: false,
                hideReverseStrand: false,
                useXS: false,
                useTS: false,
                useReverseTemplate: false,
                useReverseTemplateOption: true,
                viewAsPairs: false,
                viewAsSpans: false,
                showInterchromosomalArcs: true,
                maxInsertSize: 200000,

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

    _trackMenuOptions: function() {
        var thisB = this;
        var displayOptions = [];

        var m = {
            type: 'dijit/Menu',
            label: 'Track visualization types',
            children: []
        }
        var c = {
            type: 'dijit/Menu',
            label: 'Drawing options',
            children: []
        }


        displayOptions.push(m)
        displayOptions.push(c)

        m.children.push({
            label: 'View as unpaired',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/Alignment',
            onClick: function(event) {
                thisB.config.viewAsPairs = false
                thisB.config.viewAsSpans = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/Alignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View as pairs',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedAlignment',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.viewAsSpans = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View as arcs',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc',
            onClick: function(event) {
                thisB.config.viewAsSpans = true
                thisB.config.viewAsPairs = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedArc'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        m.children.push({
            label: 'View as read cloud',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.viewAsSpans = false
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
            label: 'Color by XS tag (RNA-seq orientation)',
            type: 'dijit/CheckedMenuItem',
            checked: this.config.useXS,
            onClick: function(event) {
                thisB.config.useXS = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        c.children.push({
            label: 'Color by TS tag (RNA-seq orientation)',
            type: 'dijit/CheckedMenuItem',
            checked: this.config.useTS,
            onClick: function(event) {
                thisB.config.useTS = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color mate pair as flipped (RNA-seq orientation)',
            type: 'dijit/CheckedMenuItem',
            checked: this.config.useReverseTemplate,
            onClick: function(event) {
                thisB.config.useReverseTemplate = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by pair orientation and insert size',
            type: 'dijit/CheckedMenuItem',
            checked: this.config.colorByOrientation,
            onClick: function(event) {
                thisB.config.colorByOrientation = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Show interchromosomal',
            type: 'dijit/CheckedMenuItem',
            checked: this.config.showInterchromosomalArcs,
            onClick: function(event) {
                thisB.config.showInterchromosomalArcs = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        return Promise.all([ this.inherited(arguments), this._alignmentsFilterTrackMenuOptions(), displayOptions ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift({ type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    },

    // override getLayout to access addRect method
    _getLayout: function() {
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

    fillFeatures: function( args ) {
        const finishCallback = args.finishCallback
        const errorCallback = e => {
            console.error(e)
            this._handleError(e, args)
            finishCallback(e)
        }

        if(this.config.viewAsPairs || this.config.viewAsSpans || this.config.colorByOrientation) {
            let supermethod = this.getInherited(arguments)
            const len = Math.min(Math.max(args.rightBase - args.leftBase, 4000), 100000)
            const region = {
                ref: this.refSeq.name,
                start: Math.max(0, args.leftBase),
                end: args.rightBase,
                viewAsPairs: true
            }
            const e = 30
            const min = Math.max(0, region.start - len * e)
            const max = region.end + len * e
            this.initialCachePromise = this.initialCachePromise || new Promise((resolve, reject) => {
                this.store.getFeatures({
                    ref: this.refSeq.name,
                    start: min,
                    end: max,
                    viewAsPairs: this.config.viewAsPairs,
                    viewAsSpans: this.config.viewAsSpans
                }, () => { /* do nothing */}, () => {
                    var stats = this.store.getInsertSizeStats()
                    this.upperPercentile = stats.upper
                    this.lowerPercentile = stats.lower

                    resolve()
                }, reject)
            })
            this.initialCachePromise.then(() => {
                args.finishCallback = () => {
                    finishCallback()
                    setTimeout(() => {
                        this.store.cleanFeatureCache({
                            ref: this.refSeq.name,
                            start: min,
                            end: max
                        })
                    }, 10000)
                }
                supermethod.call(this, args)
            }, errorCallback)
        } else {
            this.inherited(arguments);
        }
    },

    constructor() {
        this.addFeatureFilter(feat => {
            return (this.config.viewAsPairs && feat.get('end') - feat.get('start') < this.config.maxInsertSize) || !this.config.viewAsPairs
        })
    }
});
});
