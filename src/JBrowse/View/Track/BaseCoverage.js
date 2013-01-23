define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle',
         'JBrowse/Util'
        ],
        function( declare, array, Wiggle, Util ) {

var dojof = Util.dojof;

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

    constructor: function() {
        // force conf variables that are meaningless for this kind of track, and maybe harmful
        delete this.config.bicolor_pivot;
        delete this.config.scale;
        delete this.config.align;
    },

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
        var thisB = this;
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

        thisB.store.getFeatures(
            query,
            function( feature ) {
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
                if( binWidth == 1 ) {
                    var mdTag = feature.get('MD');
                    if( mdTag ) {
                        var SNPs = thisB._mdToMismatches(feature, mdTag);
                        // loops through mismatches and updates coverage variables accordingly.
                        for (var i = 0; i<SNPs.length; i++) {
                            var pos = bpToBin( feature.get('start') + SNPs[i].start );
                            // Note: we reduce matchCoverage so the sum is the total coverage
                            coverageBins[pos]['matchCoverage']--;
                            var base = SNPs[i].bases;
                            coverageBins[pos][base] = ( coverageBins[pos][base] || 0 ) + 1;
                        }
                    }
                }
            },
            function () {
                var makeFeatures = function() {
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
                };

                // if we are zoomed to base level, try to fetch the
                // reference sequence for this region and record each
                // of the bases in the coverage bins
                if( binWidth == 1 ) {
                    var sequence;
                    thisB.browser.getStore( 'refseqs', function( refSeqStore ) {
                        if( refSeqStore ) {
                            refSeqStore.getFeatures( query,
                                                     function(f) {
                                                         sequence = f.get('seq');
                                                     },
                                                     function() {
                                                         if( sequence ) {
                                                             for( var base = leftBase; base <= rightBase; base++ ) {
                                                                 var bin = bpToBin( base );
                                                                 coverageBins[bin]['refBase'] = sequence[bin];
                                                             }
                                                         }
                                                         makeFeatures();
                                                     },
                                                     makeFeatures
                                                   );
                        } else {
                            makeFeatures();
                        }
                    });
                } else {
                    makeFeatures();
                }
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

        // a canvas element below the histogram that will contain indicators of likely SNPs
        var snpCanvas = dojo.create('canvas',
                                    {height: parseInt(block.parentNode.style.height, 10) - canvas.height,
                                     width: canvas.width,
                                     style: { cursor: 'default'},
                                     innerHTML: 'Your web browser cannot display this type of track.',
                                     className: 'SNP-indicator-track'
                                 }, block);
        // widen the canvas and offset it.
        snpCanvas.width += snpCanvas.height;
        snpCanvas.style.position = 'relative';
        snpCanvas.style.left = -snpCanvas.height*0.5 + 'px';
        var snpContext = snpCanvas.getContext('2d');

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
                context.fillStyle = barColor[ID] || 'black';
                if( yPos <= originY ) {
                    // bar goes upward
                    context.fillRect( fRect.l, yPos, fRect.w, height);
                    if( !disableClipMarkers && yPos < 0 ) { // draw clip marker if necessary
                        context.fillStyle = clipColor || negColor;
                        context.fillRect( fRect.l, 0, fRect.w, 2 );
                    }
                }
                else {
                    // bar goes downward
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
            for (var counts in score) {
                if (score.hasOwnProperty(counts) && counts != 'refBase') {
                    totalHeight += score[counts];
                }
            }
            // draw indicators of SNPs if base coverage is greater than 50% of total coverage
            for (var ID in score) {
                if (score.hasOwnProperty(ID) && ID != 'matchCoverage' && ID != 'refBase' && score[ID] > 0.5*totalHeight) {
                    snpContext.beginPath();
                    snpContext.arc( fRect.l + 0.5*(fRect.w+snpCanvas.height),
                                    0.40*snpCanvas.height,
                                    0.20*snpCanvas.height,
                                    1.75 * Math.PI,
                                    1.25 * Math.PI,
                                    false);
                    snpContext.lineTo(fRect.l + 0.5*(fRect.w+snpCanvas.height), 0);
                    snpContext.closePath();
                    snpContext.fillStyle = barColor[ID] || 'black';
                    snpContext.fill();
                    snpContext.lineWidth = 1;
                    snpContext.strokeStyle = 'black';
                    snpContext.stroke();
                }
            }
            // Note: 'matchCoverage' is done first to ensure the grey part of the graph is on top
            drawRectangle('matchCoverage', toY(totalHeight), originY-toY( score['matchCoverage'] )+1, fRect);
            totalHeight -= score['matchCoverage'];

            for (var counts in score) {
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
        if( score && typeof score['matchCoverage'] == 'number') {
            var snps = dojo.clone( score );
            delete snps.refBase;
            delete snps.matchCoverage;

            var total = (score['matchCoverage'] || 0)
                + dojof.values( snps ).reduce(function(a,b){return a+b;}, 0);

            var scoreSummary = '<table>';
            scoreSummary +=
                  '<tr class="ref"><td>'
                + (score['refBase'] ? score['refBase'] +'*' : 'Ref')
                + "</td><td>"
                + score['matchCoverage'] || 0
                + '</td></tr>';
            for (var ID in snps) {
                scoreSummary += '<tr><td>'+ID + '</td><td>' +snps[ID] +'</td></tr>';
            }
            scoreSummary += '<tr class="total"><td>Total</td><td>'+total+'</td></tr>';
            scoreDisplay.innerHTML = scoreSummary+'</table>';
            return true;
        } else {
            return false;
        }
    }
});
});