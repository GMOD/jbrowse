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

    parse_feature: function( line ) {console.log(line);
        parsed = {}
        parsed.seq_id = line.ref;
        parsed.source = line.fields[1];
        parsed.type = line.fields[2];
        parsed.start = line.fields[3];
        parsed.end = line.fields[4];console.log(parsed);
        parsed.attributes=[];
        parsed.attributes[0]= line.fields[8];
        return parsed;
    },

    parse_directive: function( line ) {
        var match = /^\s*\#\#\s*(\S+)\s*(.*)/.exec( line );
        if( ! match )
            return null;
        var name = match[1], contents = match[2];

        var parsed = { directive : name };
        if( contents.length ) {
            contents = contents.replace( /\r?\n$/, '' );
            parsed.value = contents;
        }

        // do a little additional parsing for sequence-region and genome-build directives
        if( name == 'sequence-region' ) {
            var c = contents.split( /\s+/, 3 );
            parsed.seq_id = c[0];
            parsed.start  = c[1].replace(/\D/g,'');
            parsed.end    = c[2].replace(/\D/g,'');
        }
        else if( name == 'genome-build' ) {
            var c = contents.split( /\s+/, 2 );
            parsed.source    = c[0];
            parsed.buildname = c[1];
        }

        return parsed;
    },

    unescape: function( s ) {
        if( s === null )
            return null;

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
            f.attributes === null || typeof f.attributes == 'undefined'
                ? '.' : this.format_attributes( f.attributes );

        var fields = [];
        for( var i = 0; i<8; i++ ) {
            var val = f[ gff3_field_names[i] ];
            fields[i] = val === null || val === undefined ? '.' : this.escape( ''+val );
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
