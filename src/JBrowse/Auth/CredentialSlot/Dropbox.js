define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           './Google',
           'JBrowse/Errors',
           'JBrowse/Util',
           'JBrowse/Auth/OAuth2/Token',
           'JBrowse/Auth/OAuth2/TokenStore'
       ],
       function(
           declare,
           lang,

           GoogleOAuth2,
           Errors,
           Util,
           Token,
           TokenStore
       ) {
return declare( GoogleOAuth2, {

   configSchema: {
       slots: [
           { name: 'name', defaultValue: 'Dropbox' },

           { name: 'authPopupURL', defaultValue: 'https://www.dropbox.com/1/oauth2/authorize' },
           { name: 'authPopupWindowOpts',
             defaultValue: [ 'DropboxAuthWindow', 'status=no,toolbar=no,width=1000,height=700' ]
           },

           { name: 'userIDField', defaultValue: 'uid' },
           { name: 'tokenValidateURL', defaultValue: '' },
           { name: 'apiRequestOpts', defaultValue: { handleAs: 'json' } },
           { name: 'userInfoURL', defaultValue: 'https://api.dropbox.com/1/account/info' },
           { name: 'clientID',  defaultValue: 'hyqu93qdn717we9' },

           { name: 'keyringCSSClass',  defaultValue: 'dropbox' },
           { name: 'keyringLabel', defaultValue: '{display_name}' },


           // dropbox doesn't use scopes
           { name: 'defaultScope', defaultValue: [] },
           { name: 'scopeMap', defaultValue: [] }
       ]
   },

  neededFor: function( request ) {
      var url = request.resource.url || request.resource;

      return url != this.getConf('userInfoURL') &&
          /^https?:\/\/[^\/]*\.?dropbox\.com\//
          .test( url );
  },

  _validateTokenFromResponse: function( inputToken, response ) {
      if( response.error )
          throw response.error;

      if( ! response.uid ) {
          var msg = 'invalid response from '+this.getConf('name')+' token validation service';
          console.error( msg, response );
          throw new Error( msg );
      }

      inputToken.setMeta( 'uid', response.uid );
      inputToken.setValidated();

      return inputToken;
  }

});
});
