define([ 'dojo/_base/declare',
         'dojo/_base/array',
	 'JBrowse/Browser', 
         'JBrowse/Util',
         'JBrowse/Model/SimpleFeature', 
	 'WebApollo/JSONUtils', 
	 'WebApollo/Store/SeqFeature/ScratchPad'
       ],
       function( declare, array, Browser, Util, SimpleFeature, JSONUtils, ScratchPad ) {

// Created by Justin Reese 9/2012
// justaddcoffee@gmail.com
//
//After
//Alekseyenko, A., and Lee, C. (2007).
//Nested Containment List (NCList): A new algorithm for accelerating
//   interval query of genome alignment and interval databases.
//Bioinformatics, doi:10.1093/bioinformatics/btl647
//http://bioinformatics.oxfordjournals.org/cgi/content/abstract/btl647v1

// This code takes a data structure such as that returned by GFF3toJson.js 
// and makes it into an jbrowse-style json with a nested containment list 
// (NClist) suitable for use in WebApollo and possibly Jbrowse. 

function GFF3toJbrowseJson() {
};

GFF3toJbrowseJson.prototype.gff3toJbrowseJson = function(parsedGFF3, params)  {
    this.params = params;
    var trackInfo = {};
    trackInfo["intervals"] = {};

    trackInfo["histograms"] = {"stats" : [ {"basesPerBin" : "1000000","max" : 1,"mean" : 1} ],"meta" : [ { "basesPerBin" : "1000000", "arrayParams" : { "length" : 1, "chunkSize" : 10000, "urlTemplate" : "hist-1000000-{Chunk}.json"}}]};

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
    if ( typeof(parsedGFF3.parsedData.length) == 'undefined' ){
	trackInfo["featureCount"] = 1;
    }
    else {
	trackInfo["featureCount"] = parsedGFF3.parsedData.length;
    }

    // loop through each top level feature in parsedGFF3 and make array of featureArrays
    // jsonUtilObj.convertParsedGFF3JsonToFeatureArray( parsedGFF3 );
    var allGff3Features = new Array; // this is an array of featureArrays containing info for all features in parsedGFF3
    var jsonUtilObj = new JSONUtils;
  
    // see if there's only one feature, in which case parsedData is an object, not an array with one object (strangely)
    if ( !parsedGFF3.parsedData.length ){
	allGff3Features.push( jsonUtilObj.convertParsedGFF3JsonToFeatureArray( parsedGFF3 ) );
    } else { // >1 feature in parsedData, loop through and push each onto allGff3Features
	for( var k = 0; k < parsedGFF3.parsedData.length; k++ ){ 
	    var jbrowseFeat = jsonUtilObj.convertParsedGFF3JsonToFeatureArray( parsedGFF3.parsedData[k] );
	    if (jbrowseFeat)  {
		allGff3Features.push( jbrowseFeat );
	    }
   	}
    }

    return { trackInfo:  trackInfo, featArray: allGff3Features }
};

return GFF3toJbrowseJson;

} );