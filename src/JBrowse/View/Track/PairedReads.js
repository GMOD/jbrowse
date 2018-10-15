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
			showLabels: false
		});
	}
});
});
