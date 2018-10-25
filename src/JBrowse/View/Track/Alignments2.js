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

    constructor: function() {
        this.fetchMap = {}
    },

    _defaultConfig: function() {
        var c = Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                glyph: 'JBrowse/View/FeatureGlyph/Alignment',
                maxFeatureGlyphExpansion: 0,
                maxFeatureScreenDensity: 15,

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
            type: 'dijit/RadioMenuItem',
            group: 'g2',
            onClick: function(event) {
                thisB.config.type = 'JBrowse/View/Track/SNPCoverage'
                thisB.config.style.height = 200
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        displayOptions.push({
            label: 'View normal',
            type: 'dijit/RadioMenuItem',
            group: 'g2',
            onClick: function(event) {
                thisB.config.viewAsPairs = false
                thisB.config.readCloud = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/Alignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        displayOptions.push({
            label: 'View as pairs',
            type: 'dijit/RadioMenuItem',
            group: 'g2',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.readCloud = false
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        displayOptions.push({
            label: 'View paired arcs',
            type: 'dijit/RadioMenuItem',
            group: 'g2',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.readCloud = true
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedArc'
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });
        displayOptions.push({
            label: 'View pairs as read cloud',
            type: 'dijit/RadioMenuItem',
            group: 'g2',
            onClick: function(event) {
                thisB.config.viewAsPairs = true
                thisB.config.readCloud = true
                thisB.config.glyph = 'JBrowse/View/FeatureGlyph/PairedAlignment'
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
        if(this.config.viewAsPairs) {
            let supermethod = this.getInherited(arguments)
            var reg = this.browser.view.visibleRegion()
            var len = reg.end - reg.start
            const region = {
                ref: this.refSeq.name,
                start: Math.max( 0, reg.start ),
                end: reg.end,
                viewAsPairs: true
            }

            const min = Math.max(0, region.start - len*4)
            const max = region.end + len*4
            const str = min + '_' + max
            if(!this.fetchMap[str]) {
                this.fetchMap[str] = new Promise((resolve, reject) => {
                    this.store.getFeatures({ ref: this.refSeq.name, start: min, end: max, viewAsPairs: true }, () => { /* do nothing */}, resolve, reject)
                })
            }
            this.fetchMap[str].then(() => {
                supermethod.apply(this, [args])
            })
        } else {
            this.inherited(arguments);
        }
    }


});
});
