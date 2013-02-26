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

            if( typeof args == 'string' )
                args = Util.parseLocString( args );

            if( args.location )
                this._populate( args.location );

            this._populate( args );

        }
    },
    _populate: function( args ) {
        this.ref = args.ref;
        this.start = args.start;
        this.end = args.end;
        this.strand = args.strand;
        this.tracks = args.tracks;
        this.objectName = args.objectName;
    },

    toString: function() {
        var locstring =  Util.assembleLocString(this);
        if( this.objectName )
            return locstring + ' ('+this.objectName + ')';
        else
          return locstring;
    },

    fromString: function( str ) {
        var p = Util.parseLocString( str );
        p.objectName = p.extra;
        delete p.extra;
        this._populate( p );
    },

    localeCompare: function( b ) {
        var as = this.toString();
        var bs = b.toString();
        return as.localeCompare( bs );
    }
});
});