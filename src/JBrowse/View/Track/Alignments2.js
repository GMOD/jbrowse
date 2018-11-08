define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/promise/all',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function(
            declare,
            array,
            all,
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
                useReverseTemplate: false,
                useXSOption: true,
                useReverseTemplateOption: true,
                viewAsPairs: false,
                readCloud: false,

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

    _trackMenuOptions: function() {
        var thisB = this;
        var displayOptions = [];


        if(this.config.useReverseTemplateOption) {
            displayOptions.push({
                label: 'Use reversed template',
                type: 'dijit/CheckedMenuItem',
                checked: this.config.useReverseTemplate,
                onClick: function(event) {
                    thisB.config.useReverseTemplate = this.get('checked');
                    thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                }
            });
        }
        if(this.config.useXSOption) {
            displayOptions.push({
                label: 'Use XS',
                type: 'dijit/CheckedMenuItem',
                checked: this.config.useXS,
                onClick: function(event) {
                    thisB.config.useXS = this.get('checked');
                    thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
                }
            });
        }

        displayOptions.push({
            label: 'View coverage',
            onClick: function(event) {
                thisB.config.type = 'JBrowse/View/Track/SNPCoverage'
                thisB.config._oldAlignmentsHeight = thisB.config.style.height
                thisB.config.style.height = thisB.config._oldSnpCoverageHeight
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        displayOptions.push({
            label: 'View normal',
            onClick: function(event) {
                thisB.config.viewAsPairs = false
                thisB.config.readCloud = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/Alignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        displayOptions.push({
            label: 'View as pairs',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.readCloud = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        displayOptions.push({
            label: 'View paired arcs',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.readCloud = true
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedArc'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        displayOptions.push({
            label: 'View pairs as read cloud',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.readCloud = true
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        displayOptions.push({
            label: 'Color by pair orientation and insert size',
            type: 'dijit/CheckedMenuItem',
            checked: this.config.colorByOrientation,
            onClick: function(event) {
                thisB.config.colorByOrientation = this.get('checked');
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        return all([ this.inherited(arguments), this._alignmentsFilterTrackMenuOptions(), displayOptions ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift({ type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    },

    // override getLayout to access addRect method
    _getLayout: function() {
        var layout = this.inherited(arguments);
        if(this.config.readCloud || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc') {
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
        if(this.config.viewAsPairs) {
            let supermethod = this.getInherited(arguments)
            var min = args.leftBase
            var max = args.rightBase
            var len = Math.max(min - max, 4000)
            const region = {
                ref: this.refSeq.name,
                start: Math.max( 0, min ),
                end: max,
                viewAsPairs: true
            }

            const min = Math.max(0, region.start - len*30)
            const max = region.end + len*30
            this.store.getFeatures({ ref: this.refSeq.name, start: min, end: max, viewAsPairs: true }, () => { /* do nothing */}, () => {
                var stats = this.store.getStatsForPairCache()
                this.upperPercentile = stats.upper
                this.lowerPercentile = stats.lower
                this.avgPercentile = stats.avg
                let f = args.finishCallback
                args.finishCallback = () => {
                    f()
                    setTimeout(() => {
                        this.store.cleanFeatureCache({ ref: this.refSeq.name, start: min, end: max })
                    }, 1000)
                }
                supermethod.call(this, args)
            }, e => {
                console.error(e)
            })
        } else {
            this.inherited(arguments);
        }
    }


});
});
