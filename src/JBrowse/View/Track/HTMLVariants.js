/**
 * Just an HTMLFeatures track that uses the VariantDetailsMixin to
 * provide a variant-specific feature detail dialog.
 */

define( [
             'dojo/_base/declare',
             'JBrowse/View/Track/HTMLFeatures',
             'JBrowse/View/Track/_VariantDetailMixin'
         ],

         function(
             declare,
             HTMLFeatures,
             VariantDetailsMixin
         ) {
return declare( [ HTMLFeatures, VariantDetailsMixin ], {
    _trackMenuOptions: function() {
        var o = this.inherited(arguments);
        o.push( { type: 'dijit/MenuSeparator' } );
        o.push.apply( o, this._variantsFilterTrackMenuOptions() );
        return o;
    }
});
});