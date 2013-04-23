define([
        'dojo/_base/declare',
        'dojo/dom-construct'
        ],
        function(
                    declare,
                    dom
                ) {
return declare( null, {

    constructor: function( args ) {
    },

    kMeans: function( args ) {
        var data = args.data;
        var dataNames = Object.keys(data); // keys to access each datapoint
        var numClusters = args.numClusters;
        var dim = data[dataNames[0]].length; // set the dimention of our space to the number of values per datapoint
        var error = Number.POSITIVE_INFINITY; // the error of the best itteration
        var returnData;

        if ( numClusters > data.length ) {
            console.warn('more clusters than datapoints. Defaulting to sqrt(n/2) clusters.');
            numClusters = Math.ceil(Math.sqrt(data.length/2));
        }

        for (var itteration=0; itteration<20; itteration++) {
            // run the clustering several times. Pick the convergence with the loswest error.
            var means = this.kplusplus( data, dataNames, numClusters ); // initialize the dataset
            var currError = Number.POSITIVE_INFINITY; // the error of the current itteration.
            while(true) {
                var clustersAndError = this.createClusters( data, means );
                if ( Math.abs(currError - clustersAndError.error) < 0.0000001*Math.max(currError, clustersAndError.error) || currError == 0 )
                    break; // when we reach a minimum, escape.
                means = [];
                currError = clustersAndError.error;
                for ( var i=0; i<clustersAndError.clusters.length; i++ ) {
                    var tempAvg = this.average(clustersAndError.clusters[i]);
                    if (tempAvg)
                        means.push(tempAvg);
                }
            }
            if (currError < error) {
                returnData = { means: means, clusters: clustersAndError.clusters };
                error = currError;
            }
            //console.log("finished itteration ",itteration,' with error ',currError);
        }
        //console.log('final error: ',error);
        return returnData;
    },

    /* This method chooses the seeds for our clustering. 
     * Google "K-means++" for more. */
    kplusplus: function( data, dataNames, numClusters ) {
        var means = [data[dataNames[Math.floor(Math.random()*dataNames.length)]]]; // pick a point at random
        for (var i=1; i<numClusters; i++) { // add one mean for each cluster
            var weightedData = [];
            var weight = 0;
            for ( var key in data ) { // loop through datapoints
                if (data.hasOwnProperty(key)) {
                    var individualWeight = Number.POSITIVE_INFINITY; // assign a weight to each datapoint
                    for ( var keyM in means ) {
                        if (means.hasOwnProperty(keyM)) {
                            for ( var j=0; j<data[key].length; j++ ) {
                                // the individual weight is the minimum square distance
                                individualWeight = Math.min( individualWeight, (data[key][j] - means[keyM][j])*(data[key][j] - means[keyM][j]));
                            }
                        }
                    }
                    var weightedDatapoint = [];
                    for ( var j=0; j<data[key].length; j++ ) {
                        // scale the datapoints by weight
                        weightedDatapoint[j] = data[key][j]*individualWeight;
                    }
                    weightedData.push(weightedDatapoint);
                    weight += individualWeight;
                }
            }
            var weightedMean = this.average(weightedData); // average of the weighted data
            for ( var j=0; j<data[key].length; j++ ) {
                weightedMean[j] /= weight/(dataNames.filter(function(a){return a;}).length); // bring back to original scale
            }
            means.push(weightedMean);
        }
        return means;
    },

    createClusters: function( datapoints, means ) {
        // given a set of datapoints and means, makes clusters of datapoints closest to each mean.
        var clusters = [] // cluster n corresponds to mean n
        var error = 0;
        // assign datapoints to clusters
        for ( var key in datapoints ) {
            if ( datapoints.hasOwnProperty(key) ) {
                var temp = this.assignMean(datapoints[key], means);
                error += temp.error;
                if (clusters[temp.meanName]) {
                    clusters[temp.meanName][key] = datapoints[key];
                }
                else {
                    clusters[temp.meanName] = new Array(datapoints.length);
                    clusters[temp.meanName][key] = datapoints[key];
                }
            }
        }
        return { clusters: clusters, error: error };
    },

    assignMean: function( datapoint, means ) {
        // given a datapoint and the set of means, returns the mean closest to that datapoint.
        var meanName = null;
        var distance = Number.POSITIVE_INFINITY;
        for ( var i=0; i<means.length; i++ ) {
            var d = 0;
            for ( var j=0; j<datapoint.length; j++) {
                d += (datapoint[j]-means[i][j])*(datapoint[j]-means[i][j]);
            }
            if ( d < distance ) {
                meanName = i;
                distance = d;
            }
        }
        return { meanName: meanName, error: distance };
    },

    average: function( datapoints ) {
        if (!datapoints) { // if the cluster is empty, ignore it.
            return null;
        }
        // given a set of data, returns the average
        for(var i=0;true;i++){
            // find first non-empty element
            if (!datapoints[i])
                continue;
            var mean = new Array(datapoints[i].length);
            break;
        }
        for ( var i=0; i<mean.length; i++ ) {
            for ( var j=0; j<datapoints.length; j++ ) {
                if (!datapoints[j])
                    continue;
                mean[i] = mean[i] ? mean[i] + datapoints[j][i] : datapoints[j][i];
            }
            mean[i] /= datapoints.filter(function(a){return a;}).length; // divide by the number of non-empty elements.
        }
        return mean;
    }

});
});