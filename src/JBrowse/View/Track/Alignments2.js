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

    configSchema: {
        slots: [
            { name: 'glyph', type: 'string', defaultValue: 'JBrowse/View/FeatureGlyph/Alignment' },
            { name: 'maxFeatureGlyphExpansion', type: 'integer', defaultValue: 0 },
            { name: 'showLabels', type: 'boolean', defaultValue: false },

            { name: 'namedFeatureFilters', defaultValue: {
                  'hideDuplicateReads':   true,
                  'hideQCFailingReads':   true,
                  'hideSecondary':        true,
                  'hideSupplementary':    true,
                  'hideMissingMatepairs': false,
                  'hideForwardStrand':    false,
                  'hideReverseStrand':    false
              }
            }
        ]
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