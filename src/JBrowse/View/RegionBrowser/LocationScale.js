define([
           'dojo/_base/declare',

           'dijit/_WidgetBase',

           "JBrowse/View/Track/_BlockBasedMixin",
	   "./_HorizScaleMixin",
           'JBrowse/Util'
       ], function(
           declare,

           _WidgetBase,

           _BlockBasedMixin,
           _HorizScaleMixin,
           Util
       ) {

return declare( [ _WidgetBase, _BlockBasedMixin, _HorizScaleMixin ], {

baseClass: 'viewScale',

fillBlock: function( block, blockNode ) {
    var html = [];
    var blockDims = block.getDimensions();
    var projectionBlock = block.getProjectionBlock();

    this._horizontalScaleIterate(
        block,
        function(b) {
            var label = Util.humanReadableNumber(b);
            var leftpx = Math.round(projectionBlock.reverseProjectPoint(b)-blockDims.l);
            html.push(
                '<div class="posLabel" style="left: ',
                leftpx,
                'px" title="',
                Util.commifyNumber(b),
                '"><span style="left: -',
                (label.length*3),
                'px">'
                ,label,
                '</span></div>'
            );

        },
        function(){}
    );

    blockNode.innerHTML = html.join('');
}

});
});