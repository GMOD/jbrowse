define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',
           'dojo/dom-construct',

	   "dijit/_WidgetBase",

           'JBrowse/Util'

       ], function(
           declare,
           lang,
           array,
           domGeom,
           domConstruct,

           _WidgetBase,

           Util
       ) {

return declare( _WidgetBase, {

baseClass: 'viewScale',

constructor: function(args) {
},

_setGenomeViewAttr: function( genomeView ) {
    if( this._blockWatch )
        this._blockWatch.remove();

    var thisB = this;
    this.own(
        this._blockWatch = genomeView.watchRenderingBlocks(
            function( data, block ) {
                if( data.operation == 'new' ) {
                    thisB.newBlock( block );
                }
            }
        )
    );
},

newBlock: function( renderingBlock ) {
    var dims = renderingBlock.getDimensions();
    var blockNode = domConstruct.create(
        'div', {
            className: this._blockDomClass( dims ),
            style: 'left:'+(dims.l+1)+'px; width:'+dims.w+'px'
        }, this.domNode );
    this.fillBlock( renderingBlock, blockNode );

    var thisB = this;
    var blockChangeWatch = renderingBlock.watch(
        function( changeInfo, block ) {
            if( changeInfo.operation == 'destroy' ) {
                blockChangeWatch.remove();
                domConstruct.destroy( blockNode );
            }
            else {
                var dims = block.getDimensions();
                if( changeInfo.deltaLeft )
                    blockNode.style.left = dims.l+1+'px';
                if( ( changeInfo.deltaLeft || changeInfo.deltaRight )
                    && changeInfo.deltaLeft != changeInfo.deltaRight ) {
                    blockNode.style.width = dims.w+'px';
                }

                if( changeInfo.projectionChange.scale )
                    thisB.fillBlock( block, blockNode );

                if( changeInfo.edges )
                    blockNode.className = thisB._blockDomClass( dims );
            }
        });
},

_blockDomClass: function( blockdims ) {
      return 'renderingBlock'
          +( blockdims.leftEdge  ? ' projectionLeftBorder' : '' )
          +( blockdims.rightEdge ? ' projectionRightBorder' : '' );
},

fillBlock: function( block, blockNode ) {
    var html = [];

    var projectionBlock = block.getProjectionBlock();

    var aRange = projectionBlock.getValidRangeA();
    var scale = projectionBlock.getScale();
    var blockDims = block.getDims();

    var minBase = projectionBlock.projectPoint( blockDims.l );
    var maxBase = projectionBlock.projectPoint( blockDims.r );
    if( minBase === null || maxBase === null )
        return;

    if( scale < 0 ) { // swap if negative
        var tmp = minBase;
        minBase = maxBase;
        maxBase = tmp;
    }

    // apply left and right margins
    if( scale > 0 ) {
        if( blockDims.leftEdge )
            minBase += Math.abs( 10*scale );
        if( blockDims.rightEdge )
            maxBase -= Math.abs( 10*scale );
    }
    else {
        if( blockDims.rightEdge )
            minBase += Math.abs( 10*scale );
        if( blockDims.leftEdge )
            maxBase -= Math.abs( 10*scale );
    }

    var labelPitch = this._choosePitch( scale, 60 );
    for( var b = Math.ceil( minBase / labelPitch )*labelPitch; b < maxBase; b += labelPitch ) {
        var label = Util.humanReadableNumber(b);
        var leftpx = projectionBlock.reverseProjectPoint(b)-blockDims.l;
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
    }

    blockNode.innerHTML = html.join('');
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