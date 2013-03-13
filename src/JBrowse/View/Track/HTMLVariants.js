/**
 * Just an HTMLFeatures track that uses the VariantDetailsMixin to
 * provide a variant-specific feature detail dialog.
 */

define( [
             'dojo/_base/declare',
             'JBrowse/View/Track/HTMLFeatures',
             'JBrowse/View/Track/VariantDetailMixin'
         ],

         function(
             declare,
             HTMLFeatures,
             VariantDetailsMixin
         ) {
return declare( [ HTMLFeatures, VariantDetailsMixin ], {
});
});