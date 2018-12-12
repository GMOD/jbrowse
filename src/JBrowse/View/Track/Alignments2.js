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
                    colorSchemes: [{
                        name: 'Color by default',
                        callback: dojo.hitch(this, 'defaultColor'),
                        selected: true
                    },
                    {
                        name: 'Color mate reversed (RNA-seq strandedness)',
                        callback: (feature, score, glyph, track) => this.defaultColor(feature, score, glyph, track, true)
                    },
                    {
                        name: 'Color by XS (RNA-seq strandedness)',
                        callback: function(feature, score, glyph, track) {
                            const map = {
                                '-': 'color_rev_strand',
                                '+': 'color_fwd_strand'
                            };
                            return glyph.getStyle(feature, map[feature.get('xs')] || 'color_nostrand');
                        }
                    },
                    {
                        name: 'Color by TS (RNA-seq strandedness)',
                        callback: function(feature, score, glyph, track) {
                            const map = {
                                '-': feature.get('strand') === -1 ? 'color_fwd_strand' : 'color_rev_strand',
                                '+': feature.get('strand') === -1 ? 'color_rev_strand' : 'color_fwd_strand'
                            }
                            return glyph.getStyle(feature, map[feature.get('ts')] || 'color_nostrand');
                        }
                    },
					{
                        name: 'Color by mapping quality',
                        callback: function(feature, score, glyph, track) {
                            const c = Math.min(feature.get('score') * 4, 200)
                            return `rgb(${c},${c},${c})`;
                        }
                    },
                    {
                        name: 'Color by insert size',
                        insertStatsRequired: true,
						callback: function(feature, score, glyph, track)  {
							const p = track.getInsertSizePercentile.apply(track, arguments)
							return glyph.getStyle(feature, p || 'color_nostrand')
						}
                    },
                    {
                        name: 'Color by orientation',
						callback: function(feature, score, glyph, track)  {
							const p = track.getOrientation.apply(track, arguments)
							return glyph.getStyle(feature, p || 'color_nostrand')
						}
                    },
                    {
                        name: 'Color by insert size and orientation',
                        insertStatsRequired: true,
						callback: function(feature, score, glyph, track)  {
							const p = track.getInsertSizePercentile.apply(track, arguments)
							if(!p) {
                                const q = track.getOrientation.apply(track, arguments)
                                return glyph.getStyle(feature, q || 'color_nostrand')
							}
							return glyph.getStyle(feature, p || 'color_nostrand')
						}
                    }]
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
                    thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config])
                }
            })
        })

//         c.children.push({
//             label: 'Color by default',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.defaultColor,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.defaultColor = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });
//         c.children.push({
//             label: 'Color by XS tag (RNA-seq orientation)',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.useXS,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.useXS = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });

//         c.children.push({
//             label: 'Color by TS tag (RNA-seq orientation)',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.useTS,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.useTS = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });
//         c.children.push({
//             label: 'Color mate pair as flipped (RNA-seq orientation)',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.useReverseTemplate,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.useReverseTemplate = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });

//         c.children.push({
//             label: 'Color by mapping quality',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.colorByMAPQ,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.colorByMAPQ = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });
//         c.children.push({
//             label: 'Color by orientation',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.colorByOrientation,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.colorByOrientation = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });
//         c.children.push({
//             label: 'Color by insert size',
//             type: 'dijit/RadioMenuItem',
//             checked: !!this.config.colorBySize,
//             onClick: function(event) {
//                 thisB.clearColorConfig()
//                 thisB.config.colorBySize = this.get('checked');
//                 thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
//             }
//         });
        // c.children.push({
        //     label: 'Color by orientation and insert size',
        //     type: 'dijit/RadioMenuItem',
        //     checked: !!this.config.colorByOrientationAndSize,
        //     onClick: function(event) {
        //         thisB.clearColorConfig()
        //         thisB.config.colorByOrientationAndSize = this.get('checked');
        //         thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
        //     }
        // });
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
        } else if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedAlignment' || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            this._viewAsPairs = true
            this._viewAsSpans = false
        } else {
            this._viewAsPairs = false
            this._viewAsSpans = false
        }
        this.insertSizeStats = this.config.insertSizeStats

        // determine if alternate color scheme in use, otherwise make default
        var elts = [
            'defaultColor',
            'useReverseTemplate',
            'colorByOrientation',
            'colorBySize',
            'colorByOrientationAndSize',
        ]

        if(!elts.some(e => this.config[e] == true)) {
            this.config.defaultColor = true
        }
    },

    renderClickMap() {
        if (this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedArc' || this.config.glyph == 'JBrowse/View/FeatureGlyph/PairedReadCloud') {
            return
        } else {
            this.inherited(arguments)
        }
    },

    getInsertSizePercentile(feature) {
        if (feature.get('is_paired')) {
            const len = Math.abs(feature.get('template_length'))
            if(feature.get('seq_id') != feature.get('next_seq_id')) {
                return 'color_interchrom'
            } else if (this.insertSizeStats.upper < len) {
                return 'color_longinsert'
            } else if (this.insertSizeStats.lower > len) {
                return 'color_shortinsert'
            }
        }
        return null
    },

    getOrientation(feature) {
        const type = Util.orientationTypes[this.config.orientationType]
        const orientation = type[feature.get('pair_orientation')]
        return {
            'LR': 'color_pair_lr',
            'RR': 'color_pair_rr',
            'RL': 'color_pair_rl',
            'LL': 'color_pair_ll'
        }[orientation]
	},

    defaultColor(feature, score, glyph, track, useReverseTemplate) {
        var strand = feature.get('strand');
        if (Math.abs(strand) != 1 && strand != '+' && strand != '-') {
            return this.colorForBase('reference');
        } else {
            if(feature.get('multi_segment_template')) {
                var revflag = feature.get('multi_segment_first');
                if (feature.get('multi_segment_all_correctly_aligned')) {
                    if (revflag || !useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand' )
                              : glyph.getStyle( feature, 'color_rev_strand' );
                    } else {
                        return strand == 1 || strand == '+'
                            ? glyph.getStyle( feature, 'color_rev_strand' )
                            : glyph.getStyle( feature, 'color_fwd_strand' );
                    }
                }
                if (feature.get('multi_segment_next_segment_unmapped')) {
                    if (revflag || !useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_missing_mate' )
                              : glyph.getStyle( feature, 'color_rev_missing_mate' );
                    } else{
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_missing_mate' )
                              : glyph.getStyle( feature, 'color_fwd_missing_mate' );
                    }
                }
                if (feature.get('seq_id') == feature.get('next_seq_id')) {
                    if (revflag || !useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_rev_strand_not_proper' );
                    } else {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_fwd_strand_not_proper' );
                    }
                }
                // should only leave aberrant chr
                return strand == 1 || strand == '+'
                        ? glyph.getStyle( feature, 'color_fwd_diff_chr' )
                        : glyph.getStyle( feature, 'color_rev_diff_chr' );
            }
            return strand == 1 || strand == '+'
                  ? glyph.getStyle( feature, 'color_fwd_strand' )
                  : glyph.getStyle( feature, 'color_rev_strand' );
        }
        return glyph.getStyle( feature, 'color_nostrand' )
    }
});
});
