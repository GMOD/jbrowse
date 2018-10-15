define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/Util'
        ],
        function(
            declare,
            lang,
            CanvasFeatures,
            Util,
        ) {

return declare(CanvasFeatures, {
    _defaultConfig: function() {
        return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
            glyph: 'JBrowse/View/FeatureGlyph/PairedAlignment',
            maxFeatureScreenDensity: 60,
            readCloud: false,
            style: {
                showLabels: false
            }
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
    }

});
});
