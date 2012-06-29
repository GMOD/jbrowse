define( ['JBrowse/Store'],
        function( Store ) {

/**
 * Base class for JBrowse data backends that hold sequences and
 * features.  Some aspects reminiscent of Lincoln Stein's
 * Bio::DB::SeqFeature::Store.
  *
 * @class JBrowse.SeqFeatureStore
 * @extends JBrowse.Store
 * @constructor
 */

function SeqFeatureStore(args) {
    Store.call(this, args);

    if( !args ) return;

    this.loaded  = args.loaded;
    this.changed = args.changeCallback || function() {};
};

SeqFeatureStore.prototype = new Store('');

return SeqFeatureStore;

});