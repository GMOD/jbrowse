/**
 * Mixin with methods used for displaying alignments and their mismatches.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Util',
           'JBrowse/Store/SeqFeature/_MismatchesMixin'
        ],
        function(
            declare,
            array,
            Util,
            MismatchesMixin
        ) {

return declare( MismatchesMixin ,{

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

    // takes a feature, returns an HTML representation of its 'seq'
    // and 'qual', if it has at least a seq. empty string otherwise.
    _renderSeqQual: function( feature ) {

        var seq  = feature.get('seq'),
            qual = feature.get('qual') || '';
        if( !seq )
            return '';

        qual = qual.split(/\s+/);

        var html = '';
        for( var i = 0; i < seq.length; i++ ) {
            html += '<div class="basePosition" title="position '+(i+1)+'"><span class="seq">'
                    + seq[i]+'</span>';
            if( qual[i] )
                html += '<span class="qual">'+qual[i]+'</span>';
            html += '</div>';
        }
        return '<div class="baseQuality">'+html+'</div>';
    },

    // recursively find all the stylesheets that are loaded in the
    // current browsing session, traversing imports and such
    _getStyleSheets: function( inSheets ) {
        var outSheets = [];
        array.forEach( inSheets, function( sheet ) {
            outSheets.push( sheet );
            array.forEach( sheet.cssRules || sheet.rules, function( rule ) {
                if( rule.styleSheet )
                    outSheets.push.apply( outSheets, this._getStyleSheets( [rule.styleSheet] ) );
            },this);
        },this);
        return outSheets;
    },

    // get the appropriate HTML color string to use for a given base
    // letter.  case insensitive.  'reference' gives the color to draw matches with the reference.
    colorForBase: function( base ) {
        // get the base colors out of CSS
        this._baseStyles = this._baseStyles || function() {
            var colors = {};
            var styleSheets = this._getStyleSheets( document.styleSheets );
            array.forEach( styleSheets, function( sheet ) {
                var classes = sheet.rules || sheet.cssRules;
                if( ! classes ) return;
                array.forEach( classes, function( c ) {
                    var match = /^\.base_([^\s_]+)$/.exec( c.selectorText );
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

           return colors;
        }.call(this);

        return this._baseStyles[base] || '#999';
    }

});
});