/**
 * Mixin to provide a `defaultFeatureDetail` method that is optimized
 * for displaying variant data from VCF files.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'JBrowse/Util',
           'JBrowse/View/Track/FeatureDetailMixin'
       ],
       function(
           declare,
           array,
           domConstruct,
           Util,
           FeatureDetailMixin
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

    _renderGenotypes: function( parentElement, track, f, featDiv, container ) {
        var genotypes = f.get('genotypes');
        if( ! genotypes )
            return;

        var gCount = Util.dojof.keys(genotypes).length;
        var gContainer = domConstruct.create(
            'div',
            { className: 'genotypes',
              innerHTML: '<h2 class="sectiontitle">Genotypes ('
                         + gCount + ')</h2>'
            },
            parentElement );

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
    }
});
});