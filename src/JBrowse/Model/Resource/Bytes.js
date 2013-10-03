define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           '../Resource'
       ],
       function(
           declare,
           lang,
           Resource
       ) {
return declare( Resource, {
    _newlineCode: "\n".charCodeAt(0),

    _defaultRequestOpts: function() {
        return lang.mixin(
            this.inherited(arguments),
            {
                handleAs: 'arraybuffer'
            });
    },

    // get a line of text from bytes, properly decoding UTF-8
    _getline: function( parseState ) {
        var newline = this._newlineCode;

        var data = parseState.data;
        var i = parseState.offset;

        var line = [];
        while( i < data.length ) {
            var c1 = data[i], c2, c3;
            if (c1 < 128) {
                line.push( String.fromCharCode(c1) );
                i++;
                if( c1 == newline ) {
                    parseState.offset = i;
                    return line.join('');
                }
            } else if (c1 > 191 && c1 < 224) {
                c2 = data[i + 1];
                line.push( String.fromCharCode(((c1 & 31) << 6) | (c2 & 63)) );
                i += 2;
            } else {
                c2 = data[i + 1];
                c3 = data[i + 2];
                line.push( String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)) );
                i += 3;
            }
        }

        // did not get a full line
        parseState.offset = i;
        return null;
    }
});
});
