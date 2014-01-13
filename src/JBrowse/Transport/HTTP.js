define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/_base/url',
           'dojo/request/xhr',
           'JBrowse/has!jbrowse-main-process?dojo/request/iframe',
           'JBrowse/has!jbrowse-main-process?dojo/request/script',
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

return declare( 'JBrowse.Transport.HTTP', RequestBasedTransport, {

  configSchema: {
      slots: [
          { name: 'name', defaultValue: 'HTTP' }
      ]
  },

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

  request: function( resourceDef, requestOptions ) {
      var thisB = this;
      var req = lang.mixin(
          { headers: {}, toString: function() { return this.url; } },
          requestOptions,
          { url: resourceDef }
      );

      req.headers['X-Requested-With'] = false;

      function decorateAndRequest( reqMethod ) {
          return thisB._doRequest(
              resourceDef, requestOptions,
              function( resourceDef, requestOptions, credentialSlots ) {
                  return all( array.map( credentialSlots, function( cred ) {
                                             if( cred.decorateHTTPRequest )
                                                 return cred.decorateHTTPRequest( req );
                                             return undefined;
                                         }))
                      .then( function() {
                                 return thisB[reqMethod](req, credentialSlots);
                         });
              }
          );
      }

      var isXHR = req.handleAs == 'arraybuffer'
          || !( req.jsonp || req.requestTechnique == 'script'
                || req.requestTechnique == 'iframe'
              );

      // handle `range` arg.  put it in the query string if we are not
      // using an XHR for the request
      var range;
      var rangeStr;
      if(( range = req.range )) {
          delete req.range;
          rangeStr = thisB._fmtRangeSpec( range );

          if( isXHR )
              req.headers['Range'] = rangeStr;

          // note: Safari browsers cache XHRs to a
          // single resource, regardless
          // of the byte range.  So, requesting the first 32K, then
          // requesting second 32K, can result in getting the first 32K
          // twice.  Seen first-hand on Safari 6, and @dasmoth reports
          // the same thing on mobile Safari on IOS.  So, if running
          // Safari, put the byte range in a query param at the end of
          // the URL to force Safari to pay attention to it.
          if( ! isXHR || has('safari') )
              lang.setObject( 'query.content-range', rangeStr, req );
      }

      if( req.handleAs == 'arraybuffer' ) {
          if( range ) {
              return thisB._byteCache.get( req, range[0], range[1],
                                          function(req,start,end) {
                                              lang.setObject( 'headers.Range',
                                                           thisB._fmtRangeSpec( [start, end] ),
                                                           req );
                                              return decorateAndRequest( '_binaryFetch' );
                                          });
          } else {
              return decorateAndRequest( '_binaryFetch' );
          }
      }
      else {
          return decorateAndRequest( '_dojoRequest' );
      }
  },

  _fmtRangeSpec: function( range ) {
      if( isNaN( range[0] ) || isNaN( range[1] ) )
          throw new Error('invalid requested byte range '+range[0]+'-'+range[1] );

      var spec = 'bytes='+range[0]+'-';
      if( typeof range[1] == 'number' )
          spec += range[1];

      return spec;
  },

  _dojoRequest: function( req ) {
      if( req.requestTechnique == 'iframe' ) {
          if( ! iframeReq )
              throw new Error('iframe reqs not supported in this process' );
          return iframeReq( req.url, req );
      }
      else if( req.jsonp || req.requestTechnique == 'script' ) {
          if( ! scriptReq )
              throw new Error('script reqs not supported in this process' );

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

      var d = new Deferred();
      var req = new XMLHttpRequest();

      var url = request.url;

      // process request.query
      if( request.query ) {
          url = new URL( url );
          lang.mixin( url.query, request.query );
          url = url.toString();
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
              response.fileSize = parseInt( req.getResponseHeader('Content-Range').match(/\/(\d+)$/)[1] ) || undefined;
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