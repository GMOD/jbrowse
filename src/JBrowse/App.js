define([
           'dojo/_base/declare'
           ,'dojo/Stateful'

           ,'JBrowse/Component'
           ,'JBrowse/FeatureFiltererMixin'
           ,'JBrowse/Auth/_AuthManagerMixin'
           ,'JBrowse/Transport/_TransportManagerMixin'
           ,'JBrowse/Plugin/_PluginManagerMixin'
       ],
       function(
           declare
           ,Stateful

           ,JBrowseComponent
           ,FeatureFiltererMixin
           ,AuthManagerMixin
           ,TransportManagerMixin
           ,PluginManagerMixin
       ) {

return declare(
    [
        Stateful,
        JBrowseComponent,
        FeatureFiltererMixin,
        AuthManagerMixin,
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
}

});
});