define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Deferred',
            'dojo/_base/lang',
            'JBrowse/Store/SeqFeature',
            './BAM/Util',
            './BAM/File'
        ],
        function( declare, array, Deferred, lang, SeqFeatureStore, BAMUtil, BAMFile ) {

var readInt   = BAMUtil.readInt;
var readShort = BAMUtil.readShort;

var BAM_MAGIC = 21840194;
var BAI_MAGIC = 21578050;

var dlog = function(){ console.log.apply(console, arguments); };

var BAMStore = declare( SeqFeatureStore,
{
    constructor: function( args ) {
        this.bam = new BAMFile();
        this.bam.data = args.bam;
        this.bam.bai = args.bai;

        this._loading = new Deferred();
        if( args.callback )
            this._loading.then(
                function() { args.callback(bwg); },
                function() { args.callback(null, 'Loading failed!'); }
            );
        this._loading.then( dojo.hitch( this, function() {
                                            this._loading = null;
                                        }));
    },

    load: function() {
        var bam = this.bam;
        var bamFetched, baiFetched;
        bam.data.slice(0, 65536).fetch( dojo.hitch( this, function(r) {
            if (!r) {
                dlog("Couldn't access BAM");
                return;
            }

            var unc = BAMUtil.unbgzf(r);
            var uncba = new Uint8Array(unc);

            var magic = readInt(uncba, 0);
            var headLen = readInt(uncba, 4);
            var header = '';
            for (var i = 0; i < headLen; ++i) {
                header += String.fromCharCode(uncba[i + 8]);
            }

            var nRef = readInt(uncba, headLen + 8);
            var p = headLen + 12;

            bam.chrToIndex = {};
            bam.indexToChr = [];
            for (var i = 0; i < nRef; ++i) {
                var lName = readInt(uncba, p);
                var name = '';
                for (var j = 0; j < lName-1; ++j) {
                    name += String.fromCharCode(uncba[p + 4 + j]);
                }
                var lRef = readInt(uncba, p + lName + 4);
                // dlog(name + ': ' + lRef);
                bam.chrToIndex[name] = i;
                if (name.indexOf('chr') == 0) {
                    bam.chrToIndex[name.substring(3)] = i;
                } else {
                    bam.chrToIndex['chr' + name] = i;
                }
                bam.indexToChr.push(name);

                p = p + 8 + lName;
            }

            if( bam.indices ) {
                this.loadSuccess();
                return;
            }
        }));

        bam.bai.fetch( dojo.hitch( this, function(header) {   // Do we really need to fetch the whole thing? :-(
            if (!header) {
                dlog("Couldn't access BAI");
                this.loadFail();
                return;
            }

            var uncba = new Uint8Array(header);
            var baiMagic = readInt(uncba, 0);
            if (baiMagic != BAI_MAGIC) {
                dlog('Not a BAI file');
                this.loadFail();
                return;
            }

            var nref = readInt(uncba, 4);

            bam.indices = [];

            var p = 8;
            for (var ref = 0; ref < nref; ++ref) {
                var blockStart = p;
                var nbin = readInt(uncba, p); p += 4;
                for (var b = 0; b < nbin; ++b) {
                    var bin = readInt(uncba, p);
                    var nchnk = readInt(uncba, p+4);
                    p += 8 + (nchnk * 16);
                }
                var nintv = readInt(uncba, p); p += 4;
                p += (nintv * 8);
                if (nbin > 0) {
                    bam.indices[ref] = new Uint8Array(header, blockStart, p - blockStart);
                }
            }
            if( bam.chrToIndex ) {
                this.loadSuccess();
                return;
            }
        }));
    },

    loadSuccess: function() {
        this.inherited(arguments);
        this._loading.resolve({success: true });
    },

    loadFail: function() {
        this.inherited(arguments);
        this._loading.resolve({success: false });
    },

    whenReady: function() {
        var f = lang.hitch.apply(lang, arguments);
        if( this._loading ) {
            this._loading.then( f );
        } else {
            f();
        }
    },

    iterate: function( start, end, featCallback, endCallback ) {
        if( this._loading ) {
            this._loading.then( lang.hitch( this, 'iterate', start, end, featCallback, endCallback ) );
            return;
        }

        this.bam.fetch( this.refSeq.name, start, end, function(r, e) {
                if (r) {
                    array.forEach( r, function( r ) {
                        featCallback(r);
                    });
                }
                if (e) {
                    console.error( e );
                }
                endCallback();
            });
    }

});

return BAMStore;
});