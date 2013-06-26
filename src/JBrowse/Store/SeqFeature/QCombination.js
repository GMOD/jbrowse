define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'JBrowse/Store/SeqFeature/CombinationBase'
       ],
       function(
           declare,
           array,
           CombinationBaseStore
       ) {

// Plagiarized from Store/SeqFeature/Bigwig/RequestWorker to create BigWig features
var gettable = declare( null, {
    get: function(name) {
        return this[ { start: 'start', end: 'end', seq_id: 'segment' }[name] || name ];
    },
    tags: function() {
        return ['start','end','seq_id','score','type','source'];
    }
});
var Feature = declare( gettable, {} );

return declare([CombinationBaseStore], {

_setGlobalStats: function() {
    var thisB = this;
    this._regionStatsCache = undefined;
    this._getRegionStats(this.globalQuery, 
        function(stats) {
            thisB.globalStats = stats;
            thisB._deferred.stats.resolve(true);
        }, 
        function() {
            thisB._deferred.stats.reject("Failed to load global stats");
        });

},

applyOp: function(scoreA, scoreB, op) {
    var retValue;
    switch(op) {
        case "+":
            retValue = scoreA + scoreB;
            break;
        case "-":
            retValue = scoreA - scoreB;
            break;
        case "*":
            retValue = scoreA * scoreB;
            break;
        case "/":
            retValue = (scoreB == 0) ? undefined : scoreA/scoreB;
            break;
        default:
            console.error("invalid operation");
            return undefined;
    }
    return retValue;
},
// Inherits getGlobalStats and getRegionStats from the superclasses.  
// If we want any region stats or any global stats other than featureCount and featureDensity,
// We'll have to add them into this file later.
// Regional stats would be added by combining the "score" features of the underlying stores and
// using the combined data to create a "score" feature for each of the features in this.featureArray.



createFeatures: function(spans) {
    var features = [];
    for(var span in spans) {
        var f = new Feature();
        f.start = spans[span].start;
        f.end = spans[span].end;
        f.score = spans[span].score;
        if(spans[span].segment) f.segment = spans[span].segment;
        if(spans[span].type) f.type = spans[span].type;
        f.source = this.name;

        features.push(f);
    }
    return features;
},


// Defines the various set-theoretic operations that may occur and assigns each to a span-making function.
opSpan: function(op, pseudosA, pseudosB, query) {
    var retPseudos = [];
    var i = 0;
    var j = 0;
    
    var nextCritical = Math.min(pseudosA[i].start, pseudosB[j].start);
    
    var inA;
    var inB;

    var noInfinite = 0;
    while(i < pseudosA.length && j < pseudosB.length && noInfinite < 3000) {
        if(nextCritical == pseudosA[i].start) inA = true;
        if(nextCritical == pseudosB[j].start) inB = true;
        //noInfinite++;
        var addPseudo = inA || inB;
        // If we're inside at least one pseudo-feature, adds data for the current feature.
        if(addPseudo) {
            var newPseudo = 
            {
                start: nextCritical,
                score: this.applyOp(inA ? pseudosA[i].score : 0, inB ? pseudosB[j].score : 0, op)
            };
            if(inA != inB || pseudosA[i].segment == pseudosB[j].segment) {
                newPseudo.segment = inA ? pseudosA[i].segment : pseudosB[j].segment;
            }
            if(inA != inB || pseudosA[i].type == pseudosB[j].type) {
                newPseudo.type = inA ? pseudosA[i].type : pseudosB[j].type;
            }
        }
        // Dividing by zero or other invalid operation being performed, don't add the feature
        if(newPseudo.score === undefined) addPseudo = false;

        // Fetches the next critical point (the next base pair greater than the current nextCritical value
        //    that is either the beginning or the end of a pseudo)
        var _possibleCriticals = [pseudosA[i].start, pseudosA[i].end, pseudosB[j].start, pseudosB[j].end];
        _possibleCriticals = array.filter(_possibleCriticals, function(item) {
            return (item > nextCritical);
        }).sort(function(a,b){ return a-b;});
        nextCritical = _possibleCriticals[0];
        if(!nextCritical) break;
        
        // Deterstartes whether the next pseudo to be created will use data from pseudosA or pseudosB or both
        if(nextCritical == pseudosA[i].end) {
            inA = false;
            i++;
        }
        if(nextCritical == pseudosB[j].end) {
            inB = false;
            j++;
        }


        // If there is currently a pseudo-feature being built, adds it
        if(addPseudo) {
            newPseudo.end = nextCritical;
            
            retPseudos.push(newPseudo);
        }
    }

    // If some pseudofeatures remain in either pseudo set, they are pushed as is into the return pseudo set.
    for(; i < pseudosA.length; i++) {
        retPseudos.push({
            start: Math.max(nextCritical, pseudosA[i].start),
            end: pseudosA[i].end,
            score: pseudosA[i].score,
            segment: pseudosA[i].segment,
            type: pseudosA[i].type
        });
    }
    for(; j < pseudosB.length; j++) {
        retPseudos.push({
            start: Math.max(nextCritical, pseudosB[j].start),
            end: pseudosB[j].end,
            score: pseudosB[j].score,
            segment: pseudosB[j].segment,
            type: pseudosB[j].type
        });
    }
    return retPseudos;
},

/* notes for this section: 
        -A span object contains a "start" and "end". 
        -The variables "features" and "feature" are often
         pseudo-features (span objects with endpoints that match real features)
*/


toSpan: function(features, query) {
    // given a set of features, creates a set of pseudo-features with similar properties.
    var pseudos = [];
    for(var feature in features) {
        var pseudo =    
        {
            start: features[feature].get('start'),
            end: features[feature].get('end'),
            score: features[feature].get('score'),
            segment: features[feature].get('segment'),
            type: features[feature].get('type')
        };
        pseudos.push(pseudo);
    }
    return pseudos;
}


});
});