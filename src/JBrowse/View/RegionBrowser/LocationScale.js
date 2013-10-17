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
    var projectionBlocks = projection.getBlocksForRange( dims.x, dims.x+dims.w );
    var html = '';
    array.forEach( projectionBlocks, function( projectionBlock ) {
        var leftBase  = projectionBlock.projectPoint( Math.max( projectionBlock.aStart, dims.x ) );
        var rightBase = projectionBlock.projectPoint( Math.min( projectionBlock.aEnd, dims.x+dims.w ));

        var majorPitch = this._choosePitch( projectionBlock.scale, 200 );
        var minorPitch = this._choosePitch( projectionBlock.scale, 12  );

        for( var b = Math.ceil( leftBase / majorPitch )*majorPitch; b<rightBase; b += majorPitch ) {
            html += '<div style="position: absolute; left: '+projectionBlock.reverse().projectPoint(b)+'px">'+Util.humanReadableNumber(b)+'</div>';
        }
    },this);
    this.domNode.innerHTML = html;
},

_choosePitch: function( scale, maxPxSpacing ) {

    // labels should be between 25 and 200 pixels apart
    var maxMajorPitch = maxPxSpacing * scale; // in bp
    var magnitude = parseInt(
         new Number(maxMajorPitch).toExponential().match(/\d+$/)[0]
    );

    return Math.pow( 10, magnitude );
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