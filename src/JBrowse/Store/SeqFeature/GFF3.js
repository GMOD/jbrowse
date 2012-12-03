define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/_base/url',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Util',
            'JBrowse/Model/XHRBlob'
        ],
        function(
            declare,
            array,
            urlObj,
            SeqFeatureStore,
            DeferredFeaturesMixin,
            DeferredStatsMixin,
            Util,
            XHRBlob
        ) {

return declare([ SeqFeatureStore, DeferredFeaturesMixin, DeferredStatsMixin ],

 /**
  * @lends JBrowse.Store.SeqFeature.GFF3
  */
{

    constructor: function( args ) {

        this.data = args.blob || (function() {
            var url = Util.resolveUrl(
                args.baseUrl || '/',
                Util.fillTemplate( args.urlTemplate || 'data.bigwig',
                                   {'refseq': (this.refSeq||{}).name }
                                 )
            );
            return new XHRBlob( url );
        }).call(this);

        this.name = args.name || ( this.data.url && new urlObj( this.data.url ).path.replace(/^.+\//,'') ) || 'anonymous';

        this._initialLoad();
    },

    _initialLoad: function() {
        var that = this;

        // load and index the gff3 here using
        // this.data.slice(start,end).fetch( failCallback ) and/or
        // this.data.read( start, length, callback, failCallback )

        // should also calculate the feature density (avg features per
        // bp) and store it in:
        //       this._stats.featureDensity


        // when the store is ready to handle requests for stats and features, run:
        //    this._deferred.features.resolve({success: true});
        //    this._deferred.stats.resolve({success: true});
    },

    _getGlobalStats: function( successCallback, errorCallback ) {
        successCallback( this._stats || {} );
    },


    _getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        var chrName = query.ref;
        var min = query.start;
        var max = query.end;

        // call featureCallback( feature ) for every feature
        // and at the end, call endCallback
    }
});
});