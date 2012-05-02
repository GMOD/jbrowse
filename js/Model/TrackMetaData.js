dojo.require('dojox.data.CsvStore');
dojo.declare( 'JBrowse.Model.TrackMetaData', dojox.data.CsvStore,
/**
 * @lends JBrowse.Model.TrackMetaData.prototype
 */
{
    /**
     * Data store for track metadata, supporting faceted
     * (parameterized) searching.
     * @constructs
     * @param args.trackConfigs {Array} array of track configuration
     */
    constructor: function( args ) {
        dojox.data.CsvStore.call( this, {
            url: Util.resolveUrl( args.browser.config.sourceUrl, 'trackMeta.csv' )
        });

        this.filterFacets = args.filterFacets || function() {
             return true;
        };

        // init our onReady callbacks
        if( ! dojo.isArray( args.onReady ) ){
            this.onReadyFuncs = args.onReady ? [ args.onReady ] : [];
        } else {
            this.onReadyFuncs = dojo.clone(args.onReady);
        }

        // fetch our items and calculate our facets
        this.fetch({
            scope: this,
            onComplete: Util.debugHandler( this, function( items ) {
                // build our facet indexes
                this._initFacets( items );

                this.ready = true;

                // call our onReady callbacks
                dojo.forEach( this.onReadyFuncs, function(f) {
                    f.call( this, this );
                }, this );
                this.onReadyFuncs = [];
            })
        });
    },

    _initFacets: function( items ) {

        // get our (filtered) list of facets we will index for
        var facets = this.facets =
            dojo.filter( this.getAttributes( items[0] ),
                         this.filterFacets,
                         this
                       );

        // initialize the empty indexes
        this.facetIndexes = { count: 0, byFacetName: {} };
        dojo.forEach( facets, function(facet) {
            this.facetIndexes.byFacetName[facet] = { count: 0, byFacetValue: {} };
        }, this);

        // build an index of our items for each facet
        dojo.forEach( items, function( item ) {
            this.facetIndexes.count++;
            dojo.forEach( facets, function( facet ) {
                var value = this.getValue( item, facet, undefined );
                if( typeof value == 'undefined' )
                    return;
                var bucket = this.facetIndexes.byFacetName[facet].byFacetValue[value];
                if( !bucket )
                    bucket = this.facetIndexes.byFacetName[facet].byFacetValue[value] = { count: 0, items: [] };
                bucket.count++;
                bucket.items.push(item);
            },this);
        }, this);
    },

    /**
     * Get an array of the text names of the facets that are defined
     * in this track metadata.
     * @param callback {Function} called as callback( [facet,facet,...] )
     */
    getFacets: function( callback ) {
        return this.facets;
    },

    /**
     * Get an Array of the distinct values for a given facet name.
     * @param facetName {String} the facet name
     * @returns {Array} distinct values for that facet
     */
    getFacetValues: function( facetName ) {
        var index = this.facetIndexes.byFacetName[facetName];
        if( !index )
            return [];

        var values = [];
        for( var v in index.byFacetValue ) {
            if( index.byFacetValue.hasOwnProperty(v) )
                values.push( v );
        }
        return values;
    },

    /**
     * Add a callback to be called when this store is ready (loaded).
     */
    onReady: function( callback ) {
        if( this.ready ) {
            callback.call( this, this );
        }
        else {
            this.onReadyFuncs.push( callback );
        }
    },



});
