/*==================================================
 *  Exhibit.FacetUtilities
 *
 *  Utilities for facets' code.
 *==================================================
 */
Exhibit.FacetUtilities = new Object();

Exhibit.FacetUtilities.constructFacetFrame = function(forFacet, div, facetLabel, onClearAllSelections, uiContext, collapsible, collapsed) {
    div.className = "exhibit-facet";
    var dom = SimileAjax.DOM.createDOMFromString(
        div,
        "<div class='exhibit-facet-header'>" +
            "<div class='exhibit-facet-header-filterControl' id='clearSelectionsDiv' title='" + Exhibit.FacetUtilities.l10n.clearSelectionsTooltip + "'>" +
                "<span id='filterCountSpan'></span>" +
                "<img id='checkImage' />" +
            "</div>" +
            ((collapsible) ?
                "<img src='"+Exhibit.urlPrefix+"images/collapse.png' class='exhibit-facet-header-collapse' id='collapseImg' />" :
                "") +
            "<span class='exhibit-facet-header-title'>" + facetLabel + "</span>" +
        "</div>" +
        "<div class='exhibit-facet-body-frame' id='frameDiv'></div>",
        { checkImage: Exhibit.UI.createTranslucentImage("images/black-check.png") }
    );
    var resizableDivWidget = Exhibit.ResizableDivWidget.create({}, dom.frameDiv, uiContext);
    
    dom.valuesContainer = resizableDivWidget.getContentDiv();
    dom.valuesContainer.className = "exhibit-facet-body";
    
    dom.setSelectionCount = function(count) {
        this.filterCountSpan.innerHTML = count;
        this.clearSelectionsDiv.style.display = count > 0 ? "block" : "none";
    };
    SimileAjax.WindowManager.registerEvent(dom.clearSelectionsDiv, "click", onClearAllSelections);
    
    if (collapsible) {
        SimileAjax.WindowManager.registerEvent(dom.collapseImg, "click", function() {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        });
        
        if (collapsed) {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        }
    }
    
    return dom;
};

Exhibit.FacetUtilities.toggleCollapse = function(dom, facet) {
    var el = dom.frameDiv;
    if (el.style.display != "none") {
        el.style.display = "none";
        dom.collapseImg.src = Exhibit.urlPrefix + "images/expand.png";
    } else {
        el.style.display = "block";
        dom.collapseImg.src = Exhibit.urlPrefix + "images/collapse.png";
		// Try to call onUncollapse but don't sweat it if it isn't there.
		if (typeof facet.onUncollapse == 'function') {
			facet.onUncollapse();			
		}
    }
};

Exhibit.FacetUtilities.isCollapsed = function(facet) {
    var el = facet._dom.frameDiv;
    return el.style.display == "none";
};

Exhibit.FacetUtilities.constructFacetItem = function(
    label, 
    count, 
    color,
    selected, 
    facetHasSelection,
    onSelect,
    onSelectOnly,
    uiContext
) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    
    var dom = SimileAjax.DOM.createDOMFromString(
        "div",
        "<div class='exhibit-facet-value-count'>" + count + "</div>" +
        "<div class='exhibit-facet-value-inner' id='inner'>" + 
            (   "<div class='exhibit-facet-value-checkbox'>&#160;" +
                    SimileAjax.Graphics.createTranslucentImageHTML(
                        Exhibit.urlPrefix + 
                        (   facetHasSelection ?
                            (selected ? "images/black-check.png" : "images/no-check.png") :
                            "images/no-check-no-border.png"
                        )) +
                "</div>"
            ) +
            "<a class='exhibit-facet-value-link' href='javascript:{}' id='link'></a>" +
        "</div>"
    );
    dom.elmt.className = selected ? "exhibit-facet-value exhibit-facet-value-selected" : "exhibit-facet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.link.innerHTML = label;
        if (color != null) {
            dom.link.style.color = color;
        }
    } else {
        dom.link.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.inner.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    return dom.elmt;
};

Exhibit.FacetUtilities.constructFlowingFacetFrame = function(forFacet, div, facetLabel, onClearAllSelections, uiContext, collapsible, collapsed) {
    div.className = "exhibit-flowingFacet";
    var dom = SimileAjax.DOM.createDOMFromString(
        div,
        "<div class='exhibit-flowingFacet-header'>" +
            ((collapsible) ?
                "<img src='" + Exhibit.urlPrefix + "images/collapse.png' class='exhibit-facet-header-collapse' id='collapseImg' />" :
                "") +
            "<span class='exhibit-flowingFacet-header-title'>" + facetLabel + "</span>" +
        "</div>" +
        "<div id='frameDiv'><div class='exhibit-flowingFacet-body' id='valuesContainer'></div></div>"
    );
    
    dom.setSelectionCount = function(count) {
        // nothing
    };

    if (collapsible) {
        SimileAjax.WindowManager.registerEvent(dom.collapseImg, "click", function() {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        });
        
        if (collapsed) {
            Exhibit.FacetUtilities.toggleCollapse(dom, forFacet);
        }
    }
    
    return dom;
};

Exhibit.FacetUtilities.constructFlowingFacetItem = function(
    label, 
    count, 
    color,
    selected, 
    facetHasSelection,
    onSelect,
    onSelectOnly,
    uiContext
) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    
    var dom = SimileAjax.DOM.createDOMFromString(
        "div",
        (   "<div class='exhibit-flowingFacet-value-checkbox'>" +
                SimileAjax.Graphics.createTranslucentImageHTML(
                    Exhibit.urlPrefix + 
                    (   facetHasSelection ?
                        (selected ? "images/black-check.png" : "images/no-check.png") :
                        "images/no-check-no-border.png"
                    )) +
            "</div>"
        ) +
        "<a class='exhibit-flowingFacet-value-link' href='javascript:{}' id='inner'></a>" +
        " " +
        "<span class='exhibit-flowingFacet-value-count'>(" + count + ")</span>"
    );
    
    dom.elmt.className = selected ? "exhibit-flowingFacet-value exhibit-flowingFacet-value-selected" : "exhibit-flowingFacet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.inner.innerHTML = label;
        if (color != null) {
            dom.inner.style.color = color;
        }
    } else {
        dom.inner.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.elmt.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    return dom.elmt;
};

Exhibit.FacetUtilities.constructHierarchicalFacetItem = function(
    label, 
    count, 
    color,
    selected, 
    hasChildren,
    expanded,
    facetHasSelection,
    onSelect,
    onSelectOnly,
    onToggleChildren,
    uiContext
) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    
    var dom = SimileAjax.DOM.createDOMFromString(
        "div",
        "<div class='exhibit-facet-value-count'>" + count + "</div>" +
        "<div class='exhibit-facet-value-inner' id='inner'>" + 
            (   "<div class='exhibit-facet-value-checkbox'>&#160;" +
                    SimileAjax.Graphics.createTranslucentImageHTML(
                        Exhibit.urlPrefix + 
                        (   facetHasSelection ?
                            (selected ? "images/black-check.png" : "images/no-check.png") :
                            "images/no-check-no-border.png"
                        )) +
                "</div>"
            ) +
            "<a class='exhibit-facet-value-link' href='javascript:{}' id='link'></a>" +
            (   hasChildren ?
                (   "<a class='exhibit-facet-value-children-toggle' href='javascript:{}' id='toggle'>" + 
                        SimileAjax.Graphics.createTranslucentImageHTML(
                            Exhibit.urlPrefix + "images/down-arrow.png") +
                        SimileAjax.Graphics.createTranslucentImageHTML(
                            Exhibit.urlPrefix + "images/right-arrow.png") +
                    "</a>"
                ) :
                ""
            ) +
        "</div>" +
        (hasChildren ? "<div class='exhibit-facet-childrenContainer' id='childrenContainer'></div>" : "")
    );
    dom.elmt.className = selected ? "exhibit-facet-value exhibit-facet-value-selected" : "exhibit-facet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.link.appendChild(document.createTextNode(label));
        if (color != null) {
            dom.link.style.color = color;
        }
    } else {
        dom.link.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.inner.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    if (hasChildren) {
        dom.showChildren = function(show) {
            dom.childrenContainer.style.display = show ? "block" : "none";
            dom.toggle.childNodes[0].style.display = show ? "inline" : "none";
            dom.toggle.childNodes[1].style.display = show ? "none" : "inline";
        }
        
        SimileAjax.WindowManager.registerEvent(dom.toggle, "click", onToggleChildren, SimileAjax.WindowManager.getBaseLayer());
        dom.showChildren(expanded);
    }
    
    return dom;
};

Exhibit.FacetUtilities.constructFlowingHierarchicalFacetItem = function(
    label, 
    count, 
    color,
    selected, 
    hasChildren,
    expanded,
    facetHasSelection,
    onSelect,
    onSelectOnly,
    onToggleChildren,
    uiContext
) {
    if (Exhibit.params.safe) {
        label = Exhibit.Formatter.encodeAngleBrackets(label);
    }
    
    var dom = SimileAjax.DOM.createDOMFromString(
        "div",
        (   "<div class='exhibit-flowingFacet-value-checkbox'>" +
                SimileAjax.Graphics.createTranslucentImageHTML(
                    Exhibit.urlPrefix + 
                    (   facetHasSelection ?
                        (selected ? "images/black-check.png" : "images/no-check.png") :
                        "images/no-check-no-border.png"
                    )) +
            "</div>"
        ) +
        "<a class='exhibit-flowingFacet-value-link' href='javascript:{}' id='inner'></a>" +
        " " +
        "<span class='exhibit-flowingFacet-value-count'>(" + count + ")</span>" +
        (   hasChildren ?
            (   "<a class='exhibit-flowingFacet-value-children-toggle' href='javascript:{}' id='toggle'>" + 
                    SimileAjax.Graphics.createTranslucentImageHTML(
                        Exhibit.urlPrefix + "images/down-arrow.png") +
                    SimileAjax.Graphics.createTranslucentImageHTML(
                        Exhibit.urlPrefix + "images/right-arrow.png") +
                "</a>"
            ) :
            ""
        ) +
        (hasChildren ? "<div class='exhibit-flowingFacet-childrenContainer' id='childrenContainer'></div>" : "")
    );
    
    dom.elmt.className = selected ? "exhibit-flowingFacet-value exhibit-flowingFacet-value-selected" : "exhibit-flowingFacet-value";
    if (typeof label == "string") {
        dom.elmt.title = label;
        dom.inner.appendChild(document.createTextNode(label));
        if (color != null) {
            dom.inner.style.color = color;
        }
    } else {
        dom.inner.appendChild(label);
        if (color != null) {
            label.style.color = color;
        }
    }
    
    SimileAjax.WindowManager.registerEvent(dom.elmt, "click", onSelectOnly, SimileAjax.WindowManager.getBaseLayer());
    if (facetHasSelection) {
        SimileAjax.WindowManager.registerEvent(dom.elmt.firstChild, "click", onSelect, SimileAjax.WindowManager.getBaseLayer());
    }
    if (hasChildren) {
        dom.showChildren = function(show) {
            dom.childrenContainer.style.display = show ? "block" : "none";
            dom.toggle.childNodes[0].style.display = show ? "inline" : "none";
            dom.toggle.childNodes[1].style.display = show ? "none" : "inline";
        }
        
        SimileAjax.WindowManager.registerEvent(dom.toggle, "click", onToggleChildren, SimileAjax.WindowManager.getBaseLayer());
        dom.showChildren(expanded);
    }
    
    return dom;
};


/*======================================================================
 *  Cache for item/value mapping
 *======================================================================
 */

Exhibit.FacetUtilities.Cache = function(database, collection, expression) {
    var self = this;
    
    this._database = database;
    this._collection = collection;
    this._expression = expression;
    
    this._listener = { 
        onRootItemsChanged: function() {
            if ("_itemToValue" in self) {
                delete self._itemToValue;
            }
            if ("_valueToItem" in self) {
                delete self._valueToItem;
            }
            if ("_missingItems" in self) {
                delete self._missingItems;
            }
        }
    };
    collection.addListener(this._listener);
}

Exhibit.FacetUtilities.Cache.prototype.dispose = function() {
    this._collection.removeListener(this._listener);
    this._collection = null;
    this._listener = null;
    
    this._itemToValue = null;
    this._valueToItem = null;
    this._missingItems = null;
}

Exhibit.FacetUtilities.Cache.prototype.getItemsFromValues = function(values, filter) {
    var set;
    if (this._expression.isPath()) {
        set = this._expression.getPath().walkBackward(
            values, 
            "item",
            filter, 
            this._database
        ).getSet();
    } else {
        this._buildMaps();
        
        set = new Exhibit.Set();
        
        var valueToItem = this._valueToItem;
        values.visit(function(value) {
            if (value in valueToItem) {
                var itemA = valueToItem[value];
                for (var i = 0; i < itemA.length; i++) {
                    var item = itemA[i];
                    if (filter.contains(item)) {
                        set.add(item);
                    }
                }
            }
        });
    }
    return set;
}

Exhibit.FacetUtilities.Cache.prototype.getItemsMissingValue = function(filter, results) {
    this._buildMaps();
    
    results = results || new Exhibit.Set();
        
    var missingItems = this._missingItems;
    filter.visit(function(item) {
        if (item in missingItems) {
            results.add(item);
        }
    });
    return results;
}

Exhibit.FacetUtilities.Cache.prototype.getValueCountsFromItems = function(items) {
    var entries = [];
    var database = this._database;
    var valueType = "text";
    
    if (this._expression.isPath()) {
        var path = this._expression.getPath();
        var facetValueResult = path.walkForward(items, "item", database);
        valueType = facetValueResult.valueType;
        
        if (facetValueResult.size > 0) {
            facetValueResult.forEachValue(function(facetValue) {
                var itemSubcollection = path.evaluateBackward(facetValue, valueType, items, database);
                entries.push({ value: facetValue, count: itemSubcollection.size });
            });
        };
    } else {
        this._buildMaps();
        
        valueType = this._valueType;
        for (var value in this._valueToItem) {
            var itemA = this._valueToItem[value];
            var count = 0;
            for (var i = 0; i < itemA.length; i++) {
                if (items.contains(itemA[i])) {
                    count++;
                }
            }
            
            if (count > 0) {
                entries.push({ value: value, count: count });
            }
        }
    }
    return { entries: entries, valueType: valueType };
}

Exhibit.FacetUtilities.Cache.prototype.getValuesFromItems = function(items) {
    if (this._expression.isPath()) {
        return this._expression.getPath().walkForward(items, "item", database).getSet();
    } else {
        this._buildMaps();
        
        var set = new Exhibit.Set();
        var itemToValue = this._itemToValue;
        items.visit(function(item) {
            if (item in itemToValue) {
                var a = itemToValue[item];
                for (var i = 0; i < a.length; i++) {
                    set.add(a[i]);
                }
            }
        });
        
        return set;
    }
}

Exhibit.FacetUtilities.Cache.prototype.countItemsMissingValue = function(items) {
    this._buildMaps();
    
    var count = 0;
    for (var item in this._missingItems) {
        if (items.contains(item)) {
            count++;
        }
    }
    return count;
}

Exhibit.FacetUtilities.Cache.prototype._buildMaps = function() {
    if (!("_itemToValue" in this)) {
        var itemToValue = {};
        var valueToItem = {};
        var missingItems = {};
        var valueType = "text";
        
        var insert = function(x, y, map) {
            if (x in map) {
                map[x].push(y);
            } else {
                map[x] = [ y ];
            }
        };
        
        var expression = this._expression;
        var database = this._database;
        
        this._collection.getAllItems().visit(function(item) {
            var results = expression.evaluateOnItem(item, database);
            if (results.values.size() > 0) {
                valueType = results.valueType;
                results.values.visit(function(value) {
                    insert(item, value, itemToValue);
                    insert(value, item, valueToItem);
                });
            } else {
                missingItems[item] = true;
            }
        });
        
        this._itemToValue = itemToValue;
        this._valueToItem = valueToItem;
        this._missingItems = missingItems;
        this._valueType = valueType;
    }
};
