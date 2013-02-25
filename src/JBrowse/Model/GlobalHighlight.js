define( [
            'dojo/_base/declare',
            'JBrowse/Model/Location'
        ],
        function(
            declare,
            Location
        ) {

return declare( Location, {

  constructor: function( args ) {
      if( args ) {

          if( typeof args == 'string' )
              args = Util.parseLocString( args );

          this.objectName = args.objectName;

      }
  },

  toString: function() {
      var locstring = this.inherited(arguments);
      if( this.objectName )
          return locString + ' ('+this.objectName + ')';
      else
          return locstring;
  }

});
});