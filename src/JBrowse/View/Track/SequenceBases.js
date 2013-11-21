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
        var blurTimeout = window.setTimeout( function() {
            blockNode.appendChild( blur );
        }, 300 );

        this.heightUpdate( parseFloat( blur.style.height )+1 );

        var scale = projectionBlock.getScale();

        // if we are zoomed in far enough to draw bases, then draw them
        if ( scale < 1/1.3 ) {
            var thisB = this;

            var baseSpan = block.getBaseSpan();

            var leftExtended  = Math.floor( baseSpan.l - 2 );
            var rightExtended = Math.ceil(  baseSpan.r + 2 );

            return this.get('store')
                .getReferenceSequence( baseSpan.refName, leftExtended, rightExtended )
                .then( function( seq ) {
                           if( seq ) {
                               window.clearTimeout( blurTimeout );
                               dom.empty( blockNode );
                               thisB._fillSequenceBlock( block, blockNode, scale, leftExtended, baseSpan, seq );
                           } else
                               blur.innerHTML = '<span class="message">No sequence available</span>';
                       },
                       lang.hitch( this, '_handleError' )
                     );
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

    nbsp: String.fromCharCode(160),

    _fillSequenceBlock: function( block, blockNode, scale, originBp, baseDims, seq ) {
        var pxDims = block.getDimensions();

        var canvas = dom.create('canvas', { height: this._getHeight(), width: blockNode.offsetWidth, style: 'width: 100%; height: 100%'}, blockNode );
        var ctx = canvas.getContext('2d');

        seq = seq.replace(/\s/g,this.nbsp);
        var compSeq = Util.complement( seq );

        var colors = this.getConf('baseColors');

        var originPx = block.getProjectionBlock().reverseProjectPoint(originBp)-pxDims.l;

        var pxPerBp  = 1/scale;
        var fontSize = parseInt( (ctx.font = this.getConf('baseFont')).match(/(\d+)px/)[1] );

        var boxHeight = Math.round( fontSize*1.5 );
        for( var i = 1; i<seq.length-1; i++ ) {
            var c = seq.charAt(i);
            ctx.fillStyle = colors[c] || colors.n;
            ctx.fillRect( originPx+i*pxPerBp, 0, pxPerBp, boxHeight );
        }
        if( this.getConf('showReverseStrand') ) {
            for( var i = 1; i<compSeq.length-1; i++ ) {
                var c = compSeq.charAt(i);
                ctx.fillStyle = colors[c] || colors.n;
                ctx.fillRect( originPx+i*pxPerBp, boxHeight, pxPerBp, boxHeight );
            }
        }

        if( pxPerBp > fontSize ) {
            var textOffset = pxPerBp/2;
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'black';
            for( var i = 1; i<seq.length-1; i++ ) {
                var c = seq.charAt(i);
                ctx.fillText( c, originPx+textOffset+i*pxPerBp-ctx.measureText(c).width/2, 0 );
            }
            if( this.getConf('showReverseStrand') ) {
                for( var i = 1; i<compSeq.length-1; i++ ) {
                    var c = compSeq.charAt(i);
                    ctx.fillText( c, originPx+textOffset+i*pxPerBp-ctx.measureText(c).width/2, fontSize*1.5 );
                }
            }
        }
    }
});
});
