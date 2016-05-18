/* The function to parse the bed files
the standard file format is
    "Chr start(0based) End(1based)  name score strand matrixSring"
    1) the name column is used to store the name of pwm file, which could
     be called by another function to generate the svg logos,
    2) by default the svg logos are not generated due to he render time
     limitation regarding to bulk load of the hits on the whole genome.
 */
define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'JBrowse/Util/TextIterator',
            'JBrowse/Digest/Crc32',
            './LazyFeature'
        ],
        function (
            declare,
            lang,
            array,
            TextIterator,
            Digest,
            LazyFeature
        ) {

var bed_feature_names = 'seq_id start end name score strand'.split(" ");

return declare( null, {

    /**
     * Parse the bytes that contain the VCF header, storing the parsed
     * data in this.header.
     */
    parseHeader: function( headerBytes ) {

        // parse the header lines
        var headData = {};
        var lineIterator = new TextIterator.FromBytes({ bytes: headerBytes });
        var line;
        while(( line = lineIterator.getline() )) {

            // only interested in meta and header lines
            if( line[0] != '#' )
                continue;

            var match = /^##Motif\s(\S+)\s(\S+)/.exec( line);
            // parse meta line
            if( match && match[1] ) {
                // do further parsing for header content
                var metaData= this.parse_matrix(line);
                var key=metaData.motif;
                headData[key]=metaData.value;
            }
        }

        this.header = headData;
        return headData;
    },

    //read the line
    lineToFeature: function( line ){
        var fields=line.fields;
        for (var i =0; i < fields.length; i++)
            if(fields[i]== '.')
                fields[i] == null;
        if(fields.length <5) {
            fields[3]=fields.join('-');
            fields[4]=0;
            fields[5]=0;
        }
        var matrixValue=null;
        if(this.header[fields[3]])
            matrixValue=this.header[fields[3]]; // Add associated header
        var strand={'+':1,'-':-1}[fields[5]] || 0;

        var featureData = {
            start:  line.start,
            end:    parseInt(fields[2], 10),
            seq_id: fields[0],
            name:   fields[3],
            score:  parseFloat(fields[4],10),
            strand: strand,
            matrix: matrixValue
        };

        var f = new LazyFeature({
            id: fields.slice(0, 5).join('/'),
            data: featureData,
            fields: fields,
            parser: this
        });
        return f;
    },

    // this part is only for parsing header when specified name association for BED6, won't affect feature reading for BED3
    parse_matrix: function(line){
        var match=/^##Motif\s(\S+)\s(\S+)/.exec( line );
        if(!match)
            return null;
        var name =match[1], contents=match[2];
        var mat={motif: name };
        if(contents.length ){
            contents.replace(/\r?\n$/, '');
        }
        var matrix={};
        array.forEach(contents.split(';'), function(a){
            var kv= a.split(':',2);
            if(!(kv[1] && kv[1].length))
                return;
            var colnum= matrix[kv[0]];
            (!colnum)
                colnum = matrix[kv[0]]= [];

            colnum.push.apply(
                colnum,
                array.map(
                    kv[1].split(','),
                    this.unescape
                ));
        },this);
        mat.value=matrix;
        return mat;
    },

    unescape: function(s) {
        if( s === null )
            return null;

        return s.replace( /%([0-9A-Fa-f]{2})/g, function( match, seq ) {
            return String.fromCharCode( parseInt( seq, 16 ) );
        });
    },

    escape: function(s) {
        return s.replace( /[\n\r\t;=%&,\x00-\x1f\x7f-\xff]/g, function( ch ) {
            var hex = ch.charCodeAt(0).toString(16).toUpperCase();
            if( hex.length < 2 ) // lol, apparently there's no native function for fixed-width hex output
                hex = '0'+hex;
            return '%'+hex;
        });
    }

});
});
