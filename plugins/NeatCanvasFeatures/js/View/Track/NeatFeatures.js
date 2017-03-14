define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'JBrowse/Util',
    'JBrowse/View/Track/CanvasFeatures'
],
function (
    declare,
    lang,
    Util,
    CanvasFeatures
) {
    return declare(CanvasFeatures, {
        _defaultConfig: function () {
            return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
                glyph: lang.hitch(this, 'guessGlyphType')
            });
        },
        guessGlyphType: function (feature) {
            return 'NeatCanvasFeatures/View/FeatureGlyph/' + ({'gene': 'Gene', 'mRNA': 'ProcessedTranscript', 'transcript': 'ProcessedTranscript' }[feature.get('type')] || 'Box');
        }
    });
});
