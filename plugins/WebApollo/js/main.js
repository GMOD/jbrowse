define.amd.jQuery = true;

define(
       [
           'dojo/_base/declare',
           'JBrowse/Plugin',
           './FeatureEdgeMatchManager'
       ],
       function( declare, JBPlugin, FeatureEdgeMatchManager ) {

return declare( JBPlugin,
{
    constructor: function( args ) {
        FeatureEdgeMatchManager.setBrowser( args.browser );
   }
});
});