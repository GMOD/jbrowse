/**
 * Mixin to provide a `defaultFeatureDetail` method that is optimized
 * for displaying variant data from VCF files.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/promise/all',
           'dojo/when',
           'JBrowse/Util',
           'JBrowse/View/Track/_FeatureDetailMixin',
           'JBrowse/View/Track/_NamedFeatureFiltersMixin',
           'JBrowse/Model/NestedFrequencyTable'
       ],
       function(
           declare,
           array,
           lang,
           domConstruct,
           domClass,
           all,
           when,
           Util,
           FeatureDetailMixin,
           NamedFeatureFiltersMixin,
           NestedFrequencyTable
       ) {

return declare( [FeatureDetailMixin, NamedFeatureFiltersMixin], {


    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ featDiv, /** HTMLElement */ container ) {
        container = container || domConstruct.create('div', { className: 'detail feature-detail feature-detail-'+track.name, innerHTML: '' } );

        this._renderCoreDetails( track, f, featDiv, container );

        this._renderAdditionalTagsDetail( track, f, featDiv, container );

        // genotypes in a separate section
        this._renderGenotypes( container, track, f, featDiv );

        return container;
    },
    renderDetailValue: function( parent, title, val, f, class_ ) {
        if(title == "alternative_alleles") {
            val = Util.escapeHTML(val);
        }
        return this.inherited(arguments, [parent,title,val,f,class_]);
    },
    _isReservedTag: function( t ) {
        return this.inherited(arguments) || {genotypes:1}[t.toLowerCase()];
    },

    _renderGenotypes: function( parentElement, track, f, featDiv  ) {
        var thisB = this;
        var genotypes = f.get('genotypes');
        if( ! genotypes )
            return;

        var keys = Util.dojof.keys( genotypes ).sort();
        var gCount = keys.length;
        if( ! gCount )
            return;

        // get variants and coerce to an array
        var alt = f.get('alternative_alleles');
        if( alt &&  typeof alt == 'object' && 'values' in alt )
            alt = alt.values;
        if( alt && ! lang.isArray( alt ) )
            alt = [alt];

        var gContainer = domConstruct.create(
            'div',
            { className: 'genotypes',
              innerHTML: '<h2 class="sectiontitle">Genotypes ('
                         + gCount + ')</h2>'
            },
            parentElement );


        function render( underlyingRefSeq ) {
            var summaryElement = thisB._renderGenotypeSummary( gContainer, genotypes, alt, underlyingRefSeq );

            var valueContainer = domConstruct.create(
                'div',
                {
                    className: 'value_container genotypes'
                }, gContainer );

            thisB.renderDetailValueGrid(
                valueContainer,
                'Genotypes',
                f,
                // iterator
                function() {
                    if( ! keys.length )
                        return null;
                    var k = keys.shift();
                    var value = genotypes[k];
                    var item = { id: k };
                    for( var field in value ) {
                        item[ field ] = thisB._mungeGenotypeVal( value[field], field, alt, underlyingRefSeq );
                    }
                    return item;
                },
                {
                    descriptions: (function() {
                                       if( ! keys.length )
                                           return {};

                                       var subValue = genotypes[keys[0]];
                                       var descriptions = {};
                                       for( var k in subValue ) {
                                           descriptions[k] = subValue[k].meta && subValue[k].meta.description || null;
                                       }
                                       return descriptions;
                                   })(),
                    renderCell: {
                        "GT": function( field, value, node, options ) {
                            thisB.renderDetailValue( node, '', Util.escapeHTML(value), f, '' );
                        }
                    }
                }
            );
        };

        track.browser.getStore('refseqs', function( refSeqStore ) {
                                  if( refSeqStore ) {
                                      refSeqStore.getReferenceSequence(
                                          { ref: track.refSeq.name,
                                            start: f.get('start'),
                                            end: f.get('end')
                                          },
                                          render,
                                          function() { render(); }
                                      );
                                  }
                                  else {
                                      render();
                                  }
        });
    },

    _mungeGenotypeVal: function( value, fieldname, alt, underlyingRefSeq ) {
        if( fieldname == 'GT' ) {
            // handle the GT field specially, translating the genotype indexes into the actual ALT strings
            var value_parse = value.values[0];

            var splitter = (value_parse.match(/[\|\/]/g)||[])[0]; // only accept | and / splitters since . can mean no call
            alt = alt[0].split(','); // force split on alt alleles
            var refseq = underlyingRefSeq ? 'ref ('+underlyingRefSeq+')' : 'ref';
            value = array.map( splitter ? value_parse.split(splitter) : value_parse, function( gtIndex ) {
                                   gtIndex = parseInt( gtIndex ) || gtIndex;
                                   if(gtIndex == '.') { return 'no-call' }
                                   else if(gtIndex == 0) { return refseq; }
                                   else return alt ? alt[gtIndex-1] : gtIndex;
                               }).join( ' '+splitter+' ' );
        }
        return value;
    },

    _renderGenotypeSummary: function( parentElement, genotypes, alt, underlyingRefSeq ) {
        if( ! genotypes )
            return;

        var counts = new NestedFrequencyTable();
        for( var gname in genotypes ) {
            if( genotypes.hasOwnProperty( gname ) ) {
                // increment the appropriate count
                var gt = genotypes[gname].GT;
                if( typeof gt == 'object' && 'values' in gt )
                    gt = gt.values[0];
                if( typeof gt == 'string' )
                    gt = gt.split(/\||\//);

                if( lang.isArray( gt ) ) {
                    // if all zero, non-variant/hom-ref
                    if( array.every( gt, function( g ) { return parseInt(g) == 0; }) ) {
                        counts.getNested('non-variant').increment('homozygous for reference');
                    }
                    else if( array.every( gt, function( g ) { return g == '.'; }) ) {
                        counts.getNested('non-variant').increment('no call');
                    }
                    else if( array.every( gt, function( g ) { return g == gt[0]; } ) ) {
                        if( alt )
                            counts.getNested('variant/homozygous').increment( alt[ parseInt(gt[0])-1 ] + ' variant' );
                        else
                            counts.getNested('variant').increment( 'homozygous' );
                    }
                    else {
                        counts.getNested('variant').increment('heterozygous');
                    }
                }
            }
        }

        var total = counts.total();
        if( ! total )
            return;

        var valueContainer = domConstruct.create(
            'div', { className: 'value_container big genotype_summary' },
            parentElement );
        //domConstruct.create('h3', { innerHTML: 'Summary' }, valueContainer);

        var tableElement = domConstruct.create('table', {}, valueContainer );

        function renderFreqTable( table, level ) {
            table.forEach( function( count, categoryName ) {
                               var tr = domConstruct.create( 'tr', {}, tableElement );
                               domConstruct.create('td', { className: 'category level_'+level, innerHTML: categoryName }, tr );
                               if( typeof count == 'object' ) {
                                   var thisTotal = count.total();
                                   domConstruct.create('td', { className: 'count level_'+level, innerHTML: thisTotal }, tr );
                                   domConstruct.create('td', { className: 'pct level_'+level, innerHTML: Math.round(thisTotal/total*10000)/100 + '%' }, tr );
                                   renderFreqTable( count, level+1 );
                               } else {
                                   domConstruct.create('td', { className: 'count level_'+level, innerHTML: count }, tr );
                                   domConstruct.create('td', { className: 'pct level_'+level, innerHTML: Math.round(count/total*10000)/100+'%' }, tr );
                               }
                           });
        }

        renderFreqTable( counts, 0 );

        var totalTR = domConstruct.create('tr',{},tableElement );
        domConstruct.create('td', { className: 'category total', innerHTML: 'Total' }, totalTR );
        domConstruct.create('td', { className: 'count total', innerHTML: total }, totalTR );
        domConstruct.create('td', { className: 'pct total', innerHTML: '100%' }, totalTR );
    },


    // filters for VCF sites
    _getNamedFeatureFilters: function() {
        var thisB = this;
        return all([ this.store.getVCFHeader && this.store.getVCFHeader(), this.inherited(arguments) ])
            .then( function() {
                       if( arguments[0][0] )
                           return thisB._makeVCFFilters.apply( thisB, arguments[0] );
                       else
                           return arguments[0][1];
                   });
    },

    // given a parsed VCF header, make some appropriate named feature
    // filters to filter its data
    _makeVCFFilters: function( vcfHeader, inheritedFilters ) {
        // wraps the callback to return true if there
        // is no filter attr
        function makeFilterFilter( condition ) {
            return function(f) {
                f = f.get('filter');
                return !f || condition(f);
            };
        }
        var filters = lang.mixin(
            {},
            inheritedFilters,
            {
                hideFilterPass: {
                    desc: 'Hide sites passing all filters',
                    func: makeFilterFilter(
                        function( filter ) {
                            try {
                                return filter.values.join('').toUpperCase() != 'PASS';
                            } catch(e) {
                                return filter.toUpperCase() != 'PASS';
                            }
                        })
                },
                hideNotFilterPass: {
                    desc: 'Hide sites not passing all filters',
                    func: makeFilterFilter(
                        function( f ) {
                            try {
                                return f.values.join('').toUpperCase() == 'PASS';
                            } catch(e) {
                                return f.toUpperCase() != 'PASS';
                            }
                        })
                }
            });
        if( vcfHeader.filter ) {
            for( var filterName in vcfHeader.filter ) {
                filters[filterName] = function( filterName, filterSpec ) {
                    return {
                        desc: 'Hide sites not passing filter "'+filterName+'"',
                        title: filterName+': '+filterSpec.description,
                        func: makeFilterFilter(
                            function( f ) {
                                var fs = f.values || f;
                                if( ! fs[0] ) return true;

                                return ! array.some(
                                    fs,
                                    function(fname) {
                                        return fname == filterName;
                                    });
                            })
                    };
                }.call(this, filterName, vcfHeader.filter[filterName]);
            }
        }
        return filters;
    },

    _variantsFilterTrackMenuOptions: function() {
        // add toggles for feature filters
        var track = this;
        return this._getNamedFeatureFilters()
            .then( function( filters ) {

                       // merge our builtin filters with additional ones
                       // that might have been generated in
                       // _getNamedFeatureFilters() based on e.g. the VCF
                       // header
                       var menuItems = [
                           'hideFilterPass',
                           'hideNotFilterPass',
                           'SEPARATOR'
                       ];
                       var withAdditional = Util.uniq( menuItems.concat( Util.dojof.keys( filters ) ) );
                       if( withAdditional.length > menuItems.length )
                           menuItems = withAdditional;
                       else
                           menuItems.pop(); //< pop off the separator since we have no additional ones

                       return track._makeFeatureFilterTrackMenuItems( menuItems, filters );
                   });
    }

});
});
