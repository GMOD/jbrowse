define( ['dojo/_base/declare'],
        function( declare ) {
return declare( null, {

//  returns modified parent, or null if removal of child would result in parent with empty child list
//  if want to go "only creation, no destruction" route,
//      could clone parent and return clone instead of original...
//  assumes already populated:
//     child.track
//     child.parent
//     child.parent.track
//
removeChild: function(child)  {
    // console.log("called BioFeatureUtils.removeChild");
    var parent = child.parent();
    var fields = parent.track.fields;
    var subfields = parent.track.subFields;
    var children = parent[fields["subfeatures"]];
    console.log(children);
    var index = children.indexOf(child);
    console.log(index);
    if (index < 0)  {
	// console.log("BioFeatureUtils ERROR: child not found in parent!!");
	return parent;
    }
    children.splice(index, 1);
    //    console.log(children);
    var clength = children.length;
    if (children.length === 0)  {
	// console.log("parent has no more children");
	return null;
    }
    else  {
	// console.log("rechecking parent bounds");
	var prevmin = parent[fields["start"]];
	var prevmax = parent[fields["end"]];
	var sibling = children[0];
	var newmin = sibling[subfields["start"]];
	var newmax = sibling[subfields["end"]];
	for (var cindex = 1; cindex<clength; cindex++)  {
	    sibling = children[cindex];
	    newmin = Math.min(newmin, sibling[subfields["start"]]);
	    newmax = Math.max(newmax, sibling[subfields["end"]]);
	}
	// console.log("checked all child bounds");
	if (newmin !== prevmin)  {
	    // console.log("changing parent min: " + newmin);
	    parent[fields["start"]] = newmin;
	}
	if (newmax !=  prevmax)  {
	    // console.log("changing parent max: " + newmin);
	    parent[fields["end"]] = newmax;
	}
	// console.log("returning from BioFeatureUtils.removeChild");
	return parent;
    }
}
});
});
