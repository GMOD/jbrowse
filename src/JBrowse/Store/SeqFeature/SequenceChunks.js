/**
 * Storage backend for sequences broken up into chunks, stored and
 * served as static text files.
 */
define( [ 'dojo/_base/declare',
          'dojo/_base/lang',
          'dojo/promise/all',
          'dojo/Deferred',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Model/Resource/Text',
          'JBrowse/Model/Resource/JSON',
          'JBrowse/Util',
          'JBrowse/Util/DeferredGenerator',
          'JBrowse/Model/SimpleFeature',
          'JBrowse/Model/ReferenceSequence',
          'JBrowse/Model/BigSequence',
          'JBrowse/Digest/Crc32'
        ],
        function(
            declare,
            lang,
            all,
            Deferred,
            SeqFeatureStore,
            TextResource,
            JSONResource,
            Util,
            DeferredGenerator,
            SimpleFeature,
            ReferenceSequence,
            BigSequence,
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

    _makeChunkURLBase: function( refname ) {
        return this.resolveUrl(
            this.getConf('urlTemplate'),
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
    },

    getSequenceFragments: function( query ) {
        return this.getFeatures( query );
    },

    getFeatures: function( query ) {
        var thisB = this;
        var refname;
        var chunkSize  = query.seqChunkSize || thisB.getConf('chunkSize');
        return new DeferredGenerator( function( generator ) {
            return thisB.getReferenceSequences({ name: query.ref, limit: 1 })
                .forEach( function(r) {
                              refname = r.get('name');
                          },
                          function() {
                              // if no refname, the refseq was not found
                              if( ! refname ) {
                                  generator.resolve();
                                  return null;
                              }

                              var urlbase = thisB._makeChunkURLBase( refname );

                              // fetch all the relevant chunk text files
                              var firstChunk = Math.floor( Math.max(0,query.start) / chunkSize );
                              var lastChunk  = Math.floor( (query.end - 1)         / chunkSize );
                              var fetches = [];
                              for( var chunkNum = firstChunk; chunkNum <= lastChunk; chunkNum++ ) {
                                  fetches.push(
                                      thisB._fetchChunkSequence( urlbase, chunkNum )
                                          .then( lang.hitch(
                                                     thisB,
                                                     function( chunkNum, seqString ) {
                                                         var feature = thisB._makeFeature( refname, chunkNum, chunkSize, seqString );
                                                         generator.emit( feature );
                                                     },
                                                     chunkNum
                                                 ))
                                  );
                              }

                              return all( fetches );
                          }
                        );
        });
    },

    _fetchChunkSequence: function( urlbase, chunkNum ) {
        var url = urlbase + chunkNum + ".txt" + ( this.getConf('compress') ? 'z' : '' );
        var resource = this.openResource( TextResource, url );

        var d = new Deferred(); // need to have our own deferred that is resolved to '' on 404
        resource.fetch()
            .then( lang.hitch( d, 'resolve' ),
                   function( e ) {
                       if( e.response.status == 404 )
                           d.resolve( '' );
                       else
                           d.reject( e );
                   }
                 );
        return d;
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

    _fetchRefSeqsJson: function() {
        return this._refSeqsInfo || function() {
            var thisB = this;
            var resource = this.openResource( JSONResource, this.resolveUrl( this.getConf('refSeqs') ) );
            return this._refSeqsInfo = resource.fetch()
                .then( function( refseqs ) {
                           var refsByName = {};
                           for( var i = 0; i<refseqs.length; i++ ) {
                               refsByName[ thisB.browser.regularizeReferenceName( refseqs[i].name ) ] = refseqs[i];
                           }
                           return refsByName;
                       });
        }.call(this);
    },

    _makeReferenceSequence: function( data ) {
        if( ! data )
            return undefined;
        if( data instanceof ReferenceSequence )
            return data;

        data = lang.mixin( { seq_id: data.name }, data );
        delete data.length;
        delete data.seqChunkSize;
        return new ReferenceSequence({
            data: data,
            id: data.name,
            bigSequence: new BigSequence({ store: this, name: data.name, start: data.start, end: data.end })
        });
    },

    _getReferenceSequence: function( name ) {
        var thisB = this;
        name = this.browser.regularizeReferenceName( name );
        return thisB._fetchRefSeqsJson()
            .then( function( refseqs ) {
                       return refseqs[ name ] = thisB._makeReferenceSequence( refseqs[name] );
                   });
    },

    getReferenceSequences: function( query ) {
        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            if( query.name || query.ref )
                thisB._getReferenceSequence( query.name || query.ref )
                     .then( function(ref) {
                                generator.emit(ref);
                                generator.resolve();
                            },
                            lang.hitch( generator, 'reject' ));
            else
                thisB._fetchRefSeqsJson()
                     .then( function( refSeqs ) {
                                var limit = query.limit || Infinity;
                                for( var n in refSeqs ) {
                                    generator.emit( refSeqs[n] = thisB._makeReferenceSequence( refSeqs[n] ) );
                                    if( ! --limit )
                                        break;
                                }
                                generator.resolve();
                            });
        });
    }

});
});