define( [
            'dojo/_base/declare',
            'JBrowse/View/Track/BlockBased'
        ],
        function( declare, BlockBased ) {

return declare( BlockBased,
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
    constructor: function( args ) {
        var config = args.config;
        var refSeq = args.refSeq;

        BlockBased.call( this, config.label, config.key,
                         false, args.changeCallback );

        this.config = config;

        this.refSeq = refSeq;

        this.sequenceStore = args.store;
    },

    load: function() {
        window.setTimeout( dojo.hitch( this, 'setLoaded' ), 10 );
    },

    // startZoom: function(destScale, destStart, destEnd) {
    //     this.hide();
    //     this.heightUpdate(0);
    // },

    endZoom: function(destScale, destBlockBases) {
        this.clear();
        BlockBased.prototype.clear.apply(this);
    },

    setViewInfo:function(genomeView, heightUpdate, numBlocks,
                         trackDiv, labelDiv,
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
        if ( scale >= charSize.w ) {
            this.sequenceStore.getRange(
                this.refSeq, leftBase, rightBase,
                dojo.hitch( this, '_fillSequenceBlock', block, stripeWidth ) );
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

    _fillSequenceBlock: function( block, stripeWidth, start, end, seq ) {
        // fill with leading blanks if the
        // sequence does not extend all the way
        // across our range
        for( ; start < 0; start++ ) {
            seq = this.nbsp + seq; //nbsp is an "&nbsp;" entity
        }

        // make a div to contain the sequences
        var seqNode = document.createElement("div");
        seqNode.className = "sequence";
        seqNode.style.width = "100%";
        block.appendChild(seqNode);

        // add a div for the forward strand
        seqNode.appendChild( this._renderSeqDiv( start, end, seq, stripeWidth ));

        // and one for the reverse strand
        var comp = this._renderSeqDiv( start, end, this.complement(seq), stripeWidth );
        comp.className = 'revcom';
        seqNode.appendChild( comp );
    },

    complement: (function() {
        var compl_rx   = /[ACGT]/gi;

        // from bioperl: tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/
        // generated with:
        // perl -MJSON -E '@l = split "","acgtrymkswhbvdnxACGTRYMKSWHBVDNX"; print to_json({ map { my $in = $_; tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/; $in => $_ } @l})'
        var compl_tbl  = {"S":"S","w":"w","T":"A","r":"y","a":"t","N":"N","K":"M","x":"x","d":"h","Y":"R","V":"B","y":"r","M":"K","h":"d","k":"m","C":"G","g":"c","t":"a","A":"T","n":"n","W":"W","X":"X","m":"k","v":"b","B":"V","s":"s","H":"D","c":"g","D":"H","b":"v","R":"Y","G":"C"};

        var compl_func = function(m) { return compl_tbl[m] || JBrowse.View.Track.Sequence.prototype.nbsp; };
        return function( seq ) {
            return seq.replace( compl_rx, compl_func );
        };
    })(),

    /**
     * Given the start and end coordinates, and the sequence bases,
     * makes a div containing the sequence.
     * @private
     */
    _renderSeqDiv: function ( start, end, seq, stripeWidth ) {
        var container  = document.createElement('div');
        var charWidth = (100/seq.length)+"%";
        for( var i=0; i<seq.length; i++ ) {
            var base = document.createElement('span');
            base.className = 'base';
            base.style.width = charWidth;
            base.innerHTML = seq[i];
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

});