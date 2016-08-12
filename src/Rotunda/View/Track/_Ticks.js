define(['dojo/_base/declare',
        'Rotunda/View/Track'],
       function(declare,
                Track) {

/**
 * @class
 */
var tickMagUnits = ['', 'kb', 'Mb', 'Gb']

return declare (Track,
{
    constructor: function(config) {
	config = config || {}
    },

    _initTicks: function (rot, minRadius, maxRadius, minAngle, maxAngle) {

	var track = this

        var bloc
        if (rot.scale > 1)
            bloc = rot.calcBrowserLocation()
        if (bloc) {
            var gv = rot.browser.view
            var base_span = gv.basesPerStripe (bloc.start, bloc.end)
            // formula for minor_count duplicated from JBrowse/View/Track/GridLines.renderGridlines
            var minor_count =
                !( base_span % 20 ) ? 20 :
                !( base_span % 10 ) ? 10 :
                !( base_span % 5  ) ? 5  :
                !( base_span % 2  ) ? 2  :
                                  5;

            this.tickSep = base_span / minor_count
            this.tickMag = Math.max (0, Math.floor (Math.log10 (this.tickSep)) - 1)
            
        } else {
	    var baseRange = (maxAngle - minAngle) / rot.radsPerBase
	    var mag = Math.ceil(Math.log10(baseRange))

            this.tickMag = Math.max (0, mag - 2)
	    this.tickSep = Math.pow (10, this.tickMag)
        }
        
	this.midTickSep = 5 * this.tickSep
	this.bigTickSep = 10 * this.tickSep

	this.bigTickMag = this.tickMag + 1
	this.unitsMag = Math.min (3*(tickMagUnits.length - 1), this.bigTickMag - (this.bigTickMag % 3))
	this.unitsSep = Math.pow (10, this.unitsMag)
	this.units = tickMagUnits[this.unitsMag/3]
    }
})

});
