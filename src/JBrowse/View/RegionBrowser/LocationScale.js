define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',
           'dojo/dom-construct',

	   "dijit/_WidgetBase",

           'JBrowse/View/Track/BlockList',
           'JBrowse/View/Track/BlockBased/Block',
           'JBrowse/Util'

       ], function(
           declare,
           lang,
           array,
           domGeom,
           domConstruct,

           _WidgetBase,

           BlockList,
           Block,
           Util
       ) {

return declare( _WidgetBase, {

baseClass: 'viewScale',

constructor: function(args) {
},

_setGenomeViewAttr: function( genomeView ) {
    var thisB = this;

    genomeView.watch(
        'projection',
        function( name, oldProjection, newProjection ) {
            if( thisB.blockList )
                thisB.blockList.destroy();
            thisB.blockList = new BlockList(
                {
                    projection: newProjection,
                    viewportNode: thisB.domNode,
                    newBlock: function( args ) {
                        return new Block( lang.mixin( args, {
                          domNode: domConstruct.create('div', { className: 'block' }, thisB.domNode ),
                          updatePositionCallback: function( deltaLeft, deltaRight, projectionChange ) {
                              // if the block has changed size, need to refill it
                              if( Math.abs(deltaLeft-deltaRight)>1 )
                                  this.filled = false;
                              //if( ! this.filled && !( projectionChange && projectionChange.animating )) {
                              if( ! this.filled ) {
                                  thisB.fillBlock( this, newProjection );
                                  this.filled = true;
                              }
                          }
                        }));
                    }
                });
        });

    if( genomeView.get('projection') )
        this._update( genomeView.get('projection') );
},

fillBlock: function( block, projection, isAnimating ) {
    //console.log('fill');
    var projectionBlocks = projection.getBlocksForRange( block.left, block.right );
    var html = [];
    array.forEach( projectionBlocks, function( projectionBlock, i ) {
        var leftBase  = projectionBlock.projectPoint( Math.max( projectionBlock.aStart, block.left ) );
        var rightBase = projectionBlock.projectPoint( Math.min( projectionBlock.aEnd, block.right ));
        if( leftBase > rightBase ) { // swap if negative
            var tmp = leftBase;
            leftBase = rightBase;
            rightBase = tmp;
        }
        var labelPitch = this._choosePitch( projectionBlock.scale, 60 );
        var prevlabel;
        var blockReverse = projectionBlock.reverse();
        for( var b = Math.ceil( (leftBase+0.001) / labelPitch )*labelPitch; b < rightBase; b += labelPitch ) {
            var label = Util.humanReadableNumber(b);
            if( label != prevlabel ) //< prevent runs of the same label, which can happen for big numbers
                html.push(
                    '<div class="posLabel" style="left: ',
                    blockReverse.projectPoint(b)-block.left,
                    'px" title="',
                    Util.commifyNumber(b),
                    '"><span style="left: -',
                    (label.length*3),
                    'px">'
                    ,label,
                    '</span></div>'
                );
            prevlabel = label;
        }
    },this);
    block.domNode.innerHTML = html.join('');
},

_choosePitch: function( scale, minPxSpacing ) {
    var minPitch = minPxSpacing * Math.abs( scale );
    var magnitude = parseInt(
         new Number(minPitch).toExponential().split(/e/i)[1]
    );

    var pitch = Math.pow( 10, magnitude );
    while( pitch < minPitch ) {
        pitch *= 2;
        if( pitch >= minPitch )
            return pitch;
        pitch *= 2.5;
    }

    return pitch;
}

});
});