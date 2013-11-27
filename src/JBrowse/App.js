define([
           'dojo/_base/declare'
           ,'dojo/Stateful'

           ,'JBrowse/Component'
           ,'JBrowse/FeatureFiltererMixin'
           ,'JBrowse/Transport/_TransportManagerMixin'
           ,'JBrowse/Plugin/_PluginManagerMixin'
       ],
       function(
           declare
           ,Stateful

           ,JBrowseComponent
           ,FeatureFiltererMixin
           ,TransportManagerMixin
           ,PluginManagerMixin
       ) {

return declare(
    [
        Stateful,
        JBrowseComponent,
        FeatureFiltererMixin,
        TransportManagerMixin,
        PluginManagerMixin
    ],
    {

configSchema: {
        slots: [
            { name: 'dataRoot', type: 'string', defaultValue: "data" },
            { name: 'exactReferenceSequenceNames', type: 'boolean', defaultValue: false },
            { name: 'logMessages', type: 'boolean', defaultValue: false }
        ]
},

init: function() {
    return this._initialized || ( this._initialized = function() {
        var thisB = this;
        return thisB.loadConfig()
            .then(
                function() {
                    return thisB._initTransportDrivers();
                })
            .then( function() {
                    return thisB.loadPlugins();
                });
    }.call(this));
},

/**
 * Compare two reference sequence names, returning -1, 0, or 1
 * depending on the result.  Case insensitive, insensitive to the
 * presence or absence of prefixes like 'chr', 'chrom', 'ctg',
 * 'contig', 'scaffold', etc
 */
compareReferenceNames: function( a, b ) {
    return this.regularizeReferenceName(a).localeCompare( this.regularizeReferenceName( b ) );
},

regularizeReferenceName: function( refname ) {

    if( this.getConf('exactReferenceSequenceNames') )
        return refname;

    refname = refname.toLowerCase()
                     .replace(/^chro?m?(osome)?/,'chr')
                     .replace(/^co?n?ti?g/,'ctg')
                     .replace(/^scaff?o?l?d?/,'scaffold')
                     .replace(/^([a-z]*)0+/,'$1')
                     .replace(/^(\d+)$/, 'chr$1' );

    return refname;
}

});
});