define([
        'dojo/_base/declare',
        'dojo/Deferred',
        'dojo/promise/all',
        'JBrowse/Store/SeqFeature/regionClustering',
        'JBrowse/View/Overlay',
        'dojo/dom-construct',
        './RegionClustering/kMeans'
       ],
       function(
                declare,
                Deferred,
                all,
                regionClusteringStore,
                Overlay,
                dom,
                Kmeans
                ) {
return declare( null, {

    constructor: function(args) {
        this.browser = args.browser;
        this.refSeq = args.browser.view.ref;
        this.numOfBins = args.numOfBins;
        this.queryLength = args.queryLength || 1000;
        this.storeNames = args.storeNames.display;
        this.regionStore = new regionClusteringStore({ storeNames: args.storeNames.regions, browser: args.browser });
        this.store = new regionClusteringStore({ storeNames: args.storeNames.display, browser: args.browser });
    },

    show: function() {
        var thisB = this;
        var regions = []; // regions to query for heatmaps
        this.regionStore.getFeatures( 
            { ref: this.refSeq.name,
              scale: this.browser.view.pxPerBp,
              basesPerSpan: 1/this.browser.view.pxPerBp,
              start: this.refSeq.start, end: this.refSeq.end }, 
            // query the whole genome (alternately, allow the user to set regions?)

            function(feat){thisB.makeQuery( feat, regions );},

            dojo.hitch(this, function() {
                // once the query regions have been built, execute the following.
                var testDiv = dom.create( 'div', { innerHTML: "You're testing things. Hurray. The overlay shows test clustering data and heatmaps generated from the regions dictated by whatever HTMLFeatures takcs you selected." } );
                var heatmapDeferred = [];
                for ( var key in regions ) {
                    if (regions.hasOwnProperty(key) && regions[key]) {
                        heatmapDeferred.push(this.buildHeatmap(regions[key]));
                    }
                }
                all(heatmapDeferred).then( dojo.hitch( thisB, function( heatmaps ) {
                    this.heatmaps = heatmaps;
                    var d = this.getStoreStats();
                    d.then(dojo.hitch(this, function(){
                        var overlay = new Overlay().addTitle('test').addToDisplay(testDiv);
                        var means = this.testKmeans(heatmaps);
                        overlay.addToDisplay(dom.create('div',{innerHTML: 'break! clusters come next.'}));
                        for ( var key in means ) {
                            if (means.hasOwnProperty(key)) {
                                overlay.addToDisplay(means[key]);
                            }
                        }
                        overlay.show();
                    }));
                }));
            }));
    },

    makeQuery: function( feat, regions ) {
        // given a feature and an array of regions, generates a region to query and 
        // its directionality, and pushes it to "regions"
        if (!feat.get('strand')) {
            console.warn('feature has no "strand" property.');
            return false; // NOTE: return values should be used to alert users at some point that there was a problem.
        }
        var reg = { ref: this.refSeq.name,
                    scale: this.browser.view.pxPerBp,
                    basesPerSpan: 1/this.browser.view.pxPerBp,
                    start: feat.get('end') - this.queryLength/2,
                    end: feat.get('end') + this.queryLength/2 };
        switch (feat.get('strand')) {
            case 1:
            case '+':
                { reg.directionality = 'right-to-left';
                  break; };
            case -1:
            case '-':
                { reg.directionality = 'left-to-right';
                  break; };
            default:
                return false;
            }
        // If the region overlaps with the end of the refSeq, shift it.
        if ( reg.start < 0 ) {
            reg.end -= reg.start;
            reg.start = 0;
        }
        if ( reg.end > this.refSeq.end ) {
            reg.start -= reg.end - this.refSeq.end;
            reg.end = this.refSeq.end;
        }
        regions.push(reg);
        return true;
    },

    buildHeatmap: function( query ) {
        // queries a region of the genome to build a heatmap
        // based on the values of the wiggle tracks in that region.
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
                                        for ( var i=0; i<this.numOfBins; i++) {
                                            if (feat.get('end') < query.start+i*BPperBin || feat.get('start') > query.start+(i+1)*BPperBin)
                                                continue;
                                            var overlapStart = Math.max(feat.get('start'), query.start+i*BPperBin);
                                            var overlapEnd = Math.min(feat.get('end'), query.start+(i+1)*BPperBin);
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
                                                if ( query.directionality && query.directionality == 'left-to-right')
                                                    // reverse the heatmap if required
                                                    heatmap[this.storeNames[name]].reverse();
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
            // loop through all the stores and fetch their global statistics.
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
            // given a store and a score, this method will fetch the global statistics for that track,
            // normalize the score using the track max and min, and convert that to a color code
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
        var can = dom.create( 'canvas', { className: 'heatmap', height: 20*numRows, width: 20*numCols } );
        var c = can.getContext('2d');
        var j = 0;
        for (var name in this.storeNames ) {
            if (this.storeNames.hasOwnProperty(name)) {
                for (var i=0; i<numCols; i++) {
                    // loop through the numerical elements of the heatmap matrix and convert them to colors.
                    // use those colors to build a canvas element to be used in the display.
                    var score = heatmap[this.storeNames[name]][i];
                    c.fillStyle = scoreToColor(score, this.storeNames[name]);
                    c.fillRect(i*20, j*20, 20, 20);
                }
                j++;
            }
        }
        c.strokeRect(0.5,0.5,can.width-0.5,can.height-0.5);
        var container = dom.create('div', { className: 'heatmap-wrapper' });
        var summaryText = dom.create('div', { className: 'heatmap-source',
                                              innerHTML: (heatmap.region && heatmap.region.directionality)
                                                         ? (heatmap.region.directionality == 'left-to-right')
                                                             ? 'start: '+heatmap.region.end+', end: '+heatmap.region.start
                                                             : 'start: '+heatmap.region.start+', end: '+heatmap.region.end 
                                                         : null,
                                              style: { width: 20*numCols } } );
        container.appendChild(summaryText);
        container.appendChild(can);
        return container;
    },

    HMtoArray: function( heatmap ) {
        // converts a heatmap into an normalized array for use in the k-means algorithm.
        var hmArray = [];
        for (var index in this.storeNames ) {
            if (this.storeNames.hasOwnProperty(index)) {
                var max = this.stats[this.storeNames[index]]['scoreMax'];
                var min = this.stats[this.storeNames[index]]['scoreMin'];
                for (var i=0; i<this.numOfBins; i++) {
                    // flatten the matrix by concatenating rows
                    hmArray.push( ( heatmap[this.storeNames[index]][i] - min )/(max-min) );
                }
            }
        }
        return hmArray;
    },

    ArrayToHM: function( array, region ) {
        // converts an array into a heatmap
        var hm = { region: region };
        for (var index in this.storeNames ) {
            if (this.storeNames.hasOwnProperty(index)) {
                hm[this.storeNames[index]] = [];
                var max = this.stats[this.storeNames[index]]['scoreMax'];
                var min = this.stats[this.storeNames[index]]['scoreMin'];
                for (var i=0; i<this.numOfBins; i++) {
                    // build heatmap rows by 
                    hm[this.storeNames[index]][i] = (max-min)*array[this.numOfBins*index+i] + min;
                }
            }
        }
        return hm;
    },

    testKmeans: function( data ) {
        var thisB = this;
        var data = data.map(function(a){return thisB.HMtoArray(a);});
        var kmeans = new Kmeans().kMeans({data: data, numClusters: 3});
        var means = [];
        for ( var key in kmeans.means ) {
            if ( kmeans.means.hasOwnProperty(key) ) {
                means.push(thisB.makeClusterDisplay( { heatmap: thisB.ArrayToHM(kmeans.means[key], {}),
                                                       clusters: kmeans.clusters[key] } ) );
            }
        }
        return means;
    },

    // Creates a set of DOM nodes that show information relating to a cluster.
    makeClusterDisplay: function( args ) {
        var thisB = this;
        var heatmap = args.heatmap;
        var clusters = args.clusters;
        var can = this.drawHeatmap(heatmap);
        can.sourceHeatmaps = [];
        for (var index in clusters ) {
            if ( clusters.hasOwnProperty(index) ) {
                can.sourceHeatmaps.push(this.heatmaps[index]);
            }
        }
        var container = dom.create( 'div', { className: 'heatmap-container' } );
        container.appendChild(can);
        var sourceMapContainer = dom.create( 'div', { className: 'source-map-container', style: { display: 'none' } } );
        var button = dom.create( 'div', { className: 'heatmap-button',
                                          innerHTML: 'see cluster members',
                                          onclick: function() {
                                            if ( sourceMapContainer.style.display == 'none' ) {
                                                // if it was hidden, add source heatmaps and toggle visibility
                                                for (var key in can.sourceHeatmaps ) {
                                                    if (can.sourceHeatmaps.hasOwnProperty(key)) {
                                                        sourceMapContainer.appendChild(thisB.drawHeatmap(can.sourceHeatmaps[key]));
                                                    }
                                                }
                                                sourceMapContainer.style.display = 'block';
                                            }
                                            else {
                                                // if it was visible, remove all children and toggle visibility
                                                while (sourceMapContainer.firstChild) {
                                                    sourceMapContainer.removeChild(sourceMapContainer.firstChild);
                                                }
                                                sourceMapContainer.style.display = 'none';
                                            }    
                                        } } );
        container.appendChild(button);
        container.appendChild(sourceMapContainer);
        return container;
    }

});
});