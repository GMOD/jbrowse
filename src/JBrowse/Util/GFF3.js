/**
 * Fast, low-level functions for parsing and formatting GFF3.
 * JavaScript port of Robert Buels's Bio::GFF3::LowLevel Perl module.
 */

define([
           'dojo/_base/array'
       ],
       function(
           array
       ) {
var gff3_field_names = 'seq_id source type start end score strand phase attributes'.split(' ');

return {

    parse_feature: function( line ) {
        var f = array.map( line.split("\t"), function(a) {
            if( a == '.' ) {
                return undefined;
            }
            return a;
        });

        // unescape only the ref and source columns
        f[0] = this.unescape( f[0] );
        f[1] = this.unescape( f[1] );

        f[8] = this.parse_attributes( f[8] );
        var parsed = {};
        for( var i = 0; i < gff3_field_names.length; i++ ) {
            parsed[ gff3_field_names[i] ] = f[i];
        }
        parsed.start = parseInt( parsed.start, 10 );
        parsed.end = parseInt( parsed.end, 10 );
        parsed.score = parseFloat( parsed.score, 10 );

        return parsed;
    },

    unescape: function( s ) {
        return s.replace( /%([0-9A-Fa-f]{2})/g, function( match, seq ) {
                              return String.fromCharCode( parseInt( seq, 16 ) );
                          });
    },

    escape: function( s ) {
        return s.replace( /[\n\r\t;=%&,\x00-\x1f\x7f-\xff]/g, function( ch ) {
                              var hex = ch.charCodeAt(0).toString(16).toUpperCase();
                              if( hex.length < 2 ) // lol, apparently there's no native function for fixed-width hex output
                                  hex = '0'+hex;
                              return '%'+hex;
                          });
    },

    parse_attributes: function( attrString ) {

        if( !( attrString && attrString.length ) || attrString == '.' )
            return {};

        attrString = attrString.replace(/\r?\n$/, '' );

        var attrs = {};
        array.forEach( attrString.split(';'), function( a ) {
            var nv = a.split( '=', 2 );
            if( !( nv[1] && nv[1].length ) )
                return;
            var arec = attrs[ nv[0] ];
            if( ! arec )
                arec = attrs[ nv[0] ] = [];

            arec.push.apply(
                arec,
                array.map(
                    nv[1].split(','),
                    this.unescape
                ));
        },this);

        return attrs;
    },

    format_feature: function( f ) {
        var attrString =
            typeof f.attributes == 'undefined'
                ? '.' : this.format_attributes( f.attributes );

        var fields = [];
        for( var i = 0; i<8; i++ ) {
            var val = f[ gff3_field_names[i] ];
            fields[i] = typeof val == 'undefined' ? '.' : this.escape( ''+val );
        }
        fields[8] = attrString;

        return fields.join("\t")+"\n";
    },

    format_attributes: function( attrs ) {
        var attrOrder = [];
        for( var tag in attrs ) {
            var val = attrs[tag];
            var valstring = val.hasOwnProperty( 'toString' )
                                ? this.escape( val.toString() ) :
                            val.values
                                ? function(val) {
                                    return val instanceof Array
                                        ? array.map( val, this.escape ).join(',')
                                        : this.escape( val );
                                  }.call(this,val.values) :
                            val instanceof Array
                                ? array.map( val, this.escape ).join(',')
                                : this.escape( val );
            attrOrder.push( this.escape( tag )+'='+valstring);
        }
        return attrOrder.length ? attrOrder.join(';') : '.';
    }
};
});