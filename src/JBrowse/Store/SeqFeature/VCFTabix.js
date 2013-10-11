define([
           'dojo/_base/declare',
           'dojo/_base/lang',

           'JBrowse/Store/SeqFeature',
           'JBrowse/Util/DeferredGenerator',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/Resource/Bytes',
           'JBrowse/Model/Resource/BGZBytes',
           './VCFTabix/Parser'
       ],
       function(
           declare,
           lang,

           SeqFeatureStore,
           DeferredGenerator,
           TabixIndexedFile,
           GlobalStatsEstimationMixin,
           Bytes,
           BGZBytes,
           VCFParser
       ) {


// subclass the TabixIndexedFile to modify the parsed items a little
// bit so that the range filtering in TabixIndexedFile will work.  VCF
// files don't actually have an end coordinate, so we have to make it
// here.  also convert coordinates to interbase.
var VCFIndexedFile = declare( TabixIndexedFile, {
    parseLine: function() {
        var i = this.inherited( arguments );
        if( i ) {
            i.start--;
            i.end = i.start + i.fields[3].length;
        }
        return i;
    }
});

return declare( [ SeqFeatureStore, GlobalStatsEstimationMixin, VCFParser ],
{

    constructor: function( args ) {
        var thisB = this;

        this.indexedData = new VCFIndexedFile(
            {
                tbi:  this.openResource( BGZBytes, this.getConf('tbi') ),
                file: this.openResource( BGZBytes, this.getConf('vcf')),
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit
            });
    },

    configSchema: {
        slots: [
            { name: 'vcf', type: 'string', require: true },
            { name: 'tbi', type: 'string',
              defaultValue: function(store) {
                  return store.getConf('vcf')+'.tbi';
              }
            }
        ]
    },

    /** fetch and parse the VCF header lines */
    getVCFHeader: function() {
        var thisB = this;
        return this._parsedHeader || ( this._parsedHeader = function() {
            return thisB.indexedData.indexLoaded.then( function( index ) {
                var fetchLength = index.firstDataLine
                    ? index.firstDataLine.block + index.firstDataLine.offset - 1
                    : null;

                return thisB.indexedData.data.readRange( 0, fetchLength )
                            .then( function( bytes ) {
                                       return thisB.parseHeader( new Uint8Array( bytes ) );
                                   });
             });
        }.call(this));
    },

    getFeatures: function( query, featureCallback ) {
        if( featureCallback ) throw 'no callback args anymore!';

        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            return thisB.getVCFHeader()
                 .then( function() {
                            return thisB.indexedData.getLines(
                                query.ref,
                                query.start,
                                query.end
                            ).forEach(
                                function( line ) {
                                    generator.emit( thisB.lineToFeature( line ) );
                                }
                            );
                        }
                      );
        });
    },

    getRegionStats: function( query ) {
        return this._estimateGlobalStats( query.ref );
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     *
     * Implemented as a binary interrogation because some stores are
     * smart enough to regularize reference sequence names, while
     * others are not.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        return this.indexedData.index.hasRefSeq( seqName, callback, errorCallback );
    }

});
});