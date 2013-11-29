define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Util',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,

           Util,
           _ConfigurationMixin
       ) {
return declare( [_ConfigurationMixin], {

    constructor: function( args ) {
        Util.validate( args, { store: 'object' } );
        this.store = args.store;
    },

    deflate: function() {
        return { $class: 'JBrowse/View/Track/SequenceBases/Worker',
                 config: this.exportMergedConfig()
               };
    },

    configSchema: {
         slots: [
            { name: 'type',              type: 'string' },

            { name: 'maxExportSpan',     type: 'integer', defaultValue: 500000 },
            { name: 'showReverseStrand', type: 'boolean', defaultValue: true },
            { name: 'showForwardStrand', type: 'boolean', defaultValue: true },
            { name: 'showTranslation',   type: 'boolean', defaultValue: true },
            { name: 'baseFont',          type: 'string',
              defaultValue: 'normal 12px Open Sans,Univers,Helvetica,Arial,sans-serif'
            },
            { name: 'baseColors',        type: 'object',
              description: 'object holding CSS color definitions for sequence bases or amino acids',
              defaultValue: {
                  n: '#C6C6C6',
                  a: '#14d100',
                  c: '#4284d3',
                  t: '#fd3f49',
                  g: '#ffe440',
                  N: '#C6C6C6',
                  A: '#14d100',
                  C: '#4284d3',
                  T: '#fd3f49',
                  G: '#ffe440'
              }
            }
        ]
    },

    nbsp: String.fromCharCode(160),

    fillBlock: function( block, remoteBlockNode ) {
        return this.fillSequenceBlock.apply( this, arguments )
            .then( function() {
                       return remoteBlockNode;
                   });
    },

    _getBoxHeight: function() {
        var fontSize = parseInt( this.getConf('baseFont').match(/(\d+)px/)[1] );
        var boxHeight = Math.round( fontSize*1.5 );
        return boxHeight;
    },

    _getHeight: function() {
        var boxHeight = this._getBoxHeight();
        return ( this.getConf('showTranslation') ? 6*boxHeight : 0 )
            + ( this.getConf('showForwardStrand') ? boxHeight : 0 )
            + ( this.getConf('showReverseStrand') ? boxHeight : 0 );
    },

    fillSequenceBlock: function( block, blockNode ) {
        var thisB = this;

        var scale = block.getProjectionBlock().getScale();
        var baseSpan = block.getBaseSpan();

        var leftExtended  = Math.floor( baseSpan.l - 2 );
        var rightExtended = Math.ceil(  baseSpan.r + 2 );

        return this.store
            .getReferenceSequence( baseSpan.refName, leftExtended, rightExtended )
            .then( function( seq ) {
                       blockNode.empty();
                       if( seq ) {
                           var canvas = blockNode.createChild(
                               'canvas', {
                                   height: thisB._getHeight(),
                                   width: Math.ceil( block.getDimensions().w ),
                                   style: 'width: 100%; height: 100%'
                               });
                           var ctx = canvas.getContext('2d');
                           thisB.drawBases( block, blockNode, scale, leftExtended, baseSpan, seq, ctx );
                       } else
                           blockNode.createChild(
                               'div',
                               { className: 'sequence_blur',
                                 innerHTML: '<span class="message">No sequence available</span>'
                               });
                   }
                 );
    },

    drawBases: function( block, blockNode, scale, originBp, baseDims, seq, ctx ) {
        var pxDims = block.getDimensions();

        seq = seq.replace(/\s/g,this.nbsp);
        var compSeq = Util.complement( seq );

        var colors = this.getConf('baseColors');

        var originPx = block.getProjectionBlock().reverseProjectPoint(originBp)-pxDims.l;

        var pxPerBp  = 1/scale;
        var boxHeight = this._getBoxHeight();

        var textOffsetX = pxPerBp/2;
        var textOffsetY = boxHeight * 0.1;
        ctx.setAttribute('textBaseline','top');

        var currentY = 0;

        function drawNucleotideRow( ctx, seq ) {
            for( var i = 1; i<seq.length-1; i++ ) {
                var c = seq.charAt(i);
                ctx.setAttribute('fillStyle', colors[c] || colors.n );
                ctx.fillRect( originPx+i*pxPerBp, currentY, pxPerBp, boxHeight );
            }
            if( pxPerBp > boxHeight ) {
                ctx.setAttribute( 'fillStyle', 'black' );
                for( var i = 1; i<seq.length-1; i++ ) {
                    var c = seq.charAt(i);
                    ctx.fillText( c,
                                  originPx + textOffsetX + i*pxPerBp - 3,//ctx.measureText(c).width/2,
                                  currentY + textOffsetY
                                );
                }
            }
            currentY += boxHeight;
        }

        if( this.getConf('showForwardStrand') )
            drawNucleotideRow( ctx, seq );
        if( this.getConf('showReverseStrand') )
            drawNucleotideRow( ctx, Util.complement( seq )  );
    }

});
});