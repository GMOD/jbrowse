define( [ 'dojo/_base/declare',
          'dojo/request',
          'dojo/promise/all',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Util',
          'JBrowse/Model/SimpleFeature',
          'JBrowse/Digest/Crc32'
        ],
        function(
            declare,
            request,
            all,
            SeqFeatureStore,
            Util,
            SimpleFeature,
            Crc32
        ) {

return declare( SeqFeatureStore,
{

/**
 * Storage backend for sequences broken up into chunks, stored and
 * served as static text files.
 * @constructs
 */
    constructor: function(args) {
        this.chunkCache   = {};
        this.compress     = args.compress;
        this.urlTemplate  = args.urlTemplate;
        if( ! this.urlTemplate ) {
            throw "no urlTemplate provided, cannot open sequence store";
        }

        this.baseUrl      = args.baseUrl;
        this.seqChunkSize = args.seqChunkSize;
    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {

        errorCallback = errorCallback || function(e) { console.error(e); };

        var refname = query.ref;
        if( ! this.browser.compareReferenceNames( this.refSeq.name, refname ) )
            refname = this.refSeq.name;

        var chunkSize  = query.seqChunkSize || refname == this.refSeq.name && this.refSeq.seqChunkSize || this.seqChunkSize;

        var sequrl = this.resolveUrl(
            this.urlTemplate,
            {
                'refseq': refname,
                'refseq_dirpath': function() {
                    var hex = Crc32.crc32( refname )
                        .toString(16)
                        .toLowerCase()
                        .replace('-','n');
                    // zero-pad the hex string to be 8 chars if necessary
                    while( hex.length < 8 )
                        hex = '0'+hex;
                    var dirpath = [];
                    for( var i = 0; i < hex.length; i += 3 ) {
                        dirpath.push( hex.substring( i, i+3 ) );
                    }
                    return dirpath.join('/');
                }
            }
        );

        var firstChunk = Math.floor( Math.max(0,query.start) / chunkSize );
        var lastChunk  = Math.floor( (query.end - 1)         / chunkSize );

        var error;
        var fetches = [];
        for( var chunkNum = firstChunk; chunkNum <= lastChunk; chunkNum++ ) {
            (function( chunkNum ) {
                 var thisB = this;
                 fetches.push(
                     this._fetchChunk( sequrl, chunkNum )
                         .then( function( sequenceString ) {
                                    if( error )
                                        return;
                                    featureCallback( thisB._makeFeature( refname, chunkNum, chunkSize, sequenceString ) );
                                },
                                function( e ) {
                                    if( !error )
                                        errorCallback( error = e );
                                }
                              )
                 );
             }).call(this,chunkNum);
        }


        all( fetches ).then( endCallback );
    },

    _fetchChunk: function( sequrl, chunkNum ) {
        return request.get( sequrl + chunkNum + ".txt" + ( this.compress ? 'z' : '' ),
                            { handleAs: 'text' }
                          );
    },

    _makeFeature: function( refname, chunkNum, chunkSize, sequenceString ) {
        return new SimpleFeature({
          data: {
              start:    chunkNum * chunkSize,
              end:      chunkNum*chunkSize + sequenceString.length,
              residues: sequenceString,
              seq_id:   refname,
              name:     refname
          }
        });
    }
});
});