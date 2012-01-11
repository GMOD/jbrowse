/*==================================================
 *  Exhibit.TextSearchFacet
 *==================================================
 */

Exhibit.TextSearchFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    
    this._expressions = [];
    this._text = null;
    
    this._settings = {};
    this._dom = null;
    this._timerID = null;
    
    var self = this;
    this._listener = { 
        onRootItemsChanged: function() {
            if ("_itemToValue" in self) {
                delete self._itemToValue;
            }
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.TextSearchFacet._settingSpecs = {
    "facetLabel":       { type: "text" },
    "queryParamName":   { type: "text" },
    "requiresEnter":    {type: "boolean", defaultValue: false}
    };

Exhibit.TextSearchFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.TextSearchFacet(containerElmt, uiContext);
    
    Exhibit.TextSearchFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.TextSearchFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.TextSearchFacet(
        containerElmt != null ? containerElmt : configElmt, 
        uiContext
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.TextSearchFacet._settingSpecs, facet._settings);
    
    try {
        var s = Exhibit.getAttribute(configElmt, "expressions");
        if (s != null && s.length > 0) {
            facet._expressions = Exhibit.ExpressionParser.parseSeveral(s);
        }
        
        var query = Exhibit.getAttribute(configElmt, "query");
        if (query != null && query.length > 0) {
            facet._text = query;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "TextSearchFacet: Error processing configuration of list facet");
    }
    Exhibit.TextSearchFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.TextSearchFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TextSearchFacet._settingSpecs, facet._settings);
    
    if ("expressions" in configuration) {
        for (var i = 0; i < configuration.expressions.length; i++) {
            facet._expressions.push(Exhibit.ExpressionParser.parse(configuration.expressions[i]));
        }
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0; i < selection.length; i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    if ("query" in configuration) {
        facet._text = configuration.query;
    }
    if ("queryParamName" in facet._settings) {
        var params = SimileAjax.parseURLParameters();
        if (facet._settings["queryParamName"] in params) {
            facet._text = params[facet._settings["queryParamName"]];
        }
    }
    
    if (!("facetLabel" in facet._settings)) {
        facet._settings.facetLabel = "";
    }
}

Exhibit.TextSearchFacet.prototype.dispose = function() {
    this._uiContext.getCollection().removeFacet(this);
    
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    
    this._expressions = null;
    this._itemToValue = null;
    this._settings = null;
};

Exhibit.TextSearchFacet.prototype.hasRestrictions = function() {
    return this._text != null;
};

Exhibit.TextSearchFacet.prototype.clearAllRestrictions = function() {
    var restrictions = this._text;
    if (this._text != null) {
        this._text = null;

        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

        SimileAjax.RemoteLog.possiblyLog({
            facetType:"TextSearch", 
            facetLabel:this._settings.facetLabel, 
            operation:"clearAllRestrictions",
            exhibitSize:totalSize,
            preUpdateSize:preUpdateSize,
            postUpdateSize:postUpdateSize
        });
    }
    this._dom.input.value = "";
    
    return restrictions;
};

Exhibit.TextSearchFacet.prototype.applyRestrictions = function(restrictions) {
    this.setText(restrictions);
};

Exhibit.TextSearchFacet.prototype.setText = function(text) {
    if (text != null) {
        text = text.trim();
        this._dom.input.value = text;
        
        text = text.length > 0 ? text : null;
    } else {
        this._dom.input.value = "";
    }
    
    if (text != this._text) {
        this._text = text;
        var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        this._notifyCollection();
        var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
        var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

        SimileAjax.RemoteLog.possiblyLog({
            facetType:"TextSearch", 
            facetLabel:this._settings.facetLabel, 
            operation:"setText", 
            text:text,
            exhibitSize:totalSize,
            preUpdateSize:preUpdateSize,
            postUpdateSize:postUpdateSize            
        });
    }
}

Exhibit.TextSearchFacet.prototype.restrict = function(items) {
    if (this._text == null) {
        return items;
    } else {
        this._buildMaps();
        
        var set = new Exhibit.Set();
        var itemToValue = this._itemToValue;
        var text = this._text.toLowerCase();
        
        items.visit(function(item) {
            if (item in itemToValue) {
                var values = itemToValue[item];
                for (var v = 0; v < values.length; v++) {
                    if (values[v].indexOf(text) >= 0) {
                        set.add(item);
                        break;
                    }
                }
            }
        });
        return set;
    }
};

Exhibit.TextSearchFacet.prototype.update = function(items) {
    // nothing to do
};

Exhibit.TextSearchFacet.prototype._notifyCollection = function() {
    this._uiContext.getCollection().onFacetUpdated(this);
};

Exhibit.TextSearchFacet.prototype._initializeUI = function() {
    var self = this;
    this._dom = Exhibit.TextSearchFacet.constructFacetFrame(this._div, this._settings.facetLabel);
    
    if (this._text != null) {
        this._dom.input.value = this._text;
    }
    
    SimileAjax.WindowManager.registerEvent(this._dom.input, "keyup",
        function(elmt, evt, target) { self._onTextInputKeyUp(evt); });
};

Exhibit.TextSearchFacet.constructFacetFrame = function(div, facetLabel) {
    if (facetLabel !== "" && facetLabel !== null) {
        return SimileAjax.DOM.createDOMFromString(
            div,
            "<div class='exhibit-facet-header'>" +
                "<span class='exhibit-facet-header-title'>" + facetLabel + "</span>" +
            "</div>" +
            "<div class='exhibit-text-facet'><input type='text' id='input'></div>"
        );
    } else {
        return SimileAjax.DOM.createDOMFromString(
            div,
            "<div class='exhibit-text-facet'><input type='text' id='input'></div>"
        );
    }
};

Exhibit.TextSearchFacet.prototype._onTextInputKeyUp = function(evt) {
    if (this._timerID != null) {
        window.clearTimeout(this._timerID);
    }
    var self = this;
    if (this._settings.requiresEnter  == false) {
    	this._timerID = window.setTimeout(function() { self._onTimeout(); }, 500);
    } else {
    	var newText = this._dom.input.value.trim(); 
   		if (newText.length == 0 || evt.keyCode == 13) { // arbitrary
    	this._timerID = window.setTimeout(function() { self._onTimeout(); }, 0);
    } 
  }
};

Exhibit.TextSearchFacet.prototype._onTimeout = function() {
    this._timerID = null;
    
    var newText = this._dom.input.value.trim();
    if (newText.length == 0) {
        newText = null;
    }
    
    if (newText != this._text) {
        var self = this;
        var oldText = this._text;
        
        SimileAjax.History.addLengthyAction(
            function() { self.setText(newText); },
            function() { self.setText(oldText); },
            newText != null ?
                String.substitute(
                    Exhibit.FacetUtilities.l10n["facetTextSearchActionTitle"],
                    [ newText ]) :
                Exhibit.FacetUtilities.l10n["facetClearTextSearchActionTitle"]
        );
    }
}

Exhibit.TextSearchFacet.prototype._buildMaps = function() {
    if (!("_itemToValue" in this)) {
        var itemToValue = {};
        var allItems = this._uiContext.getCollection().getAllItems();
        var database = this._uiContext.getDatabase();
        
        if (this._expressions.length > 0) {
            var expressions = this._expressions;
            allItems.visit(function(item) {
                var values = [];
                for (var x = 0; x < expressions.length; x++) {
                    var expression = expressions[x];
                    expression.evaluateOnItem(item, database).values.visit(function(v) { values.push(v.toLowerCase()); });
                }
                itemToValue[item] = values;
            });
        } else {
            var propertyIDs = database.getAllProperties();
            allItems.visit(function(item) {
                var values = [];
                for (var p = 0; p < propertyIDs.length; p++) {
                    database.getObjects(item, propertyIDs[p]).visit(function(v) { values.push(v.toLowerCase()); });
                }
                itemToValue[item] = values;
            });
        }
        
        this._itemToValue = itemToValue;
    }
};

Exhibit.TextSearchFacet.prototype.exportFacetSelection = function() { 
  return this._text;
}; 
 
Exhibit.TextSearchFacet.prototype.importFacetSelection = function(settings) { 
  this.setText(settings);
}