/*==================================================
 *  Exhibit.ListFacet
 *==================================================
 */

Exhibit.ListFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    
    this._expression = null;
    this._valueSet = new Exhibit.Set();
    this._selectMissing = false;

	this._delayedUpdateItems = null;
    
    this._settings = {};
    this._dom = null;
};

Exhibit.ListFacet._settingSpecs = {
    "facetLabel":       { type: "text" },
    "fixedOrder":       { type: "text" },
    "sortMode":         { type: "text", defaultValue: "value" },
    "sortDirection":    { type: "text", defaultValue: "forward" },
    "showMissing":      { type: "boolean", defaultValue: true },
    "missingLabel":     { type: "text" },
    "scroll":           { type: "boolean", defaultValue: true },
    "height":           { type: "text" },
    "colorCoder":       { type: "text", defaultValue: null },
    "collapsible":      { type: "boolean", defaultValue: false },
    "collapsed":        { type: "boolean", defaultValue: false },
    "formatter":        { type: "text", defaultValue: null}
};

Exhibit.ListFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.ListFacet(containerElmt, uiContext);
    
    Exhibit.ListFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.ListFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.ListFacet(
        containerElmt != null ? containerElmt : configElmt, 
        uiContext
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ListFacet._settingSpecs, facet._settings);
    
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s; s = selection[i]; i++) {
                facet._valueSet.add(s);
            }
        }
        
        var selectMissing = Exhibit.getAttribute(configElmt, "selectMissing");
        if (selectMissing != null && selectMissing.length > 0) {
            facet._selectMissing = (selectMissing == "true");
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "ListFacet: Error processing configuration of list facet");
    }
    Exhibit.ListFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.ListFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ListFacet._settingSpecs, facet._settings);
    
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0; i < selection.length; i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    if ("selectMissing" in configuration) {
        facet._selectMissing = configuration.selectMissing;
    }
    
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "missing ex:facetLabel";
        if (facet._expression != null && facet._expression.isPath()) {
            var segment = facet._expression.getPath().getLastSegment();
            var property = facet._uiContext.getDatabase().getProperty(segment.property);
            if (property != null) {
                facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
            }
        }
    }
    if ("fixedOrder" in facet._settings) {
        var values = facet._settings.fixedOrder.split(";");
        var orderMap = {};
        for (var i = 0; i < values.length; i++) {
            orderMap[values[i].trim()] = i;
        }
        
        facet._orderMap = orderMap;
    }
    
    if ("colorCoder" in facet._settings) {
        facet._colorCoder = facet._uiContext.getExhibit().getComponent(facet._settings.colorCoder);
    }
    
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
    
    if ("formatter" in facet._settings) {
        var formatter = facet._settings.formatter;
        if (formatter != null && formatter.length > 0) {
            try {
                facet._formatter = eval(formatter);
            } catch (e) {
                SimileAjax.Debug.log(e);
            }
        }
    }
    
    facet._cache = new Exhibit.FacetUtilities.Cache(
        facet._uiContext.getDatabase(),
        facet._uiContext.getCollection(),
        facet._expression
    );
}

Exhibit.ListFacet.prototype.dispose = function() {
    this._cache.dispose();
    this._cache = null;
    
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext = null;
    this._colorCoder = null;
    
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    
    this._expression = null;
    this._valueSet = null;
    this._settings = null;
};

Exhibit.ListFacet.prototype.hasRestrictions = function() {
    return this._valueSet.size() > 0 || this._selectMissing;
};

Exhibit.ListFacet.prototype.clearAllRestrictions = function() {
    var oldRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    
    var restrictions = { selection: [], selectMissing: false };
    if (this.hasRestrictions()) {
        this._valueSet.visit(function(v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Exhibit.Set();
        
        restrictions.selectMissing = this._selectMissing;
        this._selectMissing = false;

        var newRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

        var restricted = "";
        if (newRestrictionSize > 0) {
            arr = Array();
            for (k in this._valueSet._hash) {
                arr.push(k);
            }
            restricted = arr.join("##");
        }

        SimileAjax.RemoteLog.possiblyLog({
            facetType:"ListFacet", 
            facetLabel:this._settings.facetLabel, 
            operation:"clearAllRestrictions",
            exhibitSize:totalSize,
            selectedValues:restricted,            
            preUpdateSize:preUpdateSize,
            postUpdateSize:postUpdateSize,
            oldRestrictionSize:oldRestrictionSize,
            newRestrictionSize:newRestrictionSize
        });

    }
    return restrictions;
};

Exhibit.ListFacet.prototype.applyRestrictions = function(restrictions) {
    var oldRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;

    this._valueSet = new Exhibit.Set();
    for (var i = 0; i < restrictions.selection.length; i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this._selectMissing = restrictions.selectMissing;

    var newRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

    var restricted = "";
    if (newRestrictionSize > 0) {
        arr = Array();
        for (k in this._valueSet._hash) {
            arr.push(k);
        }
        restricted = arr.join("##");
    }

    SimileAjax.RemoteLog.possiblyLog({
        facetType:"ListFacet", 
        facetLabel:this._settings.facetLabel, 
        operation:"applyRestrictions",
        exhibitSize:totalSize,
        selectedValues:restricted,
        preUpdateSize:preUpdateSize,
        postUpdateSize:postUpdateSize,        
        oldRestrictionSize:oldRestrictionSize,
        newRestrictionSize:newRestrictionSize        
    });
    
};

Exhibit.ListFacet.prototype.setSelection = function(value, selected) {
    var oldRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }

    var newRestrictionSize = SimileAjax.RemoteLog.logActive ? this._valueSet.size() : 0;
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

    var restricted = "";
    if (newRestrictionSize > 0) {
        arr = Array();
        for (k in this._valueSet._hash) {
            arr.push(k);
        }
        restricted = arr.join("##");
    }

    SimileAjax.RemoteLog.possiblyLog({
        facetType:"ListFacet", 
        facetLabel:this._settings.facetLabel, 
        operation:"setSelection", 
        value:value, 
        selected:selected,
        exhibitSize:totalSize,
        selectedValues:restricted,
        preUpdateSize:preUpdateSize,
        postUpdateSize:postUpdateSize,
        oldRestrictionSize:oldRestrictionSize,
        newRestrictionSize:newRestrictionSize        
    });

}

Exhibit.ListFacet.prototype.setSelectMissing = function(selected) {
    if (selected != this._selectMissing) {
        this._selectMissing = selected;
        this._notifyCollection();
    }
}

Exhibit.ListFacet.prototype.restrict = function(items) {
    if (this._valueSet.size() == 0 && !this._selectMissing) {
        return items;
    }
    
    var set = this._cache.getItemsFromValues(this._valueSet, items);
    if (this._selectMissing) {
        this._cache.getItemsMissingValue(items, set);
    }
    
    return set;
};

Exhibit.ListFacet.prototype.onUncollapse = function() {
	if (this._delayedUpdateItems != null) {
		this.update(this._delayedUpdateItems);
		this._delayedUpdateItems = null;
	}
}

Exhibit.ListFacet.prototype.update = function(items) {
	if (Exhibit.FacetUtilities.isCollapsed(this)) {
		this._delayedUpdateItems = items;
		return;
	}
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._constructBody(this._computeFacet(items));
    this._dom.valuesContainer.style.display = "block";
};



Exhibit.ListFacet.prototype._computeFacet = function(items) {
    var database = this._uiContext.getDatabase();
    var r = this._cache.getValueCountsFromItems(items);
    var entries = r.entries;
    var valueType = r.valueType;
    
    if (entries.length > 0) {
        var selection = this._valueSet;
        var labeler = valueType == "item" ?
            function(v) { var l = database.getObject(v, "label"); return l != null ? l : v; } :
            function(v) { return v; }
            
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            entry.actionLabel = entry.selectionLabel = labeler(entry.value);
            entry.selected = selection.contains(entry.value);
        }
        
        entries.sort(this._createSortFunction(valueType));
    }
    
    if (this._settings.showMissing || this._selectMissing) {
        var count = this._cache.countItemsMissingValue(items);
        if (count > 0 || this._selectMissing) {
            var span = document.createElement("span");
            span.innerHTML = ("missingLabel" in this._settings) ? 
                this._settings.missingLabel : Exhibit.FacetUtilities.l10n.missingThisField;
            span.className = "exhibit-facet-value-missingThisField";
            
            entries.unshift({
                value:          null, 
                count:          count,
                selected:       this._selectMissing,
                selectionLabel: span,
                actionLabel:    Exhibit.FacetUtilities.l10n.missingThisField
            });
        }
    }
    
    return entries;
}

Exhibit.ListFacet.prototype._notifyCollection = function() {
    this._uiContext.getCollection().onFacetUpdated(this);
};

Exhibit.ListFacet.prototype._initializeUI = function() {
    var self = this;
    this._dom = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetFrame" : "constructFlowingFacetFrame"](
		this,
        this._div,
        this._settings.facetLabel,
        function(elmt, evt, target) { self._clearSelections(); },
        this._uiContext,
        this._settings.collapsible,
        this._settings.collapsed
    );
    
    if ("height" in this._settings && this._settings.scroll) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};

Exhibit.ListFacet.prototype._constructBody = function(entries) {
    var self = this;
    var containerDiv = this._dom.valuesContainer;
    
    containerDiv.style.display = "none";
    
    var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetItem" : "constructFlowingFacetItem"];
    var facetHasSelection = this._valueSet.size() > 0 || this._selectMissing;
    var constructValue = function(entry) {
        var onSelect = function(elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function(elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var elmt = constructFacetItemFunction(
            entry.selectionLabel, 
            entry.count, 
            (self._colorCoder != null) ? self._colorCoder.translate(entry.value) : null,
            entry.selected, 
            facetHasSelection,
            onSelect,
            onSelectOnly,
            self._uiContext
        );
        
        if (self._formatter) self._formatter(elmt);
        
        containerDiv.appendChild(elmt);
    };
    
    for (var j = 0; j < entries.length; j++) {
        constructValue(entries[j]);
    }
    containerDiv.style.display = "block";
    
    this._dom.setSelectionCount(this._valueSet.size() + (this._selectMissing ? 1 : 0));
};

Exhibit.ListFacet.prototype._filter = function(value, label, selectOnly) {
    var self = this;
    var selected, select, deselect;
    
    var oldValues = new Exhibit.Set(this._valueSet);
    var oldSelectMissing = this._selectMissing;
    
    var newValues;
    var newSelectMissing;
    var actionLabel;
    
    var wasSelected;
    var wasOnlyThingSelected;
    
    if (value == null) { // the (missing this field) case
        wasSelected = oldSelectMissing;
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 0);
        
        if (selectOnly) {
            if (oldValues.size() == 0) {
                newSelectMissing = !oldSelectMissing;
            } else {
                newSelectMissing = true;
            }
            newValues = new Exhibit.Set();
        } else {
            newSelectMissing = !oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
        }
    } else {
        wasSelected = oldValues.contains(value);
        wasOnlyThingSelected = wasSelected && (oldValues.size() == 1) && !oldSelectMissing;
        
        if (selectOnly) {
            newSelectMissing = false;
            newValues = new Exhibit.Set();
            
            if (!oldValues.contains(value)) {
                newValues.add(value);
            } else if (oldValues.size() > 1 || oldSelectMissing) {
                newValues.add(value);
            }
        } else {
            newSelectMissing = oldSelectMissing;
            newValues = new Exhibit.Set(oldValues);
            if (newValues.contains(value)) {
                newValues.remove(value);
            } else {
                newValues.add(value);
            }
        }
    }
    
    var newRestrictions = { selection: newValues.toArray(), selectMissing: newSelectMissing };
    var oldRestrictions = { selection: oldValues.toArray(), selectMissing: oldSelectMissing };
    
    SimileAjax.History.addLengthyAction(
        function() { self.applyRestrictions(newRestrictions); },
        function() { self.applyRestrictions(oldRestrictions); },
        (selectOnly && !wasOnlyThingSelected) ?
            String.substitute(
                Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"],
                [ label, this._settings.facetLabel ]) :
            String.substitute(
                Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"],
                [ label, this._settings.facetLabel ])
    );
};

Exhibit.ListFacet.prototype._clearSelections = function() {
    var state = {};
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() { state.restrictions = self.clearAllRestrictions(); },
        function() { self.applyRestrictions(state.restrictions); },
        String.substitute(
            Exhibit.FacetUtilities.l10n["facetClearSelectionsActionTitle"],
            [ this._settings.facetLabel ])
    );
};

Exhibit.ListFacet.prototype._createSortFunction = function(valueType) {
    var sortValueFunction = function(a, b) { return a.selectionLabel.localeCompare(b.selectionLabel); };
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        
        sortValueFunction = function(a, b) {
            if (a.selectionLabel in orderMap) {
                if (b.selectionLabel in orderMap) {
                    return orderMap[a.selectionLabel] - orderMap[b.selectionLabel];
                } else {
                    return -1;
                }
            } else if (b.selectionLabel in orderMap) {
                return 1;
            } else {
                return a.selectionLabel.localeCompare(b.selectionLabel);
            }
        }
    } else if (valueType == "number") {
        sortValueFunction = function(a, b) {
            a = parseFloat(a.value);
            b = parseFloat(b.value);
            return a < b ? -1 : a > b ? 1 : 0;
        }
    }
    
    var sortFunction = sortValueFunction;
    if (this._settings.sortMode == "count") {
        sortFunction = function(a, b) {
            var c = b.count - a.count;
            return c != 0 ? c : sortValueFunction(a, b);
        }
    }

    var sortDirectionFunction = sortFunction;
    if (this._settings.sortDirection == "reverse"){
        sortDirectionFunction = function(a, b) {
            return sortFunction(b, a);
        }
    }
    
    return sortDirectionFunction;
}

Exhibit.ListFacet.prototype.exportFacetSelection = function() { 
  var s = []; 
  this._valueSet.visit(function(v) { 
    s.push(v); 
  }); 
  if (s.length > 0) {
    return s.join(',');  
  }
}; 
 
Exhibit.ListFacet.prototype.importFacetSelection = function(settings) { 
  var self = this; 
   
  self.applyRestrictions({ selection: settings.split(','), selectMissing: self._selectMissing }); 
}