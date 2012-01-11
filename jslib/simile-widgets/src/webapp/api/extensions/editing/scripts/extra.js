
/**
 * Makes the span for a single value that can be edited.
 *@param label {String} The text to be displayed by default in the input field.
 *@param valueType Not used.
 *@param layer
 *@param showRemoveIcon{boolean} Specifies whether the little remove cross should be displayed.
 */
Exhibit.UI.makeEditValueSpan = function(label, valueType, layer, showRemoveIcon) {
    var span = document.createElement("span");
    span.className = "exhibit-value";
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    
    //We don't need to take into account the valueType
    var input = document.createElement("input");
    input.className = "editable-exhibit-value";
    input.value = label;
    span.appendChild(input);
    
    if(showRemoveIcon) {
        var removeImg = Exhibit.UI.createTranslucentImage("images/remove-icon.png");
        removeImg.width = 10;
        removeImg.height = 10;
        removeImg.style.margin = 0;
        removeImg.title = "remove value";
        SimileAjax.WindowManager.registerEvent(
            removeImg, 
            "click", 
            function(elmt, evt, target) {
                span.parentNode.removeChild(span);
            }
        );
        span.appendChild(removeImg);
    }

    return span;
}

/**
 * Creates a link to a bubble that will allow editing of the item
 @param itemID {String} The itemID of the item to be in the bubble. I think.
 @param label
 @param uiContext
 @param layer
 */
Exhibit.UI.makeEditItemSpan = function(itemID, label, uiContext, layer) {
    if (label == null) {
        label = database.getObject(itemID, "label");
        if (label == null) {
            label = itemID;
        }
    }
    
    var a = SimileAjax.DOM.createElementFromString(
        "<a href=\"" + Exhibit.Persistence.getItemLink(itemID) + "\" class='exhibit-item'>" + label + "</a>");
        
    var handler = function(elmt, evt, target) {
        Exhibit.UI.showEditItemInPopup(itemID, elmt, uiContext);
    }
    SimileAjax.WindowManager.registerEvent(a, "click", handler, layer);
    
    return a;
};

/**
 * Modify the lens to make it work properly.
 *@param lens The dom element corresponding to the lens.
 *@param itemID {String}
 *@param div The dom element that get written according to the data.
 *@param uiContext
 */
Exhibit.UI.correctPopupBehavior = function(lens, itemID, div, uiContext) {
    div.firstChild.style.display = "none";
    //div.removeChild(div.lastChild);
    div.lastChild.onclick = "";
    SimileAjax.WindowManager.registerEvent(
        div.lastChild, 
        "click", 
        function(elmt, evt, target) {
            lens._saveFromEditingLens(itemID, div, uiContext);
        }
    );
}

/**
 * Creates a popup that allows editing of the data displayed by the lens.
 *@param itemID {String}
 *@param elmt The element which the bubble should be pointing.
 *@param uiContext
 */
Exhibit.UI.showEditItemInPopup = function(itemID, elmt, uiContext) {
    var coords = SimileAjax.DOM.getPageCoordinates(elmt);
    var bubble = SimileAjax.Graphics.createBubbleForPoint(
        coords.left + Math.round(elmt.offsetWidth / 2), 
        coords.top + Math.round(elmt.offsetHeight / 2), 
        uiContext.getSetting("bubbleWidth"),
        uiContext.getSetting("bubbleHeight")
    );
    
    var itemLensDiv = document.createElement("div");
    var itemLens = uiContext.getLensRegistry().createLens(itemID, itemLensDiv, uiContext, true);
    itemLens._convertLens(itemID, itemLensDiv, uiContext, true);
    Exhibit.UI.correctPopupBehavior(itemLens, itemID, itemLensDiv, uiContext);
    bubble.content.appendChild(itemLensDiv);
};

/**
 * Gets a single item from the database.
 *@param itemID {String} The item that needs to be retrieved from the database.
 *@returns {Object} An object object containing the property value {foo: bar, label: value}
 */
Exhibit.Database._Impl.prototype.getItem = function(itemID) {
    if(this._items.contains(itemID))
        this._items[itemID]
    return null;
};


/**
 * Update an item to a new state.
  * @param itemID {String},
   * @param itemEntry {Object} of the form {foo:bar, label:value, last-one:[value1, value2]}
   */
Exhibit.Database._Impl.prototype.reloadItem = function(itemID, itemEntry) {
    try {
        for(p in itemEntry)
            this.removeObjects(itemID, p);
        var o = {};        //itemEntry["label"] = itemEntry["label"][0]; //
        //itemEntry["uri"]   = itemEntry["uri"][0];   //The database is a little bit more tolerant now of critical values being single element arrays.
        //itemEntry["type"]  = itemEntry["type"][0];  //
        o.items = [itemEntry];
        database.loadData(o);
    } catch (e) {
        alert(e);
    }
};

/**
 * This hack should not be used any more, it makes things work and breaks others.
 */
/*SimileAjax.DOM.registerEvent = function(elmt, eventName, handler) {
    var handler2 = function(evt) {
        
        evt = (evt) ? evt : ((eventName) ? eventName : null);
        if (evt) {
            var target = (evt.target) ? 
                evt.target : ((evt.srcElement) ? evt.srcElement : null);
            if (target) {
                target = (target.nodeType == 1 || target.nodeType == 9) ? 
                    target : target.parentNode;
            }
            
            return handler(elmt, evt, target);
        }
        return true;
    }
    
    if (SimileAjax.Platform.browser.isIE) {
        elmt.attachEvent("on" + eventName, handler2);
    } else {
        elmt.addEventListener(eventName, handler2, true);
    }
};*/

Exhibit.createPopupMenu = function(element, align) {
    var div = document.createElement("div");
    div.className = "exhibit-menu-popup exhibit-ui-protection";
    
    var dom = {
        elmt: div,
        close: function() {
            try { document.body.removeChild(this.elmt); } catch (e) {}
        },
        open: function() {
            var self = this;
            this.layer = SimileAjax.WindowManager.pushLayer(function() { self.close(); }, true, this.elmt);
                
            document.body.appendChild(div);
            
            var docWidth = document.body.offsetWidth;
            var docHeight = document.body.offsetHeight;
        
            var coords = SimileAjax.DOM.getPageCoordinates(element);
            if (align == "center") {
                div.style.top = (coords.top + element.scrollHeight) + "px";
                div.style.left = (coords.left + Math.ceil(element.offsetWidth - div.offsetWidth) / 2) + "px";
            } else if (align == "right") {
                div.style.top = coords.top + "px";
                div.style.left = (coords.left + div.offsetWidth) + "px";
            } else {
                div.style.top = (coords.top + element.scrollHeight) + "px";
                div.style.left = coords.left + "px";
            }
        },
        makeMenuItem: function(label, icon, onClick) {
            var self = this;
            var a = document.createElement("a");
            a.className = "exhibit-menu-item";
            a.href = "javascript:";
            a.onmouseover = function() { self._mouseoverMenuItem(a); };
            if (onClick != null) {
                SimileAjax.WindowManager.registerEvent(a, "click", function(elmt, evt, target) {
                    onClick(elmt, evt, target);
                    SimileAjax.WindowManager.popLayer(self.layer);
                    SimileAjax.DOM.cancelEvent(evt);
                    return false;
                });
            }
            
            var div = document.createElement("div");
            a.appendChild(div);
    
            div.appendChild(SimileAjax.Graphics.createTranslucentImage(
                icon != null ? icon : (Exhibit.urlPrefix + "images/blank-16x16.png")));
            div.appendChild(document.createTextNode(label));
            
            return a;
        },
        appendMenuItem: function(label, icon, onClick) {
            this.elmt.appendChild(this.makeMenuItem(label, icon, onClick));
        },
        makeSectionHeading: function(label) {
            var div = document.createElement("div");
            div.className = "exhibit-menu-section";
            div.innerHTML = label;
            return div;
        },
        appendSectionHeading: function(label, icon) {
            this.elmt.appendChild(this.makeSectionHeading(label, icon));
        },
        makeSubMenu: function(label, parentElmt) {
            var self = this;
            var a = document.createElement("a");
            a.className = "exhibit-menu-item potluck-submenu";
            a.href = "javascript:";
            
            var subdom = Exhibit.createPopupMenu(a, "right");
            a.onmousemove = function() { self._mousemoveSubmenu(a, subdom); };
            
            var div = document.createElement("div");
            a.appendChild(div);
    
            var table = document.createElement("table");
            table.cellSpacing = 0;
            table.cellPadding = 0;
            table.width = "100%";
            div.appendChild(table);
            
            var tr = table.insertRow(0);
            var td = tr.insertCell(0);
            td.appendChild(document.createTextNode(label));
            
            td = tr.insertCell(1);
            td.align = "right";
            td.style.verticalAlign = "middle";
            td.appendChild(Exhibit.UI.createTranslucentImage("images/submenu.png"));
            
            parentElmt.appendChild(a);
            
            return subdom;
        },
        appendSubMenu: function(label) {
            return this.makeSubMenu(label, div);
        },
        appendSeparator: function() {
            var hr = document.createElement("hr");
            this.elmt.appendChild(hr);
        },
        _mousemoveSubmenu: function(submenu, submenuDom) {
            if (this._submenu != null) {
                if (this._submenu != submenu) {
                    if (this._timer != null) {
                        window.clearTimeout(this._timer);
                        this._timer = null;
                    }
                    var self = this;
                    this._timer = window.setTimeout(function() { 
                        self._timer = null;
                        self._closeSubmenu(); 
                        self._openSubmenu(submenu, submenuDom);
                    }, 200);
                }
            } else {
                this._openSubmenu(submenu, submenuDom);
            }
        },
        _mouseoverMenuItem: function(menuItem) {
            var self = this;
            if (this._submenu != null && this._timer == null) {
                this._timer = window.setTimeout(function() { 
                    self._timer = null;
                    self._closeSubmenu(); 
                }, 200);
            }
        },
        _openSubmenu: function(submenu, submenuDom) {
            this._submenu = submenu;
            this._submenuDom = submenuDom;
            submenuDom.open();
        },
        _closeSubmenu: function() {
            if (this._submenuDom != null) {
                this._submenuDom.close();
            }
            this._submenu = null;
            this._submenuDom = null;
        },
        _submenu: null,
        _submenuDom: null,
        _timer: null
    };
    return dom;
};

/**
 * Removes all the children of a given dom element.
 *@param elmt The dome element to be cleaned.
 */
Exhibit.UI.removeChildren = function(elmt){
    for(var i=elmt.childNodes.length; i>0; i--)
        elmt.removeChild(elmt.lastChild);
}/** * Finds elements which have the given className in the editing lens. *@param className {String} The class name for which to look. *@param node The top node in which to look. The lens dom element will do, but it's not the best. *@returns An array of dom elements. */Exhibit.UI.findClassMembers = function(className, node) {    var values = [];    var walk = function(node){        if(node.className == className)            values.push(node);        else for(var i = 0; i<node.childNodes.length; i++)            walk(node.childNodes[i]);    }    walk(node);    return values;}/*
 * This extra code should be in Exhibit, and affect it least possible.
 */
Exhibit.ViewPanel.getPropertyValuesPairs = function(itemID, propertyEntries, database) {
    var pairs = [];
    var enterPair = function(propertyID, forward) {
        var property = database.getProperty(propertyID);
        var values = forward ? 
            database.getObjects(itemID, propertyID) :
            database.getSubjects(itemID, propertyID);
        var count = values.size();
        
        if (count > 0) {
            var itemValues = property.getValueType() == "item";
            var pair = { 
                propertyID: propertyID,
                propertyLabel:
                    forward ?
                        (count > 1 ? property.getPluralLabel() : property.getLabel()) :
                        (count > 1 ? property.getReversePluralLabel() : property.getReverseLabel()),
                valueType:  property.getValueType(),
                values:     []
            };
            
            if (itemValues) {
                values.visit(function(value) {
                    var label = database.getObject(value, "label");
                    pair.values.push(label != null ? label : value);
                });
            } else {
                values.visit(function(value) {
                    pair.values.push(value);
                });
            }
            pairs.push(pair);
        }
    };
    
    for (var i = 0; i < propertyEntries.length; i++) {
        var entry = propertyEntries[i];
        if (typeof entry == "string") {
            enterPair(entry, true);
        } else {
            enterPair(entry.property, entry.forward);
        }
    }
    return pairs;
};


Exhibit.TileView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.TileView(
        containerElmt != null ? containerElmt : configElmt,
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );

    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);

    view._editSetting = Exhibit.getAttribute(configElmt, "editing");
    if(view._editSetting == null)
        view._editSetting = false;
    
    view._initializeUI();
    return view;
};

Exhibit.TileView.prototype._reconstruct = function() {
    var view = this;
    var state = {
        div:            this._dom.bodyDiv,
        contents:       null,
        groupDoms:      [],
        groupCounts:    []
    };

    var closeGroups = function(groupLevel) {
        for (var i = groupLevel; i < state.groupDoms.length; i++) {
            state.groupDoms[i].countSpan.innerHTML = state.groupCounts[i];
        }
        state.groupDoms = state.groupDoms.slice(0, groupLevel);
        state.groupCounts = state.groupCounts.slice(0, groupLevel);

        if (groupLevel > 0) {
            state.div = state.groupDoms[groupLevel - 1].contentDiv;
        } else {
            state.div = view._dom.bodyDiv;
        }
        state.contents = null;
    }

    this._orderedViewFrame.onNewGroup = function(groupSortKey, keyType, groupLevel) {
        closeGroups(groupLevel);

        var groupDom = Exhibit.TileView.constructGroup(groupLevel, groupSortKey);

        state.div.appendChild(groupDom.elmt);
        state.div = groupDom.contentDiv;

        state.groupDoms.push(groupDom);
        state.groupCounts.push(0);
    };

    this._orderedViewFrame.onNewItem = function(itemID, index) {
        if (state.contents == null) {
            state.contents = Exhibit.TileView.constructList();
            state.div.appendChild(state.contents);
        }

        for (var i = 0; i < state.groupCounts.length; i++) {
            state.groupCounts[i]++;
        }

        var itemLensItem = document.createElement("li");
        var itemLens = view._uiContext.getLensRegistry().createLens(itemID, itemLensItem, view._uiContext, view._editSetting);
        state.contents.appendChild( itemLensItem );
    };

    this._div.style.display = "none";

    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);

    this._div.style.display = "block";
};

Exhibit.ThumbnailView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.ThumbnailView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext, true)
    );
    
    view._lensRegistry = Exhibit.UIContext.createLensRegistryFromDOM(configElmt, configuration, uiContext.getLensRegistry());
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);
    
    view._editSetting = Exhibit.getAttribute(configElmt, "editing");
    if(view._editSetting == null)
        view._editSetting = false;
    
    view._initializeUI();
    return view;
};

Exhibit.ThumbnailView.prototype._reconstruct = function() {
    var view = this;
    var state = {
        div:            this._dom.bodyDiv,
        itemContainer:  null,
        groupDoms:      [],
        groupCounts:    []
    };
    
    var closeGroups = function(groupLevel) {
        for (var i = groupLevel; i < state.groupDoms.length; i++) {
            state.groupDoms[i].countSpan.innerHTML = state.groupCounts[i];
        }
        state.groupDoms = state.groupDoms.slice(0, groupLevel);
        state.groupCounts = state.groupCounts.slice(0, groupLevel);
        
        if (groupLevel > 0) {
            state.div = state.groupDoms[groupLevel - 1].contentDiv;
        } else {
            state.div = view._dom.bodyDiv;
        }
        state.itemContainer = null;
    }
    
    this._orderedViewFrame.onNewGroup = function(groupSortKey, keyType, groupLevel) {
        closeGroups(groupLevel);
        
        var groupDom = Exhibit.ThumbnailView.constructGroup(
            groupLevel,
            groupSortKey
        );
        
        state.div.appendChild(groupDom.elmt);
        state.div = groupDom.contentDiv;
        
        state.groupDoms.push(groupDom);
        state.groupCounts.push(0);
    };
    
    this._orderedViewFrame.onNewItem = function(itemID, index) {
        //if (index > 10) return;
        
        if (state.itemContainer == null) {
            state.itemContainer = Exhibit.ThumbnailView.constructItemContainer();
            state.div.appendChild(state.itemContainer);
        }
        
        for (var i = 0; i < state.groupCounts.length; i++) {
            state.groupCounts[i]++;
        }
        
        var itemLensDiv = document.createElement("div");
        itemLensDiv.className = SimileAjax.Platform.browser.isIE ?
            "exhibit-thumbnailView-itemContainer-IE" :
            "exhibit-thumbnailView-itemContainer";
        
        var itemLens = view._lensRegistry.createLens(itemID, itemLensDiv, view._uiContext, view._editSetting);
        state.itemContainer.appendChild(itemLensDiv);
    };
                
    this._div.style.display = "none";
    
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    
    this._div.style.display = "block";
};



