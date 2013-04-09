/**
 * Mixin to provide a `defaultFeatureDetail` method that is optimized
 * for displaying variant data from VCF files.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Util',
           'JBrowse/View/Track/FeatureDetailMixin'
       ],
       function(
           declare,
           array,
           Util,
           FeatureDetailMixin
       ) {

return declare( FeatureDetailMixin, {


    defaultFeatureDetail: function( /** JBrowse.Track */ track, /** Object */ f, /** HTMLElement */ featDiv, /** HTMLElement */ container ) {
        container = container || dojo.create('div', { className: 'detail feature-detail feature-detail-'+track.name, innerHTML: '' } );

        this._renderCoreDetails( track, f, featDiv, container );

        this._renderAdditionalTagsDetail( track, f, featDiv, container );

        // genotypes in a separate section
        this._renderGenotypes( track, f, featDiv, container );

        return container;
    },

    _isReservedTag: function( t ) {
        return this.inherited(arguments) || {genotypes:1}[t.toLowerCase()];
    },

    _renderGenotypes: function( track, f, featDiv, container ) {
        var genotypes = f.get('genotypes');
        if( ! genotypes )
            return;

        var samples = Util.dojof.keys( genotypes ).sort();
        if( ! samples.length )
            return;

        var g_html = '<div class="genotypes"><h2 class="sectiontitle">Genotypes</h2>';
        array.forEach( samples, function( sampleName ) {

            g_html += this.renderDetailField( sampleName, genotypes[sampleName], 'genotype_'+sampleName.replace(/[^w]/g,'_') );

        }, this);
        g_html += '</div>';

        container.innerHTML += g_html;
    }

});
});