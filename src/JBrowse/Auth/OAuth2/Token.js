/**
 * Model of an OAuth2 access token.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/json'
       ],
       function(
           declare,
           lang,
           djson
       ) {

var JSON = window.JSON || djson;

return declare( null, {

   constructor: function( tokenString, metaData ) {
       metaData = metaData || {};

       // expiry
       if( metaData.expires_in ) {
           metaData.expires = Math.floor( (new Date()).getTime()/1000 + parseFloat( metaData.expires_in ) );
           delete metaData.expires_in;
       }
       if( ! metaData.expires )
           metaData.expires = Infinity;

       // scope
       if( typeof metaData.scope == 'string' ) {
           metaData.scope = metaData.scope.split(/\s+/);
       }

       if( ! metaData.scope )
           throw new Error('scope required');

       this.tokenString = tokenString;
       this._meta = metaData;
       this._validated = false;
   },

   getMeta: function( key ) {
       if( key !== undefined )
           return this._meta[key];

       return this._meta;
   },
   setMeta: function( key, val ) {
       return this._meta[key] = val;
   },

   setValidated: function() {
       this._validated = true;
   },

   isValid: function() {
       return this._validated && ! this.isExpired();
   },

   isExpired: function() {
       return this._meta.expires-2 <= (new Date()).getTime()/1000;
   },
   getExpiryTime: function() {
       return this._meta.expires;
   },

   toString: function() {
       return this.tokenString+'';
   },

   toJSON: function() {
       return JSON.stringify([ this.tokenString, this._meta || {} ]);
   }

});
});