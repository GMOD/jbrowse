define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/dom-geometry',

           'dijit/layout/BorderContainer',
           './DataHubManager/DataHub'
       ],
       function(
           declare,
           domConstruct,
           geom,

           BorderContainer,
           DataHubView
       ) {

return declare( 'JBrowse/View/DataHubManager', BorderContainer, {

baseClass: 'dataHubManager',

buildRendering: function() {
    this.inherited(arguments);
    var thisB = this;
    this.get('app').getDataHub('default')
        .then( function(d) {
                   thisB.addChild(
                       new DataHubView(
                           { region: 'center',
                             dataHub: d
                           })
                   );
               });
},

showOver: function( el ) {
    var pos = geom.position( el );
    this.placeAt(
        domConstruct.create(
            'div', {
                style: {
                    width: pos.w+'px',
                    height: pos.h+'px',
                    top: pos.y+'px',
                    left: pos.x+'px',
                    position: 'fixed'
                }
            }, document.body )
    );
}

});
});