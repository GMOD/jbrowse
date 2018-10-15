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
	},

	// override getLayout to access addRect method
	_getLayout: function() {
		var layout = this.inherited(arguments);
		return declare.safeMixin(layout, {
			addRect: function() {
				this.pTotalHeight = this.maxHeight;
				return 0;
			}
		});
	}
});
});
