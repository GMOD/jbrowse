/*==================================================
 *  Exhibit.ImageFacet
 *==================================================
 */

Exhibit.ImageFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    
    this._expression = null;
    this._valueSet = new Exhibit.Set();
    this._selectMissing = false;
    
    this._settings = {};
    this._dom = null;
};

Exhibit.ImageFacet._settingSpecs = {
    "facetLabel":       { type: "text" },
    "thumbNail":        { type: "uri" },
    "overlayCounts":    { type: "boolean", defaultValue: true },
    "fixedOrder":       { type: "text" },
    "sortMode":         { type: "text", defaultValue: "value" },
    "sortDirection":    { type: "text", defaultValue: "forward" },
    "showMissing":      { type: "boolean", defaultValue: true },
    "missingLabel":     { type: "text" },
    "scroll":           { type: "boolean", defaultValue: true },
    "height":           { type: "text" },
    "colorCoder":       { type: "text", defaultValue: null },
    "collapsible":      { type: "boolean", defaultValue: false },
    "collapsed":        { type: "boolean", defaultValue: false }
};

Exhibit.ImageFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.ImageFacet(containerElmt, uiContext);
    
    Exhibit.ImageFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.ImageFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.ImageFacet(
        containerElmt != null ? containerElmt : configElmt, 
        uiContext
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ImageFacet._settingSpecs, facet._settings);
    
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        
        var imageString = Exhibit.getAttribute(configElmt, "image");
        if (imageString != null && imageString.length > 0) {
            facet._imageExpression = Exhibit.ExpressionParser.parse(imageString);
        }

        var tooltipString = Exhibit.getAttribute(configElmt, "tooltip");
        if (tooltipString != null && tooltipString.length > 0) {
            facet._tooltipExpression = Exhibit.ExpressionParser.parse(tooltipString);
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
        SimileAjax.Debug.exception(e, "ImageFacet: Error processing configuration of list facet");
    }
    Exhibit.ImageFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.ImageFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ImageFacet._settingSpecs, facet._settings);
    
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("image" in configuration) {
        facet._imageExpression = Exhibit.ExpressionParser.parse(configuration.image);
    }
    if ("tooltip" in configuration) {
        facet._tooltipExpression = Exhibit.ExpressionParser.parse(configuration.tooltip);
    }

	if (!(facet._imageExpression)) {
        facet._imageExpression = Exhibit.ExpressionParser.parse("value");
	}
	if (!(facet._tooltipExpression)) {
        facet._tooltipExpression = Exhibit.ExpressionParser.parse("value");
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
    
    facet._cache = new Exhibit.FacetUtilities.Cache(
        facet._uiContext.getDatabase(),
        facet._uiContext.getCollection(),
        facet._expression
    );
}

Exhibit.ImageFacet.prototype.dispose = function() {
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

Exhibit.ImageFacet.prototype.hasRestrictions = function() {
    return this._valueSet.size() > 0 || this._selectMissing;
};

Exhibit.ImageFacet.prototype.clearAllRestrictions = function() {
    var restrictions = { selection: [], selectMissing: false };
    if (this.hasRestrictions()) {
        this._valueSet.visit(function(v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Exhibit.Set();
        
        restrictions.selectMissing = this._selectMissing;
        this._selectMissing = false;
        
        this._notifyCollection();
    }
    return restrictions;
};

Exhibit.ImageFacet.prototype.applyRestrictions = function(restrictions) {
    this._valueSet = new Exhibit.Set();
    for (var i = 0; i < restrictions.selection.length; i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this._selectMissing = restrictions.selectMissing;
    
    this._notifyCollection();
};

Exhibit.ImageFacet.prototype.setSelection = function(value, selected) {
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }
    this._notifyCollection();
}

Exhibit.ImageFacet.prototype.setSelectMissing = function(selected) {
    if (selected != this._selectMissing) {
        this._selectMissing = selected;
        this._notifyCollection();
    }
}

Exhibit.ImageFacet.prototype.restrict = function(items) {
    if (this._valueSet.size() == 0 && !this._selectMissing) {
        return items;
    }
    
    var set = this._cache.getItemsFromValues(this._valueSet, items);
    if (this._selectMissing) {
        this._cache.getItemsMissingValue(items, set);
    }
    
    return set;
};

Exhibit.ImageFacet.prototype.update = function(items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    this._constructBody(this._computeFacet(items));
    this._dom.valuesContainer.style.display = "block";
};

Exhibit.ImageFacet.prototype._computeFacet = function(items) {
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
			entry.image = this._imageExpression.evaluateSingleOnItem(entry.value, database).value;
			entry.tooltip = this._tooltipExpression.evaluateSingleOnItem(entry.value, database).value;
            entry.selected = selection.contains(entry.value);
        }
        
        entries.sort(this._createSortFunction(valueType));
    }
    /* should display something to account for items that don't have this field

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
    */
    return entries;
}

Exhibit.ImageFacet.prototype._notifyCollection = function() {
    this._uiContext.getCollection().onFacetUpdated(this);
};

Exhibit.ImageFacet.prototype._initializeUI = function() {
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

Exhibit.ImageFacet.prototype._constructBody = function(entries) {
    var self = this;
    var shouldOverlayCounts = this._settings.overlayCounts;
    var containerDiv = this._dom.valuesContainer;
    
    containerDiv.style.display = "none";
    var facetHasSelection = this._valueSet.size() > 0 || this._selectMissing;
    var constructValue = function(entry) {
        var onSelectOnly = function(elmt, evt, target) {
            self._filter(entry.value, entry.actionLabel, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
		var elmt = document.createElement("span");
		var wrapper = document.createElement("div");
		wrapper.className = "wrapper";
		var image = document.createElement("img");
		image.src = entry.image;
		wrapper.appendChild(image);
		
		if(shouldOverlayCounts == true) {
			var countDiv = document.createElement("div");
			countDiv.className = "countDiv";
			var countBackground = document.createElement("div");
			countBackground.className = "countBackground";
			//countImage.src = "http://simile.mit.edu/painter/painter?renderer=map-marker&shape=square&alpha=0.7&width=20&height=20&background=FF9000&label=&pin=false&.png"
			//countImage.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod=scale,src="http://simile.mit.edu/painter/painter?renderer=map-marker&shape=circle&alpha=0.7&width=31&height=31&background=FF9000&label=&pin=false&.png");'
			countDiv.appendChild(countBackground);
			var innerCount = document.createElement("div");
			innerCount.className = "text";
			innerCount.innerHTML = entry.count;
			countDiv.appendChild(innerCount);
			wrapper.appendChild(countDiv);
		}
		
		elmt.appendChild(wrapper);
		
		elmt.className = entry.selected ? "inline-block exhibit-imageFacet-value exhibit-imageFacet-value-selected" : "inline-block exhibit-imageFacet-value";

		elmt.title = entry.count + " " + entry.tooltip;

	    SimileAjax.WindowManager.registerEvent(elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
	
        containerDiv.appendChild(elmt);
    };
    
    for (var j = 0; j < entries.length; j++) {
        constructValue(entries[j]);
    }
    containerDiv.style.display = "block";
    
    this._dom.setSelectionCount(this._valueSet.size() + (this._selectMissing ? 1 : 0));
};

Exhibit.ImageFacet.prototype._filter = function(value, label, selectOnly) {
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

Exhibit.ImageFacet.prototype._clearSelections = function() {
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

Exhibit.ImageFacet.prototype._createSortFunction = function(valueType) {
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
