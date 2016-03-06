/**
 * Mixin with methods used for displaying alignments and their mismatches.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/when',
           'JBrowse/Util',
           'JBrowse/Store/SeqFeature/_MismatchesMixin',
           'JBrowse/View/Track/_NamedFeatureFiltersMixin'
        ],
        function(
            declare,
            array,
            lang,
            when,
            Util,
            MismatchesMixin,
            NamedFeatureFiltersMixin
        ) {

return declare([ MismatchesMixin, NamedFeatureFiltersMixin ], {

    /**
     * Make a default feature detail page for the given feature.
     * @returns {HTMLElement} feature detail page HTML
     */
    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ div ) {
        var container = dojo.create('div', {
            className: 'detail feature-detail feature-detail-'+track.name.replace(/\s+/g,'_').toLowerCase(),
            innerHTML: ''
        });
        var fmt = dojo.hitch( this, function( name, value, feature ) {
            name = Util.ucFirst( name.replace(/_/g,' ') );
            return this.renderDetailField(container, name, value, feature);
        });
        fmt( 'Name', f.get('name'), f );
        fmt( 'Type', f.get('type'), f );
        fmt( 'Score', f.get('score'), f );
        fmt( 'Description', f.get('note'), f );
        fmt(
            'Position',
            Util.assembleLocString({ start: f.get('start'),
                                     end: f.get('end'),
                                     ref: this.refSeq.name })
            + ({'1':' (+)', '-1': ' (-)', 0: ' (no strand)' }[f.get('strand')] || ''),
            f
        );


        if( f.get('seq') ) {
            fmt('Sequence and Quality', this._renderSeqQual( f ), f );
        }

        var additionalTags = array.filter(
            f.tags(), function(t) {
                return ! {name:1,score:1,start:1,end:1,strand:1,note:1,subfeatures:1,type:1}[t.toLowerCase()];
            }
        ).sort();

        dojo.forEach( additionalTags, function(t) {
                          fmt( t, f.get(t), f );
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
            try {
                var styleSheets = this._getStyleSheets( document.styleSheets );
                array.forEach( styleSheets, function( sheet ) {
                    // avoid modifying cssRules for plugins which generates SecurityException on Firefox
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
            } catch(e) { /* catch errors from cross-domain stylesheets */ }

            return colors;
        }.call(this);

        return this._baseStyles[base] || '#999';
    },


    // filters for BAM alignments according to some flags
    _getNamedFeatureFilters: function() {
        return lang.mixin( {}, this.inherited( arguments ),
            {
                hideDuplicateReads: {
                    desc: 'Hide PCR/Optical duplicate reads',
                    func: function( f ) {
                        return ! f.get('duplicate');
                    }
                },
                hideQCFailingReads: {
                    desc: 'Hide reads failing vendor QC',
                    func: function( f ) {
                        return ! f.get('qc_failed');
                    }
                },
                hideSecondary: {
                    desc: 'Hide secondary alignments',

                    func: function( f ) {
                        return ! f.get('secondary_alignment');
                    }
                },
                hideSupplementary: {
                    desc: 'Hide supplementary alignments',
                    func: function( f ) {
                        return ! f.get('supplementary_alignment');
                    }
                },
                hideMissingMatepairs: {
                    desc: 'Hide reads with missing mate pairs',
                    func: function( f ) {
                        return ! ( f.get('multi_segment_template') && ! f.get('multi_segment_all_aligned') );
                    }
                },
                hideUnmapped: {
                    desc: 'Hide unmapped reads',
                    func: function( f ) {
                        return ! f.get('unmapped');
                    }
                },
                hideForwardStrand: {
                    desc: 'Hide reads aligned to the forward strand',
                    func: function( f ) {
                        return f.get('strand') != 1;
                    }
                },
                hideReverseStrand: {
                    desc: 'Hide reads aligned to the reverse strand',
                    func: function( f ) {
                        return f.get('strand') != -1;
                    }
                }
            });
    },

    _alignmentsFilterTrackMenuOptions: function() {
        // add toggles for feature filters
        var track = this;
        return when( this._getNamedFeatureFilters() )
            .then( function( filters ) {
                       return track._makeFeatureFilterTrackMenuItems(
                           [
                               'hideDuplicateReads',
                               'hideQCFailingReads',
                               'hideMissingMatepairs',
                               'hideSecondary',
                               'hideSupplementary',
                               'hideUnmapped',
                               'SEPARATOR',
                               'hideForwardStrand',
                               'hideReverseStrand'
                           ],
                           filters );
                   });
    }

});
});
