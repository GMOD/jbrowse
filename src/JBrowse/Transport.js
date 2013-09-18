define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'JBrowse/Store/ByteRangeCache',
           'JBrowse/Errors'
       ],
       function(
           declare,
           lang,
           Deferred,
           ByteRangeCache,
           JBrowseErrors
       ) {

var byteRangeCache = new ByteRangeCache({
    name: 'global byte-range cache',
    sizeFunction: function( bytes ) {
        return bytes.length;
    },
    maxSize: 50000000 // 50MB
});

return declare( null, {

  constructor: function( args ) {

      // all Transport objects share the same byte-range cache
      this._byteCache = byteRangeCache;

      this.browser = args.browser;
      if( ! this.browser )
          throw new Error("browser object required");
  },

  fetch: function( resourceDefinition, opts ) {
      var thisB = this;
      var deferred = new Deferred();
      var resolve = lang.hitch( deferred, 'resolve' );
      var reject  = lang.hitch( deferred, 'reject'  );

      thisB.browser.getCredentialsForResource( resourceDefinition )
          .then(
              function( credentialSlots ) {
                  return thisB._fetch( resourceDefinition, opts, credentialSlots );
              })
          .then(
               resolve,
               function( error ) {
                   var retry = thisB.handleError( error );
                   if( retry ) {
                       thisB.fetch( resourceDefinition )
                           .then( resolve, reject );
                  }
                  else
                      reject( error );
              });

      return deferred;
  },

  /**
   * Override this in subclasses to fetch a resource.
   * @returns Deferred
   */
  _fetch: function( resourceDefinition, credentialSlots ) {
      var d = new Deferred();
      d.resolve(undefined);
      return d;
  },

  /**
   * Handle fetch errors.
   * @returns {Boolean} true if the request should be retried
   */
  handleError: function( errorObject ) {
      return false;
  }

});
});
