define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'JBrowse/View/FeatureGlyph/Box'
],
function(
    declare,
    array,
    lang,
    Box
) {
return declare(Box, {

renderFeature( context, fRect ) {
    if( this.track.displayMode != 'collapsed' )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );


    if(fRect.f.pairedFeature()) {
        this.renderConnector( context, fRect );
        this.renderSegments( context, fRect );
    } else {
        this.inherited(arguments)
    }
},

renderSegments( context, fRect ) {
    this.renderBox(context, fRect.viewInfo, fRect.f.f1,  fRect.t, fRect.rect.h, fRect.f);
    this.renderBox(context, fRect.viewInfo, fRect.f.f2,  fRect.t, fRect.rect.h, fRect.f);
},

renderConnector( context, fRect ) {
    // connector
    var connectorColor = this.getStyle( fRect.f, 'connectorColor' );
    if( connectorColor ) {
        context.fillStyle = connectorColor;
        var connectorThickness = this.getStyle( fRect.f, 'connectorThickness' );
        context.fillRect(
            fRect.rect.l, // left
            Math.round(fRect.rect.t+(fRect.rect.h-connectorThickness)/2), // top
            fRect.rect.w, // width
            connectorThickness
        );
    }
},

_defaultConfig: function() {
    return this._mergeConfigs(
        dojo.clone( this.inherited(arguments) ),
        {
            //maxFeatureScreenDensity: 400
            style: {
                connectorColor: '#333',
                connectorThickness: 1,

                color: function( feature, path, glyph, track ) {
                  var strand = feature.get('strand');
                  if(Math.abs(strand) != 1 && strand != '+' && strand != '-')
                    return track.colorForBase('reference');
                  else if(track.config.useXS) {
                    var xs = feature._get('xs')
                    var strand={'-':'color_rev_strand','+':'color_fwd_strand'}[xs];
                    if(!strand) strand='color_nostrand';
                    return glyph.getStyle( feature, strand );
                  }
                  else if(feature.get('multi_segment_template')) {
                    var revflag=feature.get('multi_segment_first');
                    if(feature.get('multi_segment_all_correctly_aligned')) {
                      if(revflag||!track.config.useReverseTemplate){
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand' )
                              : glyph.getStyle( feature, 'color_rev_strand' );
                      }else {
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_strand' )
                              : glyph.getStyle( feature, 'color_fwd_strand' );
                      }
                    }
                    if(feature.get('multi_segment_next_segment_unmapped')) {
                      if(revflag||!track.config.useReverseTemplate){
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_missing_mate' )
                              : glyph.getStyle( feature, 'color_rev_missing_mate' );
                      }else{
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_rev_missing_mate' )
                              : glyph.getStyle( feature, 'color_fwd_missing_mate' );
                      }
                    }
                    if(feature.get('seq_id') == feature.get('next_seq_id')) {
                      if(revflag||!track.config.useReverseTemplate){
                        return strand == 1 || strand == '+'
                              ? glyph.getStyle( feature, 'color_fwd_strand_not_proper' )
                              : glyph.getStyle( feature, 'color_rev_strand_not_proper' );
                      }else{
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
                },
                color_fwd_strand_not_proper: '#ECC8C8',
                color_rev_strand_not_proper: '#BEBED8',
                color_fwd_strand: '#EC8B8B',
                color_rev_strand: '#8F8FD8',
                color_fwd_missing_mate: '#D11919',
                color_rev_missing_mate: '#1919D1',
                color_fwd_diff_chr: '#000000',
                color_rev_diff_chr: '#969696',
                color_nostrand: '#999999',
                border_color: null,

                strandArrow: false,

                height: 7,
                marginBottom: 1,
                showMismatches: true,
                mismatchFont: 'bold 10px Courier New,monospace'
            }
        }
    );
}

});
});

