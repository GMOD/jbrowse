/**
 * Base class for a one-to-one, possibly discontinuous projection from
 * one coordinate system (A) to another (B).
 */
define([
           'dojo/_base/declare',

           'JBrowse/Util/ListenerSet'
       ],
       function(
           declare,

           ListenerSet
       ) {
return declare( null,
{
    constructor: function( args ) {
        this.listeners = new ListenerSet();

        if( ! args.bName ) throw new Error('bName required');
        if( ! args.aName ) throw new Error('aName required');
        this.bName = args.bName;
        this.aName = args.aName;
    },

    isAnimatable: function() {
        return true;
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

    watch: function( callback, phase ) {
        return this.listeners.add( callback, phase );
    },

    _notifyChanged: function( changeDescription ) {
        this.listeners.notify( changeDescription );
    },

    // look up relevant blocks by A coordinates. a block is a region
    // where the projection is continuous.  returns an array of
    // continuous projections.
    getBlocksForRange: function( a1, a2 ) {
        throw new Error('Abstract!');
    },

    getScale: function() {
        throw new Error('Abstract!');
    },

    // get the current projection offset in A-space
    getAOffset: function() {
        throw new Error('Abstract!');
    },
    setAOffset: function(offset) {
        throw new Error('Abstract!');
    },

    getAName: function() {
        return this.aName;
    },

    getBName: function() {
        return this.bName;
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
    },

    destroy: function() {
        delete this.listeners;
    }
});
});