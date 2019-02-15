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

        guessGlyphType: function(feature) {
            // first try to guess by its SO type
            let guess = {
                'gene': 'Gene',
                'pseudogene': 'Gene',
                'mRNA': 'ProcessedTranscript',
                'transcript': 'ProcessedTranscript',
                'ncRNA': 'UnprocessedTranscript',
                'lncRNA': 'UnprocessedTranscript',
                'lnc_RNA': 'UnprocessedTranscript',
                'miRNA': 'UnprocessedTranscript'
            }[feature.get('type')]

            // otherwise, make it Segments if it has children,
            // a BED if it has block_count/thick_start,
            // or a Box otherwise
            if (!guess) {
                let children = feature.children()
                if (children && children.length)
                    guess = 'Segments'
                else
                    guess = 'Box'
            }

            return 'NeatCanvasFeatures/View/FeatureGlyph/'+guess
        }
    });
});
