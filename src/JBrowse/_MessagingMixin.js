/**
 * Mixin for JBrowse/Component that contains all of the stuff related
 * to messaging.
 */
define([
           'dojo/_base/declare',
           'dojo/topic'
       ],
       function(
           declare
       ) {

return declare( null, {

    // makes the method with the given name addressable on the message bus
    publishMethod: function( methodName, channel ) {
        if( channel === undefined )
            channel = methodName;

        var oldMethod = this[methodName];
        if( ! actionFunc )
            throw new Error( 'no method '+actionFunc+' defined in scope '+this );

        if( oldMethod._JBrowsePublished )
            return oldMethod;

        this[methodName] = function() {
            return this.publishRun( channel, arguments, oldMethod );
        };

        this[methodName]._JBrowsePublished = true;

        return oldMethod;
    },

    publishRun: function( channel, args, actionFunc ) {
        // if the action is a string, run as a method
        if( typeof actionFunc == 'string' ) {
            actionFunc = this[actionFunc];
            if( ! actionFunc )
                throw new Error( 'no method '+actionFunc+' defined in scope '+this );
        }

        // call the pre-subscribers
        this._publish( channel+'/before', args );

        // run the action
        var ret = actionFunc.apply( this, args );

        // call the post-subscribers
        this._publish( channel+'/after', args );

        return ret;
    },

    messageTag: '',

    publish: function( channel, args ) {
        var envelope = { from: this, args: args };
        channel = '/jbrowse/v2/'+this.messageTag+channel;

        if( this.browser.getConf('logMessages') )
            console.log( channel, envelope );

        topic.publish( channel, envelope );
    },

    subscribe: function( phase, channel, callback ) {
        var thisB = this;
        topic.subscribe( channel+'/'+phase, function( envelope ) {
            var from = envelope.from;
            var args = Array.prototype.slice.call( envelope.args || [] );
            args.unshift( from );
            callback.apply( thisB, args );
        });
    }
});
});