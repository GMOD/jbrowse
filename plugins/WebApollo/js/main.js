require({
           packages: [
               { name: 'jqueryui', location: '../plugins/WebApollo/jslib/jqueryui' },
               { name: 'jquery', location: '../plugins/WebApollo/jslib/jquery', main: 'jquery' }
           ]
       },
       [],
       function() {

define.amd.jQuery = true;

define(
       [
           'dojo/_base/declare',
           'dijit/CheckedMenuItem',
           'JBrowse/Plugin',
           './FeatureEdgeMatchManager'
       ],
       function( declare, dijitCheckedMenuItem, JBPlugin, FeatureEdgeMatchManager ) {

return declare( JBPlugin,
{

    colorCdsByFrame: false,

    constructor: function( args ) {
        var thisB = this;
        var browser = args.browser;

        // hand the browser object to the feature edge match manager
        FeatureEdgeMatchManager.setBrowser( browser );

        // add a global menu option for setting CDS color
        var cds_frame_toggle = new dijitCheckedMenuItem(
                {
                    label: "Color by CDS frame",
                    checked: false,
                    onClick: function(event) {
                        thisB.colorCdsByFrame = cds_frame_toggle.checked;
                        browser.view.redrawTracks();
                    }
                });

        browser.addGlobalMenuItem( 'options', cds_frame_toggle );
    }
});

});

});