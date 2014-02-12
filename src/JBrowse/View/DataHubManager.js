define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/dom-geometry',
           "dojo/store/Memory",

           'dijit/layout/BorderContainer',
           "dijit/tree/ObjectStoreModel",
           "dijit/Tree"

       ],
       function(
           declare,
           domConstruct,
           geom,
           MemoryStore,

           BorderContainer,
           TreeModel,
           TreeView

       ) {

return declare( 'JBrowse/View/DataHubManager', BorderContainer, {
region: 'center',
buildRendering: function() {
    this.inherited(arguments);
    var thisB = this;
    this.get('app').getDataHub('default')
        .then( function(d) {
                   thisB.addChild(
                       new TreeView(
                           { region: 'center',
                             model: new TreeModel(
                                 { store: d.getDojoStore(),
                                   query: { id: '__ROOT' },
                                   mayHaveChildren: function( obj ) {
                                       return obj.id.charAt(0) == '_';
                                   }
                                 })
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