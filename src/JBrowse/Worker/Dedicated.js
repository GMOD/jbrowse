/**
 * Main object for multiplexing messages to and from a single Worker.  Lives in a worker process.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',

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
    var data = event.data;
    if( data ) {
        if( data.jobNumber ) {
            return this._jobs[ data.jobNumber ]
                .then( function(j) {
                           return j.handleMessage( data );
                       });
        }
        else if( data.requestNumber ) {
            return this._handleRequestMessage( data );
        }
    }

    console.warn( "unknown message received by worker", event );
    return undefined;
},

postMessage: function( message ) {
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