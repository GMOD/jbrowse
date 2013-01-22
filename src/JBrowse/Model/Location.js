define([
           'JBrowse/Util'
       ],
       function(
           Util
       ) {

return Util.fastDeclare(
{
    constructor: function( args ) {
        if( args ) {
            this.ref = args.ref;
            this.start = args.start;
            this.end = args.end;
            this.strand = args.strand;
            this.tracks = args.tracks;
        }
    },
    toString: function() {
        return Util.assembleLocString(this);
    },
    localeCompare: function( b ) {
        var as = this.toString();
        var bs = b.toString();
        return as.localeCompare( bs );
    }
});
});