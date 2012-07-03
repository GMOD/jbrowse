define( [
            'dojo/_base/declare',
            'JBrowse/Store/BigWig/Window'
        ],
        function( declare, Window, FileBlob, XHRBlob ) {
return declare( null,
 /**
  * @lends JBrowse.Store.BigWig
  */
{

    BIG_WIG_MAGIC: -2003829722,
    BIG_BED_MAGIC: -2021002517,

    BIG_WIG_TYPE_GRAPH: 1,
    BIG_WIG_TYPE_VSTEP: 2,
    BIG_WIG_TYPE_FSTEP: 3,

    /**
     * Data backend for reading wiggle data from BigWig or BigBed files.
     *
     * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
     * Explorer which is copyright Thomas Down 2006-2010
     * @constructs
     */
    constructor: function( args ) {
        var data = args.blob;
        var callback = args.callback || function(){};
        var name = args.name || 'anonymous';

        var bwg = this;
        bwg.data = data;
        bwg.name = name;
        bwg.data.slice(0, 512).fetch(function(result) {
            if (!result) {
                callback(null, "Couldn't fetch file");
            }

            var header = result;
            var sa = new Int16Array(header);
            var la = new Int32Array(header);
            if (la[0] == bwg.BIG_WIG_MAGIC) {
                bwg.type = 'bigwig';
            } else if (la[0] == bwg.BIG_BED_MAGIC) {
                bwg.type = 'bigbed';
            } else {
                callback(null, "Not a supported format");
            }
            //        dlog('magic okay');

            bwg.version = sa[2];             // 4
            bwg.numZoomLevels = sa[3];       // 6
            bwg.chromTreeOffset = (la[2] << 32) | (la[3]);     // 8
            bwg.unzoomedDataOffset = (la[4] << 32) | (la[5]);  // 16
            bwg.unzoomedIndexOffset = (la[6] << 32) | (la[7]); // 24
            bwg.fieldCount = sa[16];         // 32
            bwg.definedFieldCount = sa[17];  // 34
            bwg.asOffset = (la[9] << 32) | (la[10]);    // 36 (unaligned longlong)
            bwg.totalSummaryOffset = (la[11] << 32) | (la[12]);    // 44 (unaligned longlong)
            bwg.uncompressBufSize = la[13];  // 52

            // dlog('bigType: ' + bwg.type);
            // dlog('chromTree at: ' + bwg.chromTreeOffset);
            // dlog('uncompress: ' + bwg.uncompressBufSize);
            // dlog('data at: ' + bwg.unzoomedDataOffset);
            // dlog('index at: ' + bwg.unzoomedIndexOffset);
            // dlog('field count: ' + bwg.fieldCount);
            // dlog('defined count: ' + bwg.definedFieldCount);

            bwg.zoomLevels = [];
            for (var zl = 0; zl < bwg.numZoomLevels; ++zl) {
                var zlReduction = la[zl*6 + 16];
                var zlData = (la[zl*6 + 18]<<32)|(la[zl*6 + 19]);
                var zlIndex = (la[zl*6 + 20]<<32)|(la[zl*6 + 21]);
                //          dlog('zoom(' + zl + '): reduction=' + zlReduction + '; data=' + zlData + '; index=' + zlIndex);
                bwg.zoomLevels.push({reduction: zlReduction, dataOffset: zlData, indexOffset: zlIndex});
            }

            bwg._readChromTree(function() {
                                  return callback(bwg);
                              });
        });
    },

    /**
     * @private
     */
    _readChromTree: function(callback) {
        var thisB = this;
        this.chromsToIDs = {};
        this.idsToChroms = {};

        var udo = this.unzoomedDataOffset;
        while ((udo % 4) != 0) {
            ++udo;
        }

        this.data.slice( this.chromTreeOffset, udo - this.chromTreeOffset )
            .fetch(function(bpt) {
                       var ba = new Uint8Array(bpt);
                       var sa = new Int16Array(bpt);
                       var la = new Int32Array(bpt);
                       var bptMagic = la[0];
                       var blockSize = la[1];
                       var keySize = la[2];
                       var valSize = la[3];
                       var itemCount = (la[4] << 32) | (la[5]);
                       var rootNodeOffset = 32;

                       // dlog('blockSize=' + blockSize + '    keySize=' + keySize + '   valSize=' + valSize + '    itemCount=' + itemCount);

                       var bptReadNode = function(offset) {
                           var nodeType = ba[offset];
                           var cnt = sa[(offset/2) + 1];
                           // dlog('ReadNode: ' + offset + '     type=' + nodeType + '   count=' + cnt);
                           offset += 4;
                           for (var n = 0; n < cnt; ++n) {
                               if (nodeType == 0) {
                                   offset += keySize;
                                   var childOffset = (la[offset/4] << 32) | (la[offset/4 + 1]);
                                   offset += 8;
                                   childOffset -= thisB.chromTreeOffset;
                                   bptReadNode(childOffset);
                               } else {
                                   var key = '';
                                   for (var ki = 0; ki < keySize; ++ki) {
                                       var charCode = ba[offset++];
                                       if (charCode != 0) {
                                           key += String.fromCharCode(charCode);
                                       }
                                   }
                                   var chromId = (ba[offset+3]<<24) | (ba[offset+2]<<16) | (ba[offset+1]<<8) | (ba[offset+0]);
                                   var chromSize = (ba[offset + 7]<<24) | (ba[offset+6]<<16) | (ba[offset+5]<<8) | (ba[offset+4]);
                                   offset += 8;

                                   // dlog(key + ':' + chromId + ',' + chromSize);
                                   thisB.chromsToIDs[key] = chromId;
                                   if (key.indexOf('chr') == 0) {
                                       thisB.chromsToIDs[key.substr(3)] = chromId;
                                   }
                                   thisB.idsToChroms[chromId] = key;
                               }
                           }
                       };
                       bptReadNode(rootNodeOffset);

                       callback(thisB);
                   });
    },

    readWigData: function(chrName, min, max, callback) {
        this.getUnzoomedView().readWigData(chrName, min, max, callback);
    },

    getUnzoomedView: function() {
        if (!this.unzoomedView) {
            var cirLen = 4000;
            var nzl = this.zoomLevels[0];
            if (nzl) {
                cirLen = this.zoomLevels[0].dataOffset - this.unzoomedIndexOffset;
            }
            this.unzoomedView = new Window( this, this.unzoomedIndexOffset, cirLen, false );
        }
        return this.unzoomedView;
    },

    getZoomedView: function(z) {
        var zh = this.zoomLevels[z];
        if (!zh.view) {
            zh.view = new Window( this, zh.indexOffset, this.zoomLevels[z + 1].dataOffset - zh.indexOffset, true );
        }
        return zh.view;
    }
});

});