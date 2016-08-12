define(['dojo/_base/declare',
        'Rotunda/View/Track/Arc',
        'Rotunda/View/Track/Link/Adjacency',
        'Rotunda/View/Track/Stacked',
	'Rotunda/util'],
       function(declare,
                ArcTrack,
                AdjacencyTrack,
                StackedTrack,
		util) {

/**
 * @class
 */
return declare (StackedTrack,
{
    constructor: function (config) {
        config = config || {}
        this.tracks = config.tracks || []
	this.features = config.features
	this.storeName = config.storeName

        this.arcTrack = new ArcTrack ({ id: "features",
					label: config.arcLabel || "Features",
					features: this.features,
					storeName: this.storeName })

	this.linkTrack = new AdjacencyTrack ({ id: "links",
					       label: config.linkLabel || "Links",
					       features: this.features,
					       storeName: this.storeName })

        this.tracks.push (this.arcTrack)
        this.tracks.push (this.linkTrack)
    },
})

});
