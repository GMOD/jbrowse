/*======================================================================
 *  Exhibit.ViewPanel
 *  http://simile.mit.edu/wiki/Exhibit/API/ViewPanel
 *======================================================================
 */
Exhibit.ViewPanel = function(div, uiContext) {
    this._uiContext = uiContext;
    this._div = div;
    this._uiContextCache = {};
    
    this._viewConstructors = [];
    this._viewConfigs = [];
    this._viewLabels = [];
    this._viewTooltips = [];
    this._viewDomConfigs = [];
    this._viewIDs = [];
    this._viewClassStrings = [];
    
    this._viewIndex = 0;
    this._view = null;
}

Exhibit.ViewPanel.create = function(configuration, div, uiContext) {
    var viewPanel = new Exhibit.ViewPanel(div, uiContext);
    
    if ("views" in configuration) {
        for (var i = 0; i < configuration.views.length; i++) {
            var viewConfig = configuration.views[i];
            
            var viewClass = ("viewClass" in view) ? view.viewClass : Exhibit.TileView;
            if (typeof viewClass == "string") {
                viewClass = Exhibit.UI.viewClassNameToViewClass(viewClass);
            }
            
            var label = null;
            if ("viewLabel" in viewConfig) {
                label = viewConfig.viewLabel;
            } else if ("label" in viewConfig) {
                label = viewConfig.label;
            } else if ("l10n" in viewClass && "viewLabel" in viewClass.l10n) {
                label = viewClass.l10n.viewLabel;
            } else {
                label = "" + viewClass;
            }
            
            var tooltip = null;
            if ("tooltip" in viewConfig) {
                tooltip = viewConfig.tooltip;
            } else if ("l10n" in viewClass && "viewTooltip" in viewClass.l10n) {
                tooltip = viewClass.l10n.viewTooltip;
            } else {
                tooltip = label;
            }
            
            var id = viewPanel._generateViewID();
            if ("id" in viewConfig) {
                id = viewConfig.id;
            }
                
            viewPanel._viewConstructors.push(viewClass);
            viewPanel._viewConfigs.push(viewConfig);
            viewPanel._viewLabels.push(label);
            viewPanel._viewTooltips.push(tooltip);
            viewPanel._viewDomConfigs.push(null);
            viewPanel._viewIDs.push(id);
        }
    }
    
    if ("initialView" in configuration) {
        viewPanel._viewIndex = configuration.initialView;
    }
    
    viewPanel._internalValidate();
    viewPanel._initializeUI();
    
    return viewPanel;
};

Exhibit.ViewPanel.createFromDOM = function(div, uiContext) {
    var viewPanel = new Exhibit.ViewPanel(div, Exhibit.UIContext.createFromDOM(div, uiContext, false));
    
    var node = div.firstChild;
    while (node != null) {
        if (node.nodeType == 1) {
            node.style.display = "none";
            
            var role = Exhibit.getRoleAttribute(node);
            if (role == "view") {
                var viewClass = Exhibit.TileView;
                
                var viewClassString = Exhibit.getAttribute(node, "viewClass");
                
                if (viewClassString != null && viewClassString.length > 0) {
                    viewClass = Exhibit.UI.viewClassNameToViewClass(viewClassString);
                    if (viewClass == null) {
                        SimileAjax.Debug.warn("Unknown viewClass " + viewClassString);
                    }
                }
                
                var viewLabel = Exhibit.getAttribute(node, "viewLabel");
                var label = (viewLabel != null && viewLabel.length > 0) ? viewLabel : Exhibit.getAttribute(node, "label");
                var tooltip = Exhibit.getAttribute(node, "title");
                var id = node.id;
                
                if (label == null) {
                    if ("viewLabel" in viewClass.l10n) {
                        label = viewClass.l10n.viewLabel;
                    } else {
                        label = "" + viewClass;
                    }
                }
                if (tooltip == null) {
                    if ("l10n" in viewClass && "viewTooltip" in viewClass.l10n) {
                        tooltip = viewClass.l10n.viewTooltip;
                    } else {
                        tooltip = label;
                    }
                }
                if (id == null || id.length == 0) {
                    id = viewPanel._generateViewID();
                }
                
                viewPanel._viewConstructors.push(viewClass);
                viewPanel._viewConfigs.push(null);
                viewPanel._viewLabels.push(label);
                viewPanel._viewTooltips.push(tooltip);
                viewPanel._viewDomConfigs.push(node);
                viewPanel._viewIDs.push(id);
                viewPanel._viewClassStrings.push(viewClassString);
            }
        }
        node = node.nextSibling;
    }
    
    var initialView = Exhibit.getAttribute(div, "initialView");
    if (initialView != null && initialView.length > 0) {
        try {
            var n = parseInt(initialView);
            if (!isNaN(n)) {
                viewPanel._viewIndex = n;
            }
        } catch (e) {
        }
    }
    
    viewPanel._internalValidate();
    viewPanel._initializeUI();
    
    return viewPanel;
};

Exhibit.ViewPanel.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);

    if (this._view != null) {
        this._view.dispose();
        this._view = null;
    }
    
    this._div.innerHTML = "";
    
    this._uiContext.dispose();
    this._uiContext = null;
    this._div = null;
};

Exhibit.ViewPanel.prototype._generateViewID = function() {
    return "view" + Math.floor(Math.random() * 1000000).toString();
};

Exhibit.ViewPanel.prototype._internalValidate = function() {
    if (this._viewConstructors.length == 0) {
        this._viewConstructors.push(Exhibit.TileView);
        this._viewConfigs.push({});
        this._viewLabels.push(Exhibit.TileView.l10n.viewLabel);
        this._viewTooltips.push(Exhibit.TileView.l10n.viewTooltip);
        this._viewDomConfigs.push(null);
        this._viewIDs.push(this._generateViewID());
    }
    
    this._viewIndex = 
        Math.max(0, Math.min(this._viewIndex, this._viewConstructors.length - 1));
};

Exhibit.ViewPanel.prototype._initializeUI = function() {
    var div = document.createElement("div");
    if (this._div.firstChild != null) {
        this._div.insertBefore(div, this._div.firstChild);
    } else {
        this._div.appendChild(div);
    }
    
    var self = this;
    this._dom = Exhibit.ViewPanel.constructDom(
        this._div.firstChild,
        this._viewLabels,
        this._viewTooltips,
        function(index) {
            self._selectView(index);
        }
    );
    
    this._createView();
};

Exhibit.ViewPanel.prototype._createView = function() {
    var viewContainer = this._dom.getViewContainer();
    viewContainer.innerHTML = "";
    
    var viewDiv = document.createElement("div");
    viewContainer.appendChild(viewDiv);
    
    var index = this._viewIndex;
    var context = this._uiContextCache[index] || this._uiContext;
    try {
        if (this._viewDomConfigs[index] != null) {
            this._view = this._viewConstructors[index].createFromDOM(
                this._viewDomConfigs[index],
                viewContainer, 
                context
            );
        } else {
            this._view = this._viewConstructors[index].create(
                this._viewConfigs[index],
                viewContainer, 
                context
            );
        }
    } catch (e) {
        SimileAjax.Debug.log("Failed to create view " + this._viewLabels[index]);
        SimileAjax.Debug.exception(e);
    }
    
    this._uiContextCache[index] = this._view._uiContext;

    this._uiContext.getExhibit().setComponent(this._viewIDs[index], this._view);
    this._dom.setViewIndex(index);
};

Exhibit.ViewPanel.prototype._switchView = function(newIndex) {
    if (this._view) {
        this._uiContext.getExhibit().disposeComponent(this._viewIDs[this._viewIndex]);
        this._view = null;
    }
    this._viewIndex = newIndex;
    this._createView();
};

Exhibit.ViewPanel.prototype._selectView = function(newIndex) {
    var oldIndex = this._viewIndex;
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            self._switchView(newIndex);
        },
        function() {
            self._switchView(oldIndex);
        },
        Exhibit.ViewPanel.l10n.createSelectViewActionTitle(self._viewLabels[newIndex])
    );    

    if (SimileAjax.RemoteLog.logActive) {
        var dat = {
            "action":"switchView",
            "oldIndex":oldIndex,
            "newIndex":newIndex,
            "oldLabel":this._viewLabels[oldIndex],
            "newLabel":this._viewLabels[newIndex],
            "oldID":this._viewIDs[oldIndex],
            "newID":this._viewIDs[newIndex]
        }
        if (newIndex < this._viewClassStrings.length) {
            dat["newClass"] = this._viewClassStrings[newIndex];
        }
        if (oldIndex < this._viewClassStrings.length) {
            dat["oldClass"] = this._viewClassStrings[oldIndex];
        }
        SimileAjax.RemoteLog.possiblyLog(dat);
    }

};

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

Exhibit.ViewPanel.constructDom = function(
    div,
    viewLabels,
    viewTooltips,
    onSelectView
) {
    var l10n = Exhibit.ViewPanel.l10n;
    var template = {
        elmt: div,
        className: "exhibit-viewPanel exhibit-ui-protection",
        children: [
            {   tag:        "div",
                className:  "exhibit-viewPanel-viewSelection",
                field:      "viewSelectionDiv"
            },
            {   tag:        "div",
                className:  "exhibit-viewPanel-viewContainer",
                field:      "viewContainerDiv"
            }
        ]
    };
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    dom.getViewContainer = function() {
        return dom.viewContainerDiv;
    };
    dom.setViewIndex = function(index) {
        if (viewLabels.length > 1) {
            dom.viewSelectionDiv.innerHTML = "";
            
            var appendView = function(i) {
                var selected = (i == index);
                if (i > 0) {
                    dom.viewSelectionDiv.appendChild(document.createTextNode(" \u2022 "));
                }
                
                var span = document.createElement("span");
                span.className = selected ? 
                    "exhibit-viewPanel-viewSelection-selectedView" :
                    "exhibit-viewPanel-viewSelection-view";
                span.title = viewTooltips[i];
                span.innerHTML = viewLabels[i];
                
                if (!selected) {
                    var handler = function(elmt, evt, target) {
                        onSelectView(i);
                        SimileAjax.DOM.cancelEvent(evt);
                        return false;
                    }
                    SimileAjax.WindowManager.registerEvent(span, "click", handler);
                }
                dom.viewSelectionDiv.appendChild(span);
            };
            
            for (var i = 0; i < viewLabels.length; i++) {
                appendView(i);
            }
        }
    };
    
    return dom;
};
