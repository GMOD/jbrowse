define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',

           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/Names/Hash',
           'JBrowse/Util',
           'JBrowse/Util/DeferredGenerator',
           'JBrowse/Model/ArrayRepr',
           'JBrowse/Model/Resource/JSON',
           'JBrowse/Store/NCList',
           'JBrowse/Store/LazyArray'
       ],
       function(
           declare,
           lang,
           Deferred,

           SeqFeatureStore,
           NamesHashStore,
           Util,
           DeferredGenerator,
           ArrayRepr,
           JSONResource,
           GenericNCList,
           LazyArray
       ) {

/**
 * Implementation of SeqFeatureStore using nested containment
 * lists held in static files that are lazily fetched from the web
 * server.
 *
 * @class JBrowse.Store.SeqFeature.NCList
 * @extends SeqFeatureStore
 */

var idfunc = function() { return this._uniqueID; };
var parentfunc = function() { return this._parent; };
var childrenfunc = function() { return this.get('subfeatures'); };

return declare( SeqFeatureStore,
{
    configSchema: {
        slots: [
            { name: 'url', type: 'string',
              description: 'url of the NCList directory',
              required: true
            },
            { name: 'nameUrl', type: 'string',
              defaultValue: function(b) {
                  return b.getConf('url')+'/names/root.json';
              }
            },
            { name: 'names', type: 'object', defaultValue: {} }
        ]
    },

    constructor: function(args) {
        this._roots = {};
    },

    makeNCList: function() {
        return new GenericNCList({ transportManager: this.browser });
    },

    loadNCList: function( refData, trackInfo, url ) {
        refData.nclist.importExisting( trackInfo.intervals.nclist,
                                       refData.attrs,
                                       url,
                                       trackInfo.intervals.urlTemplate,
                                       trackInfo.intervals.lazyClass
                                     );
    },

    getDataRoot: function( query ) {
        var url = this.getConf('url');
        if( url.charAt( url.length-1 ) !== '/' )
            url += '/';
        url = this.resolveUrl(
            url+'{refseq}/trackData.json',
            lang.mixin( { refseq: query.ref }, query )
        );

        var thisB = this;
        return this._roots[url] || ( this._roots[url] = function() {
            return thisB.openResource( JSONResource, url )
                       .readAll()
                       .then( function( trackInfo, request ) {
                                  return thisB._parseTrackInfo( trackInfo, url );
                              },
                      function(error) {
                          if( error.response && error.response.status == 404 )
                              return thisB._parseTrackInfo( {}, url );
                          else if( error.response && error.response.status != 200)
                              throw "Server returned an HTTP " + error.response.status + " error";
                          else
                              throw error;
                      }
                    );
        }.call() );
    },

    _parseTrackInfo: function( trackInfo, url ) {
        var refData = {
            nclist: this.makeNCList()
        };

        refData.stats = {
            featureCount: trackInfo.featureCount || 0
        };
        if( 'featureDensity' in trackInfo )
             refData.stats.featureDensity = trackInfo.featureDensity;

        refData.empty = !trackInfo.featureCount;

        if( trackInfo.intervals ) {
            refData.attrs = new ArrayRepr( trackInfo.intervals.classes );
            this.loadNCList( refData, trackInfo, url );
        }

        var histograms = trackInfo.histograms;
        if( histograms && histograms.meta ) {
            for (var i = 0; i < histograms.meta.length; i++) {
                histograms.meta[i].lazyArray =
                    new LazyArray( histograms.meta[i].arrayParams, url );
            }
            refData._histograms = histograms;
        }

        return refData;
    },

    /**
     * Load our name index.
     */
    _loadNames: function() {
        var conf = lang.mixin( {}, this.getConf('names') );
        if( ! conf.url )
            conf.url = this.getConf('nameUrl');

        if( conf.baseUrl )
            conf.url = Util.resolveUrl( conf.baseUrl, conf.url );

        this.nameStore = new NamesHashStore( dojo.mixin({ browser: this }, conf) );
    },

    getRegionStats: function( query ) {
        return this.getDataRoot( query )
            .then( function( data ) {
                       return data.stats;
                   });
    },

    getRegionFeatureDensities: function( query ) {
        return this.getDataRoot( query )
            .then( function( data ) {
                var numBins = query.numBins || 25;
                if( ! query.basesPerBin )
                    throw 'basesPerBin arg required for getRegionFeatureDensities';

                // pick the relevant entry in our pre-calculated stats
                var statEntry = (function( basesPerBin, stats ) {
                    for (var i = 0; i < stats.length; i++) {
                        if( stats[i].basesPerBin >= basesPerBin ) {
                            return stats[i];
                            break;
                        }
                    }
                    return undefined;
                })( query.basesPerBin, data._histograms.stats || [] );

                if( ! data._histograms ) {
                    return { bins: [], stats: {} };
                }

                // The histogramMeta array describes multiple levels of histogram detail,
                // going from the finest (smallest number of bases per bin) to the
                // coarsest (largest number of bases per bin).
                // We want to use coarsest histogramMeta that's at least as fine as the
                // one we're currently rendering.
                // TODO: take into account that the histogramMeta chosen here might not
                // fit neatly into the current histogram (e.g., if the current histogram
                // is at 50,000 bases/bin, and we have server histograms at 20,000
                // and 2,000 bases/bin, then we should choose the 2,000 histogramMeta
                // rather than the 20,000)
                var histogramMeta = data._histograms.meta[0];
                for (var i = 0; i < data._histograms.meta.length; i++) {
                    if( query.basesPerBin >= data._histograms.meta[i].basesPerBin )
                        histogramMeta = data._histograms.meta[i];
                }

                // number of bins in the server-supplied histogram for each current bin
                var binCount = query.basesPerBin / histogramMeta.basesPerBin;

                // if the server-supplied histogram fits neatly into our requested
                var d = new Deferred();
                if ( binCount > .9
                     &&
                     Math.abs(binCount - Math.round(binCount)) < .0001
                   ) {
                       // we can use the server-supplied counts
                       var firstServerBin = Math.floor( query.start / histogramMeta.basesPerBin);
                       binCount = Math.round(binCount);
                       var histogram = [];
                       for (var bin = 0; bin < numBins; bin++)
                           histogram[bin] = 0;

                       histogramMeta.lazyArray.range(
                           firstServerBin,
                           firstServerBin + binCount*numBins,
                           function(i, val) {
                               // this will count features that span the boundaries of
                               // the original histogram multiple times, so it's not
                               // perfectly quantitative.  Hopefully it's still useful, though.
                               histogram[ Math.floor( (i - firstServerBin) / binCount ) ] += val;
                           },
                           function() {
                               d.resolve( { bins: histogram, stats: statEntry } );
                           }
                       );
                   } else {
                       //console.log('make own',query);
                       // make our own counts
                       data.nclist.histogram.call(
                           data.nclist,
                           query.start,
                           query.end,
                           numBins,
                           function( hist ) {
                               d.resolve( { bins: hist, stats: statEntry } );
                           });
                   }
                   return d;
               });
    },


    getFeatures: function( query ) {
        var thisB = this;
        return new DeferredGenerator( function( generator ) {
            thisB.getDataRoot( query )
                 .then( function( data ) {
                            if( data.empty ) {
                                generator.resolve();
                                return;
                            }

                            var startBase  = query.start;
                            var endBase    = query.end;
                            var accessors  = data.attrs.accessors();

                            data.nclist.iterate(
                                startBase, endBase,
                                function( feature, path ) {
                                    // the unique ID is a stringification of the path in the
                                    // NCList where the feature lives; it's unique across the
                                    // top-level NCList (the top-level NCList covers a
                                    // track/chromosome combination)

                                    // only need to decorate a feature once
                                    if( ! feature.decorated )  {
                                        var uniqueID = data.nclist.baseURL + '&p=' + path.join(",");
                                        thisB._decorate_feature( accessors, feature, uniqueID );
                                    }
                                    return  generator.emit( feature );
                                },
                                lang.hitch( generator, 'resolve' ),
                                lang.hitch( generator, 'reject' )
                            );
                        });
        });
    },

    // helper method to recursively add .get and .tags methods to a feature and its
    // subfeatures
    _decorate_feature: function( accessors, feature, id, parent ) {
        feature.get = accessors.get;
        // possibly include set method in decorations? not currently
        //    feature.set = accessors.set;
        feature.tags = accessors.tags;
        feature.deflate = accessors.deflate;
        feature._uniqueID = id;
        feature.id = idfunc;
        feature._parent  = parent;
        feature.parent   = parentfunc;
        feature.children = childrenfunc;
        dojo.forEach( feature.get('subfeatures'), function(f,i) {
            this._decorate_feature( accessors, f, id+'-'+i, feature );
        },this);
        feature.decorated = true;
    }
});
});

