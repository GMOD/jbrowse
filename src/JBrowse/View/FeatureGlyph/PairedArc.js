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
var orientationTypes = {
    "fr": {

        "F1R2": "LR",
        "F2R1": "LR",

        "F1F2": "LL",
        "F2F1": "LL",

        "R1R2": "RR",
        "R2R1": "RR",

        "R1F2": "RL",
        "R2F1": "RL"
    },

    "rf": {

        "R1F2": "LR",
        "R2F1": "LR",

        "R1R2": "LL",
        "R2R1": "LL",

        "F1F2": "RR",
        "F2F1": "RR",

        "F1R2": "RL",
        "F2R1": "RL"
    },

    "ff": {

        "F2F1": "LR",
        "R1R2": "LR",

        "F2R1": "LL",
        "R1F2": "LL",

        "R2F1": "RR",
        "F1R2": "RR",

        "R2R1": "RL",
        "F1F2": "RL"
    }
};
    return declare(FeatureGlyph, {

        _defaultConfig: function() {
            return this._mergeConfigs(lang.clone(this.inherited(arguments)), {
                style: {
                    color: function( feature, score, glyph, track ) {
                        if(track.config.colorByOrientation) {
                            const type = orientationTypes[track.config.orientationType]
                            const orientation = type[feature.get('pair_orientation')]
                            const map = {
                                'LR': 'color_pair_lr',
                                'RR': 'color_pair_rr',
                                'RL': 'color_pair_rl',
                                'LL': 'color_pair_ll'
                            };
                            return glyph.getStyle( feature, map[orientation] || 'color_nostrand' );
                        }
                        return 'hsl(' + Math.abs(score / 10) + ',50%,50%)';
                    },
                    color_pair_lr: 'grey',
                    color_pair_rr: 'navy',
                    color_pair_rl: 'teal',
                    color_pair_ll: 'green',
                    color_nostrand: '#999999',
                    mouseovercolor: 'rgba(0,0,0,0)',
                    strandArrow: false,
                    orientationType: 'fr' // default illumina adapter sequence --> <--
                }
            });
        },

        renderFeature: function(context, fRect) {
            var r = this.getRadius(fRect.f, fRect.viewInfo.block);
            if (r.r === 0) {
                return;
            }
            context.beginPath();
            context.strokeStyle = this.getConf('style.color', [fRect.f, r.span, this, this.track]);
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

