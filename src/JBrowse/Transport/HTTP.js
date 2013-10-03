define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/_base/url',
           'dojo/request/xhr',
           'dojo/request/iframe',
           'dojo/request/script',
           'dojo/Deferred',
           'dojo/promise/all',

           'JBrowse/has',
           './_RequestBased'
       ],
       function(
           declare,
           lang,
           array,
           URL,
           xhrReq,
           iframeReq,
           scriptReq,
           Deferred,
           all,

           has,
           RequestBasedTransport
       ) {

jbrowse_jsonp_callbacks = {};
var serialNumber = 0;

return declare( RequestBasedTransport, {

  name: 'HTTP',

  constructor: function() {
  },

  canHandle: function( url ) {
      // can only handle string URLs
      if( typeof url != 'string' )
          return false;
      try {
          var scheme = ((new URL( url )).scheme || window.location.protocol.replace(':','')).toLowerCase();
          return /^https?$/.test( scheme );
      } catch(e) {}
      return false;
  },

  _request: function( resourceDef, requestOptions, credentialSlots ) {
      var req = lang.mixin(
          { headers: {}, toString: function() { return this.url; } },
          requestOptions,
          { url: resourceDef }
      );

      // give each credential an opportunity to decorate the HTTP
      // request
      var thisB = this;
      return all( array.map( credentialSlots, function( cred ) {
                          if( cred.decorateHTTPRequest )
                              return cred.decorateHTTPRequest( req );
                          return undefined;
                      }) )
          .then( function() {
                     if( req.handleAs == 'arraybuffer' ) {
                         if( req.range ) {
                             return thisB._byteCache.get( req, req.range[0], req.range[1],
                                                         function(req,start,end) {
                                                             req = lang.mixin( {}, req, { range: [start,end] } );
                                                             return thisB._binaryFetch( req, credentialSlots );
                                                         });
                         } else {
                             return thisB._binaryFetch( req, credentialSlots );
                         }
                     }
                     else {
                         return thisB._dojoRequest( req, credentialSlots );
                     }
                 });
  },

  _dojoRequest: function( req, credentialSlots ) {
      // handle `range` arg
      var range;
      if(( range = req.range )) {
          delete req.range;
          req.headers['Range'] = 'bytes='+range[0]+'-'+range[1];
      }

      if( req.requestTechnique == 'iframe' )
          return iframeReq( req.url, req );
      else if( req.jsonp || req.requestTechnique == 'script' ) {
          // TODO: delete this JSONP re-implementation when upgrading
          // to dojo 1.9.1
          var jsonpCallbackVarName = req.jsonp;
          delete req.jsonp;
          if( jsonpCallbackVarName ) {
              if( ! req.query ) req.query = {};
              var cb = this._makeJSONPCallback();
              req.query[jsonpCallbackVarName] = cb.name;
              return scriptReq(req.url, req).then( function(v) { return cb.deferred; } );
          }
          else {
              return scriptReq( req.url, req );
          }
      } else
          return xhrReq( req.url, req );
  },

  _makeJSONPCallback: function() {
      var name = 'cb'+(++serialNumber);
      var d = new Deferred();
      jbrowse_jsonp_callbacks[name] = function(data) {
          delete jbrowse_jsonp_callbacks[name];
          d.resolve( data );
      };
      return {
          name: 'jbrowse_jsonp_callbacks.'+name,
          deferred: d
      };
  },

  _binaryFetch: function( request, credentialSlots ) {
      request = lang.mixin( {}, request );

      // handle `range` arg
      var range;
      if(( range = request.range )) {
          delete request.range;
          request.headers['Range'] = 'bytes='+range[0]+'-'+range[1];
      }

      var d = new Deferred();

      var req = new XMLHttpRequest();
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

      for( var header in request.headers ) {
          try {
              req.setRequestHeader( header, request.headers[header] );
          } catch(e) { console.error(e); }
      }

      req.responseType = 'arraybuffer';

      var respond = function( response ) {
          try {
              response.nocache = /no-cache/.test( req.getResponseHeader('Cache-Control') )
                  || /no-cache/.test( req.getResponseHeader('Pragma') );
              response.req = req;
              response.url = url;
              response.req.url = url;
          } catch(e) {}
          d.resolve( response );
      };

      req.onreadystatechange = dojo.hitch( this, function() {
          if (req.readyState == 4) {
              if (req.status == 200 || req.status == 206) {
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
                  d.reject( this._makeError( request, req, url ) );
                  return null;
              }
          }
          return null;
      });

      req.send('');
      return d;
    },

    _makeError: function( request, xhr, url ) {
        var e = new Error( xhr.status ? xhr.status+' ('+xhr.statusText+') when attempting to request '+url
                           : 'Unable to request '+url );
        e.request = request;
        e.xhr = xhr;
        e.url = url;
        return e;
    }
});
});