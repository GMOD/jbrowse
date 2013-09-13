/**
 * Storage backend for sequences broken up into chunks, stored and
 * served as static text files.
 */
define( [ 'dojo/_base/declare',
          'dojo/_base/lang',
          'dojo/request',
          'dojo/promise/all',
          'dojo/Deferred',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Util',
          'JBrowse/Model/SimpleFeature',
          'JBrowse/Digest/Crc32'
        ],
        function(
            declare,
            lang,
            request,
            all,
            Deferred,
            SeqFeatureStore,
            Util,
            SimpleFeature,
            Crc32
        ) {

return declare( SeqFeatureStore,
{
    configSchema: {
        slots: [
            { name: 'refSeqs', type: 'string', defaultValue: 'seq/refSeqs.json' },
            { name: 'chunkSize', type: 'integer', defaultValue: 20000 },
            { name: 'urlTemplate', type: 'string', defaultValue: "seq/{refseq_dirpath}/{refseq}-" },
            { name: 'compress', type: 'boolean', defaultValue: false }
        ]
    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        var thisB = this;
        errorCallback = errorCallback || function(e) { console.error(e); };

        var refname = query.ref;
        var chunkSize  = query.seqChunkSize || this.getConf('chunkSize');

        this.getRefSeqMeta(
            { name: refname, limit: 1 },
            function(r) { refname = r.name; },
            function() {
                var sequrl = thisB.resolveUrl(
                    thisB.getConf('urlTemplate'),
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
                         var d = new Deferred(); // need to have our own deferred that is resolved to '' on 404
                         thisB._fetchChunk( sequrl, chunkNum )
                                 .then( lang.hitch( d, 'resolve' ),
                                        function( e ) {
                                            if( e.response.status == 404 )
                                                d.resolve( '' );
                                            else
                                                d.reject( e );
                                        }
                                      );
                         d.then( function( sequenceString ) {
                                     if( error )
                                             return;
                                     featureCallback( thisB._makeFeature( refname, chunkNum, chunkSize, sequenceString ) );
                                 },
                                 function( e ) {
                                     if( !error )
                                         errorCallback( error = e );
                                 });
                         fetches.push( d );
                     }).call(thisB,chunkNum);
                }


                all( fetches ).then( endCallback );
            },
            errorCallback
        );
    },

    _fetchChunk: function( sequrl, chunkNum ) {
        return request.get( sequrl + chunkNum + ".txt" + ( this.getConf('compress') ? 'z' : '' ),
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
    },

    _getRefSeqsInfo: function() {
        return this._refSeqsInfo || function() {
            var thisB = this;
            return this._refSeqsInfo =
                request.get( this.resolveUrl( this.getConf('refSeqs') ), { handleAs: 'json' } )
                       .then( function( r ) {
                                  var refsByName = {};
                                  for( var i = 0; i<r.length; i++ ) {
                                      refsByName[ thisB.browser.regularizeReferenceName( r[i].name ) ] = r[i];
                                  }
                                  return refsByName;
                              });
        }.call(this);
    },

    getRefSeqMeta: function( query, refSeqCallback, finishCallback, errorCallback ) {
        var thisB = this;
        this._getRefSeqsInfo().then( function( refSeqs ) {
            if( query.name ) {
                refSeqCallback( refSeqs[ thisB.browser.regularizeReferenceName( query.name ) ] );
                finishCallback();
            }
            else {
                var limit = query.limit || Infinity;
                for( var n in refSeqs ) {
                    refSeqCallback( refSeqs[n] );
                    if( ! --limit )
                        break;
                }
                finishCallback();
            }
        });
    }

});
});