define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/Deferred',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Errors',
            'JBrowse/Model/SimpleFeature'
        ],
        function(
            declare,
            array,
            Deferred,
            has,
            Util,
            Errors,
            SimpleFeature
            ) {

return declare( null,
{
    constructor: function( args ) {
        this.store = args.store;
        this.data  = args.data;
    },

    init: function( args ) {
        var fasta = this.data;
        var thisB = this;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) { console.error(e, e.stack); };
        console.log("init");
        this.parseFile( fasta, function(data) {
            console.log("parseFile");
            array.forEach( data, function(rs) {
                thisB.features[rs.name] = {
                    seq_id: rs.name,
                    name: rs.name,
                    start: 0,
                    end: rs.seq.length,
                    seq: rs.seq
                };
                thisB.refseqs = {
                    name: rs.name,
                    start: 1,
                    end: rs.seq.length+1,
                    length: rs.seq.length
                };
            });
            successCallback();
        }, failCallback );
    },

    

    fetch: function(chr, min, max, featCallback, endCallback, errorCallback ) {
        errorCallback = errorCallback || function(e) { console.error(e); };
        var refname = chr;
        if( ! this.store.browser.compareReferenceNames( chr, refname ) )
            refname = chr;
        featCallback(new SimpleFeature({
                      data: {
                          start:    min,
                          end:      max,
                          residues: this.features[refname].substring(min,max),
                          seq_id:   refname,
                          name:     refname
                      }
                    })
        );
    },

    parseFile: function(fastaFile, successCallback, failCallback ) {
        this.data.fetch( dojo.hitch( this, function(text) {
            var fastaString = text;
            if (!(fastaString && fastaString.length))
                failCallback ("Could not read file: " + fastaFile.name);
            else {
                var data = this.parseString (text);
                if (!data.length)
                    failCallback ("File contained no (FASTA) sequences: " + fastaFile.name);
                else
                    successCallback(data);
            }

        }), failCallback );
    },

    parseString: function(fastaString) {
        var data = [];
        var addSeq = function (s) {
            if ("name" in s && s.seq.length)  // ignore empty sequences
                data.push (s);
        };
        var current = { seq: "" };
        var lines = fastaString.match(/^.*((\r\n|\n|\r)|$)/gm); // this is wasteful, maybe try to avoid storing split lines separately later

        for (var i = 0; i < lines.length; i++) {
            var m;
            if (m = /^>(\S*)/.exec(lines[i])) {
                addSeq (current);
                current = { seq: "" };
                if (m[1].length)
                    current.name = m[1];
            } else if (m = /^\s*(\S+)\s*$/.exec(lines[i])) {
                current.seq += m[1];
            }
        }
        addSeq (current);

        return data;
    }


});


});
