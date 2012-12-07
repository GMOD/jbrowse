define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/Util',
         'JBrowse/Model/SimpleFeature'
       ],
       function( declare, array, Util, SimpleFeature ) {

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
var JAFeature = declare( SimpleFeature, {
    "-chains-": {
        constructor: "manual"
    },
    constructor: function( afeature, parent ) {
        this.afeature = afeature;
	if (parent)  { this._parent = parent; }
	
        // get the main data
        var loc = afeature.location;
	var pfeat = this;
        this.data = {
            start: loc.fmin,
            end: loc.fmax,
            strand: loc.strand,
            name: afeature.name,
            parent_id: afeature.parent_id,
            type: afeature.type.name, 
	    properties: afeature.properties
        };

	if (this.data.type === "CDS")  { 
	    this.data.type = "wholeCDS"; 
	}

        this._uniqueID = afeature.uniquename;

	// this doesn't work, since can be multiple properties with same CV term (comments, for example)
	//   could create arrray for each flattened cv-name for multiple values, but not sure what the point would be over 
	//   just making sure can access via get('properties') via above assignment into data object
        // parse the props
/*        var props = afeature.properties;
        dojo.forEach( props, function( p ) {
            var pn = p.type.cv.name+':'+p.type.name;
            this.data[pn] = p.value;
        }, this);
*/

	if (afeature.properties) {
    	    for (var i = 0; i < afeature.properties.length; ++i) {
    		var property = afeature.properties[i];
    		if (property.type.name == "comment" && property.value == "Manually set translation start") {
    		    // jfeature.manuallySetTranslationStart = true;
		    this.data.manuallySetTranslationStart = true;   // so can call feat.get('manuallySetTranslationStart')
		    if (this.parent())  { parent.data.manuallySetTranslationStart = true; }
    		}
    	    }
	}

	// moved subfeature assignment to bottom of feature construction, since subfeatures may need to call method on their parent
	//     only thing subfeature constructor won't have access to is parent.data.subfeatures
        // get the subfeatures              
	this.data.subfeatures = array.map( afeature.children, function(s) {
		return new JAFeature( s, pfeat);
	} );

    }
});

JSONUtils.JAFeature = JAFeature;

JSONUtils.createJBrowseFeature = function( afeature )  {
    return new JAFeature( afeature );
};


/**
 *  takes any JBrowse feature, returns a SimpleFeature "copy", 
 *        for which all properties returned by tags() are mutable (has set() method)
 *  needed since JBrowse features no longer necessarily mutable
 *    feature requirements:
 *         functions: id, parent, tags, get
 *         if subfeatures, then returned as array by feature.get('subfeatures')
 *      
 */
JSONUtils.makeSimpleFeature = function(feature, parent)  {
    result = new SimpleFeature({id: feature.id(), parent: (parent ? parent : feature.parent()) });
    var ftags = feature.tags();
    for (var tindex = 0; tindex < ftags.length; tindex++)  {  
	var tag = ftags[tindex];
	// forcing lower case, since still having case issues with NCList features
	result.set(tag.toLowerCase(), feature.get(tag.toLowerCase()));
    }
    var subfeats = feature.get('subfeatures');
    if (subfeats && (subfeats.length > 0))  {
	var simple_subfeats = [];
	for (var sindex = 0; sindex < subfeats.length; sindex++)  {
	    var simple_subfeat = JSONUtils.makeSimpleFeature(subfeats[sindex], this);
	    simple_subfeats.push(simple_subfeat);
	}
	result.set('subfeatures', simple_subfeats);
    }
    return result;
};

/**
*  creates a sequence alteration in JBrowse JSON format
*  takes as arguments:
*      arep: ArrayRepr for kind of JBrowse feature to output
*      afeature: sequence alteration in ApolloEditorService JSON format,
*/
JSONUtils.createJBrowseSequenceAlteration = function( afeature )  {
    var loc = afeature.location; 
    var uid = afeature.uniquename;

    return new SimpleFeature({
        data: {
            start:    loc.fmin,
            end:      loc.fmax,
            strand:   loc.strand,
            id:       uid,
            type:     afeature.type.name,
            residues: afeature.residues,
            seq:      afeature.residues
        },
        id: uid
    });
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
JSONUtils.createApolloFeature = function( jfeature, specified_type )   {

    var afeature = new Object();
    var astrand;
    // Apollo feature strand must be an integer
    //     either 1 (plus strand), -1 (minus strand), or 0? (not stranded or strand is unknown?)
    switch (jfeature.get('strand')) {  // strand
    case 1:
    case '+':
	astrand = 1; break;
    case -1:
    case '-':
	astrand = -1; break;
    default:
	astrand = 0; // either not stranded or strand is uknown
    }
    
    afeature.location = {
	"fmin": jfeature.get('start'),
	"fmax": jfeature.get('end'),
	"strand": astrand
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
*  takes one parsed GFF3 feature and all of its subfeatures (children/grandchildren/great-grandchildren/...) 
*  from a parsed GFF3 data struct (returned from GFF3toJson()), and returns a a two-level feature array for 
*  the lowest and next-lowest level. For example, given a data struct for a parsed gene/mRNA/exon GFF3
*  it would return a two-level feature array for the mRNA and all of it's exons. 
*/

JSONUtils.prototype.convertParsedGFF3JsonToFeatureArray = function(parsedGff3) {
    var featureArray = new Array();
    // set to zero because we want jbrowse/webapollo to look at the first entry in attr array to 
    // look up what each of the following fields in featureArray mean
    featureArray[0] = 0; 

    // figure out how many levels we are dealing with here, b/c we need to return 
    // only the data for the lowest contained in the next lowest level, since Webapollo 
    // can only deal with two-level features. 
    var jsu = new JSONUtils;
    var gff3Depth = jsu.determineParsedGff3Depth(parsedGff3);
    
    // okay, we know the depth, go down to gff3Depth - 1, and pull the first feature at this
    // depth and its children. We're going to assume there is only one feature at this depth
    // and ignore any subsequent features.

    // get parent in parsedGff3.parsedData, which is at depth - 1
    var thisParent = jsu.getFeatureAtGivenDepth(parsedGff3, gff3Depth - 1);
    if (! thisParent)  {
	// console.log("problem");
	// console.log(parsedGff3);
	return null;
    }

    //
    // now set parent info
    // 
    var rawdata = thisParent.data[0].rawdata;
    featureArray[1] = parseInt(rawdata[3]); // set start
    featureArray[2] = parseInt(rawdata[4]); // set end
    featureArray[3] = rawdata[6]; // set strand
    featureArray[4] = rawdata[1]; // set source
    featureArray[5] = rawdata[7]; // set phase
    featureArray[6] = rawdata[2]; // set type
    featureArray[7] = rawdata[5]; // set score
    featureArray[8] = thisParent.ID; // set id

    var parsedNinthField = JSONUtils.parsedNinthGff3Field(rawdata[8]);  
    if ( !!parsedNinthField["Name"] ){
	featureArray[9] = parsedNinthField["Name"];
    }
    else  { featureArray[9] = null; }

    // 
    // now set children info 
    // 
    var children = thisParent.children
    var subfeats = null; // make array for all child features
    if ( thisParent.children && (thisParent.children.length > 0))  {
	subfeats = [];
	for ( i = 0; i < thisParent.children.length; i++ ){
	    var childData = thisParent.children[i].data[0].rawdata;
	    var subfeat = [];

 	    subfeat[0] = 1; // ? 
 	    subfeat[1] = parseInt(childData[3]); // start
 	    subfeat[2] = parseInt(childData[4]); // end
 	    subfeat[3] = childData[6]; // strand
 	    subfeat[4] = childData[1]; // source
 	    subfeat[5] = childData[7]; // phase
 	    subfeat[6] = childData[2]; // type
 	    subfeat[7] = childData[5]; // score

 	    var childNinthField = JSONUtils.parsedNinthGff3Field( childData[8] );
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
    
    return featureArray;
};

// recursive search of this feature to see how many levels there are,
// helper for convertParsedGFF3JsonToFeatureArray. This determines the
// depth of the first feature it finds. 
JSONUtils.prototype.determineParsedGff3Depth = function(gffFeature) {
    var recursion_level = 0;
    var maximum_recursion_level = 10; // paranoid about infinite recursion
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
    }
    // determineNumLevels( parsedGff3.parsedData[0] );
    determineNumLevels( gffFeature );
    return recursion_level;
}; 

// helper feature for convertParsedGFF3JsonToFeatureArray
// that returns the feature at a given depth
// (it will return the first feature in the arrayref at 
// that depth)
JSONUtils.prototype.getFeatureAtGivenDepth = function(gffFeature, depth) {
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
	// else if ( thisJsonFeature[0].children != null && thisJsonFeature[0].children.length > 0 ){
	else if ( thisJsonFeature.children != null && thisJsonFeature.children.length > 0 ){
	    var returnedFeature;
 	    // if ( returnedFeature = getFeature(thisJsonFeature[0].children[0], depth) ){
	    if ( returnedFeature = getFeature(thisJsonFeature.children[0], depth) ){
 		return returnedFeature;
 	    }
	}
	}
//    return getFeature( parsedGff3.parsedData[0], depth );
    return getFeature( gffFeature, depth );
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
};

// experimenting with forcing export of JSONUtils into global namespace...
window.JSONUtils = JSONUtils;

return JSONUtils;
 
});