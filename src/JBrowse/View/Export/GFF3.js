define([ 'dojo/_base/declare'],
       function( declare ) {

return declare( null,

 /**
  * @lends JBrowse.View.Export.GFF3.prototype
  */
{

    constructor: function( args ) {
        this.print = args.print || function( line ) { this.output += line; };
        this.output = '';
    },

    writeFeature: function( feature ) {
        this.print( feature.get('name')+"\n" );
    }
});

});
