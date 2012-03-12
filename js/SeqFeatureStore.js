//MODEL

/**
 * Base class for JBrowse data backends that hold sequences and
 * features.  Some aspects reminiscent of Lincoln Stein's
 * Bio::DB::SeqFeature::Store.
  *
 * @class
 * @constructor
 *
 */

function SeqFeatureStore(args) {
    if( !args ) return;

    this.loaded  = args.loaded;
    this.changed = args.changeCallback;
};



/**
 * Return a stored feature given its primary unique identifier.
 */

SeqFeatureStore.prototype.get_feature_by_id = function(id) {

};


