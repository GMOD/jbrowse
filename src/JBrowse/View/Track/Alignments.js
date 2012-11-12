define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/Util',
         'JBrowse/View/Track/HTMLFeatures'
        ],
        function( declare, array, Util, HTMLFeatures ) {

return declare( HTMLFeatures,
/**
 * @lends JBrowse.View.Track.Alignments
 */
{

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                maxFeatureScreenDensity: 1.5,
                layoutPitchY: 4,
                style: {
                    _defaultLabelScale: 50,
                    className: 'alignment',
                    arrowheadClass: 'arrowhead'
                }
            }
        );
    },

    renderFeature: function( feature, uniqueId, block, scale ) {
        var featDiv = this.inherited( arguments );
        this._drawMismatches( feature, featDiv, scale );

        // if this feature is part of a multi-segment read, and not
        // all of its segments are aligned, add missing_mate to its
        // class
        if( feature.get('multi_segment_template') && !feature.get('multi_segment_all_aligned') )
            featDiv.className += ' missing_mate';

        return featDiv;
    },


    /**
     * draw base-mismatches on the feature
     */
    _drawMismatches: function( feature, featDiv, scale ) {
        // recall: scale is pixels/basepair
        if ( scale >= 0.5 ) {
            var mismatches = this._getMismatches( feature );
            var charSize = this.getCharacterMeasurements();
            var drawChars = scale >= charSize.w;
            var featureLength = feature.get('end') - feature.get('start');

            array.forEach( mismatches, function( mismatch ) {
                array.forEach( mismatch.bases, function( base, i ) {
                    dojo.create('span', {
                                    className: 'mismatch base base_'+(base == '*' ? 'deletion' : base.toLowerCase()),
                                    style: {
                                        position: 'absolute',
                                        left: (mismatch.start+i)/featureLength*100 + '%',
                                        width: Math.max(scale,1) + 'px'
                                    },
                                    innerHTML: drawChars ? base : ''
                                }, featDiv );
               }, this );
            });
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
              var i = token.length-1;
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
    },


    /**
     * Make a default feature detail page for the given feature.
     * @returns {HTMLElement} feature detail page HTML
     */

    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ div ) {
        var fmt = dojo.hitch( this, function( name, value ) {
            name = Util.ucFirst( name.replace(/_/g,' ') );
            return this._fmtDetailField(name, value);
        });
        var container = dojo.create('div', {
            className: 'detail feature-detail feature-detail-'+track.name,
            innerHTML: ''
        });
        container.innerHTML += fmt( 'Name', f.get('name') );
        container.innerHTML += fmt( 'Type', f.get('type') );
        container.innerHTML += fmt( 'Score', f.get('score') );
        container.innerHTML += fmt( 'Description', f.get('note') );
        container.innerHTML += fmt(
            'Position',
            Util.assembleLocString({ start: f.get('start'),
                                     end: f.get('end'),
                                     ref: this.refSeq.name })
            + ({'1':' (+)', '-1': ' (-)', 0: ' (no strand)' }[f.get('strand')] || '')
        );


        var alignment = '<div class="alignment sequence">'+f.get('seq')+'</div>';
        if( f.get('seq') ) {
            container.innerHTML += fmt('Sequence and Quality', this._renderSeqQual( f ) );
        }


        var additionalTags = array.filter(
            f.tags(), function(t) {
                return ! {name:1,score:1,start:1,end:1,strand:1,note:1,subfeatures:1,type:1}[t.toLowerCase()];
            }
        ).sort();

        dojo.forEach( additionalTags, function(t) {
            container.innerHTML += fmt( t, f.get(t) );
        });

        return container;
    },

    _renderSeqQual: function( feature ) {

        var seq  = feature.get('seq'),
            qual = feature.get('qual') || '';
        if( !seq )
            return '';

        qual = qual.split(/\s+/);
        var fieldWidth = (''+Math.max.apply( Math, qual )).length;

        // pad the sequence with spaces
        var seqPadding = ' ';
        while( seqPadding.length < fieldWidth-1 ) {
            seqPadding += ' ';
        }
        var paddedSeq = array.map( seq, function(s) {
            return s + seqPadding;
        });

        var tableRowHTML = function(fields, class_) {
            class_ = class_ ? ' class="'+class_+'"' : '';
            return '<tr'+class_+'>'+array.map( fields, function(f) { return '<td>'+f+'</td>'; }).join('')+'</tr>';
        };
        // insert newlines
        var rendered = '';
        var lineFields = Math.round(60/fieldWidth);
        while( paddedSeq.length ) {
            var line = paddedSeq.slice(0,Math.min( paddedSeq.length, lineFields ) );
            paddedSeq = paddedSeq.slice(lineFields);
            rendered += tableRowHTML( line, 'seq' );
            if( qual.length ) {
                line = qual.slice(0, Math.min( qual.length, lineFields ));
                qual = qual.slice(lineFields);
                rendered += tableRowHTML( line, 'qual' );
            }
        }
        return '<table class="baseQuality">'+rendered+'</table>';
    }
});
});