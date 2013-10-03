define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/url',
           'dojo/io-query',

           'JBrowse/Store/LRUCache',
           './_RequestBased'
       ],
       function(
           declare,
           lang,
           URL,
           ioQuery,

           LRUCache,
           _RequestBased
       ) {


return declare( _RequestBased, {

  name: 'GoogleDrive',

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
      url = new URL( url );
      return lang.mixin( { scheme: url.scheme }, ioQuery.queryToObject( url.query ) );
  },

  canHandle: function( url ) {
      if( typeof url != 'string' )
          return false;

      url = this._parseURL( url );
      return url.scheme == 'google-drive' && ( url.fileId || url.title );
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