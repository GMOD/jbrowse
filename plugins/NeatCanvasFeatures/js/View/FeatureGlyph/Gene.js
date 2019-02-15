define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'JBrowse/View/FeatureGlyph/Gene',
    './Box',
    './ProcessedTranscript',
    './UnprocessedTranscript'
],
function (
    declare,
    lang,
    array,
    Gene,
    Box,
    ProcessedTranscript,
    UnprocessedTranscript,

) {
    return declare([Gene, Box], {
        _boxGlyph: function () {
            return this.__boxGlyph || (this.__boxGlyph = new Box({ track: this.track, browser: this.browser, config: this.config }));
        },
        _ptGlyph: function () {
            return this.__ptGlyph || (this.__ptGlyph = new ProcessedTranscript({ track: this.track, browser: this.browser, config: this.config }));
        },
        _ntGlyph: function() {
            return this.__ntGlyph || ( this.__ntGlyph = new UnprocessedTranscript({ track: this.track, browser: this.browser, config: this.config }) );
        },
    });
});
