define([ 'dojo/_base/declare',
         'JBrowse/Util'
       ],
       function( declare, Util ) {

function JSONUtils() {
}


/**
*  creates a feature in JBrowse JSON format
*  takes as arguments:
*      afeature: feature in ApolloEditorService JSON format,
*      arep: ArrayRepr for kind of JBrowse feature to output
*      OLD: fields: array specifying order of fields for JBrowse feature
*      OLD: subfields:  array specifying order of fields for subfeatures of JBrowse feature
*   "CDS" type feature in Apollo JSON format is from genomic start of translation to genomic end of translation,
*          (+ stop codon), regardless of intons, so one per transcript (usually)
*   "CDS" type feature in JBrowse JSON format is a CDS _segment_, which are piecewise and broken up by introns
*          therefore commonyly have multiple CDS segments
*
*/
// JSONUtils.createJBrowseFeature = function(afeature, fields, subfields)  {
var JAFeature = Util.fastDeclare({
    constructor: function( afeature ) {
        this.afeature = afeature;

        // get the main data
        var loc = afeature.location;
        this.start = loc.fmin;
        this.end = loc.fmax;
        this.strand = loc.strand;
        this.name = afeature.name;
        this.parent = afeature.parent_id;
        this.type = afeature.type.cv.name + ':' + afeature.type.name;
        this._uniqueID = afeature.uniquename;

        // get the subfeatures
        this.subfeatures = array.map( afeature.children, function(s) {
            return new JAFeature( s );
        });

        var tags = ['start','end','strand','name','parent','type','subfeatures'];

        // parse the props
        var props = afeature.properties;
        dojo.forEach( props, function( p ) {
            var pn = p.type.cv.name+':'+p.type.name;
            tags.push(pn);
            this[pn] = p.value;
        });

        this._tags = tags;
    },
    get: function( fname ) {
        return this[fname];
    },
    tags: function() {
        return this._tags;
    },
    id: function() {
        return this._uniqueID;
    }
});

JSONUtils.JAFeature = JAFeature;

JSONUtils.createJBrowseFeature = function( afeature )  {
    return new JAFeature( afeature );
};

/**
*  creates a sequence alteration in JBrowse JSON format
*  takes as arguments:
*      arep: ArrayRepr for kind of JBrowse feature to output
*      afeature: sequence alteration in ApolloEditorService JSON format,
*/
JSONUtils.createJBrowseSequenceAlteration = function(arep, afeature)  {
    var loc = afeature.location;
    var uid = afeature.uniquename; 

    var classIndex = 0;
    var jfeature = new Array();

    jfeature.uid = uid;

    // need ArrayRepr constructor that sets class field:
    //    var jfeature = arep.constructFeature(classIndex);
    // or probably better:
    //    var jfeature = arep.constructFeature(className);
    // 
    jfeature[0] = classIndex;
    arep.set(jfeature, "Start", loc.fmin);
    arep.set(jfeature, "End", loc.fmax);
    arep.set(jfeature, "Strand", loc.strand);
    if (arep.hasDefinedAttribute(jfeature, "Id")) {
    	arep.set(jfeature, "Id", uid);
    }
    if (arep.hasDefinedAttribute(jfeature, "Type"))  {
    	var type = afeature.type.name;
    	arep.set(jfeature, "Type", type);
    }
    if (arep.hasDefinedAttribute(jfeature, "Residues"))  {
    	var residues = afeature.residues;
    	arep.set(jfeature, "Residues", residues);
    }
    return jfeature;
};


/** 
*  creates a feature in ApolloEditorService JSON format
*  takes as argument:
*       jfeature: a feature in JBrowse JSON format, 
*       fields: array specifying order of fields in jfeature
*       subfields: array specifying order of fields in subfeatures of jfeature
*       specified_type (optional): type passed in that overrides type info for jfeature
*  ApolloEditorService format:
*    { 
*       "location" : { "fmin": fmin, "fmax": fmax, "strand": strand }, 
*       "type": { "cv": { "name":, cv },   // typical cv name: "SO" (Sequence Ontology)
*                 "name": cvterm },        // typical name: "transcript"
*       "children": { __recursive ApolloEditorService feature__ }
*    }
* 
*   For ApolloEditorService "add_feature" call to work, need to have "gene" as toplevel feature, 
*         then "transcript", then ???
*                 
*    JBrowse JSON fields example: ["start", "end", "strand", "id", "subfeatures"]
*
*    type handling
*    if specified_type arg present, it determines type name
*    else if fields has a "type" field, use that to determine type name
*    else don't include type 
*
*    ignoring JBrowse ID / name fields for now
*    currently, for features with lazy-loaded children, ignores children 
*/
JSONUtils.createApolloFeature = function( jfeature )   {

    var afeature = new Object();
    afeature.location = {
	"fmin": jfeature.get('start'),
	"fmax": jfeature.get('end'),
	"strand": jfeature.get('strand')
    };

    var typename;
    if (specified_type)  {
	typename = specified_type;
    }
//    else if (fields["type"])  { typename = jfeature[fields["type"]]; }
    else if ( jfeature.get('type') ) {
	typename = jfeature.get('type');
    }

    if (typename)  {
	afeature.type = {
	    "cv": {
//		"name": "SO"
		"name": "sequence"
	    }
	};
	afeature.type.name = typename;
    }
    //    if (fields["subfeatures"])  {
    // var subfeats = jfeature[fields["subfeatures"]];
    var subfeats = jfeature.get('subfeatures');
    if( subfeats && subfeats.length )  {
	afeature.children = new Array();
	var slength = subfeats.length;
	for (var i=0; i<slength; i++)  {
	    var subfeat = subfeats[i];
	    // afeature.children[i] = JSONUtils.createApolloFeature(subfeat, subfields);
	    //  var subtype = subfeat[subfields["type"]];
	    var subtype = subfeat.get('type');
	    // if "wholeCDS", then translate to the equivalent "CDS" for server
	    if (subtype === "wholeCDS" || subtype === "polypeptide") {
		afeature.children[i] = JSONUtils.createApolloFeature( subfeat, "CDS");
	    }
	    else  {  // currently client "CDS" (CDS-segment), "UTR", etc. are all converted to "exon"
		afeature.children[i] = JSONUtils.createApolloFeature( subfeat, "exon");
	    }
	}
    }
    return afeature;
};


/*
*  takes a feature from a source_track and returns equivalent feature for a target_track, 
*       based on inspection of feature fields and subfields
*  only doing data conversion:
*       returned feature is _not_ added to target_track (if desired, must do elsewhere)
*       no rendering or div creation
*
*  GAH TODO:  need to make this more generic 
*       maybe loop through all fields of newfeat, populate any that have corresponding fields in feat, 
*          if no corresponding field then set to null (or undefined?)
*/
JSONUtils.convertToTrack = function(feat, source_track, target_track)  {
// JSONUtils.convertToTrack = function(arep, feat, is_subfeat, source_track, target_track)  {
    var newfeat = new Array();
    var source_arep = source_track.attrs;
    console.log(source_track);
    console.log(source_arep);
    var target_arep = target_track.attrs;
//    var source_fields = source_track.fields;
//    var source_subfields = source_track.subFields;
//    var target_fields = target_track.fields;
//    var target_subfields = target_track.subFields;
//    if (is_subfeat)  {
//	source_fields = source_subfields;
//	target_fields = target_subfields;
//    }
    // feature class assignment
    // this doesn't really work across tracks though (different class data structs) !!!
    newfeat[0] = feat[0];
    target_arep.set(newfeat, "Start",  source_arep.get(feat, "Start"));
    target_arep.set(newfeat, "End",    source_arep.get(feat, "End"));
    target_arep.set(newfeat, "Strand", source_arep.get(feat, "Strand"));
//    if (target_fields["id"])  {
//	newfeat[target_fields["id"]] = feat[source_fields["id"]];
//    }
    if (target_arep.hasDefinedAttribute(newfeat, "Id"))  {
	target_arep.set(newfeat, "Id", source_arep.get(feat, "Id"));
    }
    if (target_arep.hasDefinedAttribute(newfeat, "Name"))  {
	if (source_arep.hasDefinedAttribute(feat, "Name")) {
	    var source_name = source_arep.get(feat, "Name");
	}
	else  {
	     var source_name = source_arep.get(feat, "Id");
	}
	target_arep.set(newfeat, "Name", source_name);
    }
    if (target_arep.hasDefinedAttribute(newfeat, "Type"))  {
	target_arep.set(newfeat, "Type", source_arep.get(feat, "Type"));
    }

//    if (target_fields["subfeatures"] && source_fields["subfeatures"])   { 
    if (target_arep.hasDefinedAttribute(feat, "Subfeatures") &&
	source_arep.hasDefinedAttribute(newfeat, "Subfeatures"))  {

	var newsubfeats = new Array();
	// var subfeats = feat[source_fields["subfeatures"]];
	var subfeats = source_arep.get(feat, "Subfeatures"); 
	if (subfeats)  {
	    var slength = subfeats.length;
	    for (var i = 0; i<slength; i++)  {
		var oldsub = subfeats[i];
		var newsub = new Array();
		// not reliable!  need better way of mapping class data structs, and setting
		newsub[0] = oldsub[0];
		target_arep.set(newsub, "Start", source_arep.get(oldsub, "Start") );
		target_arep.set(newsub, "End", source_arep.get(oldsub, "End") );
		target_arep.set(newsub, "Strand", source_arep.get(oldsub, "Strand") );
		target_arep.set(newsub, "Type", source_arep.get(oldsub, "Type") );
		newsub.parent = newfeat;
		if (oldsub.uid)  {
		    newsub.uid = oldsub.uid;
		}
		newsubfeats[i] = newsub;
	    }
	}
	// newfeat[target_fields["subfeatures"]]  = newsubfeats;
	target_arep.set(newfeat, "Subfeatures", newsubfeats);
    }
    newfeat.uid = feat.uid;
    return newfeat;
};

/*
*  takes one parsed GFF3 feature and all of its subfeatures (children/grandchildren/great-grandchildren/...) 
*  from a parsed GFF3 data struct (returned from GFF3toJson()), and returns a a two-level feature array for 
*  the lowest and next-lowest level. For example, given a data struct for a parsed gene/mRNA/exon GFF3
*  it would return a two-level feature array for the mRNA and all of it's exons. 
*/

// JSONUtils.prototype.convertParsedGFF3JsonToFeatureArray = function(jsonFeature) {
JSONUtils.convertParsedGFF3JsonToFeatureArray = function(jsonFeature) {
    var featureArray = new Array();
    // set to zero because we want jbrowse/webapollo to look at the first entry in attr array to 
    // look up what each of the following fields in featureArray mean
    featureArray[0] = 0; 

    // figure out how many levels we are dealing with here, b/c we need to return 
    // only the data for the lowest contained in the next lowest level, since Webapollo 
    // can only deal with two-level features. 
    var gff3Depth = JSONUtils.determineParsedGff3Depth(jsonFeature);
    
    console.log("parsed depth: ", gff3Depth);

    // okay, we know the depth, go down to gff3Depth - 1, and pull the first feature at this
    // depth and its children. We're going to assume there is only one feature at this depth
    // and ignore any subsequent features.

    // get parent in jsonFeature.parsedData, which is at depth - 1
    var thisParent = JSONUtils.getFeatureAtGivenDepth(jsonFeature, gff3Depth - 1);

    //
    // now set parent info
    // 
    featureArray[1] = parseInt(thisParent.data[3]); // set start
    featureArray[2] = parseInt(thisParent.data[4]); // set end
    featureArray[3] = thisParent.data[6]; // set strand
    featureArray[4] = thisParent.data[1]; // set source
    featureArray[5] = thisParent.data[7]; // set phase
    featureArray[6] = thisParent.data[2]; // set type
    featureArray[7] = thisParent.data[5]; // set score
    featureArray[8] = thisParent.ID; // set id

    var parsedNinthField = JSONUtils.parsedNinthGff3Field(thisParent.data[8]);  
    if ( !!parsedNinthField["Name"] ){
	featureArray[9] = parsedNinthField["Name"];
    }

    // 
    // now set children info 
    // 
    var childrenArray = new Array; // make array for all child features
     if ( !!thisParent.children ){
 	for ( i = 0; i < thisParent.children.length; i++ ){
 	    childrenArray[i] = new Array;
 	    childrenArray[i][0] = 1; // ? 
 	    childrenArray[i][1] = parseInt(thisParent.children[i].data[3]); // start
 	    childrenArray[i][2] = parseInt(thisParent.children[i].data[4]); // end
 	    childrenArray[i][3] = thisParent.children[i].data[6]; // strand
 	    childrenArray[i][4] = thisParent.children[i].data[1]; // source
 	    childrenArray[i][5] = thisParent.children[i].data[7]; // phase
 	    childrenArray[i][6] = thisParent.children[i].data[2]; // type
 	    childrenArray[i][7] = thisParent.children[i].data[5]; // score

 	    var childNinthField = JSONUtils.parsedNinthGff3Field( thisParent.children[i].data[8] );
 	    if ( !!childNinthField["ID"] ){
		childrenArray[i][8] = childNinthField["ID"];
	    }
 	    if ( !!childNinthField["Name"] ){
		childrenArray[i][9] = childNinthField["Name"];
	    }
 	}
     }
     featureArray[10] = childrenArray; // load up children
    
    return featureArray;
};

// recursive search of this feature to see how many levels there are,
// helper for convertParsedGFF3JsonToFeatureArray
JSONUtils.determineParsedGff3Depth = function(jsonFeature) {
    var recursion_level = 0;
    var maximum_recursion_level = 10; // paranoid about infinite recursion
    var determineNumLevels = function(thisJsonFeature) {
	recursion_level++;
	if ( recursion_level > maximum_recursion_level ){
	    return false;
	}
	// recurse if there there are children
	if ( thisJsonFeature.children != null && thisJsonFeature.children.length > 0 ){
	    if ( determineNumLevels(thisJsonFeature.children[0]) ){
		return true;
	    }
	}
	return false;
    };
    determineNumLevels( jsonFeature );
    return recursion_level;
};

/*JSONUtils.getFeaturesAtGivenDepth = function(jsonFeature, depth) {
    var recursion_level = 0;
    var maximum_recursion_level = 10; // paranoid about infinite recursion
    var getFeature = function(thisJsonFeature, thisDepth) {
	recursion_level++;
	if ( recursion_level > maximum_recursion_level ){
	    return null;
	}
	// are we at the right depth?
	if ( recursion_level == thisDepth ){
	    return thisJsonFeature;
	}
	else if ( thisJsonFeature.children != null && thisJsonFeature.children.length > 0 ){
	    var returnedFeature;
 	    if ( returnedFeature = getFeature(thisJsonFeature.children[0], depth) ){
 		return returnedFeature;
 	    }
	}
    };
    return getFeature( jsonFeature, depth );
};
*/


// helper feature for convertParsedGFF3JsonToFeatureArray
// that returns the feature at a given depth
JSONUtils.getFeatureAtGivenDepth = function(jsonFeature, depth) {
    var recursion_level = 0;
    var maximum_recursion_level = 10; // paranoid about infinite recursion
    var getFeature = function(thisJsonFeature, thisDepth) {
	recursion_level++;
	if ( recursion_level > maximum_recursion_level ){
	    return null;
	}
	// are we at the right depth?
	if ( recursion_level == thisDepth ){
	    return thisJsonFeature;
	}
	else if ( thisJsonFeature.children != null && thisJsonFeature.children.length > 0 ){
	    return getFeatureAtGivenDepth(thisJsonFeature.children[0], depth);
//	    var returnedFeature;
// 	    if ( returnedFeature = getFeature(thisJsonFeature.children[0], depth) ){
// 		return returnedFeature;
// 	    }
	}
    };
    return getFeature( jsonFeature, depth );
};

// helper feature for convertParsedGFF3JsonToFeatureArray
// that parsed ninth field of gff3 file
JSONUtils.parsedNinthGff3Field = function(ninthField) {
    // parse info in 9th field to get name
    var ninthFieldArray = ninthField.split(";");
    var parsedNinthField = new Object; 
    for ( j = 0; j < ninthFieldArray.length; j++){
	var keyVal = ninthFieldArray[j].split("=");
	parsedNinthField[ keyVal[0] ] = keyVal[1];
    }
    return parsedNinthField;
}

return JSONUtils;
});