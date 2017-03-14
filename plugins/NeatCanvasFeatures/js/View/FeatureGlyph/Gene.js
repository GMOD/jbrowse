define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'JBrowse/View/FeatureGlyph/Gene',
    './Box',
    './ProcessedTranscript'
],
function (
    declare,
    lang,
    array,
    Gene,
    BoxGlyph,
    ProcessedTranscriptGlyph
) {
    return declare(Gene, {
        _boxGlyph: function () {
            return this.__boxGlyph || (this.__boxGlyph = new BoxGlyph({ track: this.track, browser: this.browser, config: this.config }));
        },
        _ptGlyph: function () {
            return this.__ptGlyph || (this.__ptGlyph = new ProcessedTranscriptGlyph({ track: this.track, browser: this.browser, config: this.config }));
        }
    });
});
