Exhibit.EditingLens = {};

var NO_EDITING = 0;
var SIMPLE_EDITING = 1;
var ADVANCED_EDITING = 2;

Exhibit.EditingLens = function(itemID, div, uiContext, restore) {
    var self = this;
    this._rootNode = div;
    var database = uiContext.getDatabase();
    this.backend = new Exhibit.EditingBackend();
    
    this._getItemData = function() {
        var itemData = {};
        var allProperties = database.getAllProperties();
        var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(itemID, allProperties, database);
        for (var j = 0; j < pairs.length; j++) {
            var pair = pairs[j];
            itemData[pair.propertyID] = [];
            for(var i = 0;  i < pair.values.length; i++)
                itemData[pair.propertyID].push(pair.values[i]);
        }
        return itemData;
    };
    /* Restore returns to the unediting lens. */
    this._restore = function() {
        Exhibit.UI.removeChildren(self._rootNode);
        div.style.marginBottom = "0em";
        div.style.marginTop = "0em";
        div.style.border = "none"
        
        restore(self);
    }
    /* Revert changes the data back to what's in the database. */
    this._revert = function() {
        self._itemData = this._getItemData();
    };
    this._revert();
};

Exhibit.EditingLens._getAreEditing = function(uiContext) {
    if(!uiContext.areEditing) {
        uiContext.areEditing = {};
    }
    return uiContext.areEditing;
}

Exhibit.EditingLens.setEditing = function(itemID, editMode, uiContext) {
    var areEditing = Exhibit.EditingLens._getAreEditing(uiContext);
    switch(editMode) {
        case SIMPLE_EDITING:
        case ADVANCED_EDITING:
            areEditing[itemID] = editMode;
            break;
        default:
            areEditing[itemID] = NO_EDITING;
    }
}

Exhibit.EditingLens.getEditing = function(itemID, uiContext) {
    var areEditing = Exhibit.EditingLens._getAreEditing(uiContext);
    return areEditing[itemID];
}

/**
 * Factory constructor.
 * It will also one day setting whether or not a editingLens should start in editing mode or in normal mode.
 */
Exhibit.EditingLens.create = function(itemID, div, uiContext, lens, restore, startEditing) {
    if (startEditing==undefined || startEditing==null)
        Exhibit.EditingLens.setEditing(itemID, NO_EDITING, uiContext);
    else
        Exhibit.EditingLens.setEditing(itemID, startEditing, uiContext);
    return new Exhibit.EditingLens(itemID, div, uiContext, restore);
}


Exhibit.EditingLens.prototype._constructDefaultUI = function(itemID, div, uiContext) {
    var self = this;
    
    var database = uiContext.getDatabase();
    if (this._commonProperties == null) {
        this._commonProperties = database.getAllProperties();
    }
    var properties = this._commonProperties;
    
    var label = database.getObject(itemID, "label");
    var template = {
        elmt:       div,
        className:  "exhibit-lens",
        children: [
            {   tag:        "div",
                className:  "exhibit-lens-title",
                field:      "titlebar",
                title:      label,
                children:   [ label ]
            },
            {   tag:        "div",
                className:  "exhibit-lens-body",
                children: [
                    {   tag:        "table",
                        className:  "exhibit-lens-properties",
                        field:      "propertiesTable"
                    }
                ]
            },
            {   tag:        "div",
                className:  "exhibit-lens-title",
                title:      label,
                children:   [ label ]
            },
        ]
    };
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    
    div.setAttribute("ex:itemID", itemID);
    this._TBody = dom.propertiesTable.tBodies[0];
    
    var allProperties = database.getAllProperties();
    var pairs = Exhibit.ViewPanel.getPropertyValuesPairs(
        itemID, allProperties, database);
    
    for (var j = 0; j < pairs.length; j++) {
        var pair = pairs[j];
        
        var tr = dom.propertiesTable.insertRow(j);
        tr.className = "exhibit-lens-property";
        tr.setAttribute("ex:propertyID", pair.propertyID);
        
        var tdName = tr.insertCell(0);
        tdName.className = "exhibit-lens-property-name";
        tdName.innerHTML = pair.propertyLabel /*+
            " (" + pair.valueType + ") : "*/;
        var cell = tr.insertCell(1);
        cell.className = "exhibit-lens-property-values";
        this._fillCell(pair.propertyID, cell, uiContext);
    }
    
    //this.addButtons(itemID, dom.titlebar, uiContext);

    div.style.marginBottom = "2em";
    div.style.marginTop = "0.5em";
    div.style.border="solid";
    div.style.borderWidth = "1";
    
    this._makeEditing(itemID, div, uiContext, Exhibit.EditingLens.getEditing(itemID, uiContext));
}

Exhibit.EditingLens.prototype._makeEditing = function(itemID, div, uiContext, editMode) {
    var self = this;
    
    var popup = document.createElement("span");
    popup.className = "exhibit-toolboxWidget-popup screen";
    
    var editImg = Exhibit.UI.createTranslucentImage("images/edit-icon.png");
    editImg.className = "exhibit-toolboxWidget-button";
    SimileAjax.WindowManager.registerEvent(
        editImg, 
        "click", 
        function(elmt, evt, target) {
            self._convertLens(itemID, div, uiContext, editMode==0 ? 1 : 0);
        }
    );
    popup.style.marginTop = editMode==0 ? 1 : 0;
    popup.style.marginRight = editMode==0 ? 1 : 0;
    
    popup.appendChild(editImg);
    
    //===
    
    var menuBar = document.createElement("div");
    menuBar.style.textAlign = "right";
    if(editMode == ADVANCED_EDITING) {
        menuBar.style.borderBottom = "solid";
        menuBar.style.borderWidth = 1;
     } else
        menuBar.style.border = "none";
    
    var toggleButton = document.createElement("span");
    toggleButton.className = "item-edit-button";
    toggleButton.innerHTML = editMode==0 ? "Edit" : "Done";
    toggleButton.title = editMode==0?"Open editing view.":"Save and return to normal view.";
    SimileAjax.WindowManager.registerEvent(
        toggleButton, 
        "click", 
        function(elmt, evt, target) {
            self._convertLens(itemID, div, uiContext, editMode==0 ? 1 : 0);
        }
    );
    
    var advancedButton = document.createElement("span");
    advancedButton.className = "item-edit-button";
    advancedButton.innerHTML = editMode==1 ? "Advanced" : "Simple";
    advancedButton.title = editMode==1 ? "Show advanced view." : "Show simple view.";
    SimileAjax.WindowManager.registerEvent(
        advancedButton, 
        "click", 
        function(elmt, evt, target) {
            self._convertLens(itemID, div, uiContext, editMode==1 ? 2 : 1);
        }
    );
    
    if (editMode == ADVANCED_EDITING) {
        var addButton = document.createElement("span");
        addButton.className = "item-edit-button";
        addButton.innerHTML = "Add value";
        addButton.title = "Add a value to a property."
        SimileAjax.WindowManager.registerEvent(
            addButton,
            "click",
            function() {
                self._openAddTagMenu(addButton, itemID, uiContext);
            }
        );

        var removeButton = document.createElement("span");
        removeButton.className = "item-edit-button";
        removeButton.innerHTML = "Remove value";
        removeButton.title = "Remove a value from a property."
        SimileAjax.WindowManager.registerEvent(
            removeButton,
            "click",
            function() {
                self._openRemoveTagMenu(removeButton, itemID, uiContext);
            }
        );
        
        var revertButton = document.createElement("span");
        revertButton.className = "item-edit-button";
        revertButton.innerHTML = "Revert";
        revertButton.title = "Return to the previous saved state."
        revertButton.onclick = function() {
            self._revert();
            Exhibit.UI.removeChildren(self._rootNode);
            self._constructEditingLens(itemID, self._rootNode, uiContext);
        }
        
        var saveButton = document.createElement("span");
        saveButton.className = "item-edit-button";
        saveButton.innerHTML = "Save";
        saveButton.title = "Save the item."
        saveButton.onclick = function() {
            self._saveFromEditingLens(itemID, self._rootNode, uiContext);
            //revertButton.onclick();
        }
        menuBar.appendChild(addButton);
        menuBar.appendChild(removeButton);
        menuBar.appendChild(revertButton);
        menuBar.appendChild(saveButton);
    }
    if(editMode != NO_EDITING)
        menuBar.appendChild(advancedButton);
    menuBar.appendChild(toggleButton);
    
    var target = menuBar;
    for(var i=0; i<div.childNodes.length; i++) {
        var temp = div.childNodes[i];
        div.replaceChild(target, temp);
        target = temp;
    }
    div.appendChild(target);
}

/**
 * Converts a lens to either editing or normal.
 */
Exhibit.EditingLens.prototype._convertLens = function(itemID, div, uiContext, toEditingMode) {
    if(Exhibit.EditingLens.getEditing(itemID, uiContext) == toEditingMode)
        return;
    Exhibit.EditingLens.setEditing(itemID, toEditingMode, uiContext);
    if(Exhibit.EditingLens.getEditing(itemID, uiContext)==NO_EDITING)
        this._saveFromEditingLens(itemID, this._rootNode, uiContext);
    Exhibit.UI.removeChildren(div);
    if(toEditingMode == SIMPLE_EDITING)
        Exhibit.Lens._constructDefaultValueList = Exhibit.EditingLens._constructDefaultValueList;
    else
        Exhibit.Lens._constructDefaultValueList = Exhibit.Lens.original_constructDefaultValueList;
    if(toEditingMode == ADVANCED_EDITING) {
        this._constructDefaultUI(itemID, div, uiContext);
    } else {
        this._restore();
    }
    
}

Exhibit.EditingLens.prototype._constructEditingLens = function(itemID, div, uiContext) {
    this._constructDefaultUI(itemID, div, uiContext);
}


Exhibit.EditingLens.prototype.addButtons = function(itemID, div, uiContext) {
    var self = this;
    
    var buttons = document.createElement("span");
    buttons.className = "item-edit-buttons";
    
    var addButton = document.createElement("span");
    addButton.className = "item-edit-button";
    addButton.innerHTML = "Add value";
    SimileAjax.WindowManager.registerEvent(
        addButton,
        "click",
        function() {
            self._openAddTagMenu(addButton, itemID, uiContext);
        }
    );

    var removeButton = document.createElement("span");
    removeButton.className = "item-edit-button";
    removeButton.innerHTML = "Remove value";
    SimileAjax.WindowManager.registerEvent(
        removeButton,
        "click",
        function() {
            self._openRemoveTagMenu(removeButton, itemID, uiContext);
        }
    );
    
    var revertButton = document.createElement("span");
    revertButton.className = "item-edit-button";
    revertButton.innerHTML = "Revert";
    revertButton.onclick = function() {
        self._revert();
        Exhibit.UI.removeChildren(self._rootNode);
        self._constructEditingLens(itemID, self._rootNode, uiContext);
    }
    
    var saveButton = document.createElement("span");
    saveButton.className = "item-edit-button";
    saveButton.innerHTML = "Save";
    saveButton.onclick = function() {
        self._saveFromEditingLens(itemID, self._rootNode, uiContext);
        //revertButton.onclick();
    }
    
    buttons.appendChild(addButton);
    buttons.appendChild(removeButton);
    buttons.appendChild(saveButton);
    buttons.appendChild(revertButton);
    
    var target = buttons;
    for(var i=0; i<div.childNodes.length; i++) {
        var temp = div.childNodes[i];
        div.replaceChild(target, temp);
        target = temp;
    }
    div.appendChild(target);
    div.style.padding = "5px";
}

Exhibit.EditingLens.prototype._getTBody = function() {
    /**
     * Finds the last TBODY node in depth first order, which is also html document order that
     * is a descendent of node, or node itself.
     *@param node The root of the dom sub-tree in which to look.
     *@returns The last tbody node, or null if none is found.
     */
    var findTBody = function(node) {
        var dump = null;
        if(node.tagName && node.tagName.toLowerCase() == "tbody")
            return node;
        else for(var i =0; i<node.childNodes.length; i++) {
            var temp = findTBody(node.childNodes[i]);
            if (temp!=null)
                dump = temp;
        }
        return dump;
    }
    if(this._TBody == null)
        this._TBody = findTBody(this._rootNode);
    return this._TBody;
}

/**
 * Reads the values in the form and inserts them back in the database. Warning:
 * this function makes assumptions about the editing lens.
 * NOTE: We should explore the possibility of continuous saving and of differential saving.
 * Mixing the two ideas gives a continuously written patch to the data base, using onblur and a local data store.
 */
Exhibit.EditingLens.prototype._saveFromEditingLens = function(itemID, div, uiContext) {
    var self = this;
    this.sync();
    var action = {};
    var oldItemData = this._getItemData();
    action.perform = function() {
        uiContext.getDatabase().reloadItem(itemID, self._itemData);
    };
    action.undo = function() {
        uiContext.getDatabase().reloadItem(itemID, oldItemData);
    };
    action.label = "Changed " + oldItemData["label"][0];
    SimileAjax.History.addAction(action)
}

Exhibit.EditingLens.prototype._fillCell = function(propertyID, cell, uiContext) {
    var self = this;
    var values = this._itemData[propertyID];
    var valueType = uiContext.getDatabase().getProperty(propertyID).getValueType();
    if (valueType == "item") {
        for (var m = 0; m < values.length; m++) {
            if (m > 0) {
                cell.appendChild(document.createTextNode(", "));
            }
            cell.appendChild(Exhibit.UI.makeEditItemSpan(values[m], null, uiContext, cell.parentNode._toCheck));
        }
    } else {
        for (var m = 0; m < values.length; m++) {
            this._addRemovableValueSpan(cell, propertyID, m, uiContext, values.length>1);
        }
        this._addAppendButton(propertyID, cell, uiContext);
    }
}

Exhibit.EditingLens.prototype._addComaSpan = function(propertyID, cell, uiContext, more) {
}

Exhibit.EditingLens.prototype._addAppendButton = function(propertyID, cell, uiContext) {
    var self = this;
    var addImg = Exhibit.UI.createTranslucentImage("images/append-icon2.png");
    addImg.width = 10;
    addImg.height = 10;
    addImg.title = "add new value";
    SimileAjax.WindowManager.registerEvent(
        addImg, 
        "click", 
        function(elmt, evt, target) {
            self._addValue(propertyID, uiContext);
        }
    );
    cell.appendChild(addImg);
    if(this._itemData[propertyID].length>1)
        addImg.className = "shown";
    else {
        addImg.className = "not-shown";
        var tr = cell.parentNode;
        SimileAjax.WindowManager.registerEvent(
            tr,
            "mouseover",
            function() {
                numChildren  = cell.childNodes.length;
                cell.childNodes[numChildren - 1].className = "shown";
                cell.childNodes[numChildren - 2].className = "shown";
                cell.childNodes[numChildren - 3].className = "shown";
            }
        );
        SimileAjax.WindowManager.registerEvent(
            tr,
            "mouseout",
            function() {
                numChildren  = cell.childNodes.length;
                cell.childNodes[numChildren - 1].className = "not-shown";
                cell.childNodes[numChildren - 2].className = "not-shown";
                cell.childNodes[numChildren - 3].className = "not-shown";
            }
        );
    }
    cell.appendChild(addImg);
}

/**
 * Retrieves the data from the form to the local data.
 */
Exhibit.EditingLens.prototype.sync=function(propertyID) {
    var TBody = this._getTBody();
    for(var r = 0; r<TBody.rows.length; r++) {
        var tr = TBody.rows[r];
        if(propertyID==undefined || propertyID==null || Exhibit.getAttribute(tr, "ex:propertyID") == propertyID) {
            var values = [];
            var inputs = Exhibit.UI.findClassMembers("editable-exhibit-value", tr);
            for(var i=0;i<inputs.length; i++)
                values.push(inputs[i].value);
            this._itemData[Exhibit.getAttribute(tr, "ex:propertyID")] = values;
            var labels = Exhibit.UI.findClassMembers("exhibit-item", tr);
            for(var i=0;i<labels.length; i++)
                values.push(labels[i].innerHTML);
            this._itemData[Exhibit.getAttribute(tr, "ex:propertyID")] = values;
        }
    }
}

/**
 * Adds a value to the form and its internal backup.
 */
Exhibit.EditingLens.prototype._addValue = function(propertyID, uiContext) {
    var TBody = this._getTBody();
    var database = uiContext.getDatabase();
    for(var i = 0; i<TBody.rows.length; i++) {
        var valueType = database.getProperty(propertyID).getValueType();
        if(Exhibit.getAttribute(this._getTBody().rows[i], "ex:propertyID") == propertyID) {
            var cell = this._getTBody().rows[i].cells[1];
            this.sync(propertyID);
            this._itemData[propertyID].push("");
            Exhibit.UI.removeChildren(cell);
            this._fillCell(propertyID, cell, uiContext);
        }
    }
}

/**
 * Removes a value off of the form and its internal backup.
 */
Exhibit.EditingLens.prototype._removeValue = function(propertyID, num, uiContext) {
    var valTBody = this._getTBody();
    var database = uiContext.getDatabase();
    for(var i = 0; i<valTBody.rows.length; i++) {
        var valueType = database.getProperty(propertyID).getValueType();
        if(Exhibit.getAttribute(valTBody.rows[i], "ex:propertyID") == propertyID) {
            var cell = valTBody.rows[i].cells[1];
            this.sync(propertyID);
            this._itemData[propertyID].splice(num, 1);
            Exhibit.UI.removeChildren(cell);
            this._fillCell(propertyID, cell, uiContext);
        }
    }
}

Exhibit.EditingLens.prototype._openRemoveTagMenu = function(elmt, itemID, uiContext) {
    var self = this;
    this.sync();
    
    var dom = Exhibit.createPopupMenu(elmt);
    dom.elmt.style.width = "15em";
    dom.appendSectionHeading("Remove property value:");

    var sample = function(text) {
        if (text.length > 20) 
            return text.substr(0, 15) + "...";
        else
            return text;
    };
    
    var pairs = [];
    var propertyIDs = database.getAllProperties();
    for (var i = 0; i < propertyIDs.length; i++) {
        var propertyID = propertyIDs[i];
        //Why do we require there to be at least one abject to add another object? UI reasons.
        if (propertyID != "uri" && database.countDistinctObjects(itemID, propertyID) > 0) {
            var property = database.getProperty(propertyID);
            pairs.push({ propertyID: propertyID, label: property != null ? property.getLabel() : propertyID });
        }
    }
    
    var makeMenuItem = function(propertyID, label) {
        if(database.getProperty(propertyID).getValueType() == "item")
            return;
        var subdom = dom.appendSubMenu(label);
        for(var v = 0; v < self._itemData[propertyID].length; v++) {
            subdom.appendMenuItem(
                sample(self._itemData[propertyID][v]), 
                null, 
                (function(x) {
                    return function() { 
                        self._removeValue(propertyID, x, uiContext);
                    }
                })(v)
            );
        }
    }
    
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        makeMenuItem(pair.propertyID, pair.label);
    }
    dom.open();
};

Exhibit.EditingLens.prototype._openAddTagMenu = function(elmt, itemID, uiContext) {
    var self = this;
    this.sync();
    var database = uiContext.getDatabase();
    //var property = this._columns[columnIndex].virtualProperty;
    
    var dom = Exhibit.createPopupMenu(elmt);
    //dom.elmt.style.width = "10em";
    dom.appendSectionHeading("Add property value to:");
    
    var pairs = [];
    var propertyIDs = database.getAllProperties();
    for (var i = 0; i < propertyIDs.length; i++) {
        var propertyID = propertyIDs[i];
        //Why do we require there to be at least one abject to add another object? UI reasons.
        if (propertyID != "uri" && database.countDistinctObjects(itemID, propertyID) > 0) {
            var property = database.getProperty(propertyID);
            pairs.push({ propertyID: propertyID, label: property != null ? property.getLabel() : propertyID });
        }
    }
    
    var makeMenuItem = function(propertyID, label) {
        var a = dom.makeMenuItem(
            label, 
            null, 
            function() { 
                self._addValue(propertyID, uiContext);
            }
        );
        dom.elmt.appendChild(a);
    }
    
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        makeMenuItem(pair.propertyID, pair.label);
    }
    dom.open();
};

Exhibit.EditingLens.prototype._addRemovableValueSpan = function(parentElmt, propertyID, num, layer, showRemoveIcon) {
    var self = this;
    var value = this._itemData[propertyID][num];
    
    //We don't need to take into account the valueType
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    input.value = value;
    parentElmt.appendChild(input);
    
    var removeImg = Exhibit.UI.createTranslucentImage("images/remove-icon.png");
    removeImg.style.cursor = "pointer";
    removeImg.width = 10;
    removeImg.height = 10;
    removeImg.style.margin = 0;
    removeImg.title = "remove value";
    SimileAjax.WindowManager.registerEvent(
        removeImg, 
        "click", 
        function(elmt, evt, target) {
            self._removeValue(propertyID, num, layer);
        }
    );
    parentElmt.appendChild(removeImg);
    var commaSpan = document.createElement("span");
    commaSpan.appendChild(document.createTextNode(", "));
    parentElmt.appendChild(commaSpan);

    if(showRemoveIcon) {
        removeImg.className = "shown";
        commaSpan.className = "shown";
    } else {
        removeImg.className = "not-shown";
        commaSpan.className = "not-shown";
    }
    
};


Exhibit.EditingLens.prototype._constructFromLensTemplateURL = function(itemID, div, uiContext, lensTemplateURL) {
    Exhibit.Lens.lastItemID = itemID;
    Exhibit.Lens.prototype._constructFromLensTemplateURL(itemID, div, uiContext, lensTemplateURL);
    this._makeEditing(itemID, div, uiContext, Exhibit.EditingLens.getEditing(itemID, uiContext));
};

Exhibit.EditingLens.prototype._constructFromLensTemplateDOM = function(itemID, div, uiContext, lensTemplateNode) {
    Exhibit.Lens.lastItemID = itemID;
    Exhibit.Lens.prototype._constructFromLensTemplateDOM(itemID, div, uiContext, lensTemplateNode);
    this._makeEditing(itemID, div, uiContext, Exhibit.EditingLens.getEditing(itemID, uiContext));
};

Exhibit.EditingLens._constructDefaultValueList = function(values, valueType, parentElmt, uiContext, itemID, propertyID) {
    uiContext.formatList(values, values.size(), valueType, function(elmt) {
        parentElmt.appendChild(elmt);
    }, true);
	parentElmt.className = "editable-exhibit-value";
    SimileAjax.WindowManager.registerEvent(
        parentElmt,
        "click",
        function () {
            if(parentElmt.className != "editing-parent") {
                Exhibit.UI.removeChildren(parentElmt);
                parentElmt.className = "editing-parent";
                values.visit( function(value) {
                    Exhibit.EditingLens._addInput(values, value, valueType, parentElmt, uiContext, itemID, propertyID);
                });
                Exhibit.EditingLens._addAppendIcon(values, valueType, parentElmt, uiContext, itemID, propertyID);
                Exhibit.EditingLens._addSaveAndCancelButtons(parentElmt, uiContext, itemID, propertyID, values, valueType);
            }
        });
};

Exhibit.EditingLens._addInput = function(values, value, valueType, parentElmt, uiContext, itemID, propertyID) {
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    input.value = value;
    parentElmt.appendChild(input);
    
    Exhibit.EditingLens._addRemoveIcon(values, valueType, parentElmt, uiContext, itemID, propertyID, value);
    
    var commaSpan = document.createElement("span");
    commaSpan.appendChild(document.createTextNode(", "));
    parentElmt.appendChild(commaSpan);
}

Exhibit.EditingLens._addRemoveIcon = function(values, valueType, parentElmt, uiContext, itemID, propertyID, value) {
    var removeImg = Exhibit.UI.createTranslucentImage("images/remove-icon.png");
    removeImg.width = 10;
    removeImg.height = 10;
    removeImg.style.margin = 0;
    removeImg.title = "remove value";
    parentElmt.onclick = "";
    parentElmt.onclick = null;
    SimileAjax.WindowManager.registerEvent(
        removeImg, 
        "click", 
        function(elmt, evt, target) {
            values.remove(value);
            Exhibit.UI.removeChildren(parentElmt);
            Exhibit.EditingLens._constructDefaultValueList(values, valueType, parentElmt, uiContext, itemID, propertyID);
        }
    );
    parentElmt.appendChild(removeImg);
}

Exhibit.EditingLens._addAppendIcon = function(values, valueType, parentElmt, uiContext, itemID, propertyID) {
    var addImg = Exhibit.UI.createTranslucentImage("images/append-icon2.png");
    addImg.width = 10;
    addImg.height = 10;
    addImg.title = "add new value";
    SimileAjax.WindowManager.registerEvent(
        addImg, 
        "click", 
        function(elmt, evt, target) {
            values.add("");
            Exhibit.UI.removeChildren(parentElmt);
            Exhibit.EditingLens._constructDefaultValueList(values, valueType, parentElmt, uiContext, itemID, propertyID);
        }
    );
    parentElmt.appendChild(addImg);
}

Exhibit.EditingLens.makeButton = function(label, handler) {
    var addButton = document.createElement("span");
    addButton.className = "item-edit-button";
    addButton.innerHTML = label;
    SimileAjax.WindowManager.registerEvent(
        addButton,
        "click",
        handler
    );
    return addButton;
}

Exhibit.EditingLens._addSaveAndCancelButtons = function(propertyBox, uiContext, itemID, propertyID, values, valueType) {
    var save = function() {
        var inputs = Exhibit.UI.findClassMembers("editable-exhibit-value", propertyBox);
        var values = [];
        for(var i=0; i<inputs.length; i++)
            values.push(inputs[i].value);

        itemEntry = {};
        itemEntry[propertyID] = values;
        itemEntry["id"] = itemID;
        uiContext.getDatabase().reloadItem(itemID, itemEntry);
    };
    
    var redraw = function() {
        Exhibit.UI.removeChildren(propertyBox);
        Exhibit.EditingLens._constructDefaultValueList(values, valueType, propertyBox, uiContext, itemID, propertyID);
    };
    
    var saveAndRedraw = function() {
        save();
        redraw();
    } //That was easy!
    
    var saveButton = Exhibit.EditingLens.makeButton("Save", saveAndRedraw);
    var cancelButton = Exhibit.EditingLens.makeButton("Cancel", redraw);
    propertyBox.appendChild(saveButton);
    propertyBox.appendChild(cancelButton);
}

Exhibit.UIContext.prototype.format = function(value, valueType, appender, editing) {
    var f;
    if (valueType in this._formatters) {
        f = this._formatters[valueType];
    } else {
        f = this._formatters[valueType] = 
            new Exhibit.Formatter._constructors[valueType](this);
    }
    f.format(value, appender, editing);
};

Exhibit.UIContext.prototype.formatList = function(iterator, count, valueType, appender, editing) {
    if (this._listFormatter == null) {
        this._listFormatter = new Exhibit.Formatter._ListFormatter(this);
    }
    this._listFormatter.formatList(iterator, count, valueType, appender, editing);
};

