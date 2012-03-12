/**
 * Implementation of SeqFeatureStore using using nested containment
 * lists held in static files that are lazily fetched from the web
 * server.
 *
 * @class
 * @augments SeqFeatureStore
 */

var SeqFeatureStore;

SeqFeatureStore.NCList = function(args) {
    SeqFeatureStore.call( this, args );

    this.nclist = new NCList();

    this.baseUrl = args.baseUrl;
    this.urlTemplates = { tracklist: args.urlTemplate };
    this.refSeq = args.refSeq;
};

SeqFeatureStore.NCList.prototype = new SeqFeatureStore();

SeqFeatureStore.NCList.prototype.load = function() {
    var that = this,
         url = Util.resolveUrl(
                   this.baseUrl,
                   Util.fillTemplate( this.urlTemplates.tracklist,
                                      {'refseq': this.refSeq.name}
                                    )
               );
    // fetch the trackList
    dojo.xhrGet({ url: url,
                  handleAs: "json",
                  load:  function(o) { that.loadSuccess(o, url); },
                  error: function(o) { that.loadFail(o, url);    }
	        });
};

SeqFeatureStore.NCList.prototype.loadSuccess = function( trackInfo, url ) {

    this.count = trackInfo.featureCount;
    // average feature density per base
    this.density = trackInfo.featureCount / this.refSeq.length;

    this.attrs = new ArrayRepr(trackInfo.intervals.classes);
    this.nclist.importExisting( trackInfo.intervals.nclist,
                                this.attrs,
                                url,
                                trackInfo.intervals.urlTemplate,
                                trackInfo.intervals.lazyClass
                              );

    if (trackInfo.histograms) {
        this.histograms = trackInfo.histograms;
        for (var i = 0; i < this.histograms.meta.length; i++) {
            this.histograms.meta[i].lazyArray =
                new LazyArray(this.histograms.meta[i].arrayParams, url);
        }
    }
};

SeqFeatureStore.NCList.prototype.loadFail = function(trackInfo,url) {
    this.empty = true;
    this.setLoaded();
};

// just forward histogram() and iterate() to our encapsulate nclist
SeqFeatureStore.NCList.prototype.histogram = function() {
    return this.nclist.histogram.apply( this.nclist, arguments );
};

SeqFeatureStore.NCList.prototype.iterate = function( startBase, endBase, origFeatCallback, finishCallback ) {
    var that = this;
    var accessors    = this.attrs.accessors(),
        /** @inner */
        featCallBack = function( feature, path ) {
            that._add_getters( accessors.get, feature );
            return origFeatCallback( feature, path );
        };

    return this.nclist.iterate.call( this.nclist, startBase, endBase, featCallBack, finishCallback );
};

// helper method to recursively add a .get method to a feature and its
// subfeatures
SeqFeatureStore.NCList.prototype._add_getters = function(getter,feature) {
    var that = this;
    feature.get = getter;
    dojo.forEach( feature.get('subfeatures'), function(f) { that._add_getters( getter, f ); } );
};

