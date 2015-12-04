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
        this.parseFile( fasta ).then( function(data) {
            array.forEach( data, function(rs) {
                this.features[rs.name] = {
                    seq_id: rs.name,
                    name: rs.name,
                    start: 0,
                    end: rs.seq.length,
                    seq: rs.seq
                };
                this.refseqs = {
                    name: rs.name,
                    start: 1,
                    end: rs.seq.length+1,
                    length: rs.seq.length
                };
            });
            successCallback()
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

    parseFile: function(fastaFile) {
        var d = new Deferred();
        var fr = new FileReader();
        fr.onload = dojo.hitch (this, function(e) {
            var fastaString = e.target.result;
            if (!(fastaString && fastaString.length))
                d.reject ("Could not read file: " + fastaFile.name);
            else {
                var data = this.parseString (e.target.result);
                if (!data.length)
                    d.reject ("File contained no (FASTA) sequences: " + fastaFile.name);
                else
                    d.resolve (data);
            }
        });
        fr.readAsText(fastaFile);
        return d;
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
    },

    getRefSeqs: function( featCallback, errorCallback ) {
        var thisB=this;
        this._deferred.features.then(
            function() {
                featCallback( this.refseqs );
            },
            errorCallback
        );
    }


});


});
