define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',


	   "dijit/_WidgetBase",

           'JBrowse/Util'

       ], function(
           declare,
           lang,
           array,
           domGeom,

           _WidgetBase,

           Util
       ) {

return declare( _WidgetBase, {

baseClass: 'viewScale',

constructor: function(args) {
},

_setGenomeViewAttr: function( genomeView ) {
    var thisB = this;
    genomeView.watch( 'projection', function( name, oldProjection, newProjection ) {
                          newProjection.watch( lang.hitch( thisB, '_update', newProjection ) );
                          thisB._update( newProjection );
                      });
    if( genomeView.get('projection') )
        this._update( genomeView.get('projection') );
},

_update: function( projection, changeDescription ) {
    var dims = domGeom.position( this.domNode );
    dims.r = dims.x+dims.w;
    var projectionBlocks = projection.getBlocksForRange( dims.x, dims.r );
    var html = [];
    array.forEach( projectionBlocks, function( projectionBlock, i ) {
        var leftBase  = projectionBlock.projectPoint( Math.max( projectionBlock.aStart, dims.x ) );
        var rightBase = projectionBlock.projectPoint( Math.min( projectionBlock.aEnd, dims.r ));
        if( leftBase > rightBase ) { // swap if negative
            var tmp = leftBase;
            leftBase = rightBase;
            rightBase = tmp;
        }

        var blockLeft = projectionBlock.aStart >= dims.x && projectionBlock.aStart <= dims.r ? projectionBlock.aStart : 0;
        var blockWidth = projectionBlock.aEnd >= dims.x && projectionBlock.aEnd <= dims.r ? projectionBlock.aEnd-blockLeft+'px' : '102%';
        html.push( '<div class="projectionBlock" style="left: ', blockLeft-2, 'px; width: ', blockWidth, '">' );

        var labelPitch = this._choosePitch( projectionBlock.scale, 100, 300 );

        var prevlabel;
        for( var b = Math.ceil( leftBase / labelPitch )*labelPitch; b < rightBase; b += labelPitch ) {
            var label = Util.humanReadableNumber(b);
            if( label != prevlabel ) //< prevent runs of the same label, which can happen for big numbers
                html.push(
                    '<div class="posLabel" style="left: ',
                    projectionBlock.reverse().projectPoint(b)-blockLeft,
                    'px" title="',
                    b,
                    '"><span style="left: -',
                    (label.length*2),
                    'px">'
                    ,label,
                    '</span></div>'
                );
            prevlabel = label;
        }
        html.push('</div>');
    },this);
    this.domNode.innerHTML = html.join('');
},

_choosePitch: function( scale, minPxSpacing, maxPxSpacing ) {
    scale = Math.abs(scale);

    var maxPitch = maxPxSpacing * scale; // in bp
    var minPitch = minPxSpacing * scale;
    var magnitude = parseInt(
         new Number(maxPitch).toExponential().match(/\d+$/)[0]
    );

    var pitch = Math.pow( 10, magnitude );
    if( pitch > minPitch )
        return pitch;
    else if( pitch * 2 > minPitch )
        return pitch * 2;
    else if( pitch * 5 > minPitch )
        return pitch * 5;

    while( pitch < minPitch )
        pitch *= 2;

    return pitch;
},

_chooseLabels: function( projectionBlock ) {

    var majorPitch = this._choosePitch( projectionBlock.scale, 200 );
    var minorPitch = this._choosePitch( projectionBlock.scale, 12  );
    // the number with the most zeroes behind it that satisfies the minDistance and maxDistance

    var left = viewArgs.leftBase + 1;
    var width = viewArgs.rightBase - left + 1;
    var scale = viewArgs.scale;
    for( var mod = 1000000; mod > 0; mod /= 10 ) {
        if( left % mod * scale <= 3 )
                return left - left%mod;
    }
    return left;
}


});
});