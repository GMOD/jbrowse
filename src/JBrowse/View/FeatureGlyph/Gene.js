define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'JBrowse/View/FeatureGlyph/ProcessedTranscript'
       ],
       function(
           declare,
           lang,
           ProcessedTranscript
       ) {

return declare( ProcessedTranscript, {

_getFeatureRectangle: function( viewArgs, feature ) {

    // lay out rects for each of the subfeatures
    var subArgs = lang.mixin( {}, viewArgs );
    subArgs.showDescriptions = subArgs.showLabels = false;
    var subfeatures = feature.children();

    // sort the children by name
    subfeatures.sort( function( a, b ) { return (a.get('name') || '').localeCompare( b.get('name')||'' ); } );

    // get the rects for the children
    var padding = 1;
    var fRect = { l: Infinity, h: 0, r: -Infinity, subRects: [], f: feature };
    if( subfeatures ) {
        for( var i = 0; i < subfeatures.length; i++ ) {
            var subRect = this.inherited( arguments, [ subArgs,subfeatures[i] ] );
            subRect.t = fRect.h ? fRect.h+padding : 0;
            fRect.subRects.push( subRect );
            fRect.r = Math.max( fRect.r, subRect.l+subRect.w-1 );
            fRect.l = Math.min( fRect.l, subRect.l );
            fRect.h += subRect.h+padding;
        }
    }
    fRect.rect = { l: fRect.l, h: fRect.h, w: Math.max( fRect.w, 2 ) };
    fRect.w = fRect.rect.w; // in case it was increased
    if( viewArgs.displayMode != 'compact' )
        fRect.h += this.getStyle( feature, 'marginBottom' ) || 0;


    // calculate the width
    fRect.w = fRect.r - fRect.l + 1;
    delete fRect.r;

    // no labels or descriptions if displayMode is collapsed, so stop here
    if( viewArgs.displayMode == "collapsed")
        return fRect;

    // expand the fRect to accommodate labels if necessary
    this._expandRectangleWithLabels( viewArgs, feature, fRect );

    return fRect;
},

renderFeature: function( context, fRect ) {
    if( this.track.displayMode != 'collapsed' )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );

    var subRects = fRect.subRects;
    for( var i = 0; i < subRects.length; i++ ) {
        this.inherited( arguments, [ context, subRects[i] ] );
    }

    this.renderLabel( context, fRect );
    this.renderDescription( context, fRect );
}

});
});
