define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/Deferred',
           'JBrowse/has',
           'JBrowse/Model/DataView',
           'JBrowse/Util',
           'JBrowse/Model/BGZip/VirtualOffset'
       ],
       function(
           declare,
           array,
           Deferred,
           has,
           jDataView,
           Util,
           VirtualOffset
       ) {

// inner class representing a chunk
var Chunk = Util.fastDeclare({
    constructor: function(minv,maxv,bin) {
        this.minv = minv;
        this.maxv = maxv;
        this.bin = bin;
    },
    toUniqueString: function() {
        return this.minv+'..'+this.maxv+' (bin '+this.bin+')';
    },
    toString: function() {
        return this.toUniqueString();
    },
    compareTo: function( b ) {
        return this.minv.compareTo(b.minv) || this.maxv.compareTo(b.maxv) || this.bin - b.bin;
    },
    compare: function( b ) {
        return this.compareTo( b );
    },
    fetchedSize: function() {
        return this.maxv.block + (1<<16) - this.minv.block + 1;
    }
});

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.blob = args.blob;
        this.load();
    },

    load: function() {
        var thisB = this;
        return this._loaded = this._loaded || function() {
            var d = new Deferred();
            if( ! has('typed-arrays') )
                d.reject( 'This web browser lacks support for JavaScript typed arrays.' );
            else
                this.blob.fetch( function( data) {
                                     thisB._parseIndex( data, d );
                                 }, dojo.hitch( d, 'reject' ) );
            return d;
        }.call(this);
    },

    // fetch and parse the index
    _parseIndex: function( bytes, deferred ) {

        this._littleEndian = true;
        var data = new jDataView( bytes, 0, undefined, this._littleEndian );

        // check TBI magic numbers
        if( data.getInt32() != 21582659 /* "CSI\1" */) {
            // try the other endianness if no magic
            this._littleEndian = false;
            data = new jDataView( bytes, 0, undefined, this._littleEndian );
            if( data.getInt32() != 21582659 /* "CSI\1" */) {
                console.error('Not a CSI file');
                deferred.reject('Not a CSI file');
                return;
            }
        }

        // number of reference sequences in the index
        this.minShift = data.getInt32();
        this.depth = data.getInt32();
        var l_aux = data.getInt32();


        var aux = data.getBytes( l_aux, undefined, false );
        var refCount = data.getInt32();


        // read sequence dictionary
        this._refIDToName = new Array( refCount );
        this._refNameToID = {};
//         var nameSectionLength = data.getInt32();
        //
        this._parseAux( aux );

        // read the per-reference-sequence indexes
        this._indices = new Array( refCount );
        for (var i = 0; i < refCount; ++i) {
            // the binning index
            var binCount = data.getInt32();
            var idx = this._indices[i] = { binIndex: {} };
            for (var j = 0; j < binCount; ++j) {
                var bin        = data.getInt32();
                var loffset = new VirtualOffset( data.getBytes(8) );
                var chunkCount = data.getInt32();
                var chunks = new Array( chunkCount );
                for (var k = 0; k < chunkCount; ++k) {
                    var u = new VirtualOffset( data.getBytes(8) );
                    var v = new VirtualOffset( data.getBytes(8) );
                    this._findFirstData( u );
                    chunks[k] = new Chunk( u, v, bin );
                }
                idx.binIndex[bin] = chunks;
            }
            // the linear index

        }
        deferred.resolve({ success: true });
    },

    _findFirstData: function( virtualOffset ) {
        var fdl = this.firstDataLine;
        this.firstDataLine = fdl ? fdl.compareTo( virtualOffset ) > 0 ? virtualOffset
                                                                      : fdl
                                 : virtualOffset;
    },

    _parseAux: function(aux) {
        var data = new jDataView(new Uint8Array(aux).buffer, 0, undefined,true);

        //var offset = 28;
//        var ret = data.getInt32();
        var ret = data.getInt32();
        this.columnNumbers = {
            ref:   data.getInt32(),
            start: data.getInt32(),
            end:   data.getInt32()
        };
        this.metaValue = data.getInt32();
        this.metaChar = this.metaValue ? String.fromCharCode( this.metaValue ) : null;
        this.skipLines = data.getInt32();
        var nameSectionLength = data.getInt32();

        this._parseNameBytes( data.getBytes( nameSectionLength, undefined, false ) );
    },


    _parseNameBytes: function( namesBytes ) {
        var offset = 0;

        function getChar() {
            var b = namesBytes[ offset++ ];
            return b ? String.fromCharCode( b ) : null;
        }

        function getString() {
            var c, s = '';
            while(( c = getChar() ))
                s += c;
            return s.length ? s : null;
        }

        var refName, refID = 0;
        for( ; refName = getString(); refID++ ) {
            this._refIDToName[refID] = refName;
            this._refNameToID[ this.browser.regularizeReferenceName( refName ) ] = refID;
        }
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
       var thisB = this;
       seqName = thisB.browser.regularizeReferenceName( seqName );
       thisB.load().then( function() {
           if( seqName in thisB._refNameToID ) {
               callback(true);
               return;
           }
           callback( false );
       });
   },

   getRefId: function( refName ) {
       refName = this.browser.regularizeReferenceName( refName );
       return this._refNameToID[refName];
   },

   TAD_LIDX_SHIFT: 14,

   blocksForRange: function( refName, beg, end ) {
       if( beg < 0 )
           beg = 0;

       var tid = this.getRefId( refName );
       var indexes = this._indices[tid];
       if( ! indexes )
           return [];

       var linearIndex = indexes.linearIndex,
            binIndex   = indexes.binIndex;

       var bins = this._reg2bins(beg, end, this.minShift, this.depth);
    // var linearCount = data.getInt32();
            // var linear = idx.linearIndex = new Array( linearCount );
            // for (var k = 0; k < linearCount; ++k) {
            //     linear[k] = new VirtualOffset( data.getBytes(8) );
            //     this._findFirstData( linear[k] );
            // }
       var min_off = new VirtualOffset( 0, 0 );

       var i, l, n_off = 0;
       for( i = 0; i < bins.length; ++i ) {
           n_off += ( binIndex[ bins[i] ] || [] ).length;
       }

       if( n_off == 0 )
           return [];

       var off = [];

       var chunks;
       for (i = n_off = 0; i < bins.length; ++i)
           if (( chunks = binIndex[ bins[i] ] ))
               for (var j = 0; j < chunks.length; ++j)
                   //if( min_off.compareTo( chunks[j].maxv ) < 0 )
                       off[n_off++] = new Chunk( chunks[j].minv, chunks[j].maxv, chunks[j].bin );

       if( ! off.length )
           return [];

       off = off.sort( function(a,b) {
                           return a.compareTo(b);
                       });

       // resolve completely contained adjacent blocks
       for (i = 1, l = 0; i < n_off; ++i) {
           if( off[l].maxv.compareTo( off[i].maxv ) < 0 ) {
               ++l;
               off[l].minv = off[i].minv;
               off[l].maxv = off[i].maxv;
           }
       }
       n_off = l + 1;

       // resolve overlaps between adjacent blocks; this may happen due to the merge in indexing
       for (i = 1; i < n_off; ++i)
           if ( off[i-1].maxv.compareTo(off[i].minv) >= 0 )
               off[i-1].maxv = off[i].minv;
       // merge adjacent blocks
       for (i = 1, l = 0; i < n_off; ++i) {
           if( off[l].maxv.block == off[i].minv.block )
               off[l].maxv = off[i].maxv;
           else {
               ++l;
               off[l].minv = off[i].minv;
               off[l].maxv = off[i].maxv;
           }
       }
       n_off = l + 1;

       return off.slice( 0, n_off );
   },

    /* calculate bin given an alignment covering [beg,end) (zero-based, half-close-half-open) */
    _reg2bin: function(beg, end, min_shift, depth) {
        let l, s = min_shift, t = ((1<<depth*3) - 1) / 7;
        for(--end, l = depth; l > 0; --l, s += 3, t -= 1<<l*3) {
            if (beg>>s == end>>s) return t + (beg>>s);
        }
        return 0;
    },
    _reg2bins: function(beg, end, min_shift, depth) {
        let bins = [];
        let l, t, n, s = min_shift + depth*3;
        for (--end, l = n = t = 0; l <= depth; s -= 3, t += 1<<l*3, ++l) {
            let b = t + (beg>>s), e = t + (end>>s), i;
            for (i = b; i <= e; ++i) bins[n++] = i;
        }
        return bins;
    }

});
});
