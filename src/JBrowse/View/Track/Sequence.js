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

        this.charWidth = args.charWidth;
        this.seqHeight = args.seqHeight;

        this.refSeq = refSeq;

        this.sequenceStore = args.store;
    },

    load: function() {
        window.setTimeout( dojo.hitch( this, 'setLoaded' ), 10 );
    },

    startZoom: function(destScale, destStart, destEnd) {
        this.hide();
        this.heightUpdate(0);
    },

    endZoom: function(destScale, destBlockBases) {
        if (destScale == this.charWidth) this.show();
        BlockBased.prototype.clear.apply(this);
    },

    setViewInfo:function(genomeView, numBlocks,
                                                   trackDiv, labelDiv,
                                                   widthPct, widthPx, scale) {
        BlockBased.prototype.setViewInfo.apply(this, [genomeView, numBlocks,
                                                                         trackDiv, labelDiv,
                                                                         widthPct, widthPx, scale]);
        if (scale == this.charWidth) {
            this.show();
        } else {
            this.hide();
            this.heightUpdate(0);
        }
        this.setLabel(this.key);
    },

    nbsp: String.fromCharCode(160),

    fillBlock:function(blockIndex, block,
                       leftBlock, rightBlock,
                       leftBase, rightBase,
                       scale, stripeWidth,
                       containerStart, containerEnd) {
        var that = this;
        if (scale == this.charWidth) {
            this.show();
        } else {
            this.hide();
            this.heightUpdate(0);
        }

        if (this.shown) {
            this.sequenceStore.getRange( this.refSeq, leftBase, rightBase,
                                         function( start, end, seq ) {

                                             // fill with leading blanks if the
                                             // sequence does not extend all the way
                                             // across our range
                                             for( ; start < 0; start++ ) {
                                                 seq = that.nbsp + seq; //nbsp is an "&nbsp;" entity
                                             }

                                             // make a div to contain the sequences
                                             var seqNode = document.createElement("div");
                                             seqNode.className = "sequence";
                                             block.appendChild(seqNode);

                                             // add a div for the forward strand
                                             seqNode.appendChild( that.renderSeqDiv( start, end, seq ));

                                             // and one for the reverse strand
                                             var comp = that.renderSeqDiv( start, end, that.complement(seq) );
                                             comp.className = 'revcom';
                                             seqNode.appendChild( comp );
                                         }
                                       );
            this.heightUpdate(this.seqHeight, blockIndex);
        } else {
            this.heightUpdate(0, blockIndex);
        }
    },

    complement:(function() {
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
     */
    renderSeqDiv: function ( start, end, seq ) {
        var container  = document.createElement("div");
        container.appendChild( document.createTextNode( seq ) );
        return container;
    }
});

});