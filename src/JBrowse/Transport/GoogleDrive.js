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
      return this.__http || ( this.__http = this.browser.getTransport('HTTP') );
  },

  _normalizeResourceDefinition: function( def ) {
      if( typeof def == 'string' )
          def = { url: def };

      if( def.url ) {
          lang.mixin( def, this._parseURL( def.url ) );
      }

      return def;
  },

  _parseURL: function( url ) {
      url = new URL( url );
      return lang.mixin( { scheme: url.scheme }, ioQuery.queryToObject( url.query ) );
  },

  canHandle: function( resourceDefinition ) {
      resourceDefinition = this._normalizeResourceDefinition( resourceDefinition );
      return resourceDefinition.scheme == 'google-drive' && ( resourceDefinition.fileId || resourceDefinition.title );
  },

  _fetch: function( resourceDefinition, opts, credentialSlots ) {
      var resource = this._normalizeResourceDefinition( resourceDefinition );
      var thisB = this;
      return this._getFileMeta( resource, opts, credentialSlots )
          .then( function( fileMeta ) {
                     if( ! fileMeta.downloadUrl )
                         return null;

                     if( parseInt( fileMeta.fileSize ) )
                         thisB._byteCache.setTotalSize( fileMeta.downloadUrl, parseInt( fileMeta.fileSize ) );

                     return thisB._http().fetch( fileMeta.downloadUrl, opts );
                 });
  },

  _getFileMeta: function( resource, opts, credentialSlots ) {
      var key = resource.fileId || resource.title && 'title = '+resource.title;
      var thisB = this;
      return this._fileMetaCache.getD( key, function() {
          return thisB._fetchFileMeta( resource, opts, credentialSlots );
      });
  },

  _fetchFileMeta: function( resource, opts, credentialSlots ) {
      var base = 'https://www.googleapis.com/drive/v2/files';
      var thisB = this;
      if( resource.fileId )
          return this._http().fetch(
              base + '/'+resource.fileId,
              { jsonp: 'callback', handleAs: 'json' }
          );
      else if( resource.title )
          return this._http().fetch(
              { url: base,
                jsonp: 'callback',
                query: { q: "title = '"+resource.title.replace("'","\\'")+"'" }
              },
              { handleAs: 'json' }
          ).then( function( fileList ) {
                      return fileList.items[0];
                  });
      else
          throw new Error('fileId or title required');
  }
});
});