define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',
           'dojo/dom-construct',
           'dojo/dom-class',

	   "dijit/_WidgetBase",

           'JBrowse/Util'

       ], function(
           declare,
           lang,
           array,
           domGeom,
           domConstruct,
           domClass,

           _WidgetBase,

           Util
       ) {

return declare( _WidgetBase, {

baseClass: 'viewScale',

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
    var thisB = this,
    blockNode = domConstruct.create( 'div', { className: 'renderingBlock' }, this.domNode ),
    blockChangeWatch = renderingBlock.watch(
        function( changeInfo, block ) {
            if( changeInfo.operation == 'destroy' )
                blockChangeWatch.remove();

            thisB.blockChange( blockNode, changeInfo, block );
        });

    this.blockChange( blockNode, { operation: 'new' }, renderingBlock );
},

_positionBlockNode: function( block, blockNode, changeInfo ) {
    var dims = block.getDimensions();
    var isNew = changeInfo.operation == 'new';
    var edgeChanges;

    // update the basic dimensions and css classes of the block
    if( isNew || changeInfo.deltaLeft )
        blockNode.style.left = dims.l+1+'px';
    if( isNew
        || ( changeInfo.deltaLeft || changeInfo.deltaRight )
           && changeInfo.deltaLeft != changeInfo.deltaRight
      )
        blockNode.style.width = dims.w+'px';

    if( isNew ) {
        if( dims.leftEdge )
            domClass.add( blockNode, 'projectionLeftBorder' );
        if( dims.rightEdge )
            domClass.add( blockNode, 'projectionRightBorder' );
    } else if(( edgeChanges = changeInfo.edges )) {
        if( 'leftEdge' in edgeChanges )
            domClass[ edgeChanges.leftEdge ? 'add' : 'remove' ]( 'projectionLeftBorder' );
        if( 'rightEdge' in edgeChanges )
            domClass[ edgeChanges.rightEdge ? 'add' : 'remove' ]( 'projectionRightBorder' );
    }
},

blockChange: function( blockNode, changeInfo, block ) {
    if( changeInfo.operation == 'destroy' ) {
        domConstruct.destroy( blockNode );
    }
    else {
        this._positionBlockNode( block, blockNode, changeInfo );
        if( changeInfo.operation != 'move' ) {
            return this.fillBlock( block, blockNode );
        }
    }
    return undefined;
},

fillBlock: function( block, blockNode ) {
    var html = [];

    var projectionBlock = block.getProjectionBlock();

    var aRange = projectionBlock.getValidRangeA();
    var scale = projectionBlock.getScale();
    var blockDims = block.getDims();

    var gridPitch = this.chooseGridPitch( scale, 60, 15 );

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

    for( var b = Math.ceil( minBase / gridPitch.majorPitch ) * gridPitch.majorPitch;
         b < maxBase;
         b += gridPitch.majorPitch
       ) {
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

chooseGridPitch: function( scale, minMajorPitchPx, minMinorPitchPx ) {
    scale = Math.abs(scale);
    var minMajorPitchBp = minMajorPitchPx * scale;
    var majorMagnitude = parseInt(
         new Number( minMajorPitchBp ).toExponential().split(/e/i)[1]
    );

    var majorPitch = Math.pow( 10, majorMagnitude );
    while( majorPitch < minMajorPitchBp ) {
        majorPitch *= 2;
        if( majorPitch >= minMajorPitchBp )
            break;
        majorPitch *= 2.5;
    }

    var majorPitchPx = majorPitch/scale;

    var minorPitch = !( majorPitch % 10 ) && majorPitchPx/10 > minMinorPitchPx ? majorPitch/10 :
                     !( majorPitch % 5  ) && majorPitchPx/5  > minMinorPitchPx ? majorPitch/5  :
                     !( majorPitch % 2  ) && majorPitchPx/2  > minMinorPitchPx ? majorPitch/2  :
                      0;

    return { majorPitch: majorPitch, minorPitch: minorPitch };
}

});
});