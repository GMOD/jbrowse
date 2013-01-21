define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle',
         'JBrowse/Util'
        ],
        function( declare, array, Wiggle, Util ) {

// feature class for the features we make for the calculated coverage
// values
var CoverageFeature = Util.fastDeclare(
    {
        get: function(f) { return this[f]; },
        tags: function() { return [ 'start', 'end', 'score' ]; },
        score: 0,
        constructor: function( args ) {
            this.start = args.start;
            this.end = args.end;
            this.score = args.score;
        }
    });

return declare( Wiggle,
{

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                min_score: 0,
                max_score: 100
            }
        );
    },

    getGlobalStats: function() {
        return {};
    },

    getFeatures: function( query, featureCallback, finishCallback, errorCallback ) {
        var leftBase  = query.start;
        var rightBase = query.end;
        var scale = query.scale; // px/bp
        var widthBp = rightBase-leftBase;
        var widthPx = widthBp * ( query.scale || 1/query.basesPerSpan);

        var binWidth = Math.ceil( query.basesPerSpan ); // in bp

        var coverageBins = {};
        var bpToBin = function( bp ) {
            return Math.floor( (bp-leftBase) / binWidth );
        };

        this.store.getFeatures(
            query,
            dojo.hitch( this, function( feature ) {
                            var startBin = bpToBin( feature.get('start') );
                            var endBin   = bpToBin( feature.get('end')-1 );
                            for( var i = startBin; i <= endBin; i++ ) {
                                if ( coverageBins[i] ) {
                                    coverageBins[i]['matchCoverage']++;
                                }
                                else {
                                    coverageBins[i] = {};
                                    coverageBins[i]['matchCoverage'] = 1;
                                }
                            }
                            // Calculate SNP coverage
                            var mdTag = feature.get('MD');
                            if(mdTag) {
                                var SNPs = this._mdToMismatches(feature, mdTag);
                                // loops through mismatches and updates coverage variables accordingly.
                                for (var i = 0; i<SNPs.length; i++) {
                                    var pos = bpToBin( feature.get('start') + SNPs[i].start );
                                    // Note: we reduce matchCoverage so the sum is the total coverage
                                    coverageBins[pos]['matchCoverage']--;
                                    if ( coverageBins[pos][SNPs[i].bases] ) {
                                        coverageBins[pos][SNPs[i].bases]++;
                                    }
                                    else {
                                        coverageBins[pos][SNPs[i].bases] = 1;
                                    }
                                }
                            }
                        }),
            function () {
                // make fake features from the coverage
                for( var i = 0; i < Math.ceil( widthBp/binWidth ); i++ ) {
                    var bpOffset = leftBase+binWidth*i;
                    featureCallback( new CoverageFeature({
                        start: bpOffset,
                        end:   bpOffset+binWidth,
                        score: coverageBins[i] || {'matchCoverage': 0}
                     }));
                }
                finishCallback();
            }
        );
    },

    /*
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize.call(this, val) );
        });
        var originY = toY( dataScale.origin );

        var barColor  = {'matchCoverage':'#999', 'A':'#00BF00', 'T':'red', 'C':'#4747ff', 'G':'#d5bb04'}; // base colors from "main.css"
        var negColor  = this.config.style.neg_color;
        var clipColor = this.config.style.clip_marker_color;
        var bgColor   = this.config.style.bg_color;
        var disableClipMarkers = this.config.disable_clip_markers;

        var drawRectangle = function(ID, yPos, height, fRect) {
            // draw the background color if we are configured to do so
            if( bgColor && yPos >= 0 ) {
                context.fillStyle = bgColor;
                context.fillRect( fRect.l, 0, fRect.w, canvasHeight );
            }

            if( yPos <= canvasHeight ) { // if the rectangle is visible at all

                if( yPos <= originY ) {
                    // bar goes upward
                    context.fillStyle = barColor[ID] || 'black';
                    context.fillRect( fRect.l, yPos, fRect.w, height);
                    if( !disableClipMarkers && yPos < 0 ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || negColor;
                        context.fillRect( fRect.l, 0, fRect.w, 2 );
                    }
                }
                else {
                    // bar goes downward (Should not be reached)

                    context.fillStyle = negColor;
                    context.fillRect( fRect.l, originY, fRect.w, height );
                    if( !disableClipMarkers && yPos >= canvasHeight ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || barColor[ID];
                        context.fillRect( fRect.l, canvasHeight-3, fRect.w, 2 );
                    }
                }
            }
        };

        dojo.forEach( features, function(f,i) {
            var fRect = featureRects[i];
            var score = f.get('score');
            var totalHeight = 0;
            for (counts in score) {
                if (score.hasOwnProperty(counts)) {
                    totalHeight += score[counts];
                }
            }

            // Note: 'matchCoverage' is done first to ensure the grey part of the graph is on top
            drawRectangle('matchCoverage', toY(totalHeight), originY-toY( score['matchCoverage'] )+1, fRect);
            totalHeight -= score['matchCoverage'];

            for (counts in score) {
                if (score.hasOwnProperty(counts) && counts != 'matchCoverage') {
                    drawRectangle( counts, toY(totalHeight), originY-toY( score[counts] )+1, fRect);
                    totalHeight -= score[counts];
                }
            }

        }, this ); 
    },

    /**
     * parse a SAM MD tag to find mismatching bases of the template versus the reference
     * @returns {Array[Object]} array of mismatches and their positions
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
                  curr.bases = '*';
                  nextRecord();
              }
          }
          else if( token.match(/^[a-z]/i) ) { // mismatch
              curr.bases = seq.substr( curr.start, token.length );
              nextRecord();
          }
        });
        return mismatchRecords;
    },


    /*
     * The following method is required to override the equivalent method in "WiggleBase.js"
     * It displays more complete data.
     */
    _showPixelValue: function( scoreDisplay, score ) {
        if( typeof score['matchCoverage'] == 'number') {
            var scoreSummary = "<u>COVERAGE SUMMARY</u><br>";
            if (score['matchCoverage']){scoreSummary += "Matching Bases: "+score['matchCoverage']+'<br>';}
            for (ID in score) {
                if (score.hasOwnProperty(ID) && ID != 'matchCoverage') {
                    scoreSummary += ID + ': ' +score[ID] +'<br>';
                }
            }
            scoreDisplay.innerHTML = scoreSummary;
            return true;
        } else {
            return false;
        }
    }
});
});