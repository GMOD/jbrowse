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

        var arraySize = Math.ceil( widthBp/binWidth );
        var coverageBins = new Array( arraySize );
        var aCoverage = new Array( arraySize );
        var tCoverage = new Array( arraySize );
        var cCoverage = new Array( arraySize );
        var gCoverage = new Array( arraySize );
        var bpToBin = function( bp ) {
            return Math.floor( (bp-leftBase) / binWidth );
        };

        this.store.getFeatures(
            query,
            dojo.hitch( this, function( feature ) {
                            var startBin = bpToBin( feature.get('start') );
                            var endBin   = bpToBin( feature.get('end')-1 );
                            for( var i = startBin; i <= endBin; i++ ) {
                                coverageBins[i] = (coverageBins[i] || 0) + 1;
                            }
                            // Calculate SNP coverage
                            var mdTag = feature.get('MD');
                            if(mdTag) {
                                var SNPs = this._mdToMismatches(feature, mdTag);
                                // loops through mismatches and updates coverage variables accordingly.
                                for (var i = 0; i<SNPs.length; i++) {
                                    var pos = feature.get('start') + SNPs[i].start - leftBase;
                                    switch (SNPs[i].bases) {
                                        case "A": aCoverage[pos] = (aCoverage[pos] || 0) + 1; break;
                                        case "T": tCoverage[pos] = (tCoverage[pos] || 0) + 1; break;
                                        case "C": cCoverage[pos] = (cCoverage[pos] || 0) + 1; break;
                                        case "G": gCoverage[pos] = (gCoverage[pos] || 0) + 1; break;
                                        default: alert("Unknown base encountered: " + SNPs[i].bases);
                                    }
                                }
                            }
                        }),
            function () {
                // make fake features from the coverage
                for( var i = 0; i < coverageBins.length; i++ ) {
                    // score contains [non-SNP coverage, a SNPs, t SNPs, c SNPs, g SNPs]
                    var nonSNP = (coverageBins[i] || 0) - (aCoverage[i] || 0) - (tCoverage[i] || 0) - (cCoverage[i] || 0) - (gCoverage[i] || 0);
                    var score = [nonSNP, aCoverage[i] || 0, tCoverage[i] || 0, cCoverage[i] || 0, gCoverage[i] || 0];
                    var bpOffset = leftBase+binWidth*i;
                    featureCallback( new CoverageFeature({
                        start: bpOffset,
                        end:   bpOffset+binWidth,
                        score: score
                     }));
                }
                finishCallback();
            }
        );
    },

    /***********************************************************************************************************************
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

        var barColor  = ['#777', 'green', 'red', 'blue', 'yellow'];
        var clipColor = this.config.style.clip_marker_color;
        var bgColor   = this.config.style.bg_color;
        var disableClipMarkers = this.config.disable_clip_markers;

        dojo.forEach( features, function(f,i) {

            var fRect = featureRects[i];

            var score = f.get('score');

            for (var j = 0; j<5; j++) {

                fRect.t = toY(score.slice(j,5).reduce(function(a,b){return a+b;})); // makes progressively shorter rectangles.

                // draw the background color if we are configured to do so
                if( bgColor && fRect.t >= 0 ) {
                    context.fillStyle = bgColor;
                    context.fillRect( fRect.l, 0, fRect.w, canvasHeight );
                }

                if( fRect.t <= canvasHeight ) { // if the rectangle is visible at all

                    if( fRect.t <= originY ) {
                        // bar goes upward
                        context.fillStyle = barColor[j];
                        context.fillRect( fRect.l, fRect.t, fRect.w, originY-fRect.t+1);
                        if( !disableClipMarkers && fRect.t < 0 ) { // draw clip marker if necessary
                            context.fillStyle = clipColor || negColor;
                            context.fillRect( fRect.l, 0, fRect.w, 2 );
                        }
                    }
                    else {
                        alert('Invalid data used. Negative values are not possible.');
                    }
                }
            }
        }, this );
    },
    //*******************************************************************************************************************************

    // a method blatently stolen from "Alignments.js" Perhaps it would be better just to include the file...
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
    }
});
});