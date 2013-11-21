(function(self) {
  self.postMessage( 'starting' );

  function loadScript( url, callback ) {
      //console.log( 'loading '+url);
      var req = new XMLHttpRequest();
      req.open('GET', url, false );
      req.onreadystatechange = function() {
          //console.log( 'req status '+req.status );
          if( req.readyState == 4 ) {
              eval( req.responseText );
              req = null;
              callback();
          }
      };
      req.send(null);
  }

  self.window = self; // HACK1 hack to get loader to work
  self.dojoConfig = {
      async: 1,
      loaderPatch: { // good lord. monkey-patch the dojo loader.
          injectUrl: loadScript
      },
      has: {
          'dojo-sniff': false,
          'dom': false,
          'host-browser': false
      }
  };

  self.onmessage = function( event ) {
      var data; eval( 'data='+event.data+';' );

      var load = function() {
          // add any require() config we were passed
          if( data.require )
              require( data.require );

          // load our worker class and instantiate it
          require([ data.workerClass ], function( WorkerObject ) {
              delete self.window; // delete our loader-fixing HACK1
              new WorkerObject({ self: self });
          });
      };

      // wrap the last load callback to pre-load the script urls we
      // were passed in data.load
      for( var i = data.load.length-1; i >=0; i-- ) {
          (function( oldload, url ) {
               load = function() {
                 loadScript( url, oldload );
               };
          })(load, data.load[i]);
      }

      load();
  };

}(self));