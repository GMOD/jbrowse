define( ['dojo/_base/declare',
         'JBrowse/Store/SeqFeature'
        ],
        function( declare, SeqFeatureStore ) {

// return declare( "testScratchPadClass", SeqFeatureStore,
return declare( SeqFeatureStore,
{
    constructor: function( args ) {
        this.features = {};
	this.sorted_feats = [];
        this._calculateStats();
    },

    insert: function( feature ) {
        this.features[ feature.id() ] = feature;
//	this._sort();
        this._calculateStats();
    },

    replace: function( feature ) {
	this.features[ feature.id() ] = feature;
//	this._sort();
        this._calculateStats();
    }, 

/*    _sort: function()  {
	sorted_feats.sort(function(a, b) {
	    var astart = a.get('start');
	    var bstart = b.get('start');
            if (astart != bstart)  {
		return astart - bstart;
	    }
            else {
		return b.get('end') - a.get('end');
	    }
	} );
    }, 
*/

/*
    delete: function( feature ) {
	this.deleteFeatureById[ feature.id() ];
    },
*/

    deleteFeatureById: function( id ) {
	delete  this.features[ id ];
        this._calculateStats();
    },
    

    /* if feature with given id is present in store, return it.  Otherwise return null */
    getFeatureById: function( id )  {
	return this.features[ id ];
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
            featureDensity: featureCount/(maxEnd-minStart+1),
            featureCount: featureCount,
            minStart: minStart,
            maxEnd: maxEnd,
            span: (maxEnd-minStart+1)
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
        if (endCallback)  { endCallback() }
    }
});
});