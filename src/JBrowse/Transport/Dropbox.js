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

  _http: function() {
      return this.__http || ( this.__http = this.transportManager.getTransport('HTTP') );
  },

  _parseURL: function( url ) {
      return new URL( url );
  },

  canHandle: function( url ) {
      if( typeof url != 'string' )
          return false;

      url = this._parseURL( url );
      return url.scheme == 'dropbox';
  },

  _request: function( url, requestOptions, credentialSlots ) {
      var resource = this._parseURL( url );
      if(! resource.path )
          throw 'invalid dropbox url '+url;

      // support both proper dropbox:///foo/bar and improper
      // dropbox://foo/bar, and make sure it has a leading /
      var path = resource.path;
      if( resource.host )
          path = resource.host + path;
      if( path.indexOf( '/' ) != 0 )
          path = '/'+path;

      var downloadURL = 'https://api-content.dropbox.com/1/files/dropbox'+path;

      return this._http().request( downloadURL, requestOptions );
  }

});
});