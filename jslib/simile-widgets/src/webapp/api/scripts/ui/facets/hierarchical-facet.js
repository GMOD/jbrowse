/*==================================================
 *  Exhibit.HierarchicalFacet
 *==================================================
 */

Exhibit.HierarchicalFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._colorCoder = null;
    
    this._expression = null;
    this._uniformGroupingExpression = null;
    this._selections = [];
    this._expanded = {};
    
    this._settings = {};
    this._dom = null;
    
    var self = this;
    this._listener = { 
        onRootItemsChanged: function() {
            if ("_cache" in self) {
                delete self._cache;
            }
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.HierarchicalFacet._settingSpecs = {
    "facetLabel":       { type: "text" },
    "fixedOrder":       { type: "text" },
    "sortMode":         { type: "text", defaultValue: "value" },
    "sortDirection":    { type: "text", defaultValue: "forward" },
    "othersLabel":      { type: "text" },
    "scroll":           { type: "boolean", defaultValue: true },
    "height":           { type: "text" },
    "colorCoder":       { type: "text", defaultValue: null },
    "collapsible":      { type: "boolean", defaultValue: false },
    "collapsed":        { type: "boolean", defaultValue: false }
};

Exhibit.HierarchicalFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.HierarchicalFacet(containerElmt, uiContext);
    
    Exhibit.HierarchicalFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.HierarchicalFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.HierarchicalFacet(
        containerElmt != null ? containerElmt : configElmt, 
        uiContext
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.HierarchicalFacet._settingSpecs, facet._settings);
    
    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        
        var uniformGroupingString = Exhibit.getAttribute(configElmt, "uniformGrouping");
        if (uniformGroupingString != null && uniformGroupingString.length > 0) {
            facet._uniformGroupingExpression = Exhibit.ExpressionParser.parse(uniformGroupingString);
        }
        
        var selection = Exhibit.getAttribute(configElmt, "selection", ";");
        if (selection != null && selection.length > 0) {
            for (var i = 0, s; s = selection[i]; i++) {
                facet._selections = 
                    facet._internalAddSelection({ value: s, selectOthers: false });
            }
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "HierarchicalFacet: Error processing configuration of hierarchical facet");
    }
    Exhibit.HierarchicalFacet._configure(facet, configuration);
    
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);
    
    return facet;
};

Exhibit.HierarchicalFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.HierarchicalFacet._settingSpecs, facet._settings);
    
    if ("expression" in configuration) {
        facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
    }
    if ("uniformGrouping" in configuration) {
        facet._uniformGroupingExpression = Exhibit.ExpressionParser.parse(configuration.uniformGrouping);
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        for (var i = 0; i < selection.length; i++) {
            facet._selections.push({ value: selection[i], selectOthers: false });
        }
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
}

Exhibit.HierarchicalFacet.prototype.dispose = function() {
    this._uiContext.getCollection().removeFacet(this);
    
    this._uiContext.getCollection().removeListener(this._listener);
    this._uiContext = null;
    this._colorCoder = null;
    
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    
    this._expression = null;
    this._uniformGroupingExpression = null;
    this._selections = null;
    this._settings = null;
    
    this._cache = null;
};

Exhibit.HierarchicalFacet.prototype.hasRestrictions = function() {
    return this._selections.length > 0;
};

Exhibit.HierarchicalFacet.prototype.clearAllRestrictions = function() {
    var selections = this._selections;
    this._selections = [];
    
    if (selections.length > 0) {
        this._notifyCollection();
    }
    return selections;
};

Exhibit.HierarchicalFacet.prototype.applyRestrictions = function(restrictions) {
    this._selections = [].concat(restrictions);
    this._notifyCollection();
};

Exhibit.HierarchicalFacet.prototype.setSelection = function(value, selected) {
    var selection = { value: value, selectOthers: false };
    if (selected) {
        this._selections = this._internalAddSelection(selection);
    } else {
        this._selections = this._internalRemoveSelection(selection);
    }
    this._notifyCollection();
}

Exhibit.HierarchicalFacet.prototype.setselectOthers = function(value, selected) {
    var selection = { value: value, selectOthers: true };
    if (selected) {
        this._selections = this._internalAddSelection(selection);
    } else {
        this._selections = this._internalRemoveSelection(selection);
    }
    this._notifyCollection();
}

Exhibit.HierarchicalFacet.prototype.restrict = function(items) {
    if (this._selections.length == 0) {
        return items;
    }
    
    this._buildCache();
    
    var set = new Exhibit.Set();
    var includeNode = function(node) {
        if ("children" in node) {
            includeChildNodes(node.children);
            Exhibit.Set.createIntersection(node.others, items, set);
        } else {
            Exhibit.Set.createIntersection(node.items, items, set);
        }
    }
    var includeChildNodes = function(childNodes) {
        for (var i = 0; i < childNodes.length; i++) {
            includeNode(childNodes[i]);
        }
    };
    
    for (var i = 0; i < this._selections.length; i++) {
        var selection = this._selections[i];
        var node = this._getTreeNode(selection.value);
        if (node) {
            if (selection.selectOthers) {
                Exhibit.Set.createIntersection(node.others, items, set);
            } else {
                includeNode(node);
            }
        }
    }
    
    return set;
};

Exhibit.HierarchicalFacet.prototype._internalAddSelection = function(selection) {
    var parentToClear = {};
    var childrenToClear = {};
    
    var cache = this._cache;
    var markClearAncestors = function(value) {
        if (value in cache.valueToParent) {
            var parents = cache.valueToParent[value];
            for (var i = 0; i < parents.length; i++) {
                var parent = parents[i];
                parentToClear[parent] = true;
                markClearAncestors(parent);
            }
        }
    };
    var markClearDescendants = function(value) {
        if (value in cache.valueToChildren) {
            var children = cache.valueToChildren[value];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                childrenToClear[child] = true;
                markClearDescendants(child);
            }
        }
    };
    
    /*
        ignore "(others)" at the root (its value is null) 
        because it has no parent nor children.
     */
    if (selection.value != null) { 
        markClearAncestors(selection.value);
        if (selection.selectOthers) {
            parentToClear[selection.value] = true;
        } else {
            childrenToClear[selection.value] = true;
            markClearDescendants(selection.value);
        }
    }
    
    var oldSelections = this._selections;
    var newSelections = [ selection ];
    for (var i = 0; i < oldSelections.length; i++) {
        var s = oldSelections[i];
        if ((!(s.value in parentToClear) || s.selectOthers) && 
            (!(s.value in childrenToClear))) {
            
            newSelections.push(s);
        }
    }
    
    return newSelections;
};

Exhibit.HierarchicalFacet.prototype._internalRemoveSelection = function(selection) {
    var oldSelections = this._selections;
    var newSelections = [];
    for (var i = 0; i < oldSelections.length; i++) {
        var s = oldSelections[i];
        if (s.value != selection.value || s.selectOthers != selection.selectOthers) {
            newSelections.push(s);
        }
    }
    
    return newSelections;
};

Exhibit.HierarchicalFacet.prototype.update = function(items) {
    this._dom.valuesContainer.style.display = "none";
    this._dom.valuesContainer.innerHTML = "";
    
    var tree = this._computeFacet(items);
    if (tree) {
        this._constructBody(tree);
    }
    this._dom.valuesContainer.style.display = "block";
};

Exhibit.HierarchicalFacet.prototype._computeFacet = function(items) {
    this._buildCache();
    
    var database = this._uiContext.getDatabase();
    var sorter = this._getValueSorter();
    var othersLabel = "othersLabel" in this._settings ? this._settings.othersLabel : "(others)";
    
    var selectionMap = {};
    for (var i = 0; i < this._selections.length; i++) {
        var s = this._selections[i];
        selectionMap[s.value] = s.selectOthers;
    }
    
    var processNode = function(node, resultNodes, superset) {
        var selected = (node.value in selectionMap && !selectionMap[node.value]);
        if ("children" in node) {
            var resultNode = {
                value:      node.value,
                label:      node.label,
                children:   [],
                selected:   selected,
                areOthers:  false
            };
            
            var superset2 = new Exhibit.Set();
            
            for (var i = 0; i < node.children.length; i++) {
                var childNode = node.children[i];
                processNode(childNode, resultNode.children, superset2);
            }
            resultNode.children.sort(sorter);
            
            if (node.others.size() > 0) {
                var othersSelected = (node.value in selectionMap && selectionMap[node.value]);
                var subset = Exhibit.Set.createIntersection(items, node.others);
                if (subset.size() > 0 || othersSelected) {
                    resultNode.children.push({
                        value:      node.value,
                        label:      othersLabel,
                        count:      subset.size(),
                        selected:   othersSelected,
                        areOthers:  true
                    });
                    superset2.addSet(subset);
                }
            }
            
            resultNode.count = superset2.size();
            if (selected || resultNode.count > 0 || resultNode.children.length > 0) {
                resultNodes.push(resultNode);
                
                if (superset != null && superset2.size() > 0) {
                    superset.addSet(superset2);
                }
            }
        } else {
            var subset = Exhibit.Set.createIntersection(items, node.items);
            if (subset.size() > 0 || selected) {
                resultNodes.push({
                    value:      node.value,
                    label:      node.label,
                    count:      subset.size(),
                    selected:   selected,
                    areOthers:  false
                });
                
                if (superset != null && subset.size() > 0) {
                    superset.addSet(subset);
                }
            }
        }
    };
    
    var nodes = [];
    processNode(this._cache.tree, nodes, null);
    
    return nodes[0];
};

Exhibit.HierarchicalFacet.prototype._getValueSorter = function() {
    var sortValueFunction = function(a, b) { return a.label.localeCompare(b.label); };
    
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        
        sortValueFunction = function(a, b) {
            if (a.label in orderMap) {
                if (b.label in orderMap) {
                    return orderMap[a.label] - orderMap[b.label];
                } else {
                    return -1;
                }
            } else if (b.label in orderMap) {
                return 1;
            } else {
                return a.label.localeCompare(b.label);
            }
        }
    } else if (this._cache.valueType == "number") {
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
};

Exhibit.HierarchicalFacet.prototype._notifyCollection = function() {
    this._uiContext.getCollection().onFacetUpdated(this);
};

Exhibit.HierarchicalFacet.prototype._initializeUI = function() {
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

Exhibit.HierarchicalFacet.prototype._constructBody = function(tree) {
    var self = this;
    var containerDiv = this._dom.valuesContainer;
    
    containerDiv.style.display = "none";
    
    var constructFacetItemFunction = Exhibit.FacetUtilities[this._settings.scroll ? "constructHierarchicalFacetItem" : "constructFlowingHierarchicalFacetItem"];
    var facetHasSelection = this._selections.length > 0;
    
    var processNode = function(node, div) {
        var hasChildren = ("children" in node);
        var onSelect = function(elmt, evt, target) {
            self._filter(node.value, node.areOthers, node.label, node.selected, false);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onSelectOnly = function(elmt, evt, target) {
            self._filter(node.value, node.areOthers, node.label, node.selected, !(evt.ctrlKey || evt.metaKey));
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var onToggleChildren = function(elmt, evt, target) {
            var show;
            if (node.value in self._expanded) {
                delete self._expanded[node.value];
                show = false;
            } else {
                self._expanded[node.value] = true;
                show = true;
            }
            dom.showChildren(show);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        };
        var dom = constructFacetItemFunction(
            node.label, 
            node.count, 
            (self._colorCoder != null) ? self._colorCoder.translate(node.value) : null,
            node.selected, 
            hasChildren,
            (node.value in self._expanded),
            facetHasSelection,
            onSelect,
            onSelectOnly,
            onToggleChildren,
            self._uiContext
        );
        div.appendChild(dom.elmt);
                
        if (hasChildren) {
            processChildNodes(node.children, dom.childrenContainer);
        }
    };
    var processChildNodes = function(childNodes, div) {
        for (var i = 0; i < childNodes.length; i++) {
            processNode(childNodes[i], div);
        }
    };
    
    processChildNodes(tree.children, containerDiv);
    
    containerDiv.style.display = "block";
    
    this._dom.setSelectionCount(this._selections.length);
};

Exhibit.HierarchicalFacet.prototype._filter = function(value, areOthers, label, wasSelected, selectOnly) {
    var self = this;
    var wasSelectedAlone = wasSelected && this._selections.length == 1;
    
    var selection = {
        value:          value,
        selectOthers:  areOthers
    };
    
    var oldRestrictions = this._selections;
    var newRestrictions;
    if (wasSelected) {
        if (selectOnly) {
            if (wasSelectedAlone) {
                // deselect
                newRestrictions = [];
            } else {
                // clear all other selections
                newRestrictions = [ selection ];
            }
        } else {
            // toggle
            newRestrictions = this._internalRemoveSelection(selection);
        }
    } else {
        if (selectOnly) {
            newRestrictions = [ selection ];
        } else {
            newRestrictions = this._internalAddSelection(selection);
        }
    }
    
    SimileAjax.History.addLengthyAction(
        function() { self.applyRestrictions(newRestrictions); },
        function() { self.applyRestrictions(oldRestrictions); },
        (selectOnly && !wasSelectedAlone) ?
            String.substitute(
                Exhibit.FacetUtilities.l10n["facetSelectOnlyActionTitle"],
                [ label, this._settings.facetLabel ]) :
            String.substitute(
                Exhibit.FacetUtilities.l10n[wasSelected ? "facetUnselectActionTitle" : "facetSelectActionTitle"],
                [ label, this._settings.facetLabel ])
    );
};

Exhibit.HierarchicalFacet.prototype._clearSelections = function() {
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

Exhibit.HierarchicalFacet.prototype._buildCache = function() {
    if (!("_cache" in this)) {
        var valueToItem = {};
        var valueType = "text";
        
        var valueToChildren = {};
        var valueToParent = {};
        var valueToPath = {};
        var values = new Exhibit.Set();
        
        var insert = function(x, y, map) {
            if (x in map) {
                map[x].push(y);
            } else {
                map[x] = [ y ];
            }
        };
        
        var database = this._uiContext.getDatabase();
        var tree = {
            value:      null,
            label:      "(root)",
            others:     new Exhibit.Set(),
            children:   []
        };
        
        var expression = this._expression;
        this._uiContext.getCollection().getAllItems().visit(function(item) {
            var results = expression.evaluateOnItem(item, database);
            if (results.values.size() > 0) {
                valueType = results.valueType;
                results.values.visit(function(value) {
                    values.add(value);
                    insert(value, item, valueToItem);
                });
            } else {
                tree.others.add(item);
            }
        });
        
        var groupingExpression = this._uniformGroupingExpression;
        var rootValues = new Exhibit.Set();
        var getParentChildRelationships = function(valueSet) {
            var newValueSet = new Exhibit.Set();
            valueSet.visit(function(value) {
                var results = groupingExpression.evaluateOnItem(value, database);
                if (results.values.size() > 0) {
                    results.values.visit(function(parentValue) {
                        insert(value, parentValue, valueToParent);
                        insert(parentValue, value, valueToChildren);
                        if (!valueSet.contains(parentValue)) {
                            newValueSet.add(parentValue);
                        }
                        return true;
                    });
                } else {
                    rootValues.add(value);
                }
            });
            
            if (newValueSet.size() > 0) {
                getParentChildRelationships(newValueSet);
            }
        };
        getParentChildRelationships(values);
        
        var processValue = function(value, nodes, valueSet, path) {
            var label = database.getObject(value, "label");
            var node = {
                value:  value,
                label:  label != null ? label : value
            };
            nodes.push(node);
            valueToPath[value] = path;
            
            if (value in valueToChildren) {
                node.children = [];
                
                var valueSet2 = new Exhibit.Set();
                var childrenValue = valueToChildren[value];
                for (var i = 0; i < childrenValue.length; i++) {
                    processValue(childrenValue[i], node.children, valueSet2, path.concat(i));
                };
                
                node.others = new Exhibit.Set();
                if (value in valueToItem) {
                    var items = valueToItem[value];
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        if (!valueSet2.contains(item)) {
                            node.others.add(item);
                            valueSet.add(item);
                        }
                    }
                }
                
                valueSet.addSet(valueSet2);
            } else {
                node.items = new Exhibit.Set();
                if (value in valueToItem) {
                    var items = valueToItem[value];
                    for (var i = 0; i < items.length; i++) {
                        var item = items[i];
                        node.items.add(item);
                        valueSet.add(item);
                    }
                }
            }
        }
        
        var index = 0;
        rootValues.visit(function (value) { processValue(value, tree.children, new Exhibit.Set(), [index++]); });
        
        this._cache = {
            tree:               tree,
            valueToChildren:    valueToChildren,
            valueToParent:      valueToParent,
            valueToPath:        valueToPath,
            valueType:          valueType
        };
    }
};

Exhibit.HierarchicalFacet.prototype._getTreeNode = function(value) {
    if (value == null) {
        return this._cache.tree;
    }
    
    var path = this._cache.valueToPath[value];
    var trace = function(node, path, index) {
        var node2 = node.children[path[index]];
        if (++index < path.length) {
            return trace(node2, path, index);
        } else {
            return node2;
        }
    };
    return (path) ? trace(this._cache.tree, path, 0) : null;
};

