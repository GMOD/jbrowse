/**
 * Base class for the resources that are in a DataHub: tracks, stores,
 * and reference sequence sets.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Util',
           'JBrowse/Component'
       ],
       function(
           declare,
           lang,

           Util,
           JBrowseComponent
       ) {
return declare( JBrowseComponent, {

constructor: function( args ) {
    Util.validate( args, { resourceUrl: 'string' });
    this._resourceUrl = args.resourceUrl;
},

configSchema: {
    slots: [
        { name: 'name', type: 'string', required: true }
    ]
},

// get the jbrowse-resource:// url for this resource
getURL: function() {
    return this._resourceUrl;
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