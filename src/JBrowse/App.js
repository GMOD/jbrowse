define([
           'dojo/_base/declare'
           ,'dojo/_base/lang'
           ,'dojo/Stateful'
           ,'dojo/Deferred'
           ,'dojo/when'

           ,'JBrowse/Component'
           ,'JBrowse/ConfigManager'
           ,'JBrowse/_FeatureFiltererMixin'
           ,'JBrowse/Transport/_TransportManagerMixin'
           ,'JBrowse/Plugin/_PluginManagerMixin'
       ],
       function(
           declare
           ,lang
           ,Stateful
           ,Deferred
           ,when

           ,JBrowseComponent
           ,ConfigLoader
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
            { name: 'exactReferenceSequenceNames', type: 'boolean', defaultValue: false },
            { name: 'logMessages', type: 'boolean', defaultValue: false }
        ]
},

init: function() {
    return this._initialized || ( this._initialized = function() {
        var thisB = this;
        return when( thisB._initTransportDrivers() )
            .then( function() {
                    return thisB.loadPlugins();
                });
    }.call(this));
},


/**
 *  Load our configuration file(s) based on the parameters thex
 *  constructor was passed.  Does not return until all files are
 *  loaded and merged in.
 *  @returns nothing meaningful
 */
loadConfig:function () {
    return this._milestoneFunction( 'loadConfig', function( deferred ) {
        var c = new ConfigLoader({ config: this._constructorArgs, defaults: {}, browser: this });
        this._finalizeConfig( this._constructorArgs || {} );
        c.getFinalConfig()
         .then( lang.hitch(this, function( finishedConfig ) {
                               this._finalizeConfig( finishedConfig, this._getLocalConfig() );
                               deferred.resolve({success:true});
                           }));
    });
},

/**
 * Run a function that will eventually resolve the named Deferred
 * (milestone).
 * @param {String} name the name of the Deferred
 */
_milestoneFunction: function( /**String*/ name, func ) {

    var thisB = this;
    var args = Array.prototype.slice.call( arguments, 2 );

    var d = thisB._getDeferred( name );
    args.unshift( d );
    try {
        func.apply( thisB, args ) ;
    } catch(e) {
        console.error( name, e, e.stack );
        d.resolve({ success:false, error: e });
    }

    return d;
},

/**
 * Fetch or create a named Deferred, which is how milestones are implemented.
 */
_getDeferred: function( name ) {
    if( ! this._deferred )
        this._deferred = {};
    return this._deferred[name] = this._deferred[name] || new Deferred();
},
/**
 * Attach a callback to a milestone.
 */
afterMilestone: function( name, func, ctx ) {
    return this._getDeferred(name)
        .then( function() {
                   try {
                       func.call( ctx || this );
                   } catch( e ) {
                       console.error( ''+e, e.stack, e );
                   }
               });
},
/**
 * Indicate that we've reached a milestone in the initalization
 * process.  Will run all the callbacks associated with that
 * milestone.
 */
passMilestone: function( name, result ) {
    return this._getDeferred(name).resolve( result );
},
/**
 * Return true if we have reached the named milestone, false otherwise.
 */
reachedMilestone: function( name ) {
    return this._getDeferred(name).isResolved();
},


// override component getconf to pass browser object by default
getConf: function( key, args ) {
    return this.inherited( arguments, [ key, args || [this] ] );
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