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
        this._renderGenotypes( container, track, f, featDiv, container );

        return container;
    },

    _isReservedTag: function( t ) {
        return this.inherited(arguments) || {genotypes:1}[t.toLowerCase()];
    },

    // _renderAlleles: function( parentElement, track, f, featDiv ) {
    // },

    _renderGenotypes: function( parentElement, track, f, featDiv  ) {
        var genotypes = f.get('genotypes');
        if( ! genotypes )
            return;

        var gCount = Util.dojof.keys(genotypes).length;
        if( ! gCount )
            return;

        var gContainer = domConstruct.create(
            'div',
            { className: 'genotypes',
              innerHTML: '<h2 class="sectiontitle">Genotypes ('
                         + gCount + ')</h2>'
            },
            parentElement );

        var summaryElement = this._renderGenotypeSummary( gContainer, genotypes, f );

        var valueContainer = domConstruct.create(
            'div',
            {
                className: 'value_container genotypes'
            }, gContainer );

        this.renderDetailValue(
            valueContainer,
            'Genotypes',
            genotypes
        );
    },

    _renderGenotypeSummary: function( parentElement, genotypes, feature ) {
        if( ! genotypes )
            return;

        // get variants and coerce to an array
        var alt = feature.get('alternative_alleles');
        if( alt &&  typeof alt == 'object' && 'values' in alt )
            alt = alt.values;
        if( alt && ! lang.isArray( alt ) )
            alt = [alt];

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
                                   domConstruct.create('td', { className: 'pct level_'+level, innerHTML: (thisTotal/total*100).toPrecision(3)+ '%' }, tr );
                                   renderFreqTable( count, level+1 );
                               } else {
                                   domConstruct.create('td', { className: 'count level_'+level, innerHTML: count }, tr );
                                   domConstruct.create('td', { className: 'pct level_'+level, innerHTML:(count/total*100).toPrecision(3)+'%' }, tr );
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