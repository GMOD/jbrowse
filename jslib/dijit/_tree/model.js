
dojo.declare(
	"dijit.tree.model",
	null,
{
	// summary
	//		Contract for any data provider object for the tree.  Tree 
	//		passes in values to the constructor to specify the callbacks.
	//		"item" is typically a dojo.data.Item but it's just a black box so
	//		it could be anything.
	//
	//		This (like dojo.data.api.Read) is just documentation, and not meant to be used.
	
	destroy: function(){
		// summary: destroys this object, releasing connections to the store
	},
	
	// =======================================================================
	// Methods for traversing hierarchy
	
	getRoot: function(onItem){
		// summary:
		//		Calls onItem with the root item for the tree, possibly a fabricated item.
		//		Throws exception on error.
	},
	
	mayHaveChildren: function(/*dojo.data.Item*/ item){
		// summary
		//		Tells if an item has or may have children.  Implementing logic here
		//		avoids showing +/- expando icon for nodes that we know don't have children.
		//		(For efficiency reasons we may not want to check if an element actually
		//		has children until user clicks the expando node)
	},
	
	getChildren: function(/*dojo.data.Item*/ parentItem, /*function(items)*/ onComplete){
		// summary
		// 		Calls onComplete() with array of child items of given parent item, all loaded.
		//		Throws exception on error.
	},
	
	// =======================================================================
	// Inspecting items
	
	getIdentity: function(/* item */ item){
		// summary: returns identity for an item
	},
	
	getLabel: function(/*dojo.data.Item*/ item){
		// summary: get the label for an item
	},
	
	// =======================================================================
	// Write interface
	
	newItem: function(/* Object? */ args, /*Item?*/ parent){
		// summary
		//		Creates a new item.   See dojo.data.api.Write for details on args.
	},
	
	pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem, /*Boolean*/ bCopy){
		// summary
		//		Move or copy an item from one parent item to another.
		//		Used in drag & drop.
		//		If oldParentItem is specified and bCopy is false, childItem is removed from oldParentItem.
		//		If newParentItem is specified, childItem is attached to newParentItem.
	},
	
	// =======================================================================
	// Callbacks
	
	onChange: function(/*dojo.data.Item*/ item){
		// summary
		//		Callback whenever an item has changed, so that Tree
		//		can update the label, icon, etc.   Note that changes
		//		to an item's children or parent(s) will trigger an
		//		onChildrenChange() so you can ignore those changes here.
	},
	
	onChildrenChange: function(/*dojo.data.Item*/ parent, /*dojo.data.Item[]*/ newChildrenList){
		// summary
		//		Callback to do notifications about new, updated, or deleted items.
	}
});

