define( ['dojo/_base/declare',
         'JBrowse/Store/SeqFeature'
        ],
        function( declare, SeqFeatureStore ) {

return declare( SeqFeatureStore,
{
    constructor: function( args ) {
        this.features = {};
        this._calculateStats();
    },

    insert: function( feature ) {
        this.features[ feature.id() ] = feature;
        this._calculateStats();
    },

    delete: function( feature ) {
        delete this.features[ feature.id() ];
        this._calculateStats();
    },

    _calculateStats: function() {
        var minStart = Infinity;
        var maxEnd = -Infinity;
        var featureCount = 0;
        for( var id in this.features ) {
            var f = this.features[id];
            var s = f.get('start');
            var e = f.get('end');
            if( s < minStart )
                minStart = s;

            if( e > maxEnd )
                maxEnd = e;

            featureCount++;
        }

        this.globalStats = {
            featureDensity: featureCount/(maxEnd-minStart+1)
        };
    },

    getFeatures: function( query, featCallback, endCallback, errorCallback ) {
        var start = query.start;
        var end = query.end;
        for( var id in this.features ) {
            var f = this.features[id];
            if(! ( f.get('end') < start  || f.get('start') > end ) ) {
                featCallback( f );
            }
        }
        endCallback();
    }
});
});