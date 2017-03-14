define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'JBrowse/View/FeatureGlyph/Segments',
    './Box'
],
function (
    declare,
    lang,
    domConstruct,
    Segments,
    Box
) {
    return declare([Segments, Box], {
        renderFeature: function (context, fRect) {
            if (this.track.displayMode != 'collapsed') {
                context.clearRect(Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h);
            }

            this.renderSegments(context, fRect);
            this.renderIntrons(context, fRect);
            this.renderLabel(context, fRect);
            this.renderDescription(context, fRect);
            this.renderArrowhead(context, fRect);
        },
        renderIntrons: function (context, fRect) {
            var subparts = this._getSubparts(fRect.f);

            if (subparts.length <= 1) return;

            subparts.sort(function (a, b) { return a.get('start') - b.get('start'); });

            var viewInfo = fRect.viewInfo;

            for (var i = 0; i < subparts.length - 1; ++i) {
                var gap = subparts[i + 1].get('start') - subparts[i].get('end');
                if (gap > 2) {
                    var a_left  = viewInfo.block.bpToX(subparts[i].get('start'));
                    var a_width = viewInfo.block.bpToX(subparts[i].get('end')) - a_left;

                    var b_left  = viewInfo.block.bpToX(subparts[i + 1].get('start'));
                    var b_width = viewInfo.block.bpToX(subparts[i + 1].get('end')) - b_left;

                    var top = fRect.t;
                    var overallHeight = fRect.rect.h;

                    var _height = this._getFeatureHeight(viewInfo, subparts[i]);
                    if (!_height) {
                        return;
                    }
                    if (_height != overallHeight) {
                        top += Math.round((overallHeight - _height) / 2);
                    }

                    var height = _height / 2;
                    var left = a_left + a_width;
                    var width = b_left - left;
                    var mid = width / 2;

                    context.beginPath();
                    context.moveTo(left, top + height);
                    context.lineTo(left + mid, top + 1);
                    context.lineTo(left + width, top + height);
                    context.lineWidth = 1;
                    context.strokeStyle = '#202020';
                    context.lineCap = 'square';
                    context.stroke();
                }
            }
        }
    });
});

