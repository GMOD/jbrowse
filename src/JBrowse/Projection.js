/**
 * Base class for a one-to-one, possibly discontinuous projection from
 * one coordinate system (A) to another (B).
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

        if( ! args.bName ) throw new Error('bName required');
        if( ! args.aName ) throw new Error('aName required');
        this.bName = args.bName;
        this.aName = args.aName;
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

    _notifyChanged: function( changeDescription ) {
        var l = this.listeners;
        for( var i = 0; i<l.length; i++ )
            if( l[i] )
                l[i].cb( changeDescription, this );
    },

    // look up relevant blocks by A coordinates. a block is a region
    // where the projection is continuous.  returns an array of
    // continuous projections.
    getBlocksForRange: function( a1, a2 ) {
        throw new Error('Abstract!');
    },

    // offset the projection in A by the given delta
    offset: function( delta ) {
        throw new Error('Abstract!');
    },

    // multiply projection's scale by the given factor, and, if
    // aStatic is passed, also alter the projection's offset to maintain
    // the same B projection point for aStatic
    zoom: function( factor, aStatic, animationMilliseconds ) {
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