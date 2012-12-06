
dojo.require("JBrowse/Store/SeqFeature/GFF3/GFF3Parser");

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
            'WebApollo/GFF3toJbrowseJson', 
            'JBrowse/Model/ArrayRepr',
            // , 'JBrowse/Store/SeqFeature/GFF3/GFF3Parser'
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
	    GFF3toJbrowseJson, 
	    ArrayRepr
	    // , GFF3Parser
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
	console.log(gff3_json);
	var converter = new GFF3toJbrowseJson();
	var results = converter.gff3toJbrowseJson(gff3_json, store.args)
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
    }

/*
    _getGlobalStats: function( successCallback, errorCallback ) {
	console.log("GFF3 _getGlobalStats called");
	this.inherited(arguments);
    },
*/

    /** deferred callback triggered by getFeature() call (invoked by superclass DeferredFeaturesMixin) */
/*
    _getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
	console.log("GFF3 _getFeatures called: ", query, featureCallback);
	this.inherited(arguments);
    }
*/

});
});