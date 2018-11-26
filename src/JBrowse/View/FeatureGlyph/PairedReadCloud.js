define([
    'dojo/_base/declare',
    'JBrowse/View/FeatureGlyph/PairedAlignment'
],
function(
    declare,
    PairedAlignment
) {


return declare(PairedAlignment, {

clearFeat( context, fRect ) {
},

layoutFeature(viewArgs, layout, feature) {
    var rect = this.inherited(arguments);
    if (!rect) {
        return rect;
    }

    if (feature.pairedFeature()) {
        var tlen = feature.read1.get('template_length')
        var t = Math.abs(tlen)
        var k = this.track.config.readCloudLogScale ?
            Math.log(t+1)/Math.log(this.track.upperPercentile) : t/this.track.upperPercentile
        k *= this.track.config.maxHeight/2

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
