define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            './BigWig',
            './BigWig/Window'
        ],
        function(
            declare,
            lang,
            array,
            BigWig,
            Window
        ) {
return declare(BigWig,

 /**
  * @lends JBrowse.Store.BigWig
  */
{
    _getFeatures: function( query, featureCallback, endCallback, errorCallback ) {

        var chrName = this.browser.regularizeReferenceName( query.ref );
        var min = query.start;
        var max = query.end;

        var v = this.getView();

        if( !v ) {
            endCallback();
            return;
        }

        v.readWigData( chrName, min, max, dojo.hitch( this, function( features ) {
            array.forEach( features || [], featureCallback );
            endCallback();
        }), errorCallback );
    },

    getView: function() {
        if (!this.unzoomedView) {
            var cirLen = 4000;
            var nzl = this.zoomLevels[0];
            if (nzl) {
                cirLen = this.zoomLevels[0].dataOffset - this.unzoomedIndexOffset;
            }
            this.unzoomedView = new Window( this, this.unzoomedIndexOffset, cirLen, false );
        }
        return this.unzoomedView;
    }

});

});
