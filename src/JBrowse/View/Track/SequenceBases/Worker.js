define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Util',
            'JBrowse/CodonTable',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,

           Util,
           CodonTables,
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

             { name: 'maxExportSpan',             type: 'integer', defaultValue: 500000 },
             { name: 'showReverseStrand',         type: 'boolean', defaultValue: true },
             { name: 'showForwardStrand',         type: 'boolean', defaultValue: true },
             { name: 'showTranslation',           type: 'boolean', defaultValue: true },

             { name: 'highlightSpliceDonorSites',    type: 'multi-string', defaultValue: ['gt'] },
             { name: 'highlightSpliceAcceptorSites', type: 'multi-string', defaultValue: ['ag'] },
             { name: 'spliceDonorColor', type: 'string', defaultValue: 'black' },
             { name: 'spliceAcceptorColor', type: 'string', defaultValue: 'white' },

             { name: 'baseFont',          type: 'string',
               defaultValue: 'normal 12px Open Sans,Univers,Helvetica,Arial,sans-serif'
             },
             { name: 'translationTable', type: 'string', defaultValue: 'default',
               description: 'name of the JBrowse codon table to use'
             },
             { name: 'baseColors',        type: 'object',
               description: 'object holding CSS color definitions for sequence bases',
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
             },

             { name: 'aminoAcidColors',        type: 'object',
               description: 'object holding CSS color definitions for amino acids',
               defaultValue: {
                   n: '#C6C6C6',
                   N: '#C6C6C6',
                   m: '#14d100',
                   M: '#14d100',
                   '*': '#fd3f49'
               }
             }

         ]
    },

    nbsp: String.fromCharCode(160),

    fillBlock: function( block, remoteBlockNode ) {
        return this.fillSequenceBlock.apply( this, arguments )
            .then( function() {
                       return remoteBlockNode;
                   }, Util.cancelOK );
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
        var rightExtended = Math.ceil(  baseSpan.r + 3 );

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
                       } else {
                           blockNode.createChild(
                               'div',
                               { className: 'sequence_blur',
                                 innerHTML: '<span class="message">No sequence available</span>'
                               });
                       }
                   },
                   Util.cancelOK
                 );
    },

    drawBases: function( block, blockNode, scale, originBp, baseDims, seq, ctx ) {
        var pxDims = block.getDimensions();

        seq = seq.replace(/\s/g,this.nbsp);
        var compSeq = Util.complement( seq );

        var baseColors = this.getConf('baseColors');
        var aaColors = this.getConf('aminoAcidColors');

        var originPx = block.getProjectionBlock().reverseProjectPoint(originBp)-pxDims.l;

        var pxPerBp  = 1/scale;
        var boxHeight = this._getBoxHeight();

        var textOffsetX = pxPerBp/2;
        var textOffsetY = boxHeight * 0.1;
        ctx.set('textBaseline','top');

        var currentY = 0;
        var thisB = this;

        function drawTranslationRow( ctx, seq, offset, reverse ) {
            var codonTable = CodonTables[ thisB.getConf('translationTable') ];
            var i, aminoAcid;
            function getAA(i) {
                var codon = seq.substr(i,3);
                if( reverse ) codon = codon.split('').reverse().join('');
                var aminoAcid = codonTable[ codon ];
                return aminoAcid;
            }

            ctx.set('fillStyle', aaColors.n );
            ctx.fillRect( originPx+offset*pxPerBp, currentY, seq.length*pxPerBp, boxHeight );

            for( var i = offset; i<seq.length-1; i+=3 ) {
                if(( aminoAcid = getAA(i) ) && aaColors[aminoAcid]) {
                        ctx.set('fillStyle', aaColors[aminoAcid] );
                        ctx.fillRect( originPx+i*pxPerBp, currentY, pxPerBp*3, boxHeight );
                }
            }
            if( pxPerBp*3 > boxHeight ) {
                ctx.set( 'fillStyle', 'black' );
                for( var i = offset; i<seq.length-1; i+=3 ) {
                    if(( aminoAcid = getAA(i) )) {
                        ctx.fillText( aminoAcid,
                                      originPx + textOffsetX*3 + i*pxPerBp - 3,//ctx.measureText(aminoAcid).width/2,
                                      currentY + textOffsetY
                                    );
                    }
                }
            }
            currentY += boxHeight;
        };

        function drawNucleotideRow( ctx, seq ) {
            for( var i = 1; i<seq.length-1; i++ ) {
                var c = seq.charAt(i);
                ctx.set('fillStyle', baseColors[c] || baseColors.n );
                ctx.fillRect( originPx+i*pxPerBp, currentY, pxPerBp, boxHeight );
            }
            if( pxPerBp > boxHeight ) {
                ctx.set( 'fillStyle', 'black' );
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

        function highlightDonorsAcceptors( ctx, seq, reverse, y ) {
            for( var i = 0; i<seq.length; i++ ) {
                var di = seq.substr( i, 2 );
                if( reverse ) di = di.charAt(1)+di.charAt(0);
                if( spliceDonorRegexp && spliceDonorRegexp.test( di ) ) {
                    ctx.set('fillStyle', spliceDonorColor );
                    ctx.fillRect( Math.round( originPx-1+(reverse ? i+2 : i )*pxPerBp ), y-2, 2, boxHeight+4 );
                }
                if( spliceAcceptorRegexp && spliceAcceptorRegexp.test( di ) ) {
                    ctx.set('fillStyle', spliceAcceptorColor );
                    ctx.fillRect( Math.round( originPx-1+(reverse ? i : i+2 )*pxPerBp ), y-2, 2, boxHeight+4 );
                }
            }
        }

        var translationOffsets = this.getConf('showTranslation') && function() {
            var mod = (originBp+2)%3;
            var a = [];
            a[ mod ] = 2;
            a[ (mod+1)%3 ] = 0;
            a[ (mod+2)%3 ] = 1;
            return a;
        }.call(this);

        //console.log( originBp+' '+JSON.stringify( translationOffsets ) );

        if( this.getConf('showForwardStrand') ) {
            if( this.getConf('showTranslation') ) {
                drawTranslationRow( ctx, seq, translationOffsets[2] );
                drawTranslationRow( ctx, seq, translationOffsets[1] );
                drawTranslationRow( ctx, seq, translationOffsets[0] );
            }

            var forwardNucY = currentY; //< save for highlighting donor/acceptors
            drawNucleotideRow( ctx, seq );
        }
        if( this.getConf('showReverseStrand') ) {
            var reverseNucY = currentY; //< save for highlighting donor/acceptors
            var compseq = Util.complement(seq);
            drawNucleotideRow( ctx, compseq  );
            if( this.getConf('showTranslation') ) {
                drawTranslationRow( ctx, compseq, translationOffsets[0], 'reverse' );
                drawTranslationRow( ctx, compseq, translationOffsets[1], 'reverse' );
                drawTranslationRow( ctx, compseq, translationOffsets[2], 'reverse' );
            }
        }

        // highlight donor/acceptor sites if configured and zoomed in far enough
        if( pxPerBp > 3 ) {
            var spliceDonorRegexp    = this.getConf('highlightSpliceDonorSites')
                && new RegExp( '^('+this.getConf('highlightSpliceDonorSites').join('|')+')$', 'i');
            var spliceAcceptorRegexp = this.getConf('highlightSpliceAcceptorSites')
                && new RegExp( '^('+this.getConf('highlightSpliceAcceptorSites').join('|')+')$', 'i');
            var spliceDonorColor = this.getConf('spliceDonorColor');
            var spliceAcceptorColor = this.getConf('spliceAcceptorColor');
            if( spliceDonorRegexp || spliceAcceptorRegexp ) {
                if( this.getConf('showForwardStrand') )
                    highlightDonorsAcceptors( ctx, seq, false,    forwardNucY );
                if( this.getConf('showReverseStrand') )
                    highlightDonorsAcceptors( ctx, compseq, true, reverseNucY );
            }
        }
    }

});
});