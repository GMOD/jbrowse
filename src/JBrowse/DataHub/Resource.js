/**
 * Base class for the resources that are in a DataHub: tracks, stores,
 * and reference sequence sets.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Component'
       ],
       function(
           declare,
           lang,

           JBrowseComponent
       ) {
return declare( JBrowseComponent, {

configSchema: {
    slots: [
        { name: 'name', type: 'string', required: true }
    ]
},

clone: function() {
    var newThis = lang.clone( this );
    return newThis;
},

forkTo: function( otherDataHub ) {
    return otherDataHub.addResource( this.clone() );
}

});
});