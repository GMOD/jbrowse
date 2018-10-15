define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'JBrowse/View/Track/CanvasFeatures',
            'JBrowse/View/Track/_PairedAlignmentsMixin',
            'JBrowse/Util'
        ],
        function(
            declare,
            array,
            lang,
            CanvasFeatures,
            PairedAlignmentsMixin,
            Util,
        ) {

return declare([CanvasFeatures, PairedAlignmentsMixin], {
    _defaultConfig: function() {
        return Util.deepUpdate(lang.clone(this.inherited(arguments)), {
            glyph: 'JBrowse/View/FeatureGlyph/PairedAlignment',
            maxFeatureScreenDensity: 60,
            readCloud: false,
            style: {
                showLabels: false
            }
        });
    },
    // override getLayout to access addRect method
    _getLayout: function() {
        var layout = this.inherited(arguments);
        if(this.config.readCloud) {
            layout = declare.safeMixin(layout, {
                addRect: function() {
                    this.pTotalHeight = this.maxHeight;
                    return 0;
                }
            });
        }
        return layout;
    },

    // recursively find all the stylesheets that are loaded in the
    // current browsing session, traversing imports and such
    _getStyleSheets: function( inSheets ) {
        var outSheets = []
        array.forEach(inSheets, sheet => {
            try {
                let rules = sheet.cssRules || sheet.rules
                let includedSheets = [sheet]
                array.forEach(rules, rule => {
                    if (rule.styleSheet)
                         includedSheets.push(...this._getStyleSheets([rule.styleSheet]))
                })
                outSheets.push(...includedSheets)
            } catch(e) {
                //console.warn('could not read stylesheet',sheet)
            }
        })

        return outSheets;
    },

    // get the appropriate HTML color string to use for a given base
    // letter.  case insensitive.  'reference' gives the color to draw matches with the reference.
    colorForBase: function( base ) {
        // get the base colors out of CSS
        this._baseStyles = this._baseStyles || function() {
            var colors = {};
            try {
                var styleSheets = this._getStyleSheets( document.styleSheets );
                array.forEach( styleSheets, function( sheet ) {
                    // avoid modifying cssRules for plugins which generates SecurityException on Firefox
                    var classes = sheet.rules || sheet.cssRules;
                    if( ! classes ) return;
                    array.forEach( classes, function( c ) {
                        var match = /^\.jbrowse\s+\.base_([^\s_]+)$/.exec( c.selectorText );
                        if( match && match[1] ) {
                            var base = match[1];
                            match = /\#[0-9a-f]{3,6}|(?:rgb|hsl)a?\([^\)]*\)/gi.exec( c.cssText );
                            if( match && match[0] ) {
                                colors[ base.toLowerCase() ] = match[0];
                                colors[ base.toUpperCase() ] = match[0];
                            }
                        }
                    });
                });
            } catch(e) {
                console.error(e)
                 /* catch errors from cross-domain stylesheets */
            }
            return colors;
        }.call(this);

        return this._baseStyles[base] || '#999';
    }

});
});
