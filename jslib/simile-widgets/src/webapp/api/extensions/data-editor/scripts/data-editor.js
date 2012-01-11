/*
 * Data editor extension for Simile Exhibit (aka Felix2, codename 'Tigger').
 *    "But whatever his weight in pounds, shillings, and ounces, 
 *     He always seems bigger because of the bounces"
 *
 * Initial version developed by the Ensemble Project at Liverpool JMU.
 */

 /* 
  * Roles
  *   <div ex:role="editor">                         Editor lens definition
  *   <div ex:role="editorActivateButton">           Button to activate edit lens mode
  *   <div ex:role="editorEditButton">               Button to acitvate an individual edit lens
  *   <div ex:role="editorSaveButton">               Button to save
  *   <div ex:role="editorCancelButton">             Button to cancel
  *   <div ex:role="editorStatus">                   Validator messages, etc.
  *
  * *** FIXME: The below is not yet fully implemented. ***
  * Lifecycle
  *   Various events are fired during the lifecycle of an edit, paired as before and after an
  *   action.  The onBeforeX events may return false to cancel the action, meaning the
  *   corresponding onX event will never happen.  
  *
  *   The editor can either save individual fields after each is edited, or the whole item if
  *   a [SAVE] button is employed.  onSave's field and value parameters are null if the whole
  *   object is being saved.  An onSave event handler should return true if it *failed* to 
  *   persist its data -- unpersisted data causes a warning to the user when leaving the page.
  *
  *   Multiple event handlers may be registered with addEventhandler(), each as an object with 
  *   functions mapped to properties of the event name, thus:
  *     Exhibit.DataEdit.addEventHandler({
  *       onBeforeInit : function() { ... return false; } ,
  *       onInit : function() { ... }
  *     });
  *   For each event, each handler object is consulted, and if an appropriate property is found its
  *   function is called.  In the case of onBeforeX and onSave events, *all* handlers are called,
  *   and an aggregate return value is determined by AND'ing each individual return -- this 
  *   aggregate return is then used to determine whether the event action should abort (false==abort).
  *
  *   The onSave event also returns an aggregate -- each handler should return true if the persistence
  *   operation went well, and false if it failed.
  *
  *   onBeforeInit : boolean ()                      Run at start of $(document).ready() 
  *   onInit : void ()                               Run at end of $(document).ready()
  *   onBeforeActivate : boolean ()                  Run at start of Exhibit.DataEdit.activate
  *   onActivate : void ()                           Run at end of Exhibit.DataEdit.activate
  *   onBeforeActivateClose : boolean ()             Run if [Editor] toggle clicked to abort edit
  *   onActivateClose : void ()                      Run if [Editor] toggle clicked to abort edit
  *   onBeforeEdit : boolean (itemId)                Run at start of Exhibit.DataEdit.edit
  *   onEdit : void (itemId)                         Run at end of Exhibit.DataEdit.edit
  *   onBeforeDelete : boolean (itemId)              Run at start of Exhibit.DataEdit.delete
  *   onDelete : void (itemId)                       Run at end of Exhibit.DataEdit.delete
  *   onBeforeClone : boolean (itemId)               Run at start of Exhibit.DataEdit.clone
  *   onClone : void (itemId)                        Run at end of Exhibit.DataEdit.clone
  *   onBeforeSave : boolean (itemId,item)           Run at start of Exhibit.DataEdit.save
  *   onSave : boolean (itemId,item)                 Run at end of Exhibit.DataEdit.save
  *   onBeforeCancel : boolean ()                    Run at start of Exhibit.DataEdit.cancel
  *   onCancel : void ()                             Run at end of Exhibit.DataEdit.cancel
  */
 
/* FIXME: Should not be necessary.  Fixes problem with noConflict(true) call in Exhibit platform.js */
if(!window.jQuery) { window.jQuery = SimileAjax.jQuery; }

/** 'Constructor' */
Exhibit.DataEdit = function() {}


/* ========================================================================
 * Constants 'n' stuff...
 * ======================================================================== */

 /** Class used to find Edit/Save Boxes added to lens. */
Exhibit.DataEdit.EDIT_INJECT_MARKER = "exhibitDataEditMarker";
Exhibit.DataEdit.EDIT_DIV = "exhibitDataEditBar";
Exhibit.DataEdit.EDIT_BUTTON = "exhibitDataEditButton";
Exhibit.DataEdit.EDIT_MESSAGE = "exhibitDataEditError";

/** Roles. */
Exhibit.DataEdit.EDIT_ROLE_LENS = "editor";
Exhibit.DataEdit.EDIT_ROLE_ACTIVATE = "editorActivateButton";
Exhibit.DataEdit.EDIT_ROLE_EDIT = "editorEditButton";
Exhibit.DataEdit.EDIT_ROLE_DELETE = "editorDeleteButton";
Exhibit.DataEdit.EDIT_ROLE_CLONE = "editorCloneButton";
Exhibit.DataEdit.EDIT_ROLE_CREATE = "editorCreateButton";
Exhibit.DataEdit.EDIT_ROLE_SAVE = "editorSaveButton";
/*Exhibit.DataEdit.EDIT_ROLE_CANCEL = "editorCancelButton";*/
Exhibit.DataEdit.EDIT_ROLE_STATUS = "editorStatus";

/** Database mutation modes. */
Exhibit.DataEdit.CREATE_MODE = 1;
Exhibit.DataEdit.UPDATE_MODE = 2;
Exhibit.DataEdit.DELETE_MODE = 3;

/** Debug mode? */
Exhibit.DataEdit._DEBUG_ = false;

/** Editor lock -- prevent editor from being invoked when already open. */
Exhibit.DataEdit._lock_ = false;
/** Currently active editors. */
Exhibit.DataEdit._editors_ = null;
/** Used to hold externally registered lifecycle callbacks. */
Exhibit.DataEdit._lifeCycleEventHandlers_ = [];


/* ========================================================================
 * Edit steps
 * ======================================================================== */

/** STEP1: Activate edit mode. */
Exhibit.DataEdit.activate = function() {
	var self = this;
	// Locked?  Cancel.
	if(Exhibit.DataEdit._lock_) { 
		if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeActivateClose')) { return; }
		/*Exhibit.DataEdit.cancel();*/
		database._listeners.fire("onAfterLoadingItems",[]);
		Exhibit.DataEdit._setEditLock(false);
		Exhibit.DataEdit._invokeEventHandlers('onActivateClose');
		return;
	}

	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeActivate')) { return; }
	Exhibit.DataEdit._setEditLock(true);
	//Exhibit.UI.showBusyIndicator();
	// Editors
	Exhibit.DataEdit._editors_ = {};
	// Go through each ex:itemid, making <div> selectable for editing
	var filter = function(idx) { return $(this).attr("ex:itemid"); }
	$('*').filter(filter).each(function(idx) {  // See http://bugs.jquery.com/ticket/3729
		var id = $(this).attr("ex:itemid");
		// Did the display lens contain an ex:role="editorEdit"?  (Note: ex:role attr has been 
		// rewritten as _ex:role, to survive display lens capture/render code) 
		var filterEdit = function(idx) { return $(this).attr("_ex:role")==Exhibit.DataEdit.EDIT_ROLE_EDIT; }
		var l = $('*',this).filter(filterEdit);  // Important: see FIXME [1] at foot of code
		if(l.length>0) {
			// Yes: display user's <div>
			l.each(function(idx) {
				$(this).css('display','Block');
				$(this).click(function() { Exhibit.DataEdit.edit(id); });  // Attach onclick
			});
			// Now look for new/clone/delete buttons
			var filterDelete = function(idx) { return $(this).attr("_ex:role")==Exhibit.DataEdit.EDIT_ROLE_DELETE; }
			$('*',this).filter(filterDelete).each(function(idx) {
				$(this).css('display','Block');
				$(this).click(function() { Exhibit.DataEdit.de1ete(id); });  // Attach onclick
			});
			var filterClone = function(idx) { return $(this).attr("_ex:role")==Exhibit.DataEdit.EDIT_ROLE_CLONE; }
			$('*',this).filter(filterClone).each(function(idx) {
				$(this).css('display','Block');
				$(this).click(function() { Exhibit.DataEdit.clone(id); });  // Attach onclick
			});
			var filterCreate = function(idx) { return $(this).attr("_ex:role")==Exhibit.DataEdit.EDIT_ROLE_CREATE; }
			$('*',this).filter(filterCreate).each(function(idx) {
				$(this).css('display','Block');
				$(this).click(function() { Exhibit.DataEdit.create(id); });  // Attach onclick
			});
		} else {
			// No: add overlay to display <div>
			// Add clickable overlay onto display lens.
			var xy = $(this).offset();
			var w = $(this).outerWidth(true);  // Width / height inc. margins and padding. 
			var h = $(this).outerHeight(true);
			// Due to limitations with the way IE7/8 handles mouse events, we need to create
			// an invisible (but 'painted', as in it is filled with a bg col) inner <div>
			var markerId = '__MARKER__'+Exhibit.DataEdit.Editor._escapeString(id);
			var overlay = 
				'<div id="'+markerId+'" '+
					'class="'+Exhibit.DataEdit.EDIT_INJECT_MARKER+'" '+
					'onMouseOver="Exhibit.DataEdit._rollIn_(this)" onMouseOut="Exhibit.DataEdit._rollOut_(this)" '+
					'style="position:Absolute ; top:'+xy.top+'px ; left:'+xy.left+'px ; width:'+w+'px ; height:'+h+'px ; '+
						'cursor:Help ; border:2px #dddddd Dotted;">'+
					'<div '+
						'onclick="Exhibit.DataEdit.edit(\''+id+'\')" '+
						'style="width:'+w+'px ; height:'+h+'px ; '+
							'background:Black; opacity:0.0; filter:alpha(opacity=0); -ms-filter:"progid:DXImageTransform.Microsoft.Alpha(Opacity=0);">'+
					'</div>'+
					'<div class="__buttonBar__" style="position:Absolute ; top:4px ; right: 2px ; display:None; background:Red ; color:White ; padding:0.25em 0.5em">'+
						'<span onclick="Exhibit.DataEdit.create(\''+id+'\')" '+
							'style="text-decoration:Underline ; cursor:Pointer ;">New</span>'+
						'&nbsp;|&nbsp;'+
						'<span onclick="Exhibit.DataEdit.clone(\''+id+'\')" '+
							'style="text-decoration:Underline ; cursor:Pointer ;">Clone</span>'+
						'&nbsp;|&nbsp;'+
						'<span onclick="Exhibit.DataEdit.de1ete(\''+id+'\')" '+
							'style="text-decoration:Underline ; cursor:Pointer ;">Delete</span>'+
					'</div>'+
				'</div>';
			$(this).append(overlay);
		}
	});
	
	//Exhibit.UI.hideBusyIndicator();
	Exhibit.DataEdit._invokeEventHandlers('onActivate');
}
Exhibit.DataEdit._rollIn_ = function(div) {
	$(div).css('border','2px Red Dotted');  // Strong dotted band
	$('.__buttonBar__',div).css('display','Block');  // Show buttons
}
Exhibit.DataEdit._rollOut_ = function(div) { 
	$(div).css('border',"2px #dddddd Dotted");  // Faint dotted band
	$('.__buttonBar__',div).css('display','None');  // Hide buttons
}

/** STEP2a: Click on [edit] link. */
Exhibit.DataEdit.edit = function(itemId) {
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeEdit',itemId)) { return; }

	var self = this;	
	var filter = function(idx) { return ($(this).attr("ex:itemid")); }
	// FIXME: Can we be more efficient than '*' ?
	$('*').filter(filter).each(function(idx) {
		var id = $(this).attr("ex:itemid");
		var markerId = '__MARKER__'+Exhibit.DataEdit.Editor._escapeString(id);
		// If this is the item/lens selected for editing, change to editor
		if(id == itemId) {
			// Hide user defined <div ex:role="editorEditButton"> (if they exist)
			var filterEdit = function(idx) { return $(this).attr("_ex:role")==Exhibit.DataEdit.EDIT_ROLE_EDIT; }
			$('*',this).filter(filterEdit).css('display','None');  // Important: see FIXME [1] at foot of code
			// Strip away edit overlay (red dotted box) if exists
			$('#'+markerId,this).remove();
			// Display lens...
			// var lens = new Exhibit.DataEdit.Lens(el);
			var editor = new Exhibit.DataEdit.Editor(itemId,this); 
			Exhibit.DataEdit._editors_[itemId] = editor;
			editor.apply();
		} else {
			// Move the edit marker (red dotted box) if exists, to account for
			// rejigging of page caused by editor.
			var xy = $(this).offset();
			$('#'+markerId,this).css('top',xy.top+'px').css('left',xy.left+'px');
		}
	});

	Exhibit.DataEdit._invokeEventHandlers('onEdit',itemId);
}

/** STEP2b: Click on [delete] link. */
/* IMPORTANT: this function is named de-ONE-ete,  IE can't use keywords for functions names, apparently! */
Exhibit.DataEdit.de1ete = function(itemId) {
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeDelete',itemId)) { return; }
	
	// Delete all objects relating to properties of this item?
	if(confirm("Do you really want to delete this item?\nItem: "+itemId)) {
		var item = database._spo[itemId];
		for(p in item) {
			database.removeObjects(itemId,p);
		}
	} else { 
		return;  // confirm() == false
	}
	// Cause Exhibit to re-eval its views/facets, and close edit window
	database._listeners.fire("onAfterLoadingItems",[]);
	Exhibit.DataEdit._setEditLock(false);  // FIXME try/catch/*finally*
	
	Exhibit.DataEdit._invokeEventHandlers('onDelete',itemId);
}

/** STEP2c: Click on [clone] link. */
Exhibit.DataEdit.clone = function(itemId) {
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeClone',itemId)) { return; }
	
	// Clone this item?
	if(confirm("Do you really want to clone this item?\nItem: "+itemId)) {
		// Item uses label or id as 'key'?
		var keyProp = (database.getObject(itemId,'id')) ? 'id' : 'label';
		var _id = database.getObject(itemId,keyProp);
		if(!_id || _id!=itemId) { return; } // _id!=itemId should never fail!!
		// If the id ends in digits, attempt to increment
		if(_id.match(/\d+$/)) {
			// Ends in digit, increment until we get unique id
			var m = _id.match(/(.*?)(\d*)$/);  // m[1]=base m[2]=digits
			var base = m[1];
			var n = (m[2].length) ? parseInt(m[2]) : 0;  // Test should never be false!
			do { n++; } while(database.containsItem(base+n));
			_id = base+n;
		} else {
			// Doesn't end in digit, so add one
			_id = _id+'2';
		}
		// Deep clone item
		var srcItem = database._spo[itemId];
		var destItem = {};
		for(var p in srcItem) {
			var sa = srcItem[p];
			if(typeof sa == 'object') {
				var da = [];
				for(var i in sa) { da.push(sa[i]); }
				destItem[p] = da;
			} else {
				destItem[p] = sa;
			}
		}
		// Change id/label, call cloning callback
		destItem[keyProp] = [_id];
		var hType = 'onCloning';
		for(var i=0;i<Exhibit.DataEdit._lifeCycleEventHandlers_.length;i++) {
			var handler = Exhibit.DataEdit._lifeCycleEventHandlers_[i];
			destItem = (handler[hType]) ? handler[hType](itemId,_id,destItem) : destItem;
		}
		// Save cloned item
		database.loadData( { items:[destItem] } );
	} else {
		return;  // confirm() == false
	}
	// Cause Exhibit to re-eval its views/facets, and close edit window
	database._listeners.fire("onAfterLoadingItems",[]);
	Exhibit.DataEdit._setEditLock(false);  // FIXME try/catch/*finally*
	
	Exhibit.DataEdit._invokeEventHandlers('onClone',itemId);
}

/** STEP2d: Click on [new] link. */
Exhibit.DataEdit.create = function(itemId) {
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeCreate',itemId)) { return; }
	
	var item = {};
	// Create empty item using source example
	var srcItem = database._spo[itemId];
	for(p in srcItem) {
		var o = database.getObject(itemId,p);
		if(typeof o=='number') {
			item[p] = 0;
		}
		else if(typeof o=='boolean') {
			item[p] = false;
		}
		else if(typeof o=='string') {
			if(o.match(/^(\+|\-)?\d+(\.\d+)?$/)) { item[p]=0; }
			else { item[p]=''; }
		}
		else {
			item[p] = '';
		}
	}
	// Clone source item's type
	var type = database.getObject(itemId,'type');
	item['type'] = (type) ? type : 'item';
	// Key
	var keyProp = (database.getObject(itemId,'id')) ? 'id' : 'label';
	item[keyProp] = 'item' + (new Date().getTime());
	// Call creating callback
	var hType = 'onCreating';
	for(var i=0;i<Exhibit.DataEdit._lifeCycleEventHandlers_.length;i++) {
		var handler = Exhibit.DataEdit._lifeCycleEventHandlers_[i];
		item = (handler[hType]) ? handler[hType](item[keyProp],item) : item;
	}
	// Save
	database.loadData( { items:[item] } );

	// Cause Exhibit to re-eval its views/facets, and close edit window
	database._listeners.fire("onAfterLoadingItems",[]);
	Exhibit.DataEdit._setEditLock(false);  // FIXME try/catch/*finally*
	
	Exhibit.DataEdit._invokeEventHandlers('onCreate',itemId);
}

/** STEP3a: Click on [save] link. */
Exhibit.DataEdit.save = function(itemId) {
	var self = this;

	var mode = Exhibit.DataEdit.UPDATE_MODE;
	var editor = Exhibit.DataEdit._editors_[itemId];
	var fields = editor.getFields();

	Exhibit.DataEdit._onSaveMessages = [];
	
	// Build an item dictionary
	var item = {};
	for(var fieldId in fields) { item[fieldId] = fields[fieldId].getValue(); }
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeSave',itemId,item)) { return; }

	// Reset all error indicators
	for(var fieldId in fields) { fields[fieldId].setError(false); }
	// Save fields
	for(var fieldId in fields) {
		var f = fields[fieldId];
		if( Exhibit.DataEdit._saveField(itemId,fieldId,f) ) { return; }
	}
	// Cause Exhibit to re-eval its views/facets, and close edit window
	/* Reloading Exhibit on save not supported after multi item edit introduced.
	database._listeners.fire("onAfterLoadingItems",[]);
	Exhibit.DataEdit._setEditLock(false);  // FIXME try/catch/*finally*
	*/
	
	var success = Exhibit.DataEdit._invokeEventHandlers('onSave',itemId,item);
	Exhibit.DataEdit._checkForSaveFailure(success);
}

/** STEP3b: Click on [cancel] link. */
/*  [CANCEL] no longer supported after multi item edit introduced.
Exhibit.DataEdit.cancel = function() {
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeCancel')) { return; }

	//var self = this;
	database._listeners.fire("onAfterLoadingItems",[]);
	Exhibit.DataEdit._setEditLock(false);  // FIXME try/catch/*finally*

	Exhibit.DataEdit._invokeEventHandlers('onCancel');
}
*/

/* Set up clear the edit lock (also set the edit button appearence). */
Exhibit.DataEdit._setEditLock = function(b) {
	Exhibit.DataEdit._lock_ = b;
	// Alter the global button
	// FIXME: For speed, cache result from selector?
	$('.exhibitDataEditButton #editorToggleSymbol').html(
		Exhibit.DataEdit._lock_ ? '<span class="on">&#10004;</span>' : '<span class="off">&#10006;</span>');
	$('.exhibitDataEditButton #editorToggleText').html(
		Exhibit.DataEdit._lock_ ? 'Stop editing' : 'Start editing');
}

/* When in field saving mode (because [SAVE] button missing) each editing 
 * component checks in here when their onChange is triggered, with their
 * itemId and fieldId. */
Exhibit.DataEdit.onChange = function(itemId,fieldId) {
	var editor = Exhibit.DataEdit._editors_[itemId];
	var fields = editor.getFields();
	var f = fields[fieldId];
	
	var item = {};
	item[fieldId] = f.getValue();
	
	Exhibit.DataEdit._onSaveMessages = [];
	
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeSave',itemId,item)) { return; }
	if( Exhibit.DataEdit._saveField(itemId,fieldId,f) ) {
		// Find status element, if exists, and display error message
		// FIXME: For speed, cache result from selector?
		$('.'+Exhibit.DataEdit.STATUS_CLASS).each(function(idx) { $(this).html(err); });
	}
	var success = Exhibit.DataEdit._invokeEventHandlers('onSave',itemId,item);
	Exhibit.DataEdit._checkForSaveFailure(success);
}

/** Varargs log function, using special array 'arguments', and apply() */
Exhibit.DataEdit.log = function() {
	if(window.console && Exhibit.DataEdit._DEBUG_) { console.log.apply(this,arguments); }
}

/* Convenience */
Exhibit.DataEdit._checkForSaveFailure = function(success) {
	if(!success) { 
		if(Exhibit.DataEdit.onSaveFailed) {
			// Call user defined error handler.
			Exhibit.DataEdit.onSaveFailed(Exhibit.DataEdit._onSaveMessages)
		} else if(Exhibit.DataEdit._onSaveMessages.length>0) {
			// If there are messages to show, and no error handler, alert().
			var s = "";
			for(var i=0;i<Exhibit.DataEdit._onSaveMessages.length;i++) { 
				s=s+Exhibit.DataEdit._onSaveMessages[i]+'\n';
			}
			alert(s);
		}
	}
}

/* ========================================================================
 * Database
 * ======================================================================== */

/** Save a given field for given item. */
Exhibit.DataEdit._saveField = function(itemId,fieldId,f) {
	var mode = Exhibit.DataEdit.UPDATE_MODE;
	
	var val = f.getValue();
	var validators = f._validators;
	// Perform validation
	if(validators) {
		var _vNames = validators.split(',');
		for(var i=0;i<_vNames.length;i++) {
			var err = null;
			var v = _vNames[i];
			// Check internal validators first
			var found = false;
			var vl = v.toLowerCase();
			if(Exhibit.DataEdit._internalValidators[vl]) { 
				err = Exhibit.DataEdit._internalValidators[vl](val);
				found = true;
			}
			if(!found && (window[v]) && (typeof window[v]=='function')) {
				err = window[v](val);
				found = true;
			}
			if(!found) {} // FIXME: Do something useful!
			// Did we get an error?
			if(err!=null) {
				// Find status element, if exists, and display error message
				// FIXME: For speed, cache result from selector?
				if($('#'+Exhibit.DataEdit.EDIT_MESSAGE).length) {
					$('#'+Exhibit.DataEdit.EDIT_MESSAGE).html(err);
				} else {
					alert(err);
				}
				// Change field itself
				f.setError(true);
				return true; // Exit wirh error
			}
		}
	}
	// Perform save
	if((mode==Exhibit.DataEdit.UPDATE_MODE) && (val!=undefined)) {
		database.removeObjects(itemId,fieldId);
		if(val instanceof Array) {
			Exhibit.DataEdit.log("Updating(array)",fieldId,val);
			for(var j=0;j<val.length;j++) { database.addStatement(itemId,fieldId,val[j]); }
		} else {
			Exhibit.DataEdit.log("Updating(scalar)",fieldId,val);
			database.addStatement(itemId,fieldId,val);
		}
	} else if((mode==Exhibit.DataEdit.CREATE_MODE) && (val!=undefined)) {
		Exhibit.DataEdit.log("Creating",fieldId,val);
		//database.loadData( { items:[item] } );
	} else if(mode == Exhibit.DataEdit.DELETE_MODE) {
		Exhibit.DataEdit.log("Deleting",fieldId,val);
		database.removeObjects(itemId,fieldId);
	}
	return false;
}



/* ========================================================================
 * Life cycle event handlers
 * ======================================================================== */

/** Called by external code to register an event handler object. */
Exhibit.DataEdit.addEventHandler = function(h) {
	if(h) { Exhibit.DataEdit._lifeCycleEventHandlers_.push(h); }
}
/** Called interally, to fire events for given type. */
Exhibit.DataEdit._invokeEventHandlers = function(type,id,item) {
	// Iterate over handlers
	var ret = true;
	for(var i=0;i<Exhibit.DataEdit._lifeCycleEventHandlers_.length;i++) {
		var handler = Exhibit.DataEdit._lifeCycleEventHandlers_[i];
		if(handler[type]) { 
			ret = ret && handler[type](id,item);
		}
	}
	return ret;
}

/* Error, warning messages, from onSave failures. */
Exhibit.DataEdit._onSaveMessages = [];
/** Called by external code to add a failure message for onSave action. */
Exhibit.DataEdit.addOnSaveFailedMessage = function(m) {
	Exhibit.DataEdit._onSaveMessages.push(m);
}

/** Override this to handle persistence fails. */
Exhibit.DataEdit.onSaveFailed = null;  // function(arr)



/* ========================================================================
 * Validators
 * ======================================================================== */
 
/** If defined, and is nonempty string, or nonzero number, or nonempty array... otherwise false */
Exhibit.DataEdit.validateIsNotEmpty = function(v) {
	var err = "Cannot be empty";
	if(v==undefined) { return err; }
	else if((typeof v=='string') && (v.length==0)) { return err; }
	else if((typeof v=='number') && (v==0)) { return err; }
	else if((typeof v=='object') && (v instanceof Array) && (v.length==0)) { return err; }
	else { return null; }
}
/** If defined, and begins with http:// */
Exhibit.DataEdit.validateIsURL = function(v) {
	var err = "Must be a web address";
	if(v==undefined || (typeof v != 'string')) { return err; }
	return (!v.match(/^http:\/\//)) ? err : null;
}

/* Fill this out so the validator code can map functions to attr tokens. 
 * USE LOWER CASE TOKENS!
 */
Exhibit.DataEdit._internalValidators = {
	'notempty' : 			Exhibit.DataEdit.validateIsNotEmpty ,
	'isurl' :				Exhibit.DataEdit.validateIsURL
};


/* ========================================================================
 * Bootstrap
 * ======================================================================== */

/* Setup pt1 */
Exhibit.DataEdit._setup_injectActivateButton = function() {
	// Add [Edit] button to page to activate editor.  First look for any element with 
	// ex:role="editorActivate", inject onclick if found, otherwise add a button as 
	// absolute <div> top/right.
	var filterActivate = function(idx) { return $(this).attr("ex:role")==Exhibit.DataEdit.EDIT_ROLE_ACTIVATE; }
	var l = $('*').filter(filterActivate);
	if(l.length>0) {
		// ex:role found -- inject
		l.each(function(idx) {
			try {
				$(this).click(function(){ 
					Exhibit.DataEdit.activate();
				});
			} catch(err) { SimileAjax.Debug.warn(err); }
		});
	} else {
		// ex:role not found -- add absolute <div>
		var buttonHTML = 
			'<div style="position:Fixed; right:1em;  top:1em;">'+
			'<div class="'+Exhibit.DataEdit.EDIT_BUTTON+'">'+
			'<a href="javascript:Exhibit.DataEdit.activate();"><div><span id="editorToggleSymbol"><span class="off">&#10006;</span></span>&nbsp;<span id="editorToggleText">Start editing</span></div></a>'+
			'</div>'+
			'</div>';
		var body = $('body').first().append(buttonHTML);	
	}
}
/* Setup pt2 */
Exhibit.DataEdit._setup_scanForEditButtonInDisplayLens = function() {
	// Hide all the ex:role="editorEdit" elements.
	var filterEdit = function(idx) { return $(this).attr("ex:role")==Exhibit.DataEdit.EDIT_ROLE_EDIT; }
	var l = $('*').filter(filterEdit);  // Important: see FIXME [1] at foot of code
	if(l.length>0) {
		l.each(function(idx) {
			// Display lens code removes ex:role, so rename it.
			$(this).attr('_ex:role',Exhibit.DataEdit.EDIT_ROLE_EDIT);
			// Hide element
			$(this).css('display','None');
		});
	}
}

/** Bootstrap. */
$(document).ready(function() {
	if(!Exhibit.DataEdit._invokeEventHandlers('onBeforeInit')) { return; }
	
	Exhibit.DataEdit._setup_injectActivateButton();
	/*Exhibit.DataEdit._setup_scanForEditButtonInDisplayLens();*/ // See FIXME [1] below
	
	Exhibit.DataEdit._invokeEventHandlers('onInit');
});

/*
 * FIXME [1] :
 *
 *   Originally each display lens could (optionally) feature a <div ex:role="editorEditButton">
 *   which, when editing was activated, would be shown in preference to the red dotted overlay.  
 *   _setup_scanForEditButtonInDisplayLens() would scan for such elements in the display lens, 
 *   inject an onclick handler and set display:None to hide them.  activate() would then show them
 *   again, and edit() would hide them.
 *
 *   This worked on Firefox 3.6, but not IE 8!!!  The likely problem was Exhibit's $(document).ready() 
 *   being called first and processing the display lens, making _setup_scanForEditButtonInDisplayLens()'s 
 *   changes redundant (which begs the question: how come it works in FF?!??).
 *   
 *   For this reason, _setup_scanForEditButtonInDisplayLens() has been deactivated (commented), until
 *   Exhibit gets some proper lifecycle events that allow this extension to run code before its
 *   $(document).ready() .  The remainder of the code is still in, but will have no effect without
 *   the setup code running first.
 */