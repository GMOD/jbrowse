define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function( declare, array, Util, CanvasFeatureTrack, AlignmentsMixin ) {

return declare( [ CanvasFeatureTrack, AlignmentsMixin ], {

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                glyph: 'JBrowse/View/FeatureGlyph/Alignment',
                maxFeatureGlyphExpansion: 0,

                hideDuplicateReads: true,
                hideQCFailingReads: true,
                hideSecondary: true,
                hideSupplementary: true,
                hideMissingMatepairs: false,

                style: {
                    showLabels: false
                }
            }
        );
    },

    _trackMenuOptions: function() {
        var o = this.inherited(arguments);
        o.push( { type: 'dijit/MenuSeparator' } );
        o.push.apply( o, this._alignmentsFilterTrackMenuOptions() );
        return o;
    }

});
});