/**
 * Base class for Transport methods that are based around the concept
 * of fetching resources or parts of resources, i.e. where sending and
 * receiving are coupled together.  HTTP is like this.  WebSockets are
 * not.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',
           'dojo/when',
           '../Transport',
           'JBrowse/Store/ByteRangeCache',
           'JBrowse/Errors'
       ],
       function(
           declare,
           lang,
           Deferred,
           when,
           Transport,
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

return declare( Transport, {

  constructor: function( args ) {
      // all Transport objects share the same byte-range cache
      this._byteCache = byteRangeCache;
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
                   when( thisB.handleError( error ) )
                       .then( function( retry ) {
                                  if( retry ) {
                                      thisB.fetch( resourceDefinition )
                                          .then( resolve, reject );
                                  }
                                  else
                                      reject( error );
                              });
               });
      return deferred;
  },

  /**
   * Override this in subclasses to fetch a resource.
   * @returns Deferred
   */
  _fetch: function( resourceDefinition, opts, credentialSlots ) {
      var d = new Deferred();
      d.resolve(undefined);
      return d;
  }

});
});