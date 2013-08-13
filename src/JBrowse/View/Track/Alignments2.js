define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function( declare, array, Util, CanvasFeatureTrack, AlignmentsMixin ) {

return declare( [ CanvasFeatureTrack, AlignmentsMixin ], {

    constructor: function() {
    },

    _configSchemaDefinition: function() {
        var def = this.inherited( arguments );
        def.slots.push.apply( def.slots, [
            { name: 'glyph', type: 'string', defaultValue: 'JBrowse/View/FeatureGlyph/Alignment' },
            { name: 'maxFeatureGlyphExpansion', type: 'integer', defaultValue: 0 },
            { name: 'showLabels', type: 'boolean', defaultValue: false }
        ]);
        return def;
    }

});
});