define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/url',
           'dojo/io-query',

           './_RequestBased'
       ],
       function(
           declare,
           lang,
           URL,
           ioQuery,

           _RequestBased
       ) {


return declare( _RequestBased, {

  name: 'GoogleDrive',

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
      return this._fetchFileMeta( resource, opts, credentialSlots )
          .then( function( fileMeta ) {
                     if( ! fileMeta.downloadUrl )
                         return null;

                     if( parseInt( fileMeta.fileSize ) )
                         thisB._byteCache.setTotalSize( fileMeta.downloadUrl, parseInt( fileMeta.fileSize ) );

                     return thisB._http().fetch( fileMeta.downloadUrl, opts );
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