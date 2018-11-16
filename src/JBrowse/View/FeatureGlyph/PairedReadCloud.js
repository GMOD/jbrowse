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

_defaultConfig() {
    return this._mergeConfigs(dojo.clone( this.inherited(arguments) ), {
        readCloudLog: true,
        readCloudStretch: 20,
    });
},
layoutFeature(viewArgs, layout, feature) {
    var rect = this.inherited(arguments);
    if (!rect) {
        return rect;
    }

    if (feature.pairedFeature()) {
        var tlen = feature.read1.get('template_length')
        var t = Math.abs(tlen)
        var k = this.config.readCloudLog ? Math.log(t+1) : t
        k *= this.config.readCloudStretch

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
