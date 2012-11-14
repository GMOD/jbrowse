require({
           packages: [
               { name: 'jqueryui', location: '../plugins/WebApollo/jslib/jqueryui' },
               { name: 'jquery', location: 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.1', main: 'jquery' }
           ]
       },
       [],
       function() {

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
    },
    getName: function() { return 'WebApollo'; }
});

});

});