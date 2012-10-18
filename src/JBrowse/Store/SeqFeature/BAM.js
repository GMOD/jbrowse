define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Deferred',
            'dojo/_base/lang',
            'JBrowse/Util',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Model/XHRBlob',
            './BAM/Util',
            './BAM/File',
            './BAM/Feature'
        ],
        function( declare, array, Deferred, lang, Util, SeqFeatureStore, XHRBlob, BAMUtil, BAMFile, BAMFeature ) {

var BAMStore = declare( SeqFeatureStore,

/**
 * @lends JBrowse.Store.SeqFeature.BAM
 */
{
    /**
     * Data backend for reading feature data directly from a
     * web-accessible BAM file.
     *
     * @constructs
     */
    constructor: function( args ) {
        this.bam = new BAMFile();

        this.bam.data = args.bam || (function() {
            var url = Util.resolveUrl(
                args.baseUrl || '/',
                Util.fillTemplate( args.urlTemplate || 'data.bam',
                                   {'refseq': (this.refSeq||{}).name }
                                 )
            );
            return new XHRBlob( url );
        }).call(this);

        this.bam.bai = args.bai || (function() {
            var url = Util.resolveUrl(
                args.baseUrl || '/',
                Util.fillTemplate( args.baiUrlTemplate || args.urlTemplate+'.bai' || 'data.bam.bai',
                                   {'refseq': (this.refSeq||{}).name }
                                 )
            );
            return new XHRBlob( url );
        }).call(this);

        this.source = this.bam.data.url ? this.bam.data.url.match( /\/([^/\#\?]+)($|[\#\?])/ )[1] : undefined;

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
        this.bam.init({
            success: dojo.hitch( this, '_estimateGlobalStats',
                                 dojo.hitch( this, 'loadSuccess' )),
            failure: dojo.hitch( this, 'loadFail' )
        });
    },

    /**
     * Fetch a region of the current reference sequence and use it to
     * estimate the feature density in the BAM file.
     * @private
     */
    _estimateGlobalStats: function( finishCallback ) {

        var statsFromInterval = function( refSeq, length, callback ) {
            var start = refSeq.start;
            var end = start+length;
            this.bam.fetch( refSeq.name, start, end, dojo.hitch( this, function( records, error) {
                if ( error ) {
                    console.error( error );
                    callback.call( this, length,  null, error );
                }
                else if( records ) {
                    records = array.filter( records, function(r) { return r.pos >= start && r.pos <= end; } );
                    callback.call( this, length,
                                   {
                                       featureDensity: records.length / length,
                                       _statsSampleRecords: records.length,
                                       _statsSampleInterval: length
                                   });
                }
            }));
        };

        var maybeRecordStats = function( interval, stats, error ) {
            if( stats._statsSampleRecords >= 300 || interval * 2 > this.refSeq.length || error ) {
                this.globalStats = stats;
                finishCallback();
            } else {
                statsFromInterval.call( this, this.refSeq, interval * 2, maybeRecordStats );
            }
        };

        statsFromInterval.call( this, this.refSeq, 200, maybeRecordStats );
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

        var bamStore = this;
        this.bam.fetch( this.refSeq.name, start, end, function( records, error) {
                if( records ) {
                    array.forEach( records, function( record ) {
                        // skip if this alignment does not actually overlap this range
                        var rEnd = record.lref ? record.pos + record.lref : record.seq ? record.pos + record.seq.length : undefined;
                        if (rEnd <= start || record.pos >= end )
                            return;

                        // make a new feature and return it, but only if the read is mapped
                        if( ! record.unmapped ) {
                            var feature = new BAMFeature({ store: bamStore, record: record });
                            featCallback( feature );
                        }
                    });
                }
                if ( error ) {
                    console.error( error );
                }
                endCallback();
            });
    }

});

return BAMStore;
});