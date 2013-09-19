define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ) {

return declare( null, {

  constructor: function( args ) {
      this.browser = args.browser;
      if( ! this.browser )
          throw new Error("browser object required");
  },

  /**
   * Return true if this transport driver knows how to fetch the given
   * resource definition.  Override this in subclasses.
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
