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
        this._charMeasurements = {};
    },

    configSchema: {
        slots: [
            { name: 'maxExportSpan',     type: 'integer', defaultValue: 500000 },
            { name: 'showReverseStrand', type: 'boolean', defaultValue: true },
            { name: 'showForwardStrand', type: 'boolean', defaultValue: true },
            { name: 'showTranslation',   type: 'boolean', defaultValue: true }
        ]
    },

    _exportFormats: function() {
        return MediaTypes.getTypeRecords('fasta');
    },

    nbsp: String.fromCharCode(160),

    fillBlock:function( block, blockNode ) {
        var blockDims = block.getDimensions();
        var projectionBlock = block.getProjectionBlock();

        dom.empty( blockNode );

        var blur = dojo.create(
            'div',
            { className: 'sequence_blur',
              innerHTML: '<span class="loading">Loading</span>',
              style: {
                  height: ( this.getConf('showTranslation') ? 6*14 : 0 )
                      + ( this.getConf('showForwardStrand') ? 14 : 0 )
                      + ( this.getConf('showReverseStrand') ? 14 : 0 ) + 'px'
              }
            }, blockNode );

        this.heightUpdate( parseFloat( blur.style.height ) );

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
                           if( seq )
                               thisB._fillSequenceBlock( block, blockNode, scale, seq );
                           else
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

    _fillSequenceBlock: function( block, blockNode, scale, seq ) {
        seq = seq.replace(/\s/g,this.nbsp);

        var baseSpan = block.getBaseSpan();

        var blockStart = Math.floor( baseSpan.l );
        var blockEnd   = Math.ceil(  baseSpan.r );

        var blockSeq    = seq.substring( 2, seq.length - 2 );
        var blockLength = blockSeq.length;

        var extStart = blockStart-2;
        var extEnd = blockStart+2;
        var extStartSeq = seq.substring( 0, seq.length - 2 );
        var extEndSeq = seq.substring( 2 );

        if( this.getConf('showForwardStrand') && this.getConf('showTranslation') ) {
            var frameDiv = [];
            for( var i = 0; i < 3; i++ ) {
                var transStart = blockStart + i;
                var frame = (transStart % 3 + 3) % 3;
                var translatedDiv = this._renderTranslation( extEndSeq, i, blockStart, blockEnd, blockLength, scale );
                frameDiv[frame] = translatedDiv;
                domClass.add( translatedDiv, "frame" + frame );
            }
            for( var i = 2; i >= 0; i-- ) {
                blockNode.appendChild( frameDiv[i] );
            }
        }

        // make a table to contain the sequences
        var charSize = this.getCharacterMeasurements('sequence');
        var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles

        if( this.getConf('showReverseStrand') || this.getConf('showForwardStrand') )
            var seqNode = dom.create(
                "table", {
                    className: "sequence" + (bigTiles ? ' big' : ''),
                    style: { width: "100%" }
                }, blockNode );

        // add a table for the forward strand
        if( this.getConf('showForwardStrand') )
            seqNode.appendChild( this._renderSeqTr( blockStart, blockEnd, blockSeq, scale ));

        // and one for the reverse strand
        if( this.getConf('showReverseStrand') ) {
            var comp = this._renderSeqTr( blockStart, blockEnd, Util.complement(blockSeq), scale );
            comp.className = 'revcom';
            seqNode.appendChild( comp );

            if( this.getConf('showTranslation') ) {
                var frameDiv = [];
                for(var i = 0; i < 3; i++) {
                    var transStart = blockStart + 1 - i;
                    var frame = (transStart % 3 + 3) % 3;
                    var translatedDiv = this._renderTranslation( extStartSeq, i, blockStart, blockEnd, blockLength, scale, true );
                    frameDiv[frame] = translatedDiv;
                    domClass.add( translatedDiv, "frame" + frame );
                }
                for( var i = 0; i < 3; i++ ) {
                    blockNode.appendChild( frameDiv[i] );
                }
            }
        }

        // var totalHeight = 0;
        // array.forEach( blockNode.childNodes, function( table ) {
        //                    totalHeight += (table.clientHeight || table.offsetHeight);
        //                });
        // this.heightUpdate( totalHeight );
    },

    _renderTranslation: function( seq, offset, blockStart, blockEnd, blockLength, scale, reverse ) {
        seq = reverse ? Util.revcom( seq ) : seq;

        var extraBases = (seq.length - offset) % 3;
        var seqSliced = seq.slice( offset, seq.length - extraBases );

        var translated = "";
        for( var i = 0; i < seqSliced.length; i += 3 ) {
            var nextCodon = seqSliced.slice(i, i + 3);
            var aminoAcid = CodonTable[nextCodon] || this.nbsp;
            translated = translated + aminoAcid;
        }

        translated = reverse ? translated.split("").reverse().join("") : translated; // Flip the translated seq for left-to-right rendering

        var charSize = this.getCharacterMeasurements("aminoAcid");
        var bigTiles = scale > charSize.w + 4; // whether to add .big styles to the base tiles

        var charWidth = 100/(blockLength / 3);

        var container = dom.create( 'div',{ className: 'translatedSequence' } );
        var table  = dom.create('table',
            {
                className: 'translatedSequence offset'+offset+(bigTiles ? ' big' : ''),
                style:
                {
                    width: (charWidth * translated.length) + "%"
                }
            }, container );
        var tr = dom.create('tr', {}, table );

        table.style.left = (
            reverse ? 100 - charWidth * (translated.length + offset / 3)
                    : charWidth*offset/3
        ) + "%";

        charWidth = 100/ translated.length + "%";

        var drawChars = scale >= charSize.w;
        if( drawChars )
            table.className += ' big';

        for( var i=0; i<translated.length; i++ ) {
            var aminoAcidSpan = document.createElement('td');
            aminoAcidSpan.className = 'aminoAcid aminoAcid_'+translated.charAt(i).toLowerCase();
            aminoAcidSpan.style.width = charWidth;
            if( drawChars ) {
                aminoAcidSpan.innerHTML = translated.charAt( i );
            }
            tr.appendChild(aminoAcidSpan);
        }
        return container;
    },

    /**
     * Given the start and end coordinates, and the sequence bases,
     * makes a table row containing the sequence.
     * @private
     */
    _renderSeqTr: function ( start, end, seq, scale ) {

        var charSize = this.getCharacterMeasurements('sequence');
        var container  = document.createElement('tr');
        var charWidth = 100/(end-start)+"%";
        var drawChars = scale >= charSize.w;
        for( var i=0; i<seq.length; i++ ) {
            var base = document.createElement('td');
            base.className = 'base base_'+seq.charAt(i).toLowerCase();
            base.style.width = charWidth;
            if( drawChars ) {
                base.innerHTML = seq.charAt(i);
            }
            container.appendChild(base);
        }
        return container;
    },

    startZoom: function() {
        query('.base', this.div ).empty();
    },

    /**
     * @returns {Object} containing <code>h</code> and <code>w</code>,
     *      in pixels, of the characters being used for sequences
     */
    getCharacterMeasurements: function( className ) {
        return this._charMeasurements[className] || (
            this._charMeasurements[className] = this._measureSequenceCharacterSize( this.div, className )
        );
    },

    /**
     * Conducts a test with DOM elements to measure sequence text width
     * and height.
     */
    _measureSequenceCharacterSize: function( containerElement, className ) {
        var widthTest = document.createElement("td");
        widthTest.className = className;
        widthTest.style.visibility = "hidden";
        var widthText = "12345678901234567890123456789012345678901234567890";
        widthTest.appendChild(document.createTextNode(widthText));
        containerElement.appendChild(widthTest);
        var result = {
            w:  (widthTest.clientWidth / widthText.length)+1,
            h: widthTest.clientHeight
        };
        containerElement.removeChild(widthTest);
        return result;
  },

    _trackMenuOptions: function() {
        var track = this;
        var o = this.inherited(arguments);
        o.push( { type: 'dijit/MenuSeparator' } );
        o.push.apply( o,
            [
                { label: 'Show forward strand',
                  type: 'dijit/CheckedMenuItem',
                  checked: this.getConf('showForwardStrand'),
                  onClick: function(event) {
                      track.setConf('showForwardStrand',this.checked);
                      track.changed();
                  }
                },
                { label: 'Show reverse strand',
                  type: 'dijit/CheckedMenuItem',
                  checked: this.getConf('showReverseStrand'),
                  onClick: function(event) {
                      track.setConf('showReverseStrand', this.checked );
                      track.changed();
                  }
                },
                { label: 'Show translation',
                  type: 'dijit/CheckedMenuItem',
                  checked: this.getConf('showTranslation'),
                  onClick: function(event) {
                      track.setConf('showTranslation', this.checked );
                      track.changed();
                  }
                }
            ]);
        return o;
    }

});
});
