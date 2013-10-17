/**
 * Base class for a one-to-one discontinuous projection from one
 * coordinate space to another.
 */
define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ) {
return declare( null,
{
    constructor: function( args ) {
        this.listeners = [];
    },

    // calls the given callback with the relevant projection blocks for
    // a range once initially, and then again every time the set
    // of  that overlap that range changes
    // watchRange: function( a1, a2, callback ) {
    //     var l = [a1,a2,callback];
    //     var thisB = this;
    //     this.listeners.push( l );
    //     l.remove = function() {
    //         for( var i = 0; i<thisB.listeners.length; i++ )
    //             if( thisB.listeners[i] === l )
    //                 thisB.listeners[i] = undefined;
    //         thisB = l = undefined;
    //     };

    //     return l;
    // },

    watch: function( callback ) {
        var l = { cb: callback };
        this.listeners.push( l );

        var thisB = this;
        l.remove = function() {
            for( var i = 0; i<thisB.listeners.length; i++ )
                if( thisB.listeners[i] === l )
                    thisB.listeners[i] = undefined;
            thisB = l = undefined;
        };

        return l;
    },

    _notifyChangedAll: function( description ) {
        var l = this.listeners;
        for( var i = 0; i<l.length; i++ )
            if( l[i] )
                l[i].cb( description, this );
    },

    // look up relevant blocks by A coordinates. a block is a simple
    // linear projection region.
    getBlocksForRange: function( a1, a2 ) {
        throw new Error('Abstract!');
    },

    // return a new projection with A and B coordinates reversed
    reverse: function() {
        throw new Error('Abstract!');
    },

    // offset the projection in A by the given delta
    offset: function( delta ) {
        throw new Error('Abstract!');
    },

    // scale the projection in A by the given factor, and offset in A by
    // the given offset.
    scaleOffset: function( factor, offset ) {
        throw new Error('Abstract!');
    },

    // return a Deferred that has progress events each time the
    // projection is updated to an intermediate configuration, and
    // resolves when the projection finishes animating
    animateTo: function( factor, offset, milliseconds ) {
        throw new Error('Abstract!');
    }
});
});