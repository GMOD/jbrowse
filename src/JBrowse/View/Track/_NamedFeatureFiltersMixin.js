define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/when'
       ],
       function(
           declare,
           array,
           when
       ) {
return declare( null, {
    constructor: function() {
        this._initializeConfiguredFeatureFilters();
    },

    configSchema: {
        slots: [
            { name: 'namedFeatureFilters', type: 'object',
              description: 'object holding names of predefined filters with boolean values indicating whether they are active',
              defaultValue: {}
            }
        ]
    },

    _initializeConfiguredFeatureFilters: function() {
        // initialize toggling feature filters
        var thisB = this;
        return when( this._getNamedFeatureFilters() )
            .then( function( filters ) {
                       var filterconf = thisB.getConf('namedFeatureFilters');
                       for( var filtername in filters ) {
                           if( filterconf[filtername] )
                               thisB.addFeatureFilter( filters[filtername].func, filtername );
                           else
                               thisB.removeFeatureFilter( filtername );
                       }
                   });
    },

    _toggleFeatureFilter: function( filtername, setActive ) {
        var filterconf = this.getConf('namedFeatureFilters');
       // if no setActive, we will toggle it
        if( setActive === undefined )
            setActive = ! filterconf[filtername];

        // nothing to do if not changed
        if( !!setActive === !!filterconf[filtername] )
            return;

        filterconf[filtername] = setActive;
        this.setConf( 'namedFeatureFilters', filterconf );

        var thisB = this;
        when( this._getNamedFeatureFilters(),
              function( filters ) {
                  if( setActive )
                      thisB.addFeatureFilter( filters[filtername].func, filtername );
                  else
                      thisB.removeFeatureFilter( filtername );

                  thisB.changed();
              });
    },

    _getNamedFeatureFilters: function() {
        return {};
        // return lang.mixin(
        //     {},
        //     this.inherited(arguments),
        //     {

        //     });
    },

    _makeFeatureFilterTrackMenuItems: function( names, filters ) {
        var thisB = this;
        return when( filters || this._getNamedFeatureFilters() )
            .then( function( filters ) {
                       var items = [];
                       array.forEach( names, function( name ) {
                           if( filters[name] )
                               items.push( thisB._makeFeatureFilterTrackMenuItem( name, filters[name] ));
                       });
                       return items;
                   });
    },

    _makeFeatureFilterTrackMenuItem: function( filtername, filterspec ) {
        var thisB = this;
        if( filtername == 'SEPARATOR' )
            return { type: 'dijit/MenuSeparator' };
        return { label: filterspec.desc,
                 type: 'dijit/CheckedMenuItem',
                 checked: !! thisB.getConf('namedFeatureFilters')[filtername],
                 onClick: function(event) {
                     thisB._toggleFeatureFilter( filtername, this.checked );
                 }
               };
    }

});
});