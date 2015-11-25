define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Errors',
            'JBrowse/Store/LRUCache'
        ],
        function(
            declare,
            array,
            has,
            Util,
            Errors,
            LRUCache
            ) {

return declare( null,
{
    constructor: function( args ) {
        this.store = args.store;
        this.data  = args.data;
        this.fai   = args.fai;

        this.chunkSizeLimit = args.chunkSizeLimit || 500000;
    },

    init: function( args ) {
        var bam = this;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) { console.error(e, e.stack); };

        this._readFAI( dojo.hitch( this, function() {
            successCallback();
        }), failCallback );
    },

    _readFAI: function( successCallback, failCallback ) {
        var thisB=this;
        this.fai.fetch( dojo.hitch( this, function(text) {
            if (!text) {
                failCallback("No data read from FASTA index (FAI) file");
                return;
            }
            var buf=String.fromCharCode.apply(null,new Uint8Array(text));
            buf.split(/\r?\n/).forEach( function ( line ) {
                var row = line.split('\t');
                if(row[0]=="") return;

                thisB.store.index[row[0]] = {
                    'name': row[0],
                    'length': +row[1],
                    'start': 0,
                    'end': +row[1],
                    'offset': +row[2],
                    'linelen': +row[3],
                    'linebytelen': +row[4]
                };
            });

            successCallback(  );
        }), failCallback );
    }
});


});
