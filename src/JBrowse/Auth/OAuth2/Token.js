/**
 * Model of an OAuth2 access token.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang'
       ],
       function(
           declare,
           lang
       ) {
return declare( null, {

   constructor: function( tokenString, metaData ) {
       this.tokenString = tokenString;

       if( metaData ) { // normalize metadata and mix it in

           // expiry
           if( metaData.expires_in ) {
               metaData.expires = (new Date()).getTime()+parseFloat( metaData.expires_in );
               delete metaData.expires_in;
           }
           if( ! metaData.expires )
               metaData.expires = Infinity;

           // scopes
           if( metaData.scope && ! metaData.scopes ) {
               metaData.scopes = [ metaData.scope ];
           }
           delete metaData.scope;

           if( ! metaData.scopes )
               throw new Error('scopes required');

           declare.safeMixin( this, metaData );
       }

   },

   isExpired: function() {
       return this.expires-2 <= (new Date()).getTime();
   },

   toString: function() {
       return this.access_token+'';
   }

});
});