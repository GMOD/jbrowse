define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/_base/url',
            'JBrowse/Store/NCList',
            'JBrowse/Store/SeqFeature/NCList',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredStatsMixin',
            'JBrowse/Store/DeferredFeaturesMixin',
            'JBrowse/Util',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Model/ArrayRepr',
            './GFF3/GFF3Parser'
        ],
        function(
            declare,
            lang,
            array,
            urlObj,
            NCList,
            NCListStore,
            SeqFeatureStore,
            DeferredStatsMixin,
            DeferredFeaturesMixin,
            Util,
            XHRBlob,
            ArrayRepr,
            GFF3Parser
        ) {

return declare([ NCListStore ],

 /**
  * @lends JBrowse.Store.SeqFeature.GFF3
  */
{

    //    "-chains-": { constructor: "manual" },
    constructor: function( args ) {
        // had to push some stuff that I'd like in constructor into _load instead, because need before rest of _load, but
        //   _load is getting called at end of NCList (superclass) constructor, so before this constructor called
        //   tried using manual constructor chaining, but this.inherited(args) didn't actually trigger
        //   recursive superclass chaining, just the first parent (NCList) constructor.
        //   Therefore SeqFeature, DeferredFeatureMixin, etc. weren't getting called, and manually
        //   calling every superclass/mixin would be asking for trouble later on...
        //
        // this.inherited(arguments);
    },

    _load: function() {
        var args = this.args;
        this.data = args.blob;
        this.name = args.name || ( this.data.url && new urlObj( this.data.url ).path.replace(/^.+\//,'') ) || 'anonymous';
        console.log("called GFF3 load");

        // load and index the gff3 here
        var store = this;
        if (this.data.blob instanceof File)  {
            var fil = this.data.blob;
            var reader = new FileReader();
            reader.onload = function(e)  {
                var content = e.target.result;
                console.log( "In GFF3 store, got the file: " + fil.name + ", type: " + fil.type + ", size: " + fil.size);
                store.loadContent(content);
            };
            reader.readAsText(fil);
            console.log("called reader.readAsText");
        }
        else if (this.data.url) {
            var gffurl = this.data.url;
            dojo.xhrGet( {
                url: gffurl,
                handleAs: "text",
                load: function(response, ioArgs) {
                    console.log( "In GFF3 store, got data from URL: ", gffurl);
                    store.loadContent(response);
                },
                error: function(response, ioArgs) {
                    console.error(response);
                    console.error(response.stack);
                }
            } );
        }
    },

    loadContent: function(content)  {
        var store = this;
        console.log("   content start: " + content.substr(0, 50));
        var gparser = new GFF3Parser();
        var gff3_json = gparser.parse(content);
        var results = this._gff3toJbrowseJson(gff3_json, store.args);
        var trackInfo = results.trackInfo;
        var featArray = results.featArray;
        store.attrs = new ArrayRepr(trackInfo.intervals.classes);
        store.nclist.fill(featArray, store.attrs);

        // should also calculate the feature density (avg features per
        // bp) and store it in:
        //       store._stats.featureDensity
        store.globalStats.featureCount = trackInfo.featureCount;
        // average feature density per base
        store.globalStats.featureDensity = trackInfo.featureCount / store.refSeq.length;
        console.log("feature count: " + store.globalStats.featureCount);

        // when the store is ready to handle requests for stats and features, run:
        store._deferred.features.resolve({success: true});
        store._deferred.stats.resolve({success: true});
    },

    _gff3toJbrowseJson: function(parsedGFF3, params)  {
        var trackInfo = {};
        trackInfo["intervals"] = {};

        trackInfo["histograms"] = {
            "stats" : [
                {
                    "basesPerBin" : "1000000",
                    "max" : 1,
                    "mean" : 1
                }
            ],
            "meta" : [
                {
                    "basesPerBin" : "1000000",
                    "arrayParams" : {
                        "length" : 1,
                        "chunkSize" : 10000,
                        "urlTemplate" : "hist-1000000-{Chunk}.json"
                    }
                }
            ]
        };
        trackInfo["intervals"]["classes"] =
            [ {
                  "isArrayAttr" : {
                      "Subfeatures" : 1
                  },
                  "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
              }, {
                  "isArrayAttr" : {
                  },
                  "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
              }, {
                  "isArrayAttr" : {
                      "Sublist" : 1
                  },
                  "attributes" : [ "Start", "End", "Chunk" ]
              } ];

        trackInfo["intervals"]["lazyClass"] = 2;
        trackInfo["intervals"]["urlTemplate"] = "lf-{Chunk}.json";
        trackInfo["formatVersion"] = 1;

        var featureCount = 0;

        // first check if we have only one feature, in which case parsedData is an object not an array
        if ( typeof parsedGFF3.parsedData.length == 'undefined' ){
            trackInfo["featureCount"] = 1;
        }
        else {
            trackInfo["featureCount"] = parsedGFF3.parsedData.length;
        }

        // loop through each top level feature in parsedGFF3 and make array of featureArrays
        var allGff3Features = new Array; // this is an array of featureArrays containing info for all features in parsedGFF3
        // see if there's only one feature, in which case parsedData is an object, not an array with one object (strangely)
        if ( !parsedGFF3.parsedData.length ){
            allGff3Features.push( this._convertParsedGFF3JsonToFeatureArray( parsedGFF3 ) );
        } else { // >1 feature in parsedData, loop through and push each onto allGff3Features
            for( var k = 0; k < parsedGFF3.parsedData.length; k++ ) {
                var jbrowseFeat = this._convertParsedGFF3JsonToFeatureArray( parsedGFF3.parsedData[k] );
                if (jbrowseFeat)  {
                    allGff3Features.push( jbrowseFeat );
                }
            }
        }

        return { trackInfo:  trackInfo, featArray: allGff3Features };
    },

    /**
     *  takes one parsed GFF3 feature and all of its subfeatures (children/grandchildren/great-grandchildren/...)
     *  from a parsed GFF3 data struct (returned from GFF3toJson()), and returns a a two-level feature array for
     *  the lowest and next-lowest level. For example, given a data struct for a parsed gene/mRNA/exon GFF3
     *  it would return a two-level feature array for the all mRNA features and their exons.
     */
    _convertParsedGFF3JsonToFeatureArray: function(parsedGff3) {
        var featureArray = new Array();
        // set to zero because we want jbrowse/webapollo to look at the first entry in attr array to
        // look up what each of the following fields in featureArray mean
        featureArray[0] = 0;

        // figure out how many levels we are dealing with here, b/c we need to return
        // only the data for the lowest contained in the next lowest level, since Webapollo
        // can only deal with two-level features.
        var gff3Depth = this._determineParsedGff3Depth( parsedGff3 );

        // okay, we know the depth, go down to gff3Depth - 1, and pull the features at this
        // depth and their children.

        // get parents in parsedGff3.parsedData at depth - 1
        var theseParents = this._getFeaturesAtGivenDepth(parsedGff3, gff3Depth - 1);
        if (! theseParents || theseParents.length < 1)  {
            // console.log("problem");
            // console.log(parsedGff3);
            return null;
        }

	for ( j = 0; j < theseParents.length; j++ ){
	    console.log("j: " + j);
	    //
	    // set parent info
	    //
	    var rawdata = theseParents[j].data[0].rawdata;
	    featureArray[1] = parseInt(rawdata[3])-1; // set start (-1 for converting from 1-based to 0-based)
	    featureArray[2] = parseInt(rawdata[4]); // set end
	    featureArray[3] = rawdata[6]; // set strand
	    featureArray[4] = rawdata[1]; // set source
	    featureArray[5] = rawdata[7]; // set phase
	    featureArray[6] = rawdata[2]; // set type
	    featureArray[7] = rawdata[5]; // set score
	    featureArray[8] = theseParents[j].ID; // set id
	    
	    var parsedNinthField = this._parsedNinthGff3Field(rawdata[8]);
	    if ( !!parsedNinthField["Name"] ){
		featureArray[9] = parsedNinthField["Name"];
	    }
	    else  { featureArray[9] = null; }
	    
	    //
	    // now set children info
	    //
	    var children = theseParents[j].children;
	    var subfeats = null; // make array for all child features
	    if ( theseParents[j].children && (theseParents[j].children.length > 0))  {
		subfeats = [];
		for (var i = 0; i < theseParents[j].children.length; i++ ){
		    var childData = theseParents[j].children[i].data[0].rawdata;
		    var subfeat = [];
		    
		    subfeat[0] = 1; // ?
		    subfeat[1] = parseInt(childData[3])-1; // start  (-1 for converting from 1-based to 0-based)
		    subfeat[2] = parseInt(childData[4]); // end
		    subfeat[3] = childData[6]; // strand
		    subfeat[4] = childData[1]; // source
		    subfeat[5] = childData[7]; // phase
		    subfeat[6] = childData[2]; // type
		    subfeat[7] = childData[5]; // score
		    
		    var childNinthField = this._parsedNinthGff3Field( childData[8] );
		    if ( !!childNinthField["ID"] ){
			subfeat[8] = childNinthField["ID"];
		    }
		    else  { subfeat[8] = null; }
		    if ( !!childNinthField["Name"] ){
			subfeat[9] = childNinthField["Name"];
		    }
                else  { subfeat[9] = null; }
		    subfeats[i] = subfeat;
		}
	    }
	    featureArray[10] = subfeats; // load up children
	}

        return featureArray;
    },

    // recursive search of this feature to see how many levels there are,
    // helper for _convertParsedGFF3JsonToFeatureArray. This determines the
    // depth of the first feature it finds.
    _determineParsedGff3Depth: function(gffFeature) {
        var recursion_level = 0;
        var maximum_recursion_level = 20; // paranoid about infinite recursion
        var determineNumLevels = function(thisJsonFeature) {
            recursion_level++;
            if ( recursion_level > maximum_recursion_level ){
                return false;
            }
            // recurse if there there are children
            //if ( !! thisJsonFeature[0] && thisJsonFeature[0]["children"] != null && thisJsonFeature[0]["children"].length > 0 ){
            //    if ( determineNumLevels(thisJsonFeature[0]["children"][0] ) ){
            if ( thisJsonFeature.children != null && thisJsonFeature.children.length > 0 ){
                if ( determineNumLevels(thisJsonFeature.children[0]) ){
                    return true;
                }
            }
            return false;
        };
        // determineNumLevels( parsedGff3.parsedData[0] );
        determineNumLevels( gffFeature );
        return recursion_level;
    },

    // helper feature for _convertParsedGFF3JsonToFeatureArray
    // that returns the feature at a given depth
    // (it will return the first feature in the arrayref at
    // that depth)
    _getFeaturesAtGivenDepth: function(gffFeature, depth) {
        var recursion_level = 0;
	var maximum_recursion_level = 20; // paranoid about infinite recursion
        var getFeature = function(thisJsonFeature, thisDepth) {
            if ( recursion_level > maximum_recursion_level ){
                return null;
            }
            // are we at the right depth?
            if ( recursion_level + 1 == thisDepth ){
                return thisJsonFeature;
            }
            else if ( thisJsonFeature.children != null && thisJsonFeature.children.length > 0 ){
		recursion_level++;
                var returnedFeatures = new Array;
		for (var m = 0; m < thisJsonFeature.children.length; m++){
		    if ( thisFeature = getFeature(thisJsonFeature.children[m], depth) ){
			returnedFeatures.push( thisFeature );
		    }
		}
		return returnedFeatures;
            }
            return null;
        };
        return getFeature( gffFeature, depth );
    },

    // helper feature for _convertParsedGFF3JsonToFeatureArray
    // that parsed ninth field of gff3 file
    _parsedNinthGff3Field: function(ninthField) {
        // parse info in 9th field to get name
        var ninthFieldArray = ninthField.split(";");
        var parsedNinthField = new Object;
        for (var j = 0; j < ninthFieldArray.length; j++){
            var keyVal = ninthFieldArray[j].split("=");
            parsedNinthField[ keyVal[0] ] = keyVal[1];
        }
        return parsedNinthField;
    }

});
});