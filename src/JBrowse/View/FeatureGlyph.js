define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/aspect',

           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           array,
           aspect,

           _ConfigurationMixin
       ) {

return declare( _ConfigurationMixin, {

    constructor: function( args ) {
        this.track = args.track;

        if( ! this.declaredClass )
            throw new Error( "must declare a class name in the declare() call for feature glyphs" );
    },

    getStyle: function( feature, name ) {
        return this.getConfForFeature( name, feature );
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * feature by feature.  Provides a uniform function signature for
     * user-defined callbacks.
     */
    getConfForFeature: function( path, feature ) {
        return this.getConf( path, [feature, path, this, this.track ] );
    },

    mouseoverFeature: function( context, fRect ) {
        this.renderFeature( context, fRect );

        // highlight the feature rectangle if we're moused over
        context.fillStyle = this.getStyle( fRect.f, 'mouseovercolor' ).toString();
        context.fillRect( fRect.rect.l, fRect.t, fRect.rect.w, fRect.rect.h );
    },

    /**
     * Get the dimensions of the rendered feature in pixels.
     */
    _getFeatureRectangle: function( viewArgs, feature ) {
        var block = viewArgs.block;
        var fRect = {
            blockID: block.id(),
            l: block.bpToPx( feature.get('start') ),
            h: this.getFeatureHeight( viewArgs, feature ),
            f: feature,
            glyphType: this.declaredClass
        };
        console.log( feature.get('start')+' -> '+fRect.l );

        fRect.w = block.bpToPx( feature.get('end') ) - fRect.l;
    },

    layoutFeature: function( viewArgs, layout, feature ) {
        var block = viewArgs.block;
        var dims = block.getDimensions();
        var fRect = this._getFeatureRectangle( viewArgs, feature );
        fRect.f = feature;

        // console.log(
        //     'laid out '+feature.get('start')+'-'+feature.get('end')
        //     +' to '+fRect.l+'-'+(fRect.l+fRect.w)
        // );

        var pBlock = block.getProjectionBlock();
        var startbp = pBlock.projectPoint( dims.l + fRect.l );
        var endbp   = pBlock.projectPoint( dims.l + fRect.l + fRect.w );
        //console.log( 'layout '+feature.id() );
        fRect.t = layout.addRect(
            feature.id(),
            startbp,
            endbp,
            fRect.h,
            fRect
        );
        if( fRect.t === null )
            return null;

        return fRect;
    },

    //stub
    renderFeature: function( context, fRect ) {
    },

    getFeatureHeight: function( block, feature ) {
        return this.getStyle( feature, 'height');
    },

    updateStaticElements: function( block, context, fRect ) {

    }

});
});