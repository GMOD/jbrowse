define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Box'
],
function(
    declare,
    array,
    lang,
    FeatureGlyph
) {
    return declare(FeatureGlyph, {

        _defaultConfig: function() {
            return this._mergeConfigs(lang.clone(this.inherited(arguments)), {
                style: {
                    color: function(feature, score) {
                        return 'hsl(' + Math.abs(score / 10) + ',50%,50%)';
                    },
                    mouseovercolor: 'rgba(0,0,0,0)',
                    strandArrow: false
                }
            });
        },

        renderFeature: function(context, fRect) {
            var r = this.getRadius(fRect.f, fRect.viewInfo.block);
            if (r.r === 0) {
                return;
            }
            context.beginPath();
            context.strokeStyle = this.getConf('style.color', [fRect.f, r.span]);
            context.arc(r.drawTo + r.r, 0, Math.abs(r.r), 0, Math.PI);
            context.stroke();
        },
        getRadius: function(feature, block) {
            var n = feature.get('end')-feature.get('start');
            var chr = feature.get('seq_id');
            if (!n) {
                return 0;
            }
            var s = feature.get('start');
            var e = feature.get('end')
            var drawTo = block.bpToX(e);
            var drawFrom = block.bpToX(s);
            return {
                r: (drawFrom - drawTo) / 2,
                drawTo: drawTo,
                drawFrom: drawFrom,
                span: Math.abs(s - e)
            };
        },
        layoutFeature: function(viewArgs, layout, feature) {
            var rect = this.inherited(arguments);
            if (!rect) {
                return rect;
            }

            var r = this.getRadius(feature, viewArgs.block);
            rect.rect.t = Math.abs(r.r * 2);

            return rect;
        }
    });
});

