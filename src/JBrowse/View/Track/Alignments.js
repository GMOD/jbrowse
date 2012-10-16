define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/HTMLFeatures'
        ],
        function( declare, array, HTMLFeatures ) {

return declare( HTMLFeatures,
/**
 * @lends JBrowse.View.Track.Alignments
 */
{

    constructor: function() {
    },

    renderFeature: function(feature, uniqueId, block, scale, containerStart, containerEnd, destBlock ) {
        var featDiv = this.inherited( arguments );
        this._drawMismatches( feature, featDiv, scale );
        return featDiv;
    },

    _drawMismatches: function( feature, featDiv, scale ) {

        // recall: scale is pixels/basepair
        var charSize = this.getCharacterMeasurements();
        console.log(charSize);
        if ( scale >= charSize.w ) {
            var mismatches = this._getMismatches( feature );

            console.log( feature.get('name'), mismatches );
            dojo.forEach( mismatches, function( mismatch ) {
                dojo.create('span', {
                                className: 'base mismatch',
                                style: {
                                    position: 'absolute',
                                    top: '0px',
                                    left: scale * mismatch.start + 'px',
                                    width: mismatch.bases.length * scale + 'px'
                                },
                                innerHTML: mismatch.bases
                            }, featDiv );
           }, this );
        }
    },

    _getMismatches: function( feature ) {
        var seq = feature.get('seq');
        if( ! seq )
            return m;

        // parse the MD tag if it has one
        var mdTag = feature.get('MD');
        if( mdTag ) {
            return this._mdToMismatches( feature, mdTag );
        }

        return [];
    },

    /**
     * parse a SAM MD tag to find mismatching bases of the template versus the reference
     * @returns {Array[Object]} array of mismatches and their positions
     * @private
     */
    _mdToMismatches: function( feature, mdstring ) {
        var mismatchRecords = [];
        var curr = { start: 0, bases: '' };
        var seq = feature.get('seq');
        var nextRecord = function() {
              mismatchRecords.push( curr );
              curr = { start: curr.start + curr.bases.length, bases: ''};
        };
        array.forEach( mdstring.match(/(\d+|\^[a-z]+|[a-z])/ig), function( token ) {
          if( token.match(/^\d/) ) { // matching bases
              curr.start += parseInt( token );
          }
          else if( token.match(/^\^/) ) { // insertion in the template
              var i = token.length;
              while( i-- ) {
                  curr.bases += '*';
              }
              nextRecord();
          }
          else if( token.match(/^[a-z]/i) ) { // mismatch
              curr.bases = seq.substr( curr.start, token.length );
              nextRecord();
          }
        });
        return mismatchRecords;
    },

    // stub out subfeature rendering, this track doesn't render subfeatures
    renderSubfeature: function() {},

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
        var widthTest = dojo.create('div', {
                                        innerHTML: '<span class="base mismatch">A</span>'
                                            +'<span class="base mismatch">C</span>'
                                            +'<span class="base mismatch">T</span>'
                                            +'<span class="base mismatch">G</span>'
                                            +'<span class="base mismatch">N</span>',
                                        style: {
                                            visibility: 'hidden',
                                            position: 'absolute',
                                            left: '0px'
                                        }
                                    }, containerElement );
        var result = {
            w:  widthTest.clientWidth / 5,
            h: widthTest.clientHeight
        };
        containerElement.removeChild(widthTest);
        return result;
    }
});
});