define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/_base/url',
           'dojo/io-query',
           'dojo/json',
           'dojo/Deferred',
           'dojo/promise/all',

           'JBrowse/Util',
           'JBrowse/Store/LRUCache',
           './_RequestBased'
       ],
       function(
           declare,
           lang,
           array,
           URL,
           ioQuery,
           JSON,
           Deferred,
           all,

           Util,
           LRUCache,
           _RequestBased
       ) {

return declare( 'JBrowse.Transport.GoogleDrive',  _RequestBased, {

  configSchema: {
      slots: [
          { name: 'name', defaultValue: 'Google Drive' }
      ]
  },

  constructor: function() {
      this._fileMetaCache = new LRUCache({
          name: 'GoogleDrive file metadata cache',
          sizeFunction: function( bytes ) {
              return 1;
          },
          maxSize: 100 // cache metadata for up to 100 files
      });
  },

  _http: function() {
      return this.__http || ( this.__http = this.transportManager.getTransport('HTTP') );
  },

  _parseURL: function( url ) {
      try {
          var u = new URL( url );
          return lang.mixin( { scheme: u.scheme }, ioQuery.queryToObject( u.query || '' ) );
      } catch( e ) {
          var m = url.match( /^(file|google-drive):\/+(.+)/i );
          if( ! m )
              throw 'invalid google drive url '+url;
          return { scheme: m[1], title: m[2] };
      }
  },

  canHandle: function( url ) {
      if( typeof url != 'string' )
          return false;

      url = this._parseURL( url );
      return url.scheme == 'google-drive' && ( url.fileId || url.title );
  },

  sendFile: function( dataGenerator, destinationResourceDefinition, sendOpts ) {
      var thisB = this;
      var resource = this._parseURL( destinationResourceDefinition );

      var headers = {};
      if( sendOpts.mediaType )
          headers["Content-Type"] = sendOpts.mediaType;

      var data = '';
      return dataGenerator
          .forEach( function(chunk) { data += chunk; },
                    function() {
                     return thisB.authManager.getCredentialsForRequest(
                         lang.mixin({ resource: 'https://www.googleapis.com/upload/drive/v2/files' },
                                     sendOpts
                                   )
                     );
                    })
          .then( function( credentialSlots ) {
                     var request = thisB._formatGAPISendFileRequest( data, sendOpts );
                     return all( array.map( credentialSlots, function( slot ) {
                                                if( slot.decorateGAPIRequest )
                                                    return slot.decorateGAPIRequest( request );
                                                return undefined;
                                            }))
                         .then( function() { return request; } );
                 })
          .then( function( request ) {
                     return thisB._loadGAPI()
                         .then( function( gapi ) {
                                    var d = new Deferred();
                                    gapi.client.request( request )
                                        .execute( function( response, rawResponse ) {
                                                      if( ! response )
                                                          d.reject( rawResponse );
                                                      else if( response.error )
                                                      d.reject( response );
                                                      else
                                                          d.resolve( response );
                                                  });
                                    return d;
                                });
                 });
  },

  // damn you Google for not supporting CORS for everything.
  _loadGAPI: function() {
      return this._gapi || ( this._gapi = function() {
          return this._http()
                     .request( 'https://apis.google.com/js/client.js', { requestTechnique: 'script' } )
                     .then( function() {
                                return window.gapi;
                            });
      }.call( this ) );
  },

  _formatGAPISendFileRequest: function( data, sendOpts ) {
      // based on Erik Derohanian's prototype
      var boundary = '-------jbrowse_likes_pigeons_and_turkeys_very_much';
      var delimiter = "\r\n--" + boundary + "\r\n";
      var close_delim = "\r\n--" + boundary + "--";

      var metadata = {};
      if( sendOpts.filename )
          metadata.title = sendOpts.filename;
      if( sendOpts.mediaType )
          metadata.mimeType = sendOpts.mediaType;

      return {
          path: '/upload/drive/v2/files',
          method: 'POST',
          params: { uploadType: 'multipart'},
          headers: { 'Content-Type': 'multipart/mixed; boundary="' + boundary + '"' },
          body: delimiter +
              'Content-Type: application/json\r\n\r\n' +
              JSON.stringify( metadata ) +
              delimiter +
              ( metadata.mimeType ? 'Content-Type: ' + metadata.mimeType + '\r\n' : '' ) +
              'Content-Transfer-Encoding: base64\r\n' +
              '\r\n' +
              btoa(data) +
              close_delim
      };
  },

  _request: function( url, requestOptions, credentialSlots ) {
      var resource = this._parseURL( url );
      var thisB = this;
      return this._getFileMeta( resource, requestOptions, credentialSlots )
          .then( function( fileMeta ) {
                     if( ! fileMeta.downloadUrl )
                         return null;

                     if( parseInt( fileMeta.fileSize ) )
                         thisB._byteCache.setTotalSize( fileMeta.downloadUrl, parseInt( fileMeta.fileSize ) );

                     return thisB._http().request( fileMeta.downloadUrl, requestOptions );
                 });
  },

  _getFileMeta: function( resource, requestOptions, credentialSlots ) {
      var key = resource.fileId || resource.title && 'title = '+resource.title;
      var thisB = this;
      return this._fileMetaCache.getD( key, function() {
          return thisB._fetchFileMeta( resource, requestOptions, credentialSlots );
      });
  },

  _fetchFileMeta: function( resource, requestOptions, credentialSlots ) {
      var base = 'https://www.googleapis.com/drive/v2/files';
      var thisB = this;
      if( resource.fileId )
          return this._http().request(
              base + '/'+resource.fileId,
              { jsonp: 'callback', handleAs: 'json' }
          ).then( function(data) {
                      if( data.error ) throw data.error;
                      return data;
                  });
      else if( resource.title )
          return this._http().request(
              { url: base,
                jsonp: 'callback',
                query: { q: "title = '"+resource.title.replace("'","\\'")+"'" }
              },
              { handleAs: 'json' }
          ).then( function( fileList ) {
                      if( fileList.error ) throw fileList.error;
                      return fileList.items[0];
                  });
      else
          throw new Error('fileId or title required');
  }
});
});