define([
           'dojo/_base/declare',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Util',
           'JBrowse/Model/ArrayRepr',
           'JBrowse/Store/NCList',
           'JBrowse/Store/LazyArray'
       ],
       function( declare, SeqFeatureStore, DeferredFeaturesMixin, DeferredStatsMixin, Util, ArrayRepr, GenericNCList, LazyArray ) {

/**
 * Implementation of SeqFeatureStore using nested containment
 * lists held in static files that are lazily fetched from the web
 * server.
 *
 * @class JBrowse.Store.SeqFeature.NCList
 * @extends SeqFeatureStore
 */

var idfunc = function() { return this._uniqueID; };

return declare([ SeqFeatureStore, DeferredFeaturesMixin, DeferredStatsMixin ],
{
    constructor: function(args) {
        this.nclist = this.makeNCList();

        this.baseUrl = args.baseUrl;
        this.urlTemplates = { tracklist: args.urlTemplate };
        this.refSeq = args.refSeq;

        this._load();
    },

    makeNCList: function() {
        return new GenericNCList();
    },

    _load: function() {
        var url = Util.resolveUrl(
                       this.baseUrl,
                       Util.fillTemplate( this.urlTemplates.tracklist,
                                          {'refseq': this.refSeq.name}
                                        )
                   );
        // fetch the trackdata
        dojo.xhrGet({ url: url,
                      handleAs: "json",
                      failOk: true,
                      load:  Util.debugHandler( this, function(o) { this.loadSuccess(o, url); }),
                      error: dojo.hitch( this, function(error) {
                                             if( error.status != 404 )
                                                 console.error(''+error);
                                             this.loadFail(error, url);
                                         })
    	        });
    },

    loadSuccess: function( trackInfo, url ) {

        this.globalStats.featureCount = trackInfo.featureCount;
        // average feature density per base
        this.globalStats.featureDensity = trackInfo.featureCount / this.refSeq.length;

        this.loadNCList( trackInfo, url );

        if ( trackInfo.histograms && trackInfo.histograms.meta ) {
            this.histograms = trackInfo.histograms;
            for (var i = 0; i < this.histograms.meta.length; i++) {
                this.histograms.meta[i].lazyArray =
                    new LazyArray(this.histograms.meta[i].arrayParams, url);
            }
        }


        this._deferred.stats.resolve(    { success: true });
        this._deferred.features.resolve( { success: true });
    },

    loadNCList: function( trackInfo, url ) {
        this.attrs = new ArrayRepr(trackInfo.intervals.classes);
        this.nclist.importExisting( trackInfo.intervals.nclist,
                                    this.attrs,
                                    url,
                                    trackInfo.intervals.urlTemplate,
                                    trackInfo.intervals.lazyClass
                                  );
    },


    loadFail: function(trackInfo,url) {
        this.empty = true;
    },

    // just forward histogram() and iterate() to our encapsulate nclist
    histogram: function() {
        return this.nclist.histogram.apply( this.nclist, arguments );
    },

    _getFeatures: function( query, origFeatCallback, finishCallback, errorCallback ) {
        var that = this;
        var startBase  = query.start;
        var endBase    = query.end;
        var accessors  = this.attrs.accessors(),
            /** @inner */
            featCallBack = function( feature, path ) {
                // the unique ID is a stringification of the path in the
                // NCList where the feature lives; it's unique across the
                // top-level NCList (the top-level NCList covers a
                // track/chromosome combination)
                var uniqueID = path.join(",");
                that._decorate_feature( accessors, feature, uniqueID );
                return origFeatCallback( feature );
            };

        return this.nclist.iterate.call( this.nclist, startBase, endBase, featCallBack, finishCallback, errorCallback );
    },

    // helper method to recursively add .get and .tags methods to a feature and its
    // subfeatures
    _decorate_feature: function( accessors, feature, id ) {
        feature.get = accessors.get;
        feature.tags = accessors.tags;
        feature._uniqueID = id;
        feature.id = idfunc;
        dojo.forEach( feature.get('subfeatures'), function(f,i) {
            this._decorate_feature( accessors, f, id+'-'+i );
        },this);
    }
});
});

