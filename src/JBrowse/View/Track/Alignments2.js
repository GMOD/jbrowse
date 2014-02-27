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
                maxFeatureScreenDensity: 6,

                hideDuplicateReads: true,
                hideQCFailingReads: true,
                hideSecondary: true,
                hideSupplementary: true,
                hideUnmapped: true,
                hideMissingMatepairs: false,
                hideForwardStrand: false,
                hideReverseStrand: false,

                histograms: {
                    description: 'coverage depth'
                },

                style: {
                    showLabels: false
                }
            }
        );

        // add menu items for viewing matepair / next segment locations
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
                    return ! feature.get('next_segment_position');
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
                    return ! feature.get('next_segment_position');
                },
                "label": "Open mate/next location in new tab"
            }
        );
        return c;
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

    _trackMenuOptions: function() {
        return all([ this.inherited(arguments), this._alignmentsFilterTrackMenuOptions() ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift({ type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    }

});
});
