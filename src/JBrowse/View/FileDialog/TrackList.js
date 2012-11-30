define(['dojo/_base/declare',
        'dojo/_base/array',
       './TrackList/BAMDriver'],
       function(declare, array, BAMDriver ) {

return declare( null, {

constructor: function( args ) {
    this.fileDialog = args.dialog;
    this.domNode = dojo.create('div', { className: 'trackList', innerHTML: 'track list!' });
    this.types = [ BAMDriver ];
},

// offer a given resource record (either a file or a URL) to the
// driver for a given store type.  returns true if that driver will
// make use of that resource
_offerResource: function( resource, typeDriver ) {
    return typeDriver.tryResource( this.storeConfs, resource );
},

update: function() {
    // when called, rebuild the store and track configurations that we are going to add
    this.storeConfs = this.storeConfs || {};

    // anneal the given resources into a set of data store
    // configurations by offering each file to each type driver in
    // turn until no more are being accepted
    var resources = this.fileDialog.filesToOpen().concat( this.fileDialog.urlsToOpen() );
    var lastLength = 0;
    while( resources.length && resources.length != lastLength ) {
        resources = array.filter( resources, function( rec ) {
            return ! array.some( this.types, function( typeDriver ) {
               return this._offerResource( rec, typeDriver );
            },this);
        },this);

        lastLength = resources.length;
    }
    if( resources.length )
        console.warn("warning: not all resources could be used", resources );

    console.log( this.storeConfs );
}

});
});

