define([
           'dojo/_base/declare',
           'dojo/Deferred',

           'JBrowse/Worker/Handle'
       ],
       function(
           declare,
           Deferred,

           WorkerHandle
       ) {
return declare( null, {

  configSchema: {
    slots: [
        { name: 'workerStartTimeout', type: 'integer', defaultValue: 10,
          description: 'time in seconds to wait for a web worker to start before timing out'
        }
    ]
  },

  getWorker: function( taskGroup, taskIdentifier, workerClass ) {
      return this._worker || ( this._worker = function() {
          return this._makeRealWorker( workerClass );
      }.call(this));
  },

  _makeRealWorker: function( workerClass ) {
      var d = new Deferred();
      var thisB = this;
      var worker = new Worker( require.toUrl('JBrowse/Worker/boot_dedicated.js') );
      var timeout;//  =setTimeout( function() {
      //     d.reject( new Error( 'worker was not ready within '+thisB.getConf('workerStartTimeout')+' seconds' ) );
      // }, thisB.getConf('workerStartTimeout')*1000 );
      worker.onerror = function(e) { console.error(e); d.reject(e); };
      worker.onmessage = function( event ) {
          if( event.data == 'starting' ) {
              // do nothing
          }
          else if( event.data == 'ready' ) {
              if( timeout ) { clearTimeout( timeout ); timeout = undefined; }
              d.resolve( new WorkerHandle({ worker: worker, authManager: thisB }) );
          }
          else {
              d.reject( new Error( event ) );
          }
      };
      worker.postMessage( JSON.stringify(
                              { preload: [
                                    '../../dojo/dojo.js'
                                    , '../init.js'
                                ],
                                //delay: 3000,
                                require: { baseUrl: '../..' },
                                config: this.exportMergedConfig(),
                                workerClass: workerClass || 'JBrowse/Worker/Dedicated'
                              }));

      return d.then(
          undefined,
          function(e) {
              if( timeout ) { clearTimeout( timeout ); timeout = undefined; }
              worker.terminate();
              throw e;
          });
  }

});
});