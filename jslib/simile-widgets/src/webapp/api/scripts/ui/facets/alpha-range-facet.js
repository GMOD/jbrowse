/*==================================================
 *  Exhibit.AlphaRangeFacet
 *==================================================
 */

Exhibit.AlphaRangeFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    
    this._expression = null;
    this._settings = {};
    
    this._dom = null;
    this._ranges = [];
    
    var self = this;
    this._listener = { 
        onRootItemsChanged: function() {
            if ("_rangeIndex" in self) {
                delete self._rangeIndex;
            }
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.AlphaRangeFacet._settingSpecs = {
    "facetLabel":       { type: "text" },
    "scroll":           { type: "boolean", defaultValue: true },
    "height":           { type: "text" },
    "interval":         { type: "int", defaultValue: 7 },
    "collapsible":      { type: "boolean", defaultValue: false },
    "collapsed":        { type: "boolean", defaultValue: false }
};

Exhibit.AlphaRangeFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.AlphaRangeFacet(
        containerElmt,
        uiContext
    );
    
    Exhibit.AlphaRangeFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.AlphaRangeFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.AlphaRangeFacet(
        containerElmt != null ? containerElmt : configElmt, 
        uiContext
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.AlphaRangeFacet._settingSpecs, facet._settings);
    
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "AlphaRangeFacet: Error processing configuration of alpha range facet");
    }
    Exhibit.AlphaRangeFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.AlphaRangeFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.AlphaRangeFacet._settingSpecs, facet._settings);
    
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
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
    
    if (facet._settings.collapsed) {
        facet._settings.collapsible = true;
    }
}

Exhibit.AlphaRangeFacet.prototype.dispose = function() {
    this._uiContext.getCollection().removeFacet(this);
    
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;

    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    
    this._expression = null;
    this._settings = null;
    this._ranges = [];
};

Exhibit.AlphaRangeFacet.prototype.hasRestrictions = function() {
  return this._ranges.length > 0; 
};

Exhibit.AlphaRangeFacet.prototype.clearAllRestrictions = function() {
  var restrictions = [];
  if (this._ranges.length > 0) {
      restrictions = restrictions.concat(this._ranges);
      this._ranges = [];
      this._notifyCollection();
  }
  return restrictions;
};

Exhibit.AlphaRangeFacet.prototype.applyRestrictions = function(restrictions) {
  this._ranges = restrictions;
  this._notifyCollection();
};

Exhibit.AlphaRangeFacet.prototype.setRange = function(from, to, selected) {
    if (selected) {
        for (var i = 0; i < this._ranges.length; i++) {
            var range = this._ranges[i];
            if (range.from == from && range.to == to) {
                return;
            }
        }
        this._ranges.push({ from: from, to: to });
    } else {
        for (var i = 0; i < this._ranges.length; i++) {
            var range = this._ranges[i];
            if (range.from == from && range.to == to) {
                this._ranges.splice(i, 1);
                break;
            }
        }
    }
    this._notifyCollection();
}

Exhibit.AlphaRangeFacet.prototype.restrict = function(items) {
    if (this._ranges.length == 0) {
        return items;
    } 
    else {
        this._buildRangeIndex();
        
        var set = new Exhibit.Set();
        for (var i = 0; i < this._ranges.length; i++) {
            var range = this._ranges[i];
            this._rangeIndex.getSubjectsInRange(range.from, String.fromCharCode(range.to.charCodeAt(0)+1), true, set, items);
        }
        return set;
    }
};

Exhibit.AlphaRangeFacet.prototype.update = function(items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    
    this._reconstruct(items);
    this._dom.valuesContainer.style.display = "block";
};

Exhibit.AlphaRangeFacet.prototype._reconstruct = function(items) {

    var self = this;
    var ranges = [];
    
    var rangeIndex;
    var computeItems;
    
    this._buildRangeIndex(); 

    rangeIndex = this._rangeIndex;

    countItems = function(range) {
      return rangeIndex.getSubjectsInRange(range.from, String.fromCharCode(range.to.charCodeAt(0)+1), true, null, items).size();
    }

    // Create list of alpha characters
    var alphaList = [];
        
    var alphaInList = function(a) {
      for (x in alphaList) {
        if (alphaList[x] == a) {
          return true;
        }
      }
      return false;
    };
    
    for (var y = 0; y < rangeIndex.getCount(); y+=1) {
      var alphaChar = rangeIndex._pairs[y].value.substr(0,1).toUpperCase();
      if (!alphaInList(alphaChar)) {
        alphaList.push(alphaChar);
      }
    }

    for (var x = 0; x < alphaList.length; x += this._settings.interval) {
        var range = { 
            from:       alphaList[x], 
            to:         alphaList[(x + this._settings.interval >= alphaList.length ? alphaList.length-1 : x + this._settings.interval - 1)],
            selected:   false
        };
        range.count = countItems(range);
        
        for (var i = 0; i < this._ranges.length; i++) {
            var range2 = this._ranges[i];
            if (range2.from == range.from && range2.to == range.to) {
                range.selected = true;
                facetHasSelection = true;
                break;
            }
        }
        
        ranges.push(range);
    }
    
    var facetHasSelection = this._ranges.length > 0;
    var containerDiv = this._dom.valuesContainer;
    containerDiv.style.display = "none";
        var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructFacetItem" : "constructFlowingFacetItem"];
        var makeFacetValue = function(from, to, count, selected) {
            var onSelect = function(elmt, evt, target) {
                self._toggleRange(from, to, selected, false);
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            };
            var onSelectOnly = function(elmt, evt, target) {
                self._toggleRange(from, to, selected, !(evt.ctrlKey || evt.metaKey));
                SimileAjax.DOM.cancelEvent(evt);
                return false;
            };
            var elmt = constructFacetItemFunction(
                from.substr(0,1) + " - " + to.substr(0,1), 
                count, 
                null,
                selected, 
                facetHasSelection,
                onSelect,
                onSelectOnly,
                self._uiContext
            );
            containerDiv.appendChild(elmt);
        };
        
        for (var i = 0; i < ranges.length; i++) {
            var range = ranges[i];
            if (range.selected || range.count > 0) {
                makeFacetValue(range.from, range.to, range.count, range.selected);
            }
        }
    containerDiv.style.display = "block";
    
    this._dom.setSelectionCount(this._ranges.length);
}

Exhibit.AlphaRangeFacet.prototype._notifyCollection = function() {
    this._uiContext.getCollection().onFacetUpdated(this);
};

Exhibit.AlphaRangeFacet.prototype._initializeUI = function() {
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
    
    if ("height" in this._settings) {
        this._dom.valuesContainer.style.height = this._settings.height;
    }
};

Exhibit.AlphaRangeFacet.prototype._toggleRange = function(from, to, wasSelected, singleSelection) {
    var self = this;
    var label = from + " to " + to;
    var wasOnlyThingSelected = (this._ranges.length == 1 && wasSelected);
    if (singleSelection && !wasOnlyThingSelected) {
        var newRestrictions = [ { from: from, to: to } ];
        var oldRestrictions = [].concat(this._ranges);
    
        SimileAjax.History.addLengthyAction(
            function() { self.applyRestrictions(newRestrictions); },
            function() { self.applyRestrictions(oldRestrictions); },
            String.substitute(
                Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"],
                [ label, this._settings.facetLabel ])
        );
    } else {
        SimileAjax.History.addLengthyAction(
            function() { self.setRange(from, to, !wasSelected); },
            function() { self.setRange(from, to, wasSelected); },
            String.substitute(
                Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"],
                [ label, this._settings.facetLabel ])
        );
    }
};

Exhibit.AlphaRangeFacet.prototype._clearSelections = function() {
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


Exhibit.AlphaRangeFacet.prototype._buildRangeIndex = function() {
    if (!("_rangeIndex" in this)) {
        var expression = this._expression;
        var database = this._uiContext.getDatabase();
        
        var segment = expression.getPath().getLastSegment();
        var property = database.getProperty(segment.property);
        
        var getter = function(item, f) {
          database.getObjects(item, property.getID(), null, null).visit(function(value) {
            f(value.toUpperCase());
          }); 
          // expression.evaluateOnItem(item, database).values.visit(function(value) {
          //   f(value.toUpperCase());
          // });
        };

        this._rangeIndex = new Exhibit.Database._RangeIndex(
            this._uiContext.getCollection().getAllItems(),
            getter
        ); 
        
        // this._rangeIndex._pairs.sort(function(p1, p2) {
        //     return p1.value.localeCompare(p2.value);
        // });
    }
};

Exhibit.AlphaRangeFacet.prototype.exportFacetSelection = function() { 
  var exportedSettings = [];
  for (var i = 0; i < this._ranges.length; i++) {
    var range = this._ranges[i];
    exportedSettings.push(range.from + '|' + range.to);
  }
  return exportedSettings.join(',');
}; 
 
Exhibit.AlphaRangeFacet.prototype.importFacetSelection = function(settings) { 
  if (settings.length > 0) {
    var ranges = settings.split(',');
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i].split('|');
      this._ranges.push({from: range[0], to: range[1]});
    }
  }
  if (ranges && ranges.length > 0) {
    this.update();
    this._notifyCollection();
  }
}