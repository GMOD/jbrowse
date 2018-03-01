define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'JBrowse/Util',
            'JBrowse/Util/RejectableFastPromise',
            'dojo/promise/all',
            'JBrowse/Model/Range',
            'JBrowse/Model/SimpleFeature',
            'jszlib/inflate',
            'jszlib/arrayCopy'
        ],
        function(
            declare,
            dlang,
            array,
            Util,
            RejectableFastPromise,
            all,
            Range,
            SimpleFeature,
            inflate,
            arrayCopy
        ) {

var dlog = function(){ console.log.apply(console, arguments); };

var RequestWorker = declare( null,
 /**
  * @lends JBrowse.Store.BigWig.Window.RequestWorker.prototype
  */
 {

    BIG_WIG_TYPE_GRAPH: 1,
    BIG_WIG_TYPE_VSTEP: 2,
    BIG_WIG_TYPE_FSTEP: 3,

    /**
     * Worker object for reading data from a bigwig or bigbed file.
     * Manages the state necessary for traversing the index trees and
     * so forth.
     *
     * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
     * Explorer by Thomas Down.
     * @constructs
     */
    constructor: function( window, chr, min, max, callback, errorCallback ) {
        this.window = window;
        this.source = window.bwg.name || undefined;

        this.blocksToFetch = [];
        this.outstanding = 0;

        this.chr = chr;
        this.min = min;
        this.max = max;
        this.callback = callback;
        this.errorCallback = errorCallback || function(e) { console.error( e, e.stack, arguments.caller ); };
    },

    cirFobRecur: function(offset, level) {
        this.outstanding += offset.length;

        var maxCirBlockSpan = 4 +  (this.window.cirBlockSize * 32);   // Upper bound on size, based on a completely full leaf node.
        var spans;
        for (var i = 0; i < offset.length; ++i) {
            var blockSpan = new Range(offset[i], Math.min(offset[i] + maxCirBlockSpan, this.window.cirTreeOffset + this.window.cirTreeLength));
            spans = spans ? spans.union( blockSpan ) : blockSpan;
        }

        var fetchRanges = spans.ranges();
        //dlog('fetchRanges: ' + fetchRanges);
        for (var r = 0; r < fetchRanges.length; ++r) {
            var fr = fetchRanges[r];
            this.cirFobStartFetch(offset, fr, level);
        }
    },

    cirFobStartFetch: function(offset, fr, level, attempts) {
        var length = fr.max() - fr.min();
        // dlog('fetching ' + fr.min() + '-' + fr.max() + ' (' + Util.humanReadableNumber(length) + ')');
        //console.log('cirfobstartfetch');
        this.window.bwg._read( fr.min(), length, dlang.hitch( this,function(resultBuffer) {
                for (var i = 0; i < offset.length; ++i) {
                        if (fr.contains(offset[i])) {
                            this.cirFobRecur2(resultBuffer, offset[i] - fr.min(), level);
                            --this.outstanding;
                            if (this.outstanding == 0) {
                                this.cirCompleted();
                            }
                        }
                    }
             }), this.errorCallback );
    },

    cirFobRecur2: function(cirBlockData, offset, level) {
        var data = this.window.bwg.newDataView( cirBlockData, offset );

        var isLeaf = data.getUint8();
        var cnt = data.getUint16( 2 );
        //dlog('cir level=' + level + '; cnt=' + cnt);

        if (isLeaf != 0) {
            for (var i = 0; i < cnt; ++i) {
                var startChrom = data.getUint32();
                var startBase = data.getUint32();
                var endChrom = data.getUint32();
                var endBase = data.getUint32();
                var blockOffset = data.getUint64();
                var blockSize   = data.getUint64();
                if ((startChrom < this.chr || (startChrom == this.chr && startBase <= this.max)) &&
                    (endChrom   > this.chr || (endChrom == this.chr && endBase >= this.min)))
                {
                    // dlog('Got an interesting block: startBase=' + startBase + '; endBase=' + endBase + '; offset=' + blockOffset + '; size=' + blockSize);
                    this.blocksToFetch.push({offset: blockOffset, size: blockSize});
                }
            }
        } else {
            var recurOffsets = [];
            for (var i = 0; i < cnt; ++i) {
                var startChrom = data.getUint32();
                var startBase = data.getUint32();
                var endChrom = data.getUint32();
                var endBase = data.getUint32();
                var blockOffset = data.getUint64();
                if ((startChrom < this.chr || (startChrom == this.chr && startBase <= this.max)) &&
                    (endChrom   > this.chr || (endChrom == this.chr && endBase >= this.min)))
                {
                    recurOffsets.push(blockOffset);
                }
            }
            if (recurOffsets.length > 0) {
                this.cirFobRecur(recurOffsets, level + 1);
            }
        }
    },

    cirCompleted: function() {
        // merge contiguous blocks
        this.blockGroupsToFetch = this.groupBlocks( this.blocksToFetch );

        if (this.blockGroupsToFetch.length == 0) {
            this.callback([]);
        } else {
            this.features = [];
            this.readFeatures();
        }
    },


    groupBlocks: function( blocks ) {

        // sort the blocks by file offset
        blocks.sort(function(b0, b1) {
                        return (b0.offset|0) - (b1.offset|0);
                    });

        // group blocks that are within 2KB of eachother
        var blockGroups = [];
        var lastBlock;
        var lastBlockEnd;
        for( var i = 0; i<blocks.length; i++ ) {
            if( lastBlock && (blocks[i].offset-lastBlockEnd) <= 2000 ) {
                lastBlock.size += blocks[i].size - lastBlockEnd + blocks[i].offset;
                lastBlock.blocks.push( blocks[i] );
            }
            else {
                blockGroups.push( lastBlock = { blocks: [blocks[i]], size: blocks[i].size, offset: blocks[i].offset } );
            }
            lastBlockEnd = lastBlock.offset + lastBlock.size;
        }

        return blockGroups;
    },

    createFeature: function(fmin, fmax, opts) {
        // dlog('createFeature(' + fmin +', ' + fmax + ', '+opts.score+')');

        var data = {
            start: fmin,
            end: fmax
        };

        for( var k in opts )
            data[k] = opts[k];

        var id = data.id;
        delete data.id;

        var f = new SimpleFeature({
            data: data,
            id: id
        });

        this.features.push(f);
    },

    maybeCreateFeature: function(fmin, fmax, opts) {
        if (fmin <= this.max && fmax >= this.min) {
            this.createFeature( fmin, fmax, opts );
        }
    },

    parseSummaryBlock: function( bytes, startOffset ) {
        var data = this.window.bwg.newDataView( bytes, startOffset );

        var itemCount = bytes.byteLength/32;
        for (var i = 0; i < itemCount; ++i) {
            var chromId =   data.getInt32();
            var start =     data.getInt32();
            var end =       data.getInt32();
            var validCnt =  data.getInt32()||1;
            var minVal    = data.getFloat32();
            var maxVal    = data.getFloat32();
            var sumData   = data.getFloat32();
            var sumSqData = data.getFloat32();

            if (chromId == this.chr) {
                var summaryOpts = {score: sumData/validCnt,maxScore: maxVal,minScore:minVal};
                if (this.window.bwg.type == 'bigbed') {
                    summaryOpts.type = 'density';
                }
                this.maybeCreateFeature( start, end, summaryOpts);
            }
        }
    },

    parseBigWigBlock: function( bytes, startOffset ) {
        var data = this.window.bwg.newDataView( bytes, startOffset );

        var itemSpan = data.getUint32( 16 );
        var blockType = data.getUint8( 20 );
        var itemCount = data.getUint16( 22 );

        // dlog('processing bigwig block, type=' + blockType + '; count=' + itemCount);

        if (blockType == this.BIG_WIG_TYPE_FSTEP) {
            var blockStart = data.getInt32( 4 );
            var itemStep = data.getUint32( 12 );
            for (var i = 0; i < itemCount; ++i) {
                var score = data.getFloat32( 4*i+24 );
                this.maybeCreateFeature( blockStart + (i*itemStep), blockStart + (i*itemStep) + itemSpan, {score: score});
            }
        } else if (blockType == this.BIG_WIG_TYPE_VSTEP) {
            for (var i = 0; i < itemCount; ++i) {
                var start = data.getInt32( 8*i+24 );
                var score = data.getFloat32();
                this.maybeCreateFeature( start, start + itemSpan, {score: score});
            }
        } else if (blockType == this.BIG_WIG_TYPE_GRAPH) {
            for (var i = 0; i < itemCount; ++i) {
                var start = data.getInt32( 12*i + 24 );
                var end   = data.getInt32();
                var score = data.getFloat32();
                if (start > end) {
                    start = end;
                }
                this.maybeCreateFeature( start, end, {score: score});
            }
        } else {
            dlog('Currently not handling bwgType=' + blockType);
        }
    },

    parseBigBedBlock: function( bytes, startOffset ) {
        var data = this.window.bwg.newDataView( bytes, startOffset );

        var offset = 0;
        while (offset < bytes.byteLength) {
            var chromId = data.getUint32( offset );
            var start = data.getInt32( offset+4 );
            var end = data.getInt32( offset+8 );
            offset += 12;
            var rest = '';
            while( offset < bytes.byteLength ) {
                var ch = data.getUint8( offset++ );
                if (ch != 0) {
                    rest += String.fromCharCode(ch);
                } else {
                    break;
                }
            }

            var featureOpts = {};

            var bedColumns = rest.split('\t');
            if (bedColumns.length > 0) {
                featureOpts.name = bedColumns[0];
            }
            if (bedColumns.length > 1) {
                featureOpts.score = parseInt( bedColumns[1] );
            }
            if (bedColumns.length > 2) {
                featureOpts.strand = bedColumns[2];
            }
            if (bedColumns.length > 5) {
                var color = bedColumns[5];
                if (this.window.BED_COLOR_REGEXP.test(color)) {
                    featureOpts.override_color = 'rgb(' + color + ')';
                }
            }

            if (bedColumns.length < 9) {
                if (chromId == this.chr) {
                    this.maybeCreateFeature( start, end, featureOpts);
                }
            } else if (chromId == this.chr && start <= this.max && end >= this.min) {
                // Complex-BED?
                // FIXME this is currently a bit of a hack to do Clever Things with ensGene.bb
                var auto = this.window.autoSql;
                for(var i = 0; i < auto.fields.length-3; i++) {
                    if(bedColumns[i] != '-') {
                        featureOpts[auto.fields[i+3].name] = bedColumns[i];
                    }
                }
                delete featureOpts.blockCount;
                delete featureOpts.blockSizes;
                delete featureOpts.thickStart;
                delete featureOpts.thickEnd;
                delete featureOpts.reserved;
                delete featureOpts.chromStarts;
                delete featureOpts.override_color;

                var thickStart = bedColumns[3] | 0;
                var thickEnd  = bedColumns[4] | 0;
                var blockCount = bedColumns[6] | 0;
                var blockSizes = bedColumns[7].split(',');
                var blockStarts = bedColumns[8].split(',');


                var grp = dojo.mixin(featureOpts, {
                    id: bedColumns[0] + '_' + chromId + '_' + start + '_' + end,
                    type: 'mRNA',
                    strand: {'-': -1, '+': 1}[featureOpts.strand],
                    subfeatures: []
                });

                var ts = new Range(thickStart, thickEnd);

                for (var b = 0; b < blockCount; ++b) {
                    var bmin = (blockStarts[b]|0) + start;
                    var bmax = bmin + (blockSizes[b]|0);
                    grp.subfeatures.push({ start: bmin, end: bmax, type: 'exon' });

                    var span = new Range(bmin, bmax);
                    var tl = ts.intersection(span);
                    if(tl) {
                        grp.subfeatures.push({ start: tl.min(), end: tl.max(), type: 'CDS' });
                    }
                }

                this.createFeature(start, end, grp)
            }
        }
    },

    readFeatures: function() {
        var thisB = this;
        var blockFetches = array.map( thisB.blockGroupsToFetch, function( blockGroup ) {
            //console.log( 'fetching blockgroup with '+blockGroup.blocks.length+' blocks: '+blockGroup );
            var d = new RejectableFastPromise();
            thisB.window.bwg._read( blockGroup.offset, blockGroup.size, function( data ) {
                            blockGroup.data = data;
                            d.resolve( blockGroup );
                        }, dlang.hitch( d, 'reject' ) );
            return d;
        }, thisB );

        all( blockFetches ).then( function( blockGroups ) {
            array.forEach( blockGroups, function( blockGroup ) {
                array.forEach( blockGroup.blocks, function( block ) {
                                   var data;
                                   var offset = block.offset - blockGroup.offset;
                                   if( thisB.window.bwg.uncompressBufSize > 0 ) {
                                       // var beforeInf = new Date();
                                       data = inflate( blockGroup.data, offset+2, block.size - 2);
                                       offset = 0;
                                       //console.log( 'inflate', 2, block.size - 2);
                                       // var afterInf = new Date();
                                       // dlog('inflate: ' + (afterInf - beforeInf) + 'ms');
                                   } else {
                                       data = blockGroup.data;
                                   }

                                   if( thisB.window.isSummary ) {
                                       thisB.parseSummaryBlock( data, offset );
                                   } else if (thisB.window.bwg.type == 'bigwig') {
                                       thisB.parseBigWigBlock( data, offset );
                                   } else if (thisB.window.bwg.type == 'bigbed') {
                                       thisB.parseBigBedBlock( data, offset );
                                   } else {
                                       dlog("Don't know what to do with " + thisB.window.bwg.type);
                                   }
                });
            });

            thisB.callback( thisB.features );
       }, thisB.errorCallback );
    }
});

return RequestWorker;

});
