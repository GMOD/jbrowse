define(['dojo/_base/declare',
        'Rotunda/View/Track/Link',
	'Rotunda/util'],
       function(declare,
                LinkTrack,
		util) {

/**
 * @class
 */
return declare (LinkTrack,
{
    constructor: function (config) { },

    transformStoreFeature: function (storeFeature, seq, store) {
	if ('hasAdjacency' in store && store.hasAdjacency (storeFeature)) {
	    var adj = store.getAdjacency (storeFeature)
	    return { seq: seq,
		     start: storeFeature.get('start'),
		     end: storeFeature.get('end'),
		     otherSeq: adj.ref,
		     otherStart: adj.pos,
		     otherEnd: adj.pos
		   }
	}
	return null
    }
})

});
