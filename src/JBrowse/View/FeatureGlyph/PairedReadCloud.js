define([
    'dojo/_base/declare',
    'JBrowse/View/FeatureGlyph/PairedAlignment'
],
function(
    declare,
    PairedAlignment
) {


return declare(PairedAlignment, {

clearFeat(context, fRect) {/* do nothing since drawings overlap, overrides parent */},

layoutFeature(viewArgs, layout, feature) {
    var rect = this.inherited(arguments);
    if (!rect) {
        return rect;
    }

    if (feature.pairedFeature()) {
        const tlen = Math.abs(feature.read1.get('template_length'))

        // log view uses maximum to handle very large, linear uses upper percentile

        let k
        if(this.track.config.readCloudLogScale) {
            // max is set to upper percentile because it can handle things above this value
            k = Math.log(tlen + 1) / Math.log(this.track.insertSizeStats.upper + 1)
        } else {
            // max set to literal max or a configurable insertSizeMax
            k = tlen / (this.track.config.insertSizeMax || this.track.insertSizeStats.max)
        }
        k *= this.track.config.maxHeight
        k /= 2

        // use compact view for additional linear compression
        if(this.track.config.displayMode === 'compact') {
            k /= 4
        }

        rect.rect.t = k
        rect.t = k
    } else {
        rect.t = 0
        rect.rect.t = 0
    }

    return rect;
}

});
});
