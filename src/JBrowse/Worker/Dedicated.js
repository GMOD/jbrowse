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
           './_RequestMixin',
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
           _RequestMixin,
           Job
       ) {

return declare( [ App, _RequestMixin ], {
constructor: function(args) {
    args.self.postMessage('ready');

    this.app = this.browser = this;

    args.self.onmessage = lang.hitch( this, '_handleMessage' );

    this._jobs = {};
},

_handleMessage: function( event ) {
    try {
        var data = event.data;
        if( data ) {
            var errorHandler = lang.hitch( this, '_handleError' );
            if( data.jobNumber ) {
                var thisB = this;
                return this._jobs[ data.jobNumber ]
                    .then( function(j) {
                               return j.handleMessage( data )
                                   .then( null, errorHandler );
                           },
                           errorHandler
                         );
            }
            else if( data.requestNumber ) {
                return when( this._handleRequestMessage( data ) )
                    .then( null, errorHandler );
            }
        }

        console.warn( "unknown message received by worker", event );
        return undefined;
    } catch( error ) {
        this._handleError( error );
    }
},

_handleError: function( error ) {
    console.error( error.stack || ''+error );
    throw error;
},

postMessage: function( message ) {
    //console.log( 'worker says', message );
    return this.get('self').postMessage( message );
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
},

// support Auth system requests by remoting them to the main process
getCredentialsForRequest: function( request ) {
    return this.request( 'getCredentialsForRequest', request );
}

});
});