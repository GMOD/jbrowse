define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/request',
           'dojo/Deferred',
           'JBrowse/has',
           'JBrowse/Transport'
       ],
       function(
           declare,
           lang,
           array,
           request,
           Deferred,
           has,
           TransportBase
       ) {

return declare( TransportBase, {

  constructor: function() {
      this.totalSizes = {};
  },

  _fetch: function( resourceDef, opts, credentialSlots ) {
      var req = lang.mixin( {}, resourceDef, opts );

      // give each credential an opportunity to decorate the HTTP
      // request
      array.forEach( credentialSlots, function( cred ) {
          if( cred.decorateHTTPRequest )
              cred.decorateHTTPRequest( req );
      });

      if( resourceDef.handleAs == 'arraybuffer' ) {
          return this._binaryFetch( req, credentialSlots );
      }
      else {
          return this._dojoFetch( req, credentialSlots );
      }
  },

  _dojoFetch: function( req, credentialSlots ) {
          var fetch = request( req.url, req );
          return fetch;
  },

  _binaryFetch: function( request, credentialSlots ) {
      var d = new Deferred();

      var req = new XMLHttpRequest();
      var length;
      var url = request.url;

      // Safari browsers cache XHRs to a single resource, regardless
      // of the byte range.  So, requesting the first 32K, then
      // requesting second 32K, can result in getting the first 32K
      // twice.  Seen first-hand on Safari 6, and @dasmoth reports
      // the same thing on mobile Safari on IOS.  So, if running
      // Safari, put the byte range in a query param at the end of
      // the URL to force Safari to pay attention to it.
      if( has('safari') && request.range ) {
          url = url + ( url.indexOf('?') > -1 ? '&' : '?' ) + 'safari_range=' + request.range[0] +'-'+request.range[1];
      }

      req.open('GET', url, true );
      if( req.overrideMimeType )
          req.overrideMimeType('text/plain; charset=x-user-defined');
      if (request.range) {
          req.setRequestHeader('Range', 'bytes=' + request.range[0] + '-' + request.range[1]);
          length = request.range[1] - request.range[0] + 1;
      }
      req.responseType = 'arraybuffer';

      var respond = function( response ) {
          var nocache = /no-cache/.test( req.getResponseHeader('Cache-Control') )
              || /no-cache/.test( req.getResponseHeader('Pragma') );
          d.resolve( response, null, {nocache: nocache } );
      };

      req.onreadystatechange = dojo.hitch( this, function() {
          if (req.readyState == 4) {
              if (req.status == 200 || req.status == 206) {

                  // if this response tells us the file's total size, remember that
                  if( !( request.url in this.totalSizes ) )
                      this.totalSizes[request.url] = (function() {
                          var contentRange = req.getResponseHeader('Content-Range');
                          if( ! contentRange )
                              return undefined;
                          var match = contentRange.match(/\/(\d+)$/);
                          return match ? parseInt(match[1]) : undefined;
                      })();

                  var response = req.response || req.mozResponseArrayBuffer || (function() {
                      try {
                          respond( this._stringToBuffer(req.responseText) );
                          return;
                      } catch (x) {
                          console.error(''+x, x.stack, x);
                          // the response must have successful but
                          // empty, so respond with a zero-length
                          // arraybuffer
                          respond( new ArrayBuffer() );
                          return;
                      }
                  }).call(this);
                  if( response ) {
                      respond( response );
                  }
              } else {
                  d.reject( this._errorString( req, url ) );
                  return null;
              }
          }
          return null;
      });

      req.send('');
      return d;
    },

    _errorString: function( req, url ) {
        if( req.status )
            return req.status+' ('+req.statusText+') when attempting to fetch '+url;
        else
            return 'Unable to fetch '+url;
    }

});
});