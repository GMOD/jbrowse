/*==================================================
 *  Exhibit.OrderedViewFrame
 *==================================================
 */
 
Exhibit.OrderedViewFrame = function(uiContext) {
    this._uiContext = uiContext;
    
    this._orders = null;
    this._possibleOrders = null;
    this._settings = {};
};

Exhibit.OrderedViewFrame._settingSpecs = {
    "showAll":                  { type: "boolean", defaultValue: false },
    "grouped":                  { type: "boolean", defaultValue: true },
    "showDuplicates":           { type: "boolean", defaultValue: false },
    "abbreviatedCount":         { type: "int",     defaultValue: 10 },
    "showHeader":               { type: "boolean", defaultValue: true },
    "showSummary":              { type: "boolean", defaultValue: true },
    "showControls":             { type: "boolean", defaultValue: true },
    "showFooter":               { type: "boolean", defaultValue: true },
    "paginate":                 { type: "boolean", defaultValue: false },
    "pageSize":                 { type: "int",     defaultValue: 20 },
    "pageWindow":               { type: "int",     defaultValue: 2 },
    "page":                     { type: "int",     defaultValue: 0 },
    "alwaysShowPagingControls": { type: "boolean", defaultValue: false },
    "pagingControlLocations":   { type: "enum",    defaultValue: "topbottom", choices: [ "top", "bottom", "topbottom" ] }
};
    
Exhibit.OrderedViewFrame.prototype.configure = function(configuration) {
    if ("orders" in configuration) {
        this._orders = [];
        this._configureOrders(configuration.orders);
    }
    if ("possibleOrders" in configuration) {
        this._possibleOrders = [];
        this._configurePossibleOrders(configuration.possibleOrders);
    }

    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.OrderedViewFrame._settingSpecs, this._settings);
        
    this._internalValidate();
};

Exhibit.OrderedViewFrame.prototype.configureFromDOM = function(domConfiguration) {
    var orders = Exhibit.getAttribute(domConfiguration, "orders", ",");
    if (orders != null && orders.length > 0) {
        this._orders = [];
        this._configureOrders(orders);
    }
    
    var directions = Exhibit.getAttribute(domConfiguration, "directions", ",");
    if (directions != null && directions.length > 0 && this._orders != null) {
        for (var i = 0; i < directions.length && i < this._orders.length; i++) {
            this._orders[i].ascending = (directions[i].toLowerCase() != "descending");
        }
    }
    
    var possibleOrders = Exhibit.getAttribute(domConfiguration, "possibleOrders", ",");
    if (possibleOrders != null && possibleOrders.length > 0) {
        this._possibleOrders = [];
        this._configurePossibleOrders(possibleOrders);
    }

    var possibleDirections = Exhibit.getAttribute(domConfiguration, "possibleDirections", ",");
    if (possibleDirections != null && possibleDirections.length > 0 && this._possibleOrders != null) {
        for (var i = 0; i < possibleDirections.length && i < this._possibleOrders.length; i++) {
            this._possibleOrders[i].ascending = (possibleDirections[i].toLowerCase() != "descending");
        }
    }
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(
        domConfiguration, Exhibit.OrderedViewFrame._settingSpecs, this._settings);
        
    this._internalValidate();
}

Exhibit.OrderedViewFrame.prototype.dispose = function() {
    if (this._headerDom) {
        this._headerDom.dispose();
        this._headerDom = null;
    }
    if (this._footerDom) {
        this._footerDom.dispose();
        this._footerDom = null;
    }
    
    this._divHeader = null;
    this._divFooter = null;
    this._uiContext = null;
};

Exhibit.OrderedViewFrame.prototype._internalValidate = function() {
    if (this._orders != null && this._orders.length == 0) {
        this._orders = null;
    }
    if (this._possibleOrders != null && this._possibleOrders.length == 0) {
        this._possibleOrders = null;
    }
    if (this._settings.paginate) {
        this._settings.grouped = false;
    }
};

Exhibit.OrderedViewFrame.prototype._configureOrders = function(orders) {
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        var expr;
        var ascending = true;
        
        if (typeof order == "string") {
            expr = order;
        } else if (typeof order == "object") {
            expr = order.expression,
            ascending = ("ascending" in order) ? (order.ascending) : true;
        } else {
            SimileAjax.Debug.warn("Bad order object " + order);
            continue;
        }
            
        try {
            var expression = Exhibit.ExpressionParser.parse(expr);
            if (expression.isPath()) {
                var path = expression.getPath();
                if (path.getSegmentCount() == 1) {
                    var segment = path.getSegment(0);
                    this._orders.push({
                        property:   segment.property,
                        forward:    segment.forward,
                        ascending:  ascending
                    });
                }
            }
        } catch (e) {
            SimileAjax.Debug.warn("Bad order expression " + expr);
        }
    }
};

Exhibit.OrderedViewFrame.prototype._configurePossibleOrders = function(possibleOrders) {
    for (var i = 0; i < possibleOrders.length; i++) {
        var order = possibleOrders[i];
        var expr;
        var ascending = true;
        
        if (typeof order == "string") {
            expr = order;
        } else if (typeof order == "object") {
            expr = order.expression,
            ascending = ("ascending" in order) ? (order.ascending) : true;
        } else {
            SimileAjax.Debug.warn("Bad possible order object " + order);
            continue;
        }
            
        try {
            var expression = Exhibit.ExpressionParser.parse(expr);
            if (expression.isPath()) {
                var path = expression.getPath();
                if (path.getSegmentCount() == 1) {
                    var segment = path.getSegment(0);
                    this._possibleOrders.push({
                        property:   segment.property,
                        forward:    segment.forward,
                        ascending:  ascending
                    });
                }
            }
        } catch (e) {
            SimileAjax.Debug.warn("Bad possible order expression " + expr);
        }
    }
};

Exhibit.OrderedViewFrame.prototype.initializeUI = function() {
    var self = this;
    if (this._settings.showHeader) {
        this._headerDom = Exhibit.OrderedViewFrame.createHeaderDom(
            this._uiContext,
            this._divHeader, 
            this._settings.showSummary,
            this._settings.showControls,
            function(elmt, evt, target) { self._openSortPopup(elmt, -1); },
            function(elmt, evt, target) { self._toggleGroup(); },
            function(pageIndex) { self._gotoPage(pageIndex); }
        );
    }
    if (this._settings.showFooter) {
        this._footerDom = Exhibit.OrderedViewFrame.createFooterDom(
            this._uiContext,
            this._divFooter, 
            function(elmt, evt, target) { self._setShowAll(true); },
            function(elmt, evt, target) { self._setShowAll(false); },
            function(pageIndex) { self._gotoPage(pageIndex); }
        );
    }
};

Exhibit.OrderedViewFrame.prototype.reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    
    var originalSize = collection.countAllItems();
    var currentSize = collection.countRestrictedItems();
    
    var hasSomeGrouping = false;
    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        
        hasSomeGrouping = this._internalReconstruct(currentSet);
        
        /*
         *  Build sort controls
         */
        var orderElmts = [];
        var buildOrderElmt = function(order, index) {
            var property = database.getProperty(order.property);
            var label = property != null ?
                (order.forward ? property.getPluralLabel() : property.getReversePluralLabel()) :
                (order.forward ? order.property : "reverse of " + order.property);
                
            orderElmts.push(Exhibit.UI.makeActionLink(
                label,
                function(elmt, evt, target) {
                    self._openSortPopup(elmt, index);
                }
            ));
        };
        var orders = this._getOrders();
        for (var i = 0; i < orders.length; i++) {
            buildOrderElmt(orders[i], i);
        }
        
        if (this._settings.showHeader && this._settings.showControls) {
            this._headerDom.setOrders(orderElmts);
            this._headerDom.enableThenByAction(orderElmts.length < this._getPossibleOrders().length);
        }
    }
    
    if (this._settings.showHeader && this._settings.showControls) {
        this._headerDom.groupOptionWidget.setChecked(this._settings.grouped);
    }
    if (this._settings.showFooter) {
        this._footerDom.setCounts(
            currentSize, 
            this._settings.abbreviatedCount, 
            this._settings.showAll, 
            !(hasSomeGrouping && this._grouped) && !this._settings.paginate
        );
    }
};

Exhibit.OrderedViewFrame.prototype._internalReconstruct = function(allItems) {
    var self = this;
    var settings = this._settings;
    var database = this._uiContext.getDatabase();
    var orders = this._getOrders();
    var itemIndex = 0;
    
    var hasSomeGrouping = false;
    var createItem = function(itemID) {
        if ((itemIndex >= fromIndex && itemIndex < toIndex) || (hasSomeGrouping && settings.grouped)) {
            self.onNewItem(itemID, itemIndex);
        }
        itemIndex++;
    };
    var createGroup = function(label, valueType, index) {
        if ((itemIndex >= fromIndex && itemIndex < toIndex) || (hasSomeGrouping && settings.grouped)) {
            self.onNewGroup(label, valueType, index);
        }
    };

    var processLevel = function(items, index) {
        var order = orders[index];
        var values = order.forward ? 
            database.getObjectsUnion(items, order.property) : 
            database.getSubjectsUnion(items, order.property);
        
        var valueType = "text";
        if (order.forward) {
            var property = database.getProperty(order.property);
            valueType = property != null ? property.getValueType() : "text";
        } else {
            valueType = "item";
        }
        
        var keys = (valueType == "item" || valueType == "text") ?
            processNonNumericLevel(items, index, values, valueType) :
            processNumericLevel(items, index, values, valueType);
        
        var grouped = false;
        for (var k = 0; k < keys.length; k++) {
            if (keys[k].items.size() > 1) {
                grouped = true;
            }
        }
        //grouped = grouped && keys.length > 1;
        if (grouped) {
            hasSomeGrouping = true;
        }
        
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            if (key.items.size() > 0) {
                if (grouped && settings.grouped) {
                    createGroup(key.display, valueType, index);
                }
                
                items.removeSet(key.items);
                if (key.items.size() > 1 && index < orders.length - 1) {
                    processLevel(key.items, index+1);
                } else {
                    key.items.visit(createItem);
                }
            }
        }
        
        if (items.size() > 0) {
            if (grouped && settings.grouped) {
                createGroup(Exhibit.l10n.missingSortKey, valueType, index);
            }
            
            if (items.size() > 1 && index < orders.length - 1) {
                processLevel(items, index+1);
            } else {
                items.visit(createItem);
            }
        }
    };
    
    var processNonNumericLevel = function(items, index, values, valueType) {
        var keys = [];
        var compareKeys;
        var retrieveItems;
        var order = orders[index];
        
        if (valueType == "item") {
            values.visit(function(itemID) {
                var label = database.getObject(itemID, "label");
                label = label != null ? label : itemID;
                keys.push({ itemID: itemID, display: label });
            });
            
            compareKeys = function(key1, key2) {
                var c = key1.display.localeCompare(key2.display);
                return c != 0 ? c : key1.itemID.localeCompare(key2.itemID);
            };
            
            retrieveItems = order.forward ? function(key) {
                return database.getSubjects(key.itemID, order.property, null, items);
            } : function(key) {
                return database.getObjects(key.itemID, order.property, null, items);
            };
        } else { //text
            values.visit(function(value) {
                keys.push({ display: value });
            });
            
            compareKeys = function(key1, key2) {
                return key1.display.localeCompare(key2.display);
            };
            retrieveItems = order.forward ? function(key) {
                return database.getSubjects(key.display, order.property, null, items);
            } : function(key) {
                return database.getObjects(key.display, order.property, null, items);
            };
        }
        
        keys.sort(function(key1, key2) { 
            return (order.ascending ? 1 : -1) * compareKeys(key1, key2); 
        });
        
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            key.items = retrieveItems(key);
            if (!settings.showDuplicates) {
                items.removeSet(key.items);
            }
        }
        
        return keys;
    };
    
    var processNumericLevel = function(items, index, values, valueType) {
        var keys = [];
        var keyMap = {};
        var order = orders[index];
        
        var valueParser;
        if (valueType == "number") {
            valueParser = function(value) {
                if (typeof value == "number") {
                    return value;
                } else {
                    try {
                        return parseFloat(value);
                    } catch (e) {
                        return null;
                    }
                }
            };
        } else { //date
            valueParser = function(value) {
                if (value instanceof Date) {
                    return value.getTime();
                } else {
                    try {
                        return SimileAjax.DateTime.parseIso8601DateTime(value.toString()).getTime();
                    } catch (e) {
                        return null;
                    }
                }
            };
        }
        
        values.visit(function(value) {
            var sortkey = valueParser(value);
            if (sortkey != null) {
                var key = keyMap[sortkey];
                if (!key) {
                    key = { sortkey: sortkey, display: value, values: [], items: new Exhibit.Set() };
                    keyMap[sortkey] = key;
                    keys.push(key);
                }
                key.values.push(value);
            }
        });
        
        keys.sort(function(key1, key2) { 
            return (order.ascending ? 1 : -1) * (key1.sortkey - key2.sortkey); 
        });
        
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var values = key.values;
            for (var v = 0; v < values.length; v++) {
                if (order.forward) {
                    database.getSubjects(values[v], order.property, key.items, items);
                } else {
                    database.getObjects(values[v], order.property, key.items, items);
                }
            }
            
            if (!settings.showDuplicates) {
                items.removeSet(key.items);
            }
        }
        
        return keys;
    };
    
    var totalCount = allItems.size();
    var pageCount = Math.ceil(totalCount / settings.pageSize);
    var fromIndex = 0;
    var toIndex = settings.showAll ? totalCount : Math.min(totalCount, settings.abbreviatedCount);
    
    if (!settings.grouped && settings.paginate && (pageCount > 1 || (pageCount > 0 && settings.alwaysShowPagingControls))) {
        fromIndex = settings.page * settings.pageSize;
        toIndex = Math.min(fromIndex + settings.pageSize, totalCount);
        
        if (settings.showHeader && (settings.pagingControlLocations == "top" || settings.pagingControlLocations == "topbottom")) {
            this._headerDom.renderPageLinks(
                settings.page,
                pageCount,
                settings.pageWindow
            );
        }
        if (settings.showFooter && (settings.pagingControlLocations == "bottom" || settings.pagingControlLocations == "topbottom")) {
            this._footerDom.renderPageLinks(
                settings.page,
                pageCount,
                settings.pageWindow
            );
        }
    } else {
        if (settings.showHeader) {
            this._headerDom.hidePageLinks();
        }
        if (settings.showFooter) {
            this._footerDom.hidePageLinks();
        }
    }
    processLevel(allItems, 0);
    
    return hasSomeGrouping;
};

Exhibit.OrderedViewFrame.prototype._getOrders = function() {
    return this._orders || [ this._getPossibleOrders()[0] ];
};

Exhibit.OrderedViewFrame.prototype._getPossibleOrders = function() {
    var possibleOrders = null;
    if (this._possibleOrders == null) {
        possibleOrders = this._uiContext.getDatabase().getAllProperties();
        for (var i = 0, p; p = possibleOrders[i]; i++ ) {
            possibleOrders[i] = { ascending:true, forward:true, property:p };
        }
    } else {
        possibleOrders = [].concat(this._possibleOrders);
    }
    
    if (possibleOrders.length == 0) {
        possibleOrders.push({
            property:   "label", 
            forward:    true, 
            ascending:  true 
        });
    }
    return possibleOrders;
};

Exhibit.OrderedViewFrame.prototype._openSortPopup = function(elmt, index) {
    var self = this;
    var database = this._uiContext.getDatabase();
    
    var popupDom = Exhibit.UI.createPopupMenuDom(elmt);

    /*
     *  Ascending/descending/remove options for the current order
     */
    var configuredOrders = this._getOrders();
    if (index >= 0) {
        var order = configuredOrders[index];
        var property = database.getProperty(order.property);
        var propertyLabel = order.forward ? property.getPluralLabel() : property.getReversePluralLabel();
        var valueType = order.forward ? property.getValueType() : "item";
        var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
        sortLabels = (sortLabels != null) ? sortLabels : 
            Exhibit.Database.l10n.sortLabels["text"];
        
        popupDom.appendMenuItem(
            sortLabels.ascending, 
            Exhibit.urlPrefix +
                (order.ascending ? "images/option-check.png" : "images/option.png"),
            order.ascending ?
                function() {} :
                function() {
                    self._reSort(
                        index, 
                        order.property, 
                        order.forward, 
                        true,
                        false
                    );
                }
        );
        popupDom.appendMenuItem(
            sortLabels.descending, 
            Exhibit.urlPrefix +
                (order.ascending ? "images/option.png" : "images/option-check.png"),
            order.ascending ?
                function() {
                    self._reSort(
                        index, 
                        order.property, 
                        order.forward, 
                        false,
                        false
                    );
                } :
                function() {}
        );
        if (configuredOrders.length > 1) {
            popupDom.appendSeparator();
            popupDom.appendMenuItem(
                Exhibit.OrderedViewFrame.l10n.removeOrderLabel, 
                null,
                function() {self._removeOrder(index);}
            );
        }
    }
    
    /*
     *  The remaining possible orders
     */
    var orders = [];
    var possibleOrders = this._getPossibleOrders();
    for (i = 0; i < possibleOrders.length; i++) {
        var possibleOrder = possibleOrders[i];
        var skip = false;
        for (var j = (index < 0) ? configuredOrders.length - 1 : index; j >= 0; j--) {
            var existingOrder = configuredOrders[j];
            if (existingOrder.property == possibleOrder.property && 
                existingOrder.forward == possibleOrder.forward) {
                skip = true;
                break;
            }
        }
        
        if (!skip) {
            var property = database.getProperty(possibleOrder.property);
            orders.push({
                property:   possibleOrder.property,
                forward:    possibleOrder.forward,
                ascending:  possibleOrder.ascending,
                label:      possibleOrder.forward ? 
                                property.getPluralLabel() : 
                                property.getReversePluralLabel()
            });
        }
    }
    
    if (orders.length > 0) {
        if (index >= 0) {
            popupDom.appendSeparator();
        }
        
        orders.sort(function(order1, order2) {
            return order1.label.localeCompare(order2.label);
        });
        
        var appendOrder = function(order) {
            popupDom.appendMenuItem(
                order.label,
                null,
                function() {
                    self._reSort(
                        index, 
                        order.property, 
                        order.forward, 
                        order.ascending,
                        true
                    );
                }
            );
        }
        
        for (var i = 0; i < orders.length; i++) {
            appendOrder(orders[i]);
        }
    }
    popupDom.open();
};

Exhibit.OrderedViewFrame.prototype._reSort = function(index, propertyID, forward, ascending, slice) {
    var oldOrders = this._getOrders();
    index = (index < 0) ? oldOrders.length : index;
    
    var newOrders = oldOrders.slice(0, index);
    newOrders.push({ property: propertyID, forward: forward, ascending: ascending });
    if (!slice) {
        newOrders = newOrders.concat(oldOrders.slice(index+1));
    }
    
    var property = this._uiContext.getDatabase().getProperty(propertyID);
    var propertyLabel = forward ? property.getPluralLabel() : property.getReversePluralLabel();
    var valueType = forward ? property.getValueType() : "item";
    var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
    sortLabels = (sortLabels != null) ? sortLabels : 
        Exhibit.Database.l10n.sortLabels["text"];
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            self._orders = newOrders;
            self.parentReconstruct();
        },
        function() {
            self._orders = oldOrders;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n.formatSortActionTitle(
            propertyLabel, ascending ? sortLabels.ascending : sortLabels.descending)
    );
};

Exhibit.OrderedViewFrame.prototype._removeOrder = function(index) {
    var oldOrders = this._getOrders();
    var newOrders = oldOrders.slice(0, index).concat(oldOrders.slice(index + 1));
    
    var order = oldOrders[index];
    var property = this._uiContext.getDatabase().getProperty(order.property);
    var propertyLabel = order.forward ? property.getPluralLabel() : property.getReversePluralLabel();
    var valueType = order.forward ? property.getValueType() : "item";
    var sortLabels = Exhibit.Database.l10n.sortLabels[valueType];
    sortLabels = (sortLabels != null) ? sortLabels : 
        Exhibit.Database.l10n.sortLabels["text"];
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            self._orders = newOrders;
            self.parentReconstruct();
        },
        function() {
            self._orders = oldOrders;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle(
            propertyLabel, order.ascending ? sortLabels.ascending : sortLabels.descending)
    );
};

Exhibit.OrderedViewFrame.prototype._setShowAll = function(showAll) {
    var self = this;
    var settings = this._settings;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.showAll = showAll;
            self.parentReconstruct();
        },
        function() {
            settings.showAll = !showAll;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n[
            showAll ? "showAllActionTitle" : "dontShowAllActionTitle"]
    );
};

Exhibit.OrderedViewFrame.prototype._toggleGroup = function() {
    var settings = this._settings;
    var oldGrouped = settings.grouped;
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.grouped = !oldGrouped;
            self.parentReconstruct();
        },
        function() {
            settings.grouped = oldGrouped;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n[
            oldGrouped ? "ungroupAsSortedActionTitle" : "groupAsSortedActionTitle"]
    );
};

Exhibit.OrderedViewFrame.prototype._toggleShowDuplicates = function() {
    var settings = this._settings;
    var oldShowDuplicates = settings.showDuplicates;
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.showDuplicates = !oldShowDuplicates;
            self.parentReconstruct();
        },
        function() {
            settings.showDuplicates = oldShowDuplicates;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n[
            oldShowDuplicates ? "hideDuplicatesActionTitle" : "showDuplicatesActionTitle"]
    );
};

Exhibit.OrderedViewFrame.prototype._gotoPage = function(pageIndex) {
    var settings = this._settings;
    var oldPageIndex = settings.page;
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.page = pageIndex;
            self.parentReconstruct();
        },
        function() {
            settings.page = oldPageIndex;
            self.parentReconstruct();
        },
        Exhibit.OrderedViewFrame.l10n.makePagingActionTitle(pageIndex)
    );
};

Exhibit.OrderedViewFrame.headerTemplate =
    "<div id='collectionSummaryDiv' style='display: none;'></div>" +
    "<div class='exhibit-collectionView-header-sortControls' style='display: none;' id='controlsDiv'>" +
        "%0" + // sorting controls template
        "<span class='exhibit-collectionView-header-groupControl'> \u2022 " +
            "<a id='groupOption' class='exhibit-action'></a>" + 
        "</span>" +
    "</div>";

Exhibit.OrderedViewFrame.createHeaderDom = function(
    uiContext,
    headerDiv,
    showSummary,
    showControls,
    onThenSortBy,
    onGroupToggle,
    gotoPage
) {
    var l10n = Exhibit.OrderedViewFrame.l10n;
    var template = String.substitute(
        Exhibit.OrderedViewFrame.headerTemplate +
        "<" + l10n.pagingControlContainerElement + " class='exhibit-collectionView-pagingControls' style='display: none;' id='topPagingDiv'></" + l10n.pagingControlContainerElement + ">", 
        [ l10n.sortingControlsTemplate ]);
        
    var dom = SimileAjax.DOM.createDOMFromString(headerDiv, template, {});
    headerDiv.className = "exhibit-collectionView-header";
    
    if (showSummary) {
        dom.collectionSummaryDiv.style.display = "block";
        dom.collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create(
            {},
            dom.collectionSummaryDiv, 
            uiContext
        );
    }
    if (showControls) {
        dom.controlsDiv.style.display = "block";
        dom.groupOptionWidget = Exhibit.OptionWidget.create(
            {   label:      l10n.groupedAsSortedOptionLabel,
                onToggle:   onGroupToggle
            },
            dom.groupOption,
            uiContext
        );
        
        SimileAjax.WindowManager.registerEvent(dom.thenSortByAction, "click", onThenSortBy);
        dom.enableThenByAction = function(enabled) {
            Exhibit.UI.enableActionLink(dom.thenSortByAction, enabled);
        };
        dom.setOrders = function(orderElmts) {
            dom.ordersSpan.innerHTML = "";
            
            var addDelimiter = Exhibit.Formatter.createListDelimiter(dom.ordersSpan, orderElmts.length, uiContext);
            for (var i = 0; i < orderElmts.length; i++) {
                addDelimiter();
                dom.ordersSpan.appendChild(orderElmts[i]);
            }
            addDelimiter();
        };
    }
    dom.renderPageLinks = function(page, totalPage, pageWindow) {
        Exhibit.OrderedViewFrame.renderPageLinks(dom.topPagingDiv, page, totalPage, pageWindow, gotoPage);
        dom.topPagingDiv.style.display = "block";
    };
    dom.hidePageLinks = function() {
        dom.topPagingDiv.style.display = "none";
    };
    
    dom.dispose = function() {
        if ("collectionSummaryWidget" in dom) {
            dom.collectionSummaryWidget.dispose();
            dom.collectionSummaryWidget = null;
        }
        
        dom.groupOptionWidget.dispose();
        dom.groupOptionWidget = null;
    }
    
    return dom;
};

Exhibit.OrderedViewFrame.footerTemplate = 
    "<div id='showAllSpan'></div>";
    
Exhibit.OrderedViewFrame.createFooterDom = function(
    uiContext,
    footerDiv,
    onShowAll,
    onDontShowAll,
    gotoPage
) {
    var l10n = Exhibit.OrderedViewFrame.l10n;
    
    var dom = SimileAjax.DOM.createDOMFromString(
        footerDiv,
        Exhibit.OrderedViewFrame.footerTemplate +
        "<" + l10n.pagingControlContainerElement + " class='exhibit-collectionView-pagingControls' style='display: none;' id='bottomPagingDiv'></" + l10n.pagingControlContainerElement + ">",
        {}
    );
    footerDiv.className = "exhibit-collectionView-footer";
    
    dom.setCounts = function(count, limitCount, showAll, canToggle) {
        dom.showAllSpan.innerHTML = "";
        if (canToggle && count > limitCount) {
            dom.showAllSpan.style.display = "block";
            if (showAll) {
                dom.showAllSpan.appendChild(
                    Exhibit.UI.makeActionLink(
                        l10n.formatDontShowAll(limitCount), onDontShowAll));
            } else {
                dom.showAllSpan.appendChild(
                    Exhibit.UI.makeActionLink(
                        l10n.formatShowAll(count), onShowAll));
            }
        }
    };
    dom.renderPageLinks = function(page, totalPage, pageWindow) {
        Exhibit.OrderedViewFrame.renderPageLinks(dom.bottomPagingDiv, page, totalPage, pageWindow, gotoPage);
        dom.bottomPagingDiv.style.display = "block";
        dom.showAllSpan.style.display = "none";
    };
    dom.hidePageLinks = function() {
        dom.bottomPagingDiv.style.display = "none";
    };
    dom.dispose = function() {};
    
    return dom;
};

Exhibit.OrderedViewFrame.renderPageLinks = function(parentElmt, page, pageCount, pageWindow, gotoPage) {
    var l10n = Exhibit.OrderedViewFrame.l10n;
    
    parentElmt.className = "exhibit-collectionView-pagingControls";
    parentElmt.innerHTML = "";
    
    var self = this;
    var renderPageLink = function(label, index) {
        var elmt = document.createElement(l10n.pagingControlElement);
        elmt.className = "exhibit-collectionView-pagingControls-page";
        parentElmt.appendChild(elmt);
        
        var a = document.createElement("a");
        a.innerHTML = label;
        a.href = "javascript:{}";
        a.title = l10n.makePagingLinkTooltip(index);
        elmt.appendChild(a);
        
        var handler = function(elmt, evt, target) {
            gotoPage(index);
            SimileAjax.DOM.cancelEvent(evt);
            return false;
        }
        SimileAjax.WindowManager.registerEvent(a, "click", handler);
    };
    var renderPageNumber = function(index) {
        if (index == page) {
            var elmt = document.createElement(l10n.pagingControlElement);
            elmt.className = "exhibit-collectionView-pagingControls-currentPage";
            elmt.innerHTML = (index + 1);
            
            parentElmt.appendChild(elmt);
        } else {
            renderPageLink(index + 1, index);
        }
    };
    var renderHTML = function(html) {
        var elmt = document.createElement(l10n.pagingControlElement);
        elmt.innerHTML = html;
        
        parentElmt.appendChild(elmt);
    };
    
    if (page > 0) {
        renderPageLink(l10n.previousPage, page - 1);
        if (l10n.pageSeparator.length > 0) {
            renderHTML(" ");
        }
    }
    
    var pageWindowStart = 0;
    var pageWindowEnd = pageCount - 1;
    
    if (page - pageWindow > 1) {
        renderPageNumber(0);
        renderHTML(l10n.pageWindowEllipses);
        
        pageWindowStart = page - pageWindow;
    }
    if (page + pageWindow < pageCount - 2) {
        pageWindowEnd = page + pageWindow;
    }
    
    for (var i = pageWindowStart; i <= pageWindowEnd; i++) {
        if (i > pageWindowStart && l10n.pageSeparator.length > 0) {
            renderHTML(l10n.pageSeparator);
        }
        renderPageNumber(i);
    }
    
    if (pageWindowEnd < pageCount - 1) {
        renderHTML(l10n.pageWindowEllipses);
        renderPageNumber(pageCount - 1);
    }
    
    if (page < pageCount - 1) {
        if (l10n.pageSeparator.length > 0) {
            renderHTML(" ");
        }
        renderPageLink(l10n.nextPage, page + 1);
    }
};
