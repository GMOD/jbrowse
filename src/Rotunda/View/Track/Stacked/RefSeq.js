define(['dojo/_base/declare',
        'Rotunda/View/Track/Arc',
        'Rotunda/View/Track/Ruler',
        'Rotunda/View/Track/Stacked',
	'Rotunda/util'],
       function(declare,
                ArcTrack,
                RulerTrack,
                StackedTrack,
		util) {

/**
 * @class
 */
return declare (StackedTrack,
{
    constructor: function (config) {
        config = config || { refSeqName: [], refSeqLen: {} }

        this.tracks = config.tracks || []

        var refSeqFeatures = config.refSeqName.map (function (n, i) {
            var l = config.refSeqLen[i]
            return { seq: n,
                     start: 0,
                     end: l,
                     id: n,
                     type: n }
        })

        this.refSeqTrack = new ArcTrack ({ id: "ref_seqs",
					   label: config.refSeqLabel || "Reference sequence",
					   features: refSeqFeatures })

	this.rulerTrack = new RulerTrack ({ id: "ruler_ticks",
					    label: config.rulerLabel || "Ruler",
					    displayedName: function (refSeqName) {
					        return refSeqName.replace(config.chrPrefix || "chr","")
					    }
					  })

        this.tracks.push (this.refSeqTrack)
        this.tracks.push (this.rulerTrack)
    },
})

});
