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
                defaultColor: true,
                useReverseTemplate: false,
                useReverseTemplateOption: true,
                viewAsPairs: false,
                viewAsSpans: false,
                maxInsertSize: 50000,

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
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/Alignment'
                thisB.browser.cookie('track-' + thisB.name, JSON.stringify(thisB.config));
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View as pairs',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedAlignment',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        m.children.push({
            label: 'View as arcs',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedArc'
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        m.children.push({
            label: 'View as read cloud',
            type: 'dijit/RadioMenuItem',
            checked: this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud',
            onClick: function(event) {
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedReadCloud'
                thisB.browser.saveConfig(thisB.config, thisB.name);
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
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        c.children.push({
            label: 'Color by aligned strand',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.defaultColor,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.defaultColor = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by XS tag (RNA-seq orientation)',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.useXS,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.useXS = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        c.children.push({
            label: 'Color by TS tag (RNA-seq orientation)',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.useTS,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.useTS = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color mate pair as flipped (RNA-seq orientation)',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.useReverseTemplate,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.useReverseTemplate = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by orientation',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorByOrientation,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.colorByOrientation = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by insert size',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorBySize,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.colorBySize = this.get('checked');
                console.log('here',thisB.config)
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Color by orientation and insert size',
            type: 'dijit/RadioMenuItem',
            checked: !!this.config.colorByOrientationAndSize,
            onClick: function(event) {
                Object.assign(thisB.config, {defaultColor: false, useXS: false, useReverseTemplate: false, colorByOrientation: false, colorBySize: false, colorByOrientationAndSize: false})
                thisB.config.colorByOrientationAndSize = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        c.children.push({
            label: 'Show interchromosomal',
            type: 'dijit/CheckedMenuItem',
            checked: !!this.config.showInterchromosomalArcs,
            onClick: function(event) {
                thisB.config.showInterchromosomalArcs = this.get('checked');
                thisB.browser.saveConfig(thisB.config, thisB.name);
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
            const len = Math.max(args.rightBase - args.leftBase, 4000)
            const region = {
                ref: this.refSeq.name,
                start: Math.max(0, args.leftBase),
                end: args.rightBase,
                viewAsPairs: true
            }
            const e = 20
            const min = Math.max(0, region.start - Math.min(len * e, 100000))
            const max = region.end + Math.min(len * e, 100000)
            var cachePromise = new Promise((resolve, reject) => {
                this.store.getFeatures({
                    ref: this.refSeq.name,
                    start: min,
                    end: max,
                    viewAsPairs: this.config.viewAsPairs,
                    viewAsSpans: this.config.viewAsSpans,
                    maxInsertSize: this.config.maxInsertSize
                }, () => { /* do nothing */}, () => {
                    this.stats = this.stats || this.store.getInsertSizeStats()
                    this.upperPercentile = this.stats.upper
                    this.lowerPercentile = this.stats.lower

                    resolve()
                }, reject)
            })
            cachePromise.then(() => {
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
