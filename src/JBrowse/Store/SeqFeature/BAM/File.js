define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/Errors',
            'JBrowse/Store/LRUCache',
            'JBrowse/Model/BAIIndex',
            'JBrowse/Model/CSIIndex',
            'JBrowse/Model/BGZip/BGZBlob',
            './Util',
            './LazyFeature'
        ],
        function(
            declare,
            array,
            has,
            Util,
            Errors,
            LRUCache,
            BAIIndex,
            CSIIndex,
            BGZBlob,
            BAMUtil,
            BAMFeature
        ) {

var BAM_MAGIC = 21840194;

var dlog = function(){ console.error.apply(console, arguments); };


var readInt   = BAMUtil.readInt;
var readVirtualOffset = BAMUtil.readVirtualOffset;

var BamFile = declare( null,


/**
 * @lends JBrowse.Store.SeqFeature.BAM.File
 */
{

    /**
     * Low-level BAM file reading code.
     *
     * Adapted by Robert Buels from bam.js in the Dalliance Genome
     * Explorer which is copyright Thomas Down 2006-2010
     * @constructs
     */
    constructor: function( args ) {
        this.store = args.store;
        this.data  = args.data;

        if(args.bai) {
            this.index = new BAIIndex({ blob: args.bai, browser: args.browser });
        } else if(args.csi) {
            this.index = new CSIIndex({ blob: new BGZBlob( args.csi ), browser: args.browser } );
        }

        this.chunkSizeLimit = args.chunkSizeLimit || 5000000;
    },

    init: function( args ) {
        var bam = this;
        var successCallback = args.success || function() {};
        var failCallback = args.failure || function(e) { console.error(e, e.stack); };

        this.index.load().then(function() {
            bam._readBAMheader( function() {
                successCallback();
            }, failCallback );
        }, failCallback);
    },



    _readBAMheader: function( successCallback, failCallback ) {
        var thisB = this;
        // We have the virtual offset of the first alignment
        // in the file.  Cannot completely determine how
        // much of the first part of the file to fetch to get just
        // up to that, since the file is compressed.  Thus, fetch
        // up to the start of the BGZF block that the first
        // alignment is in, plus 64KB, which should get us that whole
        // BGZF block, assuming BGZF blocks are no bigger than 64KB.
        thisB.data.read(
            0,
            thisB.index.minAlignmentVO ? thisB.index.minAlignmentVO.block + 65535 : null,
            function(r) {
                try {
                    var uncba;
                    try {
                        uncba = new Uint8Array( BAMUtil.unbgzf(r) );
                    } catch(e) {
                        throw new Error( "Could not uncompress BAM data. Is it compressed correctly?" );
                    }

                    if( readInt(uncba, 0) != BAM_MAGIC)
                        throw new Error('Not a BAM file');

                    var headLen = readInt(uncba, 4);

                    thisB._readRefSeqs( headLen+8, 65536*4, successCallback, failCallback );
                } catch(e) {
                    dlog( ''+e );
                    failCallback( ''+e );
                }
            },
            failCallback
        );
    },

    _readRefSeqs: function( start, refSeqBytes, successCallback, failCallback ) {
        var thisB = this;
        // have to do another request, because sometimes
        // minAlignment VO is just flat wrong.
        // if headLen is not too big, this will just be in the
        // RemoteBinaryFile cache
        thisB.data.read( 0, start+refSeqBytes,
                         function(r) {
            var unc = BAMUtil.unbgzf(r);
            var uncba = new Uint8Array(unc);

            var nRef = readInt(uncba, start );
            var p = start + 4;

            thisB.chrToIndex = {};
            thisB.indexToChr = [];
            for (var i = 0; i < nRef; ++i) {
                var lName = readInt(uncba, p);
                var name = '';
                for (var j = 0; j < lName-1; ++j) {
                    name += String.fromCharCode(uncba[p + 4 + j]);
                }

                var lRef = readInt(uncba, p + lName + 4);
                //console.log(name + ': ' + lRef);
                thisB.chrToIndex[ thisB.store.browser.regularizeReferenceName( name ) ] = i;
                thisB.indexToChr.push({ name: name, length: lRef });

                p = p + 8 + lName;
                if( p > uncba.length ) {
                    // we've gotten to the end of the data without
                    // finishing reading the ref seqs, need to fetch a
                    // bigger chunk and try again.  :-(
                    refSeqBytes *= 2;
                    console.warn( 'BAM header is very big.  Re-fetching '+refSeqBytes+' bytes.' );
                    thisB._readRefSeqs( start, refSeqBytes, successCallback, failCallback );
                    return;
                }
            }

            successCallback();

        }, failCallback );
    },



    fetch: function(chr, min, max, featCallback, endCallback, errorCallback ) {

        chr = this.store.browser.regularizeReferenceName( chr );

        var chrId = this.chrToIndex && this.chrToIndex[chr];
        var chunks;
        if( !( chrId >= 0 ) ) {
            chunks = [];
        } else {
            chunks = this.index.blocksForRange(chrId, min, max, true);
            if (!chunks) {
                errorCallback( new Errors.Fatal('Error in index fetch') );
            }
        }

        // toString function is used by the cache for making cache keys
        chunks.toString = function() {
            return this.join(', ');
        };


        try {
            this._fetchChunkFeatures(
                chunks,
                chrId,
                min,
                max,
                featCallback,
                endCallback,
                errorCallback
            );
        } catch( e ) {
            errorCallback( e );
        }
    },

    _fetchChunkFeatures: function( chunks, chrId, min, max, featCallback, endCallback, errorCallback ) {
        var thisB = this;

        if( ! chunks.length ) {
            endCallback();
            return;
        }

        var chunksProcessed = 0;

        var cache = this.featureCache = this.featureCache || new LRUCache({
            name: 'bamFeatureCache',
            fillCallback: dojo.hitch( this, '_readChunk' ),
            sizeFunction: function( features ) {
                return features.length;
            },
            maxSize: 100000 // cache up to 100,000 BAM features
        });

        // check the chunks for any that are over the size limit.  if
        // any are, don't fetch any of them
        for( var i = 0; i<chunks.length; i++ ) {
            var size = chunks[i].fetchedSize();
            if( size > this.chunkSizeLimit ) {
                errorCallback( new Errors.DataOverflow('Too many BAM features. BAM chunk size '+Util.commifyNumber(size)+' bytes exceeds chunkSizeLimit of '+Util.commifyNumber(this.chunkSizeLimit)+'.' ) );
                return;
            }
        }

        var haveError;
        var pastStart;
        array.forEach( chunks, function( c ) {
            cache.get( c, function( f, e ) {
                if( e && !haveError )
                    errorCallback(e);
                if(( haveError = haveError || e )) {
                    return;
                }

                for( var i = 0; i<f.length; i++ ) {
                    var feature = f[i];
                    if( feature._refID == chrId ) {
                        // on the right ref seq
                        if( feature.get('start') > max ) // past end of range, can stop iterating
                            break;
                        else if( feature.get('end') >= min ) // must be in range
                            featCallback( feature );
                    }
                }
                if( ++chunksProcessed == chunks.length ) {
                    endCallback();
                }
            });
        });

    },

    _readChunk: function( chunk, callback ) {
        var thisB = this;
        var features = [];
        // console.log('chunk '+chunk+' size ',Util.humanReadableNumber(size));

        thisB.data.read( chunk.minv.block, chunk.fetchedSize(), function(r) {
            try {
                var data = BAMUtil.unbgzf(r, chunk.maxv.block - chunk.minv.block + 1);
                thisB.readBamFeatures( new Uint8Array(data), chunk.minv.offset, features, callback );
            } catch( e ) {
                callback( null, new Errors.Fatal(e) );
            }
        }, function( e ) {
            callback( null, new Errors.Fatal(e) );
        });
    },

    readBamFeatures: function(ba, blockStart, sink, callback ) {
        var that = this;
        var featureCount = 0;

        var maxFeaturesWithoutYielding = 300;

        while ( true ) {
            if( blockStart >= ba.length ) {
                // if we're done, call the callback and return
                callback( sink );
                return;
            }
            else if( featureCount <= maxFeaturesWithoutYielding ) {
                // if we've read no more than 200 features this cycle, read another one
                var blockSize = readInt(ba, blockStart);
                var blockEnd = blockStart + 4 + blockSize - 1;

                // only try to read the feature if we have all the bytes for it
                if( blockEnd < ba.length ) {
                    var feature = new BAMFeature({
                        store: this.store,
                        file: this,
                        bytes: { byteArray: ba, start: blockStart, end: blockEnd }
                     });
                    sink.push(feature);
                    featureCount++;
                }

                blockStart = blockEnd+1;
            }
            else {
                // if we're not done but we've read a good chunk of
                // features, put the rest of our work into a timeout to continue
                // later, avoiding blocking any UI stuff that's going on
                window.setTimeout( function() {
                    that.readBamFeatures( ba, blockStart, sink, callback );
                }, 1);
                return;
            }
        }
    }


});

return BamFile;

});
