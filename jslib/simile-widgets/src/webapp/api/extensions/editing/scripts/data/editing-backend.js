Exhibit.EditingBackend = function() {
    this._nodeTree = {};
    this._dataTree = {};
};

/*
Exhibit.EditingBackend.getBackend = function(uiContext) {
    if(!uiContext.backend)
        uiContext.backend = new Exhibit.EditingBackend();
    return uiContext.backend;
}
*/

/**
 * Rebuilds the whole node tree. This should never need be called, as long as the backend is notified of any changes as they are made.
 * For now this function does not work in general.
 *@ param root Root dom element in which to look for nodes. Defaults to document.body
 */
Exhibit.EditingBackend.prototype.rebuildNodeTree = function(lensRoot, templateRoot) {
    if(root == undefined || root == null)
        root = document.body;
    
    var nodeTree = [];
    /* Two-step depth-first tree walking function! */
    var walk = function(lensNode, templateNode, propertyID){
        var newPropertyID;
        if((newPropertyID = Exhibit.getAttribute(templateNode, "ex:property"))!=null) {
            nodeTree.properties[newPropertyID] = [];
            walkItem(node, newPropertyID);
        } else if(templateNode.className == "editable-exhibit-value" || templateNode.className == "modified-exhibit_value") {
            nodeTree.properties[propertyID].push(node);
        } else {
            for(var childI = 0; childI<node.childNodes.length; childI++)
                walk(node.childNodes[childI], propertyID);
        }
    }
    return this._nodeTree = walk(lensRoot, templateRoot, null);
}

/**
 * Rebuilds the whole node tree. This should never need be called, as long as the backend is notified of any changes as they are made.
 *@ param root Root dom element in which to look for nodes. Defaults to document.body
 */
Exhibit.EditingBackend.prototype.rebuildDataTree = function(database) {
    this._mode = (database == undefined || database == null) ? "full" : "diff";
    
    var dataTree = [];
    for(var itemID in this._nodeTree) {
        if (this._mode = "full") {
            var allProperties = database.getAllProperties();
            var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(itemID, allProperties, database);
            dataTree[itemID] = {};
            for (var j = 0; j < pairs.length; j++) {
                var pair = pairs[j];
                dataTree[itemID][pair.propertyID] = [];
                for(var i = 0;  i < pair.values.length; i++)
                    dataTree[itemID][pair.propertyID].push(pair.values[i]);
            }
        }
        for(var propertyID in this._nodeTree[i].properties) {
            dataTree[itemID][propertyID] = [];
            valueNodes = this._nodeTree[itemID].properties[propertyID];
            for(var v = 0; v < values.length;v++)
                dataTree[itemID][propertyID].push(Exhibit.EditingBackend.getNodeValue(valueNodes));
        }
    }
    return this._dataTree = dataTree;
}

Exhibit.EditingBackend.getNodeValue =function (valueNode) {
    if(valueNode.tag.toLowerCase() == "input")
        return valueNode.value;
    else
        return valueNode.innerHTML;
}

