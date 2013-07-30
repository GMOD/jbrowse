define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'JBrowse/View/FeatureGlyph/Box'
       ],
       function(
           declare,
           lang,
           array,
           BoxGlyph
       ) {

return declare( BoxGlyph, {

_defaultConfig: function() {
    return this._mergeConfigs(
        this.inherited(arguments),
        {
            style: {
                connector_color: '#333',
                connector_thickness: 1,
                border_color: 'rgba( 0, 0, 0, 0.3 )'
            },
            sub_parts: function() { return true; } // accept all subparts by default
        });
},

renderFeature: function( context, fRect ) {
    if( this.track.displayMode != 'collapsed' )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w), fRect.h );

    this.renderConnector( context,  fRect );
    this.renderSegments( context, fRect );
    this.renderLabel( context, fRect );
    this.renderDescription( context, fRect );
    this.renderArrowhead( context, fRect );
},

renderConnector: function( context, fRect ) {
    // connector
    var connectorColor = this.getStyle( fRect.f, 'connector_color' );
    if( connectorColor ) {
        context.fillStyle = connectorColor;
        var connectorThickness = this.getStyle( fRect.f, 'connector_thickness' );
        context.fillRect(
            fRect.rect.l, // left
            Math.round(fRect.rect.t+(fRect.rect.h-connectorThickness)/2), // top
            fRect.rect.w, // width
            connectorThickness
        );
    }
},

renderSegments: function( context, fRect ) {
    var subfeatures = fRect.f.children();
    if( subfeatures ) {

        var thisB = this;
        var parentFeature = fRect.f;

        function style( feature, stylename ) {
            if( stylename == 'height' )
                return thisB._getFeatureHeight( fRect.viewInfo, feature );

            return thisB.getStyle( feature, stylename ) || thisB.getStyle( parentFeature, stylename );
        }

        for( var i = 0; i < subfeatures.length; ++i ) {
            if( this._filterSubpart( subfeatures[i] ) )
                this.renderBox( context, fRect.viewInfo, subfeatures[i], fRect.t, fRect.rect.h, fRect.f, style );
        }
    }
},

_filterSubpart: function( f ) {
    return ( this._subpartsFilter || (this._subpartsFilter = this._makeSubpartsFilter()) )(f);
},

// make a function that will filter subpart features according to the
// sub_parts conf var
_makeSubpartsFilter: function( f ) {
    var filter = this.getConf( 'sub_parts' );

    if( typeof filter == 'string' )
        // convert to array
        filter = filter.split( /\s*,\s*/ );

    if( typeof filter == 'object' ) {
        // lowercase and make into a function
        if( lang.isArray( filter ) )
            filter = function() {
                var f = {};
                array.forEach( filter, function(t) { f[t.toLowerCase()] = true; } );
                return f;
            }.call(this);
        else
            filter = function() {
                var f = {};
                for( var t in filter ) {
                    f[t.toLowerCase()] = filter[t];
                }
                return f;
            }.call(this);
        return function(feature) {
            return filter[ (feature.get('type')||'').toLowerCase() ];
        };
    }

    return filter;
}

});
});