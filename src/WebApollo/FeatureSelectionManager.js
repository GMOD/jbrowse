/**
 *  Selection manager for bio-features
 *     handles deselection of any ancestors/descendants of selected features
 *        (which is desired behavior for feature selection)
 *     assumes features have had their parent property set before calling selection manager methods
 *  Sends selectionAdded() and selectionRemoved() function calls to listeners
 */
function FeatureSelectionManager()  {
    this.selected = [];
    this.listeners = [];
    this.clearOnAdd = [];
    this.unselectableTypes = { "non_canonical_five_prime_splice_site" : true, 
			       "non_canonical_three_prime_splice_site" : true };
};


/**
 *  sets an array of other FeatureSelectionManagers to call clearSelection() on 
 *     whenever addToSelection() is called on _this_ FeatureSelectionManager
 *     effectively ensures that selection is mutually exclusive between this manager 
 *        and the set of other managers passed in as setClearOnAdd args
 */
//FeatureSelectionManager.prototype.setClearOnAdd = function(other_smanagers)  {
//    this.clearOnAdd = other_smanagers;
//};
FeatureSelectionManager.prototype.addMutualExclusion = function(other_smanager)  {
    this.clearOnAdd.push(other_smanager);
}

// adding a parent should remove all children
// adding a child should remove all parents
// attempting to add a feature that's already part of the selection does nothing (and doesn't trigger listener calls)
FeatureSelectionManager.prototype.addToSelection = function(feat)  {
    // if this selection manager has had setClearOnAdd(others) called to set other selection managers to 
    //     clear selection from when 
    if (this.clearOnAdd)  {
	for (var i=0; i<this.clearOnAdd.length; i++)  {
	    this.clearOnAdd[i].clearSelection();
	}
    }
    //    console.log("called FeatureselectionManager.addToSelection()");
    // do nothing if feat is already in selection
    if (this.isSelected(feat))  {
	console.log("called FeatureSelectionManager.addToSelection(), but feature already in selection");
	return;
    }
    // remove any children
    var selarray = this.selected;
    var slength = selarray.length;
    for (var sindex=0; sindex<slength; sindex++)  {
	var sfeat = selarray[sindex];
	if (sfeat.parent == feat)  {
	    this._removeSelectionAt(sindex, sfeat);
	    slength--;
	}
    }
    // remove any parents
    var parent = feat.parent;
    if (parent)  {  
	this.removeFromSelection(parent);
    }
    selarray.push(feat);
    var lislength = this.listeners.length;
    for (var lindex = 0; lindex<lislength; lindex++)  {
	var listener = this.listeners[lindex];
	listener.selectionAdded(feat, this);
    }
    //    console.log("done calling FeatureselectionManager.addToSelection()");
};

/**
 *  attempting to remove a feature that isn't selected does nothing (and doesn't trigger listener calls)
 */
FeatureSelectionManager.prototype.removeFromSelection = function(feat)  {
    var index = this.selected.indexOf(feat);
    if (index >= 0)  {
	this._removeSelectionAt(index, feat);
    }
};

FeatureSelectionManager.prototype._removeSelectionAt = function(index, feat)  {
    this.selected.splice(index, 1);
    var lislength = this.listeners.length;
    for (var lindex = 0; lindex<lislength; lindex++)  {
	var listener = this.listeners[lindex];
	listener.selectionRemoved(feat, this);
    }
};

/**
 *  clearing an empty selection does nothing (and doesn't trigger listener calls)
 *
 *  intended for optimizing when selection is cleared, rather than 
 *     multiple calls to removeSelectionAt (and subsequent multiple calls to listeners.selectionRemoved();
 */
FeatureSelectionManager.prototype.clearSelection = function()  {
    //    console.log("called FeatureselectionManager.clearSelection()");
    var previous_selected = this.selected;
    this.selected = [];
    var lislength = this.listeners.length;
    for (var lindex=0; lindex<lislength; lindex++)  {
	var listener = this.listeners[lindex];
	listener.selectionCleared(previous_selected, this);
    }
    /*
      for (var sindex in previous_selected)  {
      var feat = previous_selected[sindex];
      for (var lindex in this.listeners)  {
      var listener = this.listeners[lindex];
      listener.selectionRemoved(feat);
      }
      }
    */
    //  console.log("done calling FeatureselectionManager.clearSelection()");
};

FeatureSelectionManager.prototype.isSelected = function(feat)  {
    return (this.selected.indexOf(feat) >= 0);
};

/**
 * returns array of currently selected features
 * this is a (shallow) copy of the selected array, therefore a snapshot of what is selected 
 *     as of when getSelection is called
 *  so if selection changes, previous value returned from getSelection will not change
 */  
FeatureSelectionManager.prototype.getSelection = function()  {
    //    return this.selected;
    //    return this.selected.slice(0);  // return shallow copy of array
    return this.selected.slice(0, this.selected.length);  // return shallow copy of array
};

FeatureSelectionManager.prototype.addListener = function(listener)  {
	var index = dojo.indexOf(this.listeners, listener);
	if (index < 0)  {  // only add if not already in listener list
		this.listeners.push(listener);
	}
};

FeatureSelectionManager.prototype.removeListener = function(listener)  {
    var index = dojo.indexOf(this.listeners, listener);
    if (index >= 0)  {  // only remove if already in listener list
	this.listeners.splice(index, 1);
    }

};

