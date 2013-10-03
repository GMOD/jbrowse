define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ) {

return declare( null, {

  constructor: function( args ) {
      this.transportManager = args.transportManager;
      if( ! this.transportManager )
          throw new Error("transportManager object required");

      this.authManager = args.authManager;
      if( ! this.authManager )
          throw new Error("authManager object required");

  },

  /**
   * Return true if this transport driver knows how to communicate
   * with the given resource.  Override this in subclasses.
   * @returns boolean
   */
  canHandle: function( resourceDefinition ) {
      return false;
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
