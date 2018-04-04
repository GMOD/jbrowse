/**
 * Just an HTMLFeatures track that uses the VariantDetailsMixin to
 * provide a variant-specific feature detail dialog.
 */

define( [
             'dojo/_base/declare',
             'dojo/promise/all',
             'JBrowse/Util',
             'JBrowse/View/Track/CanvasFeatures',
             'JBrowse/View/Track/_VariantDetailMixin'
         ],

         function(
             declare,
             all,
             Util,
             CanvasFeatures,
             VariantDetailsMixin
         ) {
return declare( [ CanvasFeatures, VariantDetailsMixin ], {

    _defaultConfig: function _defaultConfig() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(_defaultConfig, arguments) ),
            {
                style: { color: 'green' }
            });
    },

    _trackMenuOptions: function _trackMenuOptions() {
        return all([ this.inherited(_trackMenuOptions, arguments), this._variantsFilterTrackMenuOptions() ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift( { type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    }
});
});
