define( [
            'dojo/_base/declare',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/Util'
        ],
        function( declare, BlockBased, ExportMixin, Util ) {

var SequenceTrack = declare( BlockBased,
 /**
  * @lends JBrowse.View.Track.Sequence.prototype
  */
{
    /**
     * Track to display the underlying reference sequence, when zoomed in
     * far enough.
     *
     * @constructs
     * @extends JBrowse.View.Track.BlockBased
     */
    constructor: function( args ) {}
});

dojo.safeMixin( SequenceTrack.prototype, ExportMixin );

SequenceTrack.extend(
/**
 * @lends JBrowse.View.Track.Sequence.prototype
 */
{
    _defaultConfig: function() {
        return {
            maxExportSpan: 500000,
            showReverseStrand: true
        };
    },
    _exportFormats: function() {
        return ['FASTA'];
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
    },

    setViewInfo:function(genomeView, heightUpdate, numBlocks,
                         trackDiv,
                         widthPct, widthPx, scale) {
        this.inherited( arguments );
        this.show();
    },

    nbsp: String.fromCharCode(160),

    fillBlock:function(blockIndex, block,
                       leftBlock, rightBlock,
                       leftBase, rightBase,
                       scale, stripeWidth,
                       containerStart, containerEnd) {

        var charSize = this.getCharacterMeasurements();

        // if we are zoomed in far enough to draw bases, then draw them
        if ( scale >= 1 ) {
            this.store.getFeatures(
                {
                    ref: this.refSeq.name,
                    seqChunkSize: this.refSeq.seqChunkSize,
                    start: leftBase,
                    end: rightBase
                },
                dojo.hitch( this, '_fillSequenceBlock', block, scale ),
                function() {}
            );
            this.heightUpdate( charSize.h*2, blockIndex );
        }
        // otherwise, just draw a sort of line (possibly dotted) that
        // suggests there are bases there if you zoom in far enough
        else {
            var borderWidth = Math.max(1,Math.round(4*scale/charSize.w));
            var blur = dojo.create( 'div', {
                             className: 'sequence_blur',
                             style: { borderStyle: 'solid', borderTopWidth: borderWidth+'px', borderBottomWidth: borderWidth+'px' }
                         }, block );
            this.heightUpdate( blur.offsetHeight+2*blur.offsetTop, blockIndex );
        }
    },

    _fillSequenceBlock: function( block, scale, feature ) {
        var seq = feature.get('seq');
        var start = feature.get('start');
        var end = feature.get('end');

        // fill with leading blanks if the
        // sequence does not extend all the way
        // pad with blanks if the sequence does not extend all the way
        // across our range
        if( start < this.refSeq.start )
            while( seq.length < (end-start) ) {
                //nbsp is an "&nbsp;" entity
                seq = this.nbsp+seq;
            }
        else if( end > this.refSeq.end )
            while( seq.length < (end-start) ) {
                //nbsp is an "&nbsp;" entity
                seq += this.nbsp;
            }


        // make a div to contain the sequences
        var seqNode = document.createElement("div");
        seqNode.className = "sequence";
        seqNode.style.width = "100%";
        block.appendChild(seqNode);

        // add a div for the forward strand
        seqNode.appendChild( this._renderSeqDiv( start, end, seq, scale ));

        // and one for the reverse strand
        if( this.config.showReverseStrand ) {
            var comp = this._renderSeqDiv( start, end, Util.complement(seq), scale );
            comp.className = 'revcom';
            seqNode.appendChild( comp );
        }
    },

    /**
     * Given the start and end coordinates, and the sequence bases,
     * makes a div containing the sequence.
     * @private
     */
    _renderSeqDiv: function ( start, end, seq, scale ) {

        var charSize = this.getCharacterMeasurements();

        var container  = document.createElement('div');
        var charWidth = 100/(end-start)+"%";
        var drawChars = scale >= charSize.w;
        var bigTiles = scale > charSize.w + 2; // whether to add .big styles to the base tiles
        for( var i=0; i<seq.length; i++ ) {
            var base = document.createElement('span');
            base.className = 'base base_'+seq[i].toLowerCase();
            base.style.width = charWidth;
            if( drawChars ) {
                if( bigTiles )
                    base.className = base.className + ' big';
                base.innerHTML = seq[i];
            }
            container.appendChild(base);
        }
        return container;
    },

    /**
     * @returns {Object} containing <code>h</code> and <code>w</code>,
     *      in pixels, of the characters being used for sequences
     */
    getCharacterMeasurements: function() {
        if( !this._measurements )
            this._measurements = this._measureSequenceCharacterSize( this.div );
        return this._measurements;
    },

    /**
     * Conducts a test with DOM elements to measure sequence text width
     * and height.
     */
    _measureSequenceCharacterSize: function( containerElement ) {
        var widthTest = document.createElement("div");
        widthTest.className = "sequence";
        widthTest.style.visibility = "hidden";
        var widthText = "12345678901234567890123456789012345678901234567890";
        widthTest.appendChild(document.createTextNode(widthText));
        containerElement.appendChild(widthTest);
        var result = {
            w:  widthTest.clientWidth / widthText.length,
            h: widthTest.clientHeight
        };
        containerElement.removeChild(widthTest);
        return result;
  }

});


return SequenceTrack;
});
