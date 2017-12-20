define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            './BigWig',
            './BigWig/Window',
            'JBrowse/Model/SimpleFeature'
        ],
        function(
            declare,
            lang,
            array,
            BigWig,
            Window,
            SimpleFeature
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
            if(this.config.groupFeatures) {
                var genes = {};
                array.forEach( features || [], function(feature) {
                    var id = feature.get('id');
                    if(!genes[id]) {
                        genes[id] = new SimpleFeature({
                            id: feature.get('id'),
                            data: {
                                start: feature.get('start'),
                                end: feature.get('end'),
                                type: 'gene',
                                name: feature.get('name'),
                                id: feature.get('id'),
                                subfeatures: []
                            }
                        });
                    }
                    feature.data.name = null;
                    genes[id].data.subfeatures.push(feature);
                });
                Object.keys(genes).forEach(function(name) {
                    featureCallback(genes[name]);
                });
            }
            else {
                array.forEach( features || [], featureCallback );
            }
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
