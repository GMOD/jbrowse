define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/Util/DeferredGenerator',
            'JBrowse/Store',
	    'JBrowse/Util',
            'JBrowse/Store/LRUCache'
        ],
        function(
            declare,
            lang,
            DeferredGenerator,
            Store,
	    Util,
            LRUCache
        ) {

/**
 * Base class for JBrowse data backends that hold sequences and
 * features.
 *
 * @class JBrowse.SeqFeatureStore
 * @extends JBrowse.Store
 * @constructor
 */
return declare( Store,
{

    constructor: function( args ) {
        this.globalStats = {};
        this._dataHub = args.dataHub || args.store && args.store._dataHub;
        if( ! this._dataHub ) throw new Error('dataHub arg required');
    },

    deflate: function() {
        return {
            dataHub: 'FAKE',
            config: this.exportMergedConfig(),
            app: '$context.app',
            $class: this.getConf('type')
        };
    },

    configSchema: {
        slots: [
            { name: 'name', type: 'string',
              defaultValue: function(store) {
                  return 'Store '+store.serialNumber;
              }
            },
            { name: 'type', type: 'string', description: "optional JS path of this store's class" }
        ]
    },

    openResource: function( class_, resource, opts ) {
        return this.browser.openResource( class_, this.resolveUrl( resource, (opts||{}).templateVars ) );
    },

    /**
     * Fetch statistics about the features in a specific region.
     *
     * @param {String} query.ref    the name of the reference sequence
     * @param {Number} query.start  start of the region in interbase coordinates
     * @param {Number} query.end    end of the region in interbase coordinates
     */
    getRegionStats: function( query, successCallback, errorCallback ) {
        if( successCallback ) throw new Error('getRegionStats no longer takes callback arguments');

        return this._getRegionStats.apply( this, arguments );
    },

    _getRegionStats: function( query ) {
        var thisB = this;
        var cache = thisB._regionStatsCache || ( thisB._regionStatsCache = new LRUCache({
            name: 'regionStatsCache',
            maxSize: 1000, // cache stats for up to 1000 different regions
            sizeFunction: function( stats ) { return 1; },
            deferredFillCallback: function( query ) {
			//console.log( '_getRegionStats', query );
                var s = {
                    scoreMax: -Infinity,
                    scoreMin: Infinity,
                    scoreSum: 0,
                    scoreSumSquares: 0,
                    basesCovered: query.end - query.start,
                    featureCount: 0
                };
                return thisB.getFeatures( query )
                    .forEach(
                        function( feature ) {
                            var score = feature.get('score') || 0;
                            s.scoreMax = Math.max( score, s.scoreMax );
                            s.scoreMin = Math.min( score, s.scoreMin );
                            s.scoreSum += score;
                            s.scoreSumSquares += score*score;
                            s.featureCount++;
                        },
                        function() {
                            s.scoreMean = s.featureCount ? s.scoreSum / s.featureCount : 0;
                            s.scoreStdDev = Util.calcStdDevFromSums( s.scoreSum, s.scoreSumSquares, s.featureCount );
                            s.featureDensity = s.featureCount / s.basesCovered;
                            //console.log( '_getRegionStats done', s );
                            return s;
                        }
                    );
            }
         }));

         return cache.getD( query );
    },

    /**
     * Fetch feature data from this store.
     *
     * @param {String} query.ref    the name of the reference sequence
     * @param {Number} query.start  start of the region in interbase coordinates
     * @param {Number} query.end    end of the region in interbase coordinates
     * @param {Function} featureCallback(feature) callback that is called once
     *   for each feature in the region of interest, with a single
     *   argument; the feature.
     * @param {Function} endCallback() callback that is called once
     *   for each feature in the region of interest, with a single
     *   argument; the feature.
     * @param {Function} errorCallback(error) in the event of an error, this
     *   callback will be called with one argument, which is anything
     *   that can stringify to an error message.
     */
    getFeatures: function( query ) {
        throw new Error('getFeatures is abstract');
    }

});
});