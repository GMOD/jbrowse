/**
 * Track view that displays the underlying reference sequence bases.
 */
define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/dom-construct',
            'dojo/dom-class',
            'dojo/query',

            'JBrowse/MediaTypes',
            '../Track',
            './_BlockBasedMixin',
            'JBrowse/CodonTable',
            'JBrowse/Util'
        ],
        function(
            declare,
            lang,
            array,
            dom,
            domClass,
            query,

            MediaTypes,
            TrackView,
            _BlockBasedMixin,
            CodonTable,
            Util
        ) {

return declare( [ TrackView, _BlockBasedMixin ],
{
    trackClass: 'sequenceBases',

    constructor: function( args ) {
    },

    configSchema: {
        slots: [
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

    animateBlock: function( block, blockNode, changeInfo ) {
        //console.log('animate');
    },

    fillBlock:function( block, blockNode, changeInfo ) {
        //console.log('fill');
        var blockDims = block.getDimensions();
        var projectionBlock = block.getProjectionBlock();

        dom.empty( blockNode );

        var blur = dojo.create(
            'div',
            { className: 'sequence_blur',
              innerHTML: '<span class="loading">Loading</span>',
              style: {
                  height: this._getHeight() + 'px'
              }
            });
        var blurTimeout = setTimeout( function() {
            blockNode.appendChild( blur );
        }, 300 );

        this.heightUpdate( parseFloat( blur.style.height )+1 );

        var scale = projectionBlock.getScale();

        // if we are zoomed in far enough to draw bases, then draw them
        if ( scale < 1/1.3 ) {
            return this._fillSequenceBlock( this.get('store'), block, blockNode, scale, blur, blurTimeout )
                .then( function(v) {
                           clearTimeout( blurTimeout );
                           return v;
                       });
        }
        // otherwise, just draw something that suggests there are
        // bases there if you zoom in far enough
        else {
            blur.innerHTML = '<span class="zoom">Zoom in to see sequence</span>';
            return undefined;
        }
    },

    _getHeight: function() {
        return ( this.getConf('showTranslation') ? 6*14 : 0 )
            + ( this.getConf('showForwardStrand') ? 14 : 0 )
            + ( this.getConf('showReverseStrand') ? 14 : 0 ) + 4;
    },

    _getBoxHeight: function() {
        var fontSize = parseInt( this.getConf('baseFont').match(/(\d+)px/)[1] );
        var boxHeight = Math.round( fontSize*1.5 );
        return boxHeight;
    },

    nbsp: String.fromCharCode(160),

    _fillSequenceBlock: function( store, block, blockNode, scale, blur ) {
            var thisB = this;

            var baseSpan = block.getBaseSpan();

            var leftExtended  = Math.floor( baseSpan.l - 2 );
            var rightExtended = Math.ceil(  baseSpan.r + 2 );

            return store
                .getReferenceSequence( baseSpan.refName, leftExtended, rightExtended )
                .then( function( seq ) {
                           if( seq ) {
                               dom.empty( blockNode );
                               var canvas = dom.create(
                                   'canvas', {
                                       height: thisB._getHeight(),
                                       width: blockNode.offsetWidth,
                                       style: 'width: 100%; height: 100%'
                                   }, blockNode
                               );
                               var ctx = canvas.getContext('2d');
                               thisB._drawBases( block, blockNode, scale, leftExtended, baseSpan, seq, ctx );
                           } else
                               blur.innerHTML = '<span class="message">No sequence available</span>';
                       },
                       lang.hitch( this, '_handleError' )
                     );
    },

    _drawBases: function( block, blockNode, scale, originBp, baseDims, seq, ctx ) {
        var pxDims = block.getDimensions();

        seq = seq.replace(/\s/g,this.nbsp);
        var compSeq = Util.complement( seq );

        var colors = this.getConf('baseColors');

        var originPx = block.getProjectionBlock().reverseProjectPoint(originBp)-pxDims.l;

        var pxPerBp  = 1/scale;
        var boxHeight = this._getBoxHeight();

        var textOffsetX = pxPerBp/2;
        var textOffsetY = boxHeight * 0.1;
        ctx.textBaseline = 'top';

        var currentY = 0;

        function drawNucleotideRow( ctx, seq ) {
            for( var i = 1; i<seq.length-1; i++ ) {
                var c = seq.charAt(i);
                ctx.fillStyle = colors[c] || colors.n;
                ctx.fillRect( originPx+i*pxPerBp, currentY, pxPerBp, boxHeight );
            }
            if( pxPerBp > boxHeight ) {
                ctx.fillStyle = 'black';
                for( var i = 1; i<seq.length-1; i++ ) {
                    var c = seq.charAt(i);
                    ctx.fillText( c, originPx+textOffsetX+i*pxPerBp-ctx.measureText(c).width/2, currentY+textOffsetY );
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
