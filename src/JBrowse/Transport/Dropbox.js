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

  configSchema: {
      slots: [
          { name: 'name', defaultValue: 'Dropbox' },
          { name: 'baseUrl', defaultValue: 'https://api-content.dropbox.com/1/fakebase.html' }
      ]
  },

  _http: function() {
      return this.__http || ( this.__http = this.transportManager.getTransport('HTTP') );
  },

  _parseURL: function( url ) {
      try {
          var m = url.match( /^(file|dropbox):\/+(.+)/i );
          return { scheme: m[1], path: '/'+m[2] };
      } catch(e) {
          throw 'invalid dropbox url '+url;
      }
  },

  canHandle: function( url ) {
      if( typeof url != 'string' )
          return false;
      try {
          url = this._parseURL( url );
      } catch(e) {
          return false;
      }
      return url.scheme == 'dropbox';
  },

  sendFile: function( dataGenerator, destinationResourceDefinition, sendOpts ) {
      var thisB = this;
      var resource = this._parseURL( destinationResourceDefinition );
      var putURL = this.resolveUrl( 'files_put/dropbox'+resource.path );

      var data = '';
      return dataGenerator
          .forEach( function(chunk) { data += chunk; },
                    function() {
                        return thisB._http().request(
                            putURL,
                            lang.mixin( {},
                                        sendOpts,
                                        {
                                            query: { overwrite: sendOpts.overwrite || false },
                                            data: data,
                                            method: 'put'
                                        }
                                      )
                        );
                    });
  },

  _request: function( url, requestOptions, credentialSlots ) {
      var resource = this._parseURL( url );
      var downloadURL = this.resolveUrl( 'files/dropbox'+resource.path );
      return this._http().request( downloadURL, requestOptions );
  }

});
});