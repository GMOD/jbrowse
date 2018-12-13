define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/View/FeatureGlyph/Box',
           'JBrowse/View/FeatureGlyph/AlignmentColoring',
           'JBrowse/Store/SeqFeature/_MismatchesMixin'
       ],
       function(
           declare,
           array,
           BoxGlyph,
           AlignmentColoring,
           MismatchesMixin
       ) {



return declare( [BoxGlyph,MismatchesMixin], {

    constructor() {

        // if showMismatches is false, stub out this object's
        // _drawMismatches to be a no-op
        if( ! this.config.style.showMismatches )
            this._drawMismatches = function() {};

    },

    _defaultConfig() {
        return this._mergeConfigs(
            dojo.clone( this.inherited(arguments) ),
            {
                //maxFeatureScreenDensity: 400
                style: {
                    color: this.defaultColor,

                    // normal
                    color_fwd_strand_not_proper: '#ECC8C8',
                    color_rev_strand_not_proper: '#BEBED8',
                    color_fwd_strand: '#EC8B8B',
                    color_rev_strand: '#8F8FD8',
                    color_fwd_missing_mate: '#D11919',
                    color_rev_missing_mate: '#1919D1',
                    color_fwd_diff_chr: '#000000',
                    color_rev_diff_chr: '#969696',

                    // pair colors
                    color_pair_lr: 'grey',
                    color_pair_rr: 'navy',
                    color_pair_rl: 'teal',
                    color_pair_ll: 'green',
                    color_nostrand: '#999999',
                    color_interchrom: 'orange',
                    color_longinsert: 'red',
                    color_shortinsert: 'pink',
                    border_color: null,

                    strandArrow: false,
                    height: 7,
                    marginBottom: 1,
                    showMismatches: true,
                    mismatchFont: 'bold 10px Courier New,monospace',
                    orientationType: 'fr' // default illumina adapter sequence --> <--
                }
            }
        );
    },

    renderFeature( context, fRect ) {

        this.inherited( arguments );

        // draw some mismatches if the feature is more than 3px wide:
        //     draw everything if zoomed in past 0.2 px/bp, otherwise
        //     draw only skips and deletions (the mismatches that
        //     might be large enough to see)
        if( fRect.w > 2 ) {
            if( fRect.viewInfo.scale > 0.2 )
                this._drawMismatches( context, fRect, this._getMismatches( fRect.f ) );
            else
                this._drawMismatches( context, fRect, this._getSkipsAndDeletions( fRect.f ));
        }
    },

    // draw both gaps and mismatches
    _drawMismatches( context, fRect, mismatches, f) {
        var feature = f || fRect.f
        var block = fRect.viewInfo.block;
        var scale = block.scale;

        var charSize = this.getCharacterMeasurements( context );
        context.textBaseline = 'middle'; // reset to alphabetic (the default) after loop

        array.forEach( mismatches, function( mismatch ) {
            var start = feature.get('start') + mismatch.start;
            var end = start + mismatch.length;

            var mRect = {
                h: (fRect.rect||{}).h || fRect.h,
                l: block.bpToX( start ),
                t: fRect.rect.t
            };
            mRect.w = Math.max( block.bpToX( end ) - mRect.l, 1 );

            if( mismatch.type == 'mismatch' || mismatch.type == 'deletion' ) {
                context.fillStyle = this.track.colorForBase( mismatch.type == 'deletion' ? 'deletion' : mismatch.base );
                context.fillRect( mRect.l, mRect.t, mRect.w, mRect.h );

                if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                    context.font = this.config.style.mismatchFont;
                    context.fillStyle = mismatch.type == 'deletion' ? 'white' : 'black';
                    context.fillText( mismatch.base, mRect.l+(mRect.w-charSize.w)/2+1, mRect.t+mRect.h/2 );
                }
            }
            else if( mismatch.type == 'insertion' ) {
                context.fillStyle = 'purple';
                context.fillRect( mRect.l-1, mRect.t+1, 2, mRect.h-2 );
                context.fillRect( mRect.l-2, mRect.t, 4, 1 );
                context.fillRect( mRect.l-2, mRect.t+mRect.h-1, 4, 1 );
                if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                    context.font = this.config.style.mismatchFont;
                    context.fillText( '('+mismatch.base+')', mRect.l+2, mRect.t+mRect.h/2 );
                }
            }
            else if( mismatch.type == 'hardclip' || mismatch.type == 'softclip' ) {
                context.fillStyle = mismatch.type == 'hardclip' ? 'red' : 'blue';
                context.fillRect( mRect.l-1, mRect.t+1, 2, mRect.h-2 );
                context.fillRect( mRect.l-2, mRect.t, 4, 1 );
                context.fillRect( mRect.l-2, mRect.t+mRect.h-1, 4, 1 );
                if( mRect.w >= charSize.w && mRect.h >= charSize.h-3 ) {
                    context.font = this.config.style.mismatchFont;
                    context.fillText( '('+mismatch.base+')', mRect.l+2, mRect.t+mRect.h/2 );
                }
            }
            else if( mismatch.type == 'skip' ) {
                context.clearRect( mRect.l, mRect.t, mRect.w, mRect.h );
                context.fillStyle = '#333';
                context.fillRect( mRect.l, mRect.t+(mRect.h-2)/2, mRect.w, 2 );
            }
        },this);

        context.textBaseline = 'alphabetic';
    },

    getCharacterMeasurements( context ) {
        return this.charSize = this.charSize || function() {
            var fpx;

            try {
                fpx = (this.config.style.mismatchFont.match(/(\d+)px/i)||[])[1];
            } catch(e) {}

            fpx = fpx || Infinity;
            return { w: fpx, h: fpx };
        }.call(this);
    },


    useXS(feature, score, glyph, track) {
        const map = {
            '-': 'color_rev_strand',
            '+': 'color_fwd_strand'
        };
        return glyph.getStyle(feature, map[feature.get('xs')] || 'color_nostrand');
    },

    useTS(feature, score, glyph, track) {
        const map = {
            '-': feature.get('strand') === -1 ? 'color_fwd_strand' : 'color_rev_strand',
            '+': feature.get('strand') === -1 ? 'color_rev_strand' : 'color_fwd_strand'
        }
        return glyph.getStyle(feature, map[feature.get('ts')] || 'color_nostrand');
    },

    colorByMAPQ(feature, score, glyph, track) {
        const c = Math.min(feature.get('score') * 4, 200)
        return `rgb(${c},${c},${c})`;
    },

    getInsertSizePercentile(feature) {
        if (feature.get('is_paired')) {
            const len = Math.abs(feature.get('template_length'))
            if(feature.get('seq_id') != feature.get('next_seq_id')) {
                return 'color_interchrom'
            } else if (this.insertSizeStats.upper < len) {
                return 'color_longinsert'
            } else if (this.insertSizeStats.lower > len) {
                return 'color_shortinsert'
            }
        }
        return null
    },

    getOrientation(feature) {
        const type = Util.orientationTypes[this.config.orientationType]
        const orientation = type[feature.get('pair_orientation')]
        return {
            'LR': 'color_pair_lr',
            'RR': 'color_pair_rr',
            'RL': 'color_pair_rl',
            'LL': 'color_pair_ll'
        }[orientation]
	},


    defaultColor(feature, score, glyph, track, useReverseTemplate) {
        var strand = feature.get('strand');
        if (Math.abs(strand) != 1 && strand != '+' && strand != '-') {
            return this.colorForBase('reference');
        } else {
            if(feature.get('multi_segment_template')) {
                var revflag = feature.get('multi_segment_first');
                if (feature.get('multi_segment_all_correctly_aligned')) {
                    if (revflag || !useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand' )
                              : glyph.getStyle( feature, 'color_rev_strand' );
                    } else {
                        return strand == 1 || strand == '+'
                            ? glyph.getStyle( feature, 'color_rev_strand' )
                            : glyph.getStyle( feature, 'color_fwd_strand' );
                    }
                }
                if (feature.get('multi_segment_next_segment_unmapped')) {
                    if (revflag || !useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_missing_mate' )
                              : glyph.getStyle( feature, 'color_rev_missing_mate' );
                    } else{
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_missing_mate' )
                              : glyph.getStyle( feature, 'color_fwd_missing_mate' );
                    }
                }
                if (feature.get('seq_id') == feature.get('next_seq_id')) {
                    if (revflag || !useReverseTemplate) {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_rev_strand_not_proper' );
                    } else {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_fwd_strand_not_proper' );
                    }
                }
                // should only leave aberrant chr
                return strand == 1 || strand == '+'
                        ? glyph.getStyle( feature, 'color_fwd_diff_chr' )
                        : glyph.getStyle( feature, 'color_rev_diff_chr' );
            }
            return strand == 1 || strand == '+'
                  ? glyph.getStyle( feature, 'color_fwd_strand' )
                  : glyph.getStyle( feature, 'color_rev_strand' );
        }
        return glyph.getStyle( feature, 'color_nostrand' )
    }
});
});
