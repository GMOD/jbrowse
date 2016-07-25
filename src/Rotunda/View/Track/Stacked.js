define(['dojo/_base/declare',
        'Rotunda/View/Track',
	'Rotunda/util'],
       function(declare,
                Track,
		util) {

/**
 * @class
 */
return declare (Track,
{
    constructor: function (config) {
        config = config || {}
        this.tracks = config.tracks || []
    },

    getRadius: function (scale, trackRadiusScale, defaultTrackRadius) {
        return this.tracks.reduce (function (total, track) {
            return total + track.getRadius (scale, trackRadiusScale, defaultTrackRadius)
        }, 0)
    },

    draw: function (rot, minRadius, maxRadius, minAngle, maxAngle) {
        var totalTrackRadius = 0
        this.tracks.forEach (function (track) {
            var trackRadius = track.getRadius (rot.scale, rot.trackRadiusScale(rot.scale), rot.defaultTrackRadius)
            track.draw (rot, minRadius + totalTrackRadius, minRadius + totalTrackRadius + trackRadius, minAngle, maxAngle)
            totalTrackRadius += trackRadius
        })
    }
})

});
