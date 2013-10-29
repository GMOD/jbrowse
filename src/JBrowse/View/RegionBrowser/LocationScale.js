define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',
           'dojo/dom-construct',

	   "dijit/_WidgetBase",

           'JBrowse/View/Track/BlockList',
           'JBrowse/View/Track/BlockList/BlockWithDOM',
           'JBrowse/Util'

       ], function(
           declare,
           lang,
           array,
           domGeom,
           domConstruct,

           _WidgetBase,

           BlockList,
           DOMBlock,
           Util
       ) {

return declare( _WidgetBase, {

baseClass: 'viewScale',

constructor: function(args) {
},

_setGenomeViewAttr: function( genomeView ) {
    var thisB = this;

    genomeView.watch( 'projection',
        function( name, oldProjection, newProjection ) {
            thisB._makeBlockList( newProjection );
        });
},

_makeBlockList: function( projection ) {
    if( this.blockList )
        this.blockList.destroy();
    this.blockList = new BlockList(
        {
            projection: projection,
            viewportNode: this.domNode,
            newBlock: lang.hitch( this, '_newBlock' )
        });
},

_newBlock: function( args ) {
    var thisB = this;
    args.parentNode = this.domNode;
    args.changeCallbacks = {
        move: function() {}, //< don't need to do anything when blocks move
        "default": function( changeInfo, block ) {
            if( changeInfo.operation == 'destroy' )
                return;
            thisB.fillBlock( block );
        }
    };
    var block = new DOMBlock( args );
    this.fillBlock( block );
    return block;
},

fillBlock: function( block ) {
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