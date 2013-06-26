// Not sure if we want to actually have this store, or if this should be folded into a "BAMCombination" store which the SNPCoverage track
// Can convert into a SNPCoverage-type store and then use.  Keeping it for now though.

define([
		'dojo/_base/declare',
		'JBrowse/Store/SeqFeature/CombinationBase'
		],

		function(
			declare,
			CombinationBaseStore
		) {

	return declare([CombinationBaseStore], {

		createFeatures: function(spans) {
			return spans;
		},
		
		toSpan: function(features, query) {
			return features;
		},
		
		opSpan: function(op, span1, span2, query) {
			if(op == "U") { return span1.concat(span2); }
			console.error("invalid operation");
			return undefined;
		},
		
		_setGlobalStats: function() {
			this.globalStats.featureDensity = this._treeFeatureDensity(this.opTree);
			this._deferred.stats.resolve(true);
		},

		_treeFeatureDensity: function(opTree) {
			if(opTree.isLeaf()) return opTree.get().globalStats.featureDensity;
			return (opTree.leftChild ? this._treeFeatureDensity(opTree.leftChild) : 0)
			+ (opTree.rightChild ? this._treeFeatureDensity(opTree.rightChild) : 0);
		}

	});


});