define([
        'dojo/_base/declare',
        'dojo/Deferred',
        'dojo/promise/all',
        'JBrowse/Store/SeqFeature/regionClustering',
        'JBrowse/View/Overlay',
        'dojo/dom-construct',
       ],
       function(
                declare,
                Deferred,
                all,
                regionClusteringStore,
                Overlay,
                dom
                ) {
return declare( null, {

    constructor: function(args) {
        this.browser = args.browser;
        this.numOfBins = args.numOfBins;
        this.storeNames = args.storeNames.display;
        this.store = new regionClusteringStore({ storeNames: args.storeNames, browser: args.browser });
    },

    show: function() {
        var testDiv = dom.create( 'div', { innerHTML: "You're testing things. Hurray. The heatmap below shows the relative values for the region 1 to 5000. The scale is bounded by the global stats of each track, so colors will have different meanings in each row." } );
        var heatmapDeferred = this.buildHeatmap( { ref: this.browser.view.ref.name,
                                                        scale: this.browser.view.pxPerBp,
                                                        basesPerSpan: 1/this.browser.view.pxPerBp,
                                                        start: 1, end: 5000 });
        var thisB = this;
        heatmapDeferred.then( dojo.hitch( thisB, function( heatmap ) {
            var d = this.getStoreStats();
            var thisB = this;
            d.then(function(){
                var can = thisB.drawHeatmap(heatmap);
                new Overlay().addTitle('test').addToDisplay(testDiv).addToDisplay(can).show();
            });
        }));
    },

    buildHeatmap: function( query ) {
        var heatmap = { region: query };
        for ( var name in this.storeNames ) {
            if ( this.storeNames.hasOwnProperty(name) ) {
                // create a row for each store
                heatmap[this.storeNames[name]] = new Array(this.numOfBins);
            }
        }
        var d = new Deferred();
        this.store.getFeatures( query,
                                dojo.hitch( this,
                                    function(feat){
                                        var BPperBin = (query.end - query.start)/this.numOfBins;
                                        var s = feat.get('start');
                                        var e = feat.get('end');
                                        for ( var i=0; i<this.numOfBins; i++) {
                                            if (e < query.start+i*BPperBin || s > query.start+(i+1)*BPperBin)
                                                continue;
                                            var overlapStart = Math.max(s, query.start+i*BPperBin);
                                            var overlapEnd = Math.min(e, query.start+(i+1)*BPperBin);
                                            var overlappingBP = overlapEnd - overlapStart;
                                            heatmap[feat.storeName][i] = heatmap[feat.storeName][i] 
                                                                         ? heatmap[feat.storeName][i] + feat.get('score')*overlappingBP
                                                                         : feat.get('score')*overlappingBP;
                                        }
                                    }
                                ),
                                dojo.hitch( this,
                                    function(){
                                        for ( var name in this.storeNames ) {
                                            if ( this.storeNames.hasOwnProperty(name) ) {
                                                for (var i=0; i<this.numOfBins; i++) {
                                                    if (!heatmap[this.storeNames[name]][i])
                                                        heatmap[this.storeNames[name]][i] = 0;
                                                    // average over the number of base pairs in each bin.
                                                    heatmap[this.storeNames[name]][i] /= (query.end-query.start)/this.numOfBins;
                                                }
                                            }
                                        }
                                        d.resolve(heatmap, true);
                                    }
                                )
        );
        return d;
    },

    // returns a promise
    getStoreStats: function() {
        if (this.stats)
            return // don't call this multiple times.
        this.stats = {};
        var d = [];
        var thisB = this;
        for (var key in this.store.stores.display ) {
            var x = new Deferred();
            d.push(x);
            this.store.stores.display[key].getGlobalStats(
                function(s){thisB.stats[thisB.store.stores.display[key].name] = s; x.resolve();},
                function(){console.warn('could not get statistics for ',thisB.store.stores.display[key].name); x.reject();}
            );
        }
        return all(d);
    },

    // returns a promise
    drawHeatmap: function( heatmap ) {
        var thisB = this;
        var scoreToColor = function( score, store ) {
            var max = thisB.stats[store]['scoreMax'];
            var min = thisB.stats[store]['scoreMin'];
            var normalized = (score-min)/(max-min);
            color = normalized > 0.5
                    ? 'rgb(255,'+parseInt(255*2*(1-normalized),10)+','+parseInt(255*2*(1-normalized),10)+')'
                    : 'rgb('+parseInt(255*2*normalized,10)+','+parseInt(255*2*normalized,10)+',255)';
            return color;
        }
        var numRows = this.storeNames.length;
        var numCols = this.numOfBins;
        var can = dom.create( 'canvas', { height: 20*numRows, width: 20*numCols } );
        var c = can.getContext('2d');
        var j = 0;
        for (var name in this.storeNames ) {
            if (this.storeNames.hasOwnProperty(name)) {
                for (var i=0; i<numCols; i++) {
                    var score = heatmap[this.storeNames[name]][i];
                    c.fillStyle = scoreToColor(score, this.storeNames[name]);
                    console.log(c.fillStyle);
                    c.fillRect(i*20, j*20, 20, 20);
                }
                j++;
            }
        }
        return can;
    }

});
});