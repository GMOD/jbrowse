/**
 * Mixin that lets an object track unresolved promises that are
 * associated with it, and cancel them all at some time (usually when
 * the object is destroyed).
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',

           'JBrowse/Errors'
       ],
       function(
           declare,
           array,

           Errors
       ) {
return declare( null, {
    constructor: function() {
        this._unresolvedPromises = [];
    },

    // override own() from dijit/Destroyable to be able to handle Deferreds/promises also
    ownPromise: function( promise ) {
        this._unresolvedPromises.push( promise );
        var thisB = this;
        function remove() {
            var p = thisB._unresolvedPromises;
            var i = array.indexOf( thisB._unresolvedPromises, promise );
	    if( i > -1)
		thisB._unresolvedPromises.splice(i, 1);
        }
        promise.then( remove, remove );
        return promise;
    },

    cancelPromises: function( reason ) {
        var reasonObj = ( reason instanceof Errors.Cancel ) ? reason : Errors.Cancel( reason );
        var p = this._unresolvedPromises;
        for( var i = 0; i<p.length; i++ )
            p[i].cancel( reasonObj );
    }

});
});
