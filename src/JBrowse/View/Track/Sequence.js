define( [
            'dojo/_base/declare',
            'dojo/dom-construct',
            'dojo/dom-class',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/ExportMixin',
            'JBrowse/CodonTable',
            'JBrowse/Util'
        ],
        function( declare, dom, domClass, BlockBased, ExportMixin, CodonTable, Util ) {

return declare( [BlockBased, ExportMixin],
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
    constructor: function( args ) {},

    _defaultConfig: function() {
        return {
            maxExportSpan: 500000,
            showReverseStrand: true
        };
    },
    _exportFormats: function() {
        return [{name: 'FASTA', label: 'FASTA', fileExt: 'fasta'}];
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

    fillBlock:function( args ) {

        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;

        var leftExtended = leftBase - 2;
        var rightExtended = rightBase + 2;

        var charSize = this.getCharacterMeasurements();

        // if we are zoomed in far enough to draw bases, then draw them
        if ( scale >= 1 ) {
            this.store.getFeatures(
                {
                    ref: this.refSeq.name,
                    seqChunkSize: this.refSeq.seqChunkSize,
                    start: leftExtended,
                    end: rightExtended
                },
                dojo.hitch( this, '_fillSequenceBlock', block, scale ),
                function() {}
            );
            this.heightUpdate( this.config.showTranslation ? (charSize.h + 2)*8 : charSize.h*2, blockIndex );
        }
        // otherwise, just draw a sort of line (possibly dotted) that
        // suggests there are bases there if you zoom in far enough
        else {
            var borderWidth = Math.max(1,Math.round(4*scale/charSize.w));
            var blur = dojo.create( 'div', {
                             className: 'sequence_blur',
                             style: { borderStyle: 'solid', borderTopWidth: borderWidth+'px', borderBottomWidth: borderWidth+'px' }
                         }, block.domNode );
            this.heightUpdate( blur.offsetHeight+2*blur.offsetTop, blockIndex );
        }

        args.finishCallback();
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

        var blockStart = start + 2;
        var blockEnd = end - 2;
        var blockSeq = seq.substring( 2, seq.length - 2 );
        var blockLength = blockSeq.length;

        if( this.config.showTranslation ) {
            var extStart = start;
            var extEnd = end;
            var extStartSeq = seq.substring( 0, seq.length - 2 );
            var extEndSeq = seq.substring( 2 );

            var frameDiv = [];
            for( var i = 0; i < 3; i++ ) {
                var transStart = blockStart + i;
                var frame = (transStart % 3 + 3) % 3;
                var translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                frameDiv[frame] = translatedDiv;
                domClass.add( translatedDiv, "frame" + frame )
            }
            for( var i = 2; i >= 0; i-- ) {
                block.domNode.appendChild( frameDiv[i] );
            }
        }

        // make a div to contain the sequences
        var seqNode = dom.create("div", { className: "sequence", style: { width: "100%"} }, block.domNode);

        // add a div for the forward strand
        seqNode.appendChild( this._renderSeqDiv( blockStart, blockEnd, blockSeq, scale ));

        // and one for the reverse strand
        if( this.config.showReverseStrand ) {
            var comp = this._renderSeqDiv( blockStart, blockEnd, Util.complement(blockSeq), scale );
            comp.className = 'revcom';
            seqNode.appendChild( comp );

            if( this.config.showTranslation ) {
                var frameDiv = [];
                for(var i = 0; i < 3; i++) {
                    var transStart = blockStart + 1 - i;
                    var frame = (transStart % 3 + 3) % 3;
                    var translatedDiv = this._renderTranslation( extStartSeq, i, blockStart, blockEnd, blockLength, scale, true );
                    frameDiv[frame] = translatedDiv;
                    domClass.add( translatedDiv, "frame" + frame );
                }
                for( var i = 0; i < 3; i++ ) {
                    block.domNode.appendChild( frameDiv[i] );
                }
            }
        }
    },

    _renderTranslation: function( seq, offset, blockStart, blockEnd, blockLength, scale, reverse ) {
        seq = reverse ? Util.revcom( seq ) : seq;

        var extraBases = (seq.length - offset) % 3;
        var seqSliced = seq.slice( offset, seq.length - extraBases );

        var translated = "";
        for( var i = 0; i < seqSliced.length; i += 3 ) {
            var nextCodon = seqSliced.slice(i, i + 3);
            var aa = CodonTable[nextCodon] || this.nbsp;
            translated = translated + aa;
        }

        translated = reverse ? translated.split("").reverse().join("") : translated; // Flip the translated seq for left-to-right rendering

        var charSize = this.getCharacterMeasurements("translatedSequence");

        var charWidth = 100/(blockLength / 3);

        var container  = dom.create('div',
            {
                className: 'translatedSequence offset'+offset,
                style:
                {
                    width: (charWidth * translated.length) + "%"
                }
            });

        if( reverse ) {
            container.style.top = "32px";
            container.style.left = (100 - charWidth * (translated.length + offset / 3))+ "%";
        } else {
            container.style.left = (charWidth * offset / 3) + "%";
        }

        charWidth = 100/ translated.length + "%";

        var drawChars = scale >= charSize.w;

        for( var i=0; i<translated.length; i++ ) {
            var aaSpan = document.createElement('span');
            aaSpan.className = 'aa aa_'+translated.charAt([i]).toLowerCase();
            aaSpan.style.width = charWidth;
            if( drawChars ) {
                aaSpan.className = aaSpan.className + ' big';
                aaSpan.innerHTML = translated.charAt([i]);
            }
            container.appendChild(aaSpan);
        }
        return container;
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
        var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles
        for( var i=0; i<seq.length; i++ ) {
            var base = document.createElement('span');
            base.className = 'base base_'+seq.charAt([i]).toLowerCase();
            base.style.width = charWidth;
            if( drawChars ) {
                if( bigTiles )
                    base.className = base.className + ' big';
                base.innerHTML = seq.charAt(i);
            }
            container.appendChild(base);
        }
        return container;
    },

    /**
     * @returns {Object} containing <code>h</code> and <code>w</code>,
     *      in pixels, of the characters being used for sequences
     */
    getCharacterMeasurements: function( className ) {
        if( !this._measurements )
            this._measurements = this._measureSequenceCharacterSize( this.div, className );
        return this._measurements;
    },

    /**
     * Conducts a test with DOM elements to measure sequence text width
     * and height.
     */
    _measureSequenceCharacterSize: function( containerElement, className ) {
        var widthTest = document.createElement("div");
        widthTest.className = className || "sequence";
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
