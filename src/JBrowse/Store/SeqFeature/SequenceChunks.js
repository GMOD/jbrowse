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
          'JBrowse/Model/ReferenceFeature',
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
            { name: 'chunks', type: 'string', defaultValue: "seq/{refseq_dirpath}/{refseq}-{chunkNum}.txt{compressed}" },
            { name: 'compress', type: 'boolean', defaultValue: false }
        ]
    },

    deflate: function() {
        var d = this.inherited(arguments);
        d.$class = 'JBrowse/Store/SeqFeature/SequenceChunks';
        return d;
    },

    _chunkURLTemplateVars: function( refname ) {
    },

    getSequenceFragments: function( query ) {
        return this.getFeatures( query );
    },

    getReferenceSequence: function( name, start, end ) {
        var seq;
        return this.getReferenceFeatures({ seq_id: name })
                   .forEach( function(s) { seq = s; },
                             function() { return seq && seq.getSequence(start,end); }
                           );
    },

    getFeatures: function( query ) {
        var thisB = this;
        var refname;
        var chunkSize  = query.seqChunkSize || thisB.getConf('chunkSize');
        return new DeferredGenerator( function( generator ) {
            return thisB.getReferenceFeatures({ name: query.seq_id, limit: 1 })
                .forEach( function(r) {
                              refname = r.get('name');
                          },
                          function() {
                              // if no refname, the refseq was not found
                              if( ! refname ) {
                                  generator.resolve();
                                  return null;
                              }

                              // fetch all the relevant chunk text files
                              var firstChunk = Math.floor( Math.max(0,query.start) / chunkSize );
                              var lastChunk  = Math.floor( (query.end - 1)         / chunkSize );
                              var fetches = [];
                              for( var chunkNum = firstChunk; chunkNum <= lastChunk; chunkNum++ ) {
                                  fetches.push(
                                      thisB._fetchChunkSequence( refname, chunkNum )
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


    _chunkURLVars: function( refname, chunkNum ) {
        return {
            ref: refname,
            seq_id: refname,
            chunkNum: chunkNum,
            refseq: refname,
            compressed: this.getConf('compress') ? 'z' : '',
            refseq_dirpath: function() {
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
        };
    },

    _fetchChunkSequence: function( refname, chunkNum ) {

        var resource = this.openResource(
            TextResource,
            this.getConf('chunks'),
            { templateVars: this._chunkURLVars( refname, chunkNum ) }
        );

        return resource.readAll()
            .then( undefined,
                   function( e ) {
                       if( e.response.status == 404 )
                           return '';
                       throw e;
                   }
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

    _fetchRefSeqsJson: function() {
        return this._refSeqsInfo || function() {
            var thisB = this;
            var resource = this.openResource( JSONResource, this.getConf('refSeqs') );
            return this._refSeqsInfo = resource.readAll()
                .then( function( refseqs ) {
                           var refsByName = {};
                           for( var i = 0; i<refseqs.length; i++ ) {
                               refsByName[ thisB.browser.regularizeReferenceName( refseqs[i].name ) ] = refseqs[i];
                           }
                           return refsByName;
                       });
        }.call(this);
    },

    _makeReferenceFeature: function( data ) {
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

    getReferenceFeatures: function( query ) {
        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            return thisB._fetchRefSeqsJson()
                        .then( function( refSeqs ) {
                                   var name = query.name || query.seq_id;
                                   if( name ) {
                                       name = thisB.browser.regularizeReferenceName( name);
                                       generator.emit( refSeqs[ name ] = thisB._makeReferenceFeature( refSeqs[name] ) );
                                   } else {
                                       var limit = query.limit || Infinity;
                                       for( var n in refSeqs ) {
                                           generator.emit( refSeqs[n] = thisB._makeReferenceFeature( refSeqs[n] ) );
                                           if( ! --limit )
                                               break;
                                       }
                                   }
                               });
        });
    }

});
});