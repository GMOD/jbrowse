/**
 * Main object for multiplexing messages to and from a single Worker.  Lives in a worker process.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'dojo/when',

           'JBrowse/App',
           'JBrowse/Util',
           'JBrowse/Util/Serialization',
           './Job'
       ],
       function(
           declare,
           lang,
           Deferred,
           when,

           App,
           Util,
           Serialization,
           Job
       ) {

return declare( [ App ], {
constructor: function(args) {
    args.self.postMessage('ready');

    this.app = this.browser = this;

    args.self.onmessage = lang.hitch( this, '_handleMessage' );

    this._jobs = {};
},

_handleMessage: function( event ) {
    var data = event.data;
    if( data ) {
        if( data.requestNumber ) {
            return this._handleRequest( data );
        }
        else if( data.jobNumber ) {
            return this._jobs[ data.jobNumber ]
                .then( function(j) { return j.handleMessage( data ); } );
        }
    }
    else {
        console.warn( "unknown request received by worker", event );
    }
    return undefined;
},

postMessage: function( message ) {
    return this.get('self').postMessage( message );
},

// requests are one-off RPC calls
_handleRequest: function( req ) {
    var thisB = this;
    var requestNumber = req.requestNumber;
    var operation = req.operation;
    return Serialization.inflate( req.args || [], { app: this } )
        .then( function( args ) {
                   var methodName = '_handleRequest_'+operation;
                   if( ! thisB[methodName] ) throw new Error('worker handle has no method '+methodName );
                   return when( thisB[methodName].apply( thisB, args ) )
                       .then( function( result ) {
                                  thisB.get('self').postMessage(
                                      { requestNumber: requestNumber,
                                        result: Serialization.deflate( result )
                                      });
                              });
               },
               function(e) {
                   console.error( e.stack || ''+e );
               });
},
_handleRequest_apply: function( object, method, arguments ) {
    object = object || this;
    return object[method].apply( object, arguments );
},
_handleRequest_instantiate: function( className, args ) {
    return Util.instantiate( className, args );
},

// job management. jobs are ongoing tasks that the worker does; a Job
// is a persistent connection to a object in Worker-space
_handleRequest_newJob: function( jobNumber, className, args ) {
    var job = new Job({ worker: this, jobNumber: jobNumber });
    return this._jobs[jobNumber] =
        Util.instantiate( className, lang.mixin({ job: job }, args ) )
            .then( function( handlerObject ) {
                       job.setHandlerObject( handlerObject );
                       return job;
                   });
},

_handleRequest_destroyJob: function( jobNumber ) {
    this.postMessage({ jobNumber: jobNumber, operation: 'destroy' });
    return this._jobs[jobNumber].destroy();
}


});
});