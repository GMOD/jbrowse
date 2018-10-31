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
            label: 'Color by pair orientation',
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
        if(this.config.readCloud) {
            layout = declare.safeMixin(layout, {
                addRect: function() {
                    this.pTotalHeight = this.maxHeight;
                    return 0;
                }
            });
        }
        return layout;
    },

    fillBlock: function( args ) {

        // workaround for the fact that initial load of JBrowse invokes fillBlock on nonsense regions
        // and then the cache cleanup can be invoked in ways that destroys visible features
        this.removeFeaturesFromCacheAfterDelay = this.removeFeaturesFromCacheAfterDelay || false
        if(!this.removeFeaturesFromCacheAfterDelay) {
            setTimeout(() => {
                this.removeFeaturesFromCacheAfterDelay = true
            }, 10000)
        }
        if(this.config.viewAsPairs) {
            let supermethod = this.getInherited(arguments)
            var reg = this.browser.view.visibleRegion()
            var len = Math.max(reg.end - reg.start, 4000)
            const region = {
                ref: this.refSeq.name,
                start: Math.max( 0, reg.start ),
                end: reg.end,
                viewAsPairs: true
            }

            const min = Math.max(0, region.start - len*4)
            const max = region.end + len*4
            this.store.getFeatures({ ref: this.refSeq.name, start: min, end: max, viewAsPairs: true }, () => { /* do nothing */}, () => {
                var stats = this.store.getStatsForPairCache()
                this.upperPercentile = stats.upper
                this.lowerPercentile = stats.lower
                if(this.removeFeaturesFromCacheAfterDelay) {
                    let f = args.finishCallback
                    args.finishCallback = () => {
                        f()
                        setTimeout(() => {
                            this.store.cleanFeatureCache({ ref: this.refSeq.name, start: min, end: max })
                        }, 1000)
                    }
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
