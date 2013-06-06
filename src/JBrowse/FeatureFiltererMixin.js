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
    addFeatureFilter: function( filter ) {
        var oldFilter = this.filterFeature;
        this.filterFeature = function( feat ) {
            return oldFilter(feat) && filter(feat);
        };
    },
    setFeatureFilter: function( filter ) {
        if( this.featureFilterParentComponent )
            this.filterFeature = function(feat) {
                return filter(feat) && this.featureFilterParentComponent.filterFeature( feat );
            };
        else
            this.filterFeature = filter;
    },
    setFeatureFilterParentComponent: function( parent ) {
        this.featureFilterParentComponent = parent;
        this.setFeatureFilter( this.filterFeature );
    }
});
});