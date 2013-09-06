/**
 * Mixin that dynamically defines and redefines a filterFeature()
 * method, and supports a filtering hierarchy, and filter chaining at
 * each level of the hierarchy.  Designed to be really fast, because
 * filterFeature() is going to be called many, many times.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array'
       ],
       function(
           declare,
           array
       ) {
return declare( null, {
    filterFeature: function( feature ) {
        return true;
    },

    _featureFilterChain: [],

    addFeatureFilter: function( filter ) {
        this._featureFilterChain.push( filter );
        this._buildFeatureFilter();
    },

    removeFeatureFilter: function( filter ) {
        var newchain = [];
        for( var i = 0; i < this._featureFilterChain.length; i++ ) {
            if( this._featureFilterChain[i] !== filter )
                newchain.push( this._featureFilterChain[i] );
        }
        this._featureFilterChain = newchain;
        this._buildFeatureFilter();
    },

    _buildFeatureFilter: function() {

        // de-dup the filter chain
        var filterChain = function() {
            var seen = {};
            return array.filter( this._featureFilterChain || [], function( filterFunc ) {
                              var str = filterFunc.toString();
                              var s = !( str in seen );
                              seen[str] = true;
                              return s;
                          });
        }.call(this);

        if( ! filterChain.length )
            this.filterFeature = function( feat ) {
                return this.featureFilterParentComponent.filterFeature( feat );
            };
        else if( filterChain.length == 1 )
            this.filterFeature = function(feat) {
                return filterChain[0].call(this,feat) && this.featureFilterParentComponent.filterFeature( feat );
            };
        else
            this.filterFeature = function( feat ) {
                for( var i = 0; i<filterChain.length; i++ )
                    if( ! filterChain[i].call( this, feat ) )
                        return false;

                if( ! this.featureFilterParentComponent.filterFeature( feat ) )
                    return false;

                return true;
            };
    },

    featureFilterParentComponent: { filterFeature: function() { return true; } },

    setFeatureFilter: function( filter ) {
        this._featureFilterChain = [ filter ];
        this._buildFeatureFilter();
    },

    setFeatureFilterParentComponent: function( parent ) {
        this.featureFilterParentComponent = parent;
        this._buildFeatureFilter();
    }

});
});