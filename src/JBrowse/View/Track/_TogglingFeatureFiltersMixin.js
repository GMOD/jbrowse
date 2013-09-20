define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ) {
return declare( null, {
    constructor: function() {
        // initialize toggling feature filters
        var filters = this._getTogglingFeatureFilters();
        for( var filtername in filters ) {
            if( this.config[filtername] )
                this.addFeatureFilter( filters[filtername] );
            else
                this.removeFeatureFilter( filters[filtername] );
        }
    },

    _toggleFeatureFilter: function( filtername, setActive ) {
        // if no setActive, we will toggle it
        if( setActive === undefined )
            setActive = ! this.config[filtername];

        // nothing to do if not changed
        if( !!setActive === !!this.config[filtername] )
            return;

        this.config[filtername] = setActive;

        if( setActive )
            this.addFeatureFilter( this._getTogglingFeatureFilters()[filtername] );
        else
            this.removeFeatureFilter( this._getTogglingFeatureFilters()[filtername] );

        this.changed();
    },

    _getTogglingFeatureFilters: function() {
        return {};
        // return lang.mixin(
        //     {},
        //     this.inherited(arguments),
        //     {

        //     });
    }

});
});