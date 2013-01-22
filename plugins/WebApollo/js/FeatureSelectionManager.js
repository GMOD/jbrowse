define( [ 'dojo/_base/declare' ],
        function( declare ) {

return declare( null,
{
    /**
     *  Selection manager for bio-features
     *     handles deselection of any ancestors/descendants of selected features
     *        (which is desired behavior for feature selection)
     *     assumes features have had their parent property set before calling selection manager methods
     *  Sends selectionAdded() and selectionRemoved() function calls to listeners
     */
    constructor: function()  {
        this.selected = [];
        this.listeners = [];
        this.clearOnAdd = [];
        this.unselectableTypes = { "non_canonical_five_prime_splice_site" : true, 
			           "non_canonical_three_prime_splice_site" : true };
    },

    /**
     *  sets an array of other FeatureSelectionManagers to call clearSelection() on 
     *     whenever addToSelection() is called on _this_ FeatureSelectionManager
     *     effectively ensures that selection is mutually exclusive between this manager 
     *        and the set of other managers passed in as setClearOnAdd args
     */
    //FeatureSelectionManager.prototype.setClearOnAdd = function(other_smanagers)  {
    //    this.clearOnAdd = other_smanagers;
    //};
    addMutualExclusion: function(other_smanager)  {
        this.clearOnAdd.push(other_smanager);
    },

    // adding a parent should remove all children
    // adding a child should remove all parents
    // attempting to add a feature that's already part of the selection does nothing (and doesn't trigger listener calls)
    addToSelection: function( rec )  {

        // if this selection manager has had setClearOnAdd(others)
        // called to set other selection managers to clear selection
        // from when
        if (this.clearOnAdd)  {
	    for (var i=0; i<this.clearOnAdd.length; i++)  {
	        this.clearOnAdd[i].clearSelection();
	    }
        }
        //    console.log("called FeatureselectionManager.addToSelection()");
        // do nothing if feat is already in selection
        if ( this.isSelected( rec ) )  {
	    console.log("called FeatureSelectionManager.addToSelection(), but feature already in selection");
	    return;
        }
        // remove any children of the selected feature (originating from same track)
        var selarray = this.selected;
        var slength = selarray.length;
        for ( var sindex = 0; sindex < slength; sindex++ )  {
            var srec = selarray[sindex];
	    if ( srec.feature.parent() == rec.feature && srec.track == rec.track )  {
	        this._removeSelectionAt(sindex);
	        slength--;
	    }
        }

        // remove any parents of the selected feature (originating from same track)
        var parent = rec.feature.parent();
        if( parent )  {
	    this.removeFromSelection( { feature: parent, track: rec.track } );
        }
        selarray.push( rec );
        var lislength = this.listeners.length;
        for (var lindex = 0; lindex < lislength; lindex++)  {
	    var listener = this.listeners[lindex];
	    listener.selectionAdded( rec, this );
        }
        //    console.log("done calling FeatureselectionManager.addToSelection()");
    },

    /**
     *  attempting to remove a feature that isn't selected does nothing (and doesn't trigger listener calls)
     */
    removeFromSelection: function( rec )  {
        var index = this._indexOf( rec );
        if (index >= 0)  {
	    this._removeSelectionAt(index);
        }
    },

    _removeSelectionAt: function( index )  {
	var rec = this.selected[index];
        this.selected.splice(index, 1);
        var lislength = this.listeners.length;
        for (var lindex = 0; lindex<lislength; lindex++)  {
	    var listener = this.listeners[lindex];
	    listener.selectionRemoved(rec, this);
        }
    },

    _indexOf: function( rec ) {
        var index = -1;
        for( var i = 0; i < this.selected.length; i++ ) {
            if( this.selected[i].feature === rec.feature && this.selected[i].track == rec.track )
                index = i;
        }
        return index;
    },

    /**
     *  clearing an empty selection does nothing (and doesn't trigger listener calls)
     *
     *  intended for optimizing when selection is cleared, rather than 
     *     multiple calls to removeSelectionAt (and subsequent multiple calls to listeners.selectionRemoved();
     */
    clearSelection: function()  {
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
    },

    isSelected: function( rec )  {
        return this._indexOf( rec ) >= 0;
    },

    /**
     * returns array of currently selected feature records { feature: feature, track: track }
     * this is a (shallow) copy of the selected array, therefore a snapshot of what is selected 
     *     as of when getSelection is called
     *  so if selection changes, previous value returned from getSelection will not change
     */
    getSelection: function()  {
        //    return this.selected;
        //    return this.selected.slice(0);  // return shallow copy of array
        return this.selected.slice(0, this.selected.length);  // return shallow copy of array
    },

    /**
     *  since getSelection now returns feature records { feature: feature, track: track }, 
     *  also want a method that returns only the feautures (not wrapped in records)
     */
    getSelectedFeatures: function()  {
	var selfeats = new Array(this.selected.length);
	for (var i=0; i<this.selected.length; i++)  {
	    selfeats[i] = this.selected[i].feature;
	}
	return selfeats;
    }, 

    addListener: function( listener )  {
	var index = dojo.indexOf(this.listeners, listener);
	if( index < 0 )  {  // only add if not already in listener list
	    this.listeners.push(listener);
	}
    },

    removeListener: function( listener )  {
        var index = dojo.indexOf(this.listeners, listener);
        if( index >= 0 )  {  // only remove if already in listener list
	    this.listeners.splice(index, 1);
        }
    }
});
});