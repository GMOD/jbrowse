define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function( declare, array, Util, CanvasFeatureTrack, AlignmentsMixin ) {

return declare( [ CanvasFeatureTrack, AlignmentsMixin ], {

    configSchema: {
        slots: [
            { name: 'glyph', type: 'string', defaultValue: 'JBrowse/View/FeatureGlyph/Alignment' },
            { name: 'maxFeatureGlyphExpansion', type: 'integer', defaultValue: 0 },
            { name: 'showLabels', type: 'boolean', defaultValue: false }
        ]
    },

    _trackMenuOptions: function() {
        var o = this.inherited(arguments);
        o.push( { type: 'dijit/MenuSeparator' } );
        o.push.apply( o, this._alignmentsFilterTrackMenuOptions() );
        return o;
    }

});
});