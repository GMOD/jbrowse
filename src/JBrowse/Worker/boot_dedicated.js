(function(self) {




  self.postMessage( 'starting' );

  var eval_ =
	 // use the function constructor so our eval is scoped close
	 // to (but not in) in the global space with minimal pollution
	 new Function('return eval(arguments[0]);');

  function loadScript( url, callback ) {
      //console.log( 'loading '+url);
      var req = new XMLHttpRequest();
      req.open('GET', url, false );
      req.onreadystatechange = function() {
          //console.log( 'req status '+req.status );
          if( req.readyState == 4 ) {
              eval_(req.responseText + "\r\n////@ sourceURL=" + url);
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
          'dojo-test-sniff': false,
          'dojo-timeout-api': false,
          'dom': false,
          'host-browser': false
      }
  };

  function boot( config ) {
      var load = function() {
          // add any require() config we were passed
          if( config.require )
              require( config.require );

          // load our worker class and instantiate it
          require([ config.workerClass ], function( WorkerObject ) {
              delete self.window; // delete our loader-fixing HACK1
              new WorkerObject({ self: self });
          });
      };

      // wrap the last load callback to pre-load the script urls we
      // were passed in data.load
      if( config.preload )
          for( var i = config.preload.length-1; i >=0; i-- ) {
              (function( oldload, url ) {
                   load = function() {
                       loadScript( url, oldload );
                   };
               })(load, config.preload[i]);
          }

      load();
  }

  self.onmessage = function( event ) {
      var config; eval( 'config='+event.data+';' );

      // if configured with a delay, wait before continuing the boot
      // process.  delay is usually useful to give a human developer
      // time to open a debugger for this worker.
      if( config.delay )
          setTimeout( function() { boot( config ); }, config.delay );
      else
          boot( config );
  };

}(self));