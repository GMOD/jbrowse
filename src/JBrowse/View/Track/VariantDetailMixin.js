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
           'JBrowse/Util',
           'JBrowse/View/Track/FeatureDetailMixin',
           'JBrowse/Model/NestedFrequencyTable'
       ],
       function(
           declare,
           array,
           lang,
           domConstruct,
           domClass,
           Util,
           FeatureDetailMixin,
           NestedFrequencyTable
       ) {

return declare( FeatureDetailMixin, {


    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ featDiv, /** HTMLElement */ container ) {
        container = container || dojo.create('div', { className: 'detail feature-detail feature-detail-'+track.name, innerHTML: '' } );

        this._renderCoreDetails( track, f, featDiv, container );

        this._renderAdditionalTagsDetail( track, f, featDiv, container );

        // genotypes in a separate section
        this._renderGenotypes( container, track, f, featDiv );

        return container;
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

        var summaryElement = this._renderGenotypeSummary( gContainer, genotypes, alt );

        var valueContainer = domConstruct.create(
            'div',
            {
                className: 'value_container genotypes'
            }, gContainer );

        this.renderDetailValueGrid(
            valueContainer,
            'Genotypes',
            // iterator
            function() {
                if( ! keys.length )
                    return null;
                var k = keys.shift();
                var value = genotypes[k];
                var item = { id: k };
                for( var field in value ) {
                    item[ field ] = thisB._genotypeValToString( value[field], field, alt );
                }
                return item;
            },
            // descriptions object
            (function() {
                 if( ! keys.length )
                     return {};

                 var subValue = genotypes[keys[0]];
                 var descriptions = {};
                 for( var k in subValue ) {
                     descriptions[k] = subValue[k].meta && subValue[k].meta.description || null;
                 }
                 return descriptions;
             })()
        );
    },

    _genotypeValToString: function( value, fieldname, alt ) {
        value = this._valToString( value );
        if( fieldname != 'GT' )
            return value;

        // handle the GT field specially, translating the genotype indexes into the actual ALT strings
        var splitter = value.match(/\D/g)[0];
        return array.map( value.split( splitter ), function( gtIndex ) {
            gtIndex = parseInt( gtIndex );
            return gtIndex ? alt ? alt[gtIndex-1] : gtIndex : 'ref';
        }).join( ' '+splitter+' ' );
    },

    _renderGenotypeSummary: function( parentElement, genotypes, alt ) {
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
    }
});
});