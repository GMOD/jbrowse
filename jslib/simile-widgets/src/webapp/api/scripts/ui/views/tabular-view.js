/*==================================================
 *  Exhibit.TabularView
 *==================================================
 */

Exhibit.TabularView = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    
    this._settings = { rowStyler: null, tableStyler: null, indexMap: {} };
    this._columns = [];
    this._rowTemplate = null;

    var view = this;
    this._listener = { 
        onItemsChanged: function() {
            view._settings.page = 0;
            view._reconstruct();
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.TabularView._settingSpecs = {
    "sortAscending":        { type: "boolean", defaultValue: true },
    "sortColumn":           { type: "int",     defaultValue: 0 },
    "showSummary":          { type: "boolean", defaultValue: true },
    "showToolbox":          { type: "boolean", defaultValue: true },
    "border":               { type: "int",     defaultValue: 1 },
    "cellPadding":          { type: "int",     defaultValue: 5 },
    "cellSpacing":          { type: "int",     defaultValue: 3 },
    "paginate":             { type: "boolean", defaultValue: false },
    "pageSize":             { type: "int",     defaultValue: 20 },
    "pageWindow":           { type: "int",     defaultValue: 2 },
    "page":                 { type: "int",     defaultValue: 0 },
    "alwaysShowPagingControls": { type: "boolean", defaultValue: false },
    "pagingControlLocations":   { type: "enum",    defaultValue: "topbottom", choices: [ "top", "bottom", "topbottom" ] }
};

Exhibit.TabularView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.TabularView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.TabularView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.TabularView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    
    uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    
    var view = new Exhibit.TabularView(
        containerElmt != null ? containerElmt : configElmt, 
        uiContext
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.TabularView._settingSpecs, view._settings);
    
    try {
        var expressions = [];
        var labels = Exhibit.getAttribute(configElmt, "columnLabels", ",") || [];
        
        var s = Exhibit.getAttribute(configElmt, "columns");
        if (s != null && s.length > 0) {
            expressions = Exhibit.ExpressionParser.parseSeveral(s);
        }
        
        for (var i = 0; i < expressions.length; i++) {
            var expression = expressions[i];
            view._columns.push({
                expression: expression,
                uiContext:  Exhibit.UIContext.create({}, view._uiContext, true),
                styler:     null,
                label:      i < labels.length ? labels[i] : null,
                format:     "list"
            });
        }
        
        var formats = Exhibit.getAttribute(configElmt, "columnFormats");
        if (formats != null && formats.length > 0) {
            var index = 0;
            var startPosition = 0;
            while (index < view._columns.length && startPosition < formats.length) {
                var column = view._columns[index];
                var o = {};
                
                column.format = Exhibit.FormatParser.parseSeveral(column.uiContext, formats, startPosition, o);
                
                startPosition = o.index;
                while (startPosition < formats.length && " \t\r\n".indexOf(formats.charAt(startPosition)) >= 0) {
                    startPosition++;
                }
                if (startPosition < formats.length && formats.charAt(startPosition) == ",") {
                    startPosition++;
                }
                
                index++;
            }
        }
        
        var tables = configElmt.getElementsByTagName("table");
        if (tables.length > 0 && tables[0].rows.length > 0) {
            view._rowTemplate = Exhibit.Lens.compileTemplate(tables[0].rows[0], false, uiContext);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "TabularView: Error processing configuration of tabular view");
    }
    
    var s = Exhibit.getAttribute(configElmt, "rowStyler");
    if (s != null && s.length > 0) {
        var f = eval(s);
        if (typeof f == "function") {
            view._settings.rowStyler = f;
        }
    }
    s = Exhibit.getAttribute(configElmt, "tableStyler");
    if (s != null && s.length > 0) {
        f = eval(s);
        if (typeof f == "function") {
            view._settings.tableStyler = f;
        }
    }
        
    Exhibit.TabularView._configure(view, configuration);
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.TabularView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TabularView._settingSpecs, view._settings);
    
    if ("columns" in configuration) {
        var columns = configuration.columns;
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            var expr;
            var styler = null;
            var label = null;
            var format = null;
            
            if (typeof column == "string") {
                expr = column;
            } else {
                expr = column.expression;
                styler = column.styler;
                label = column.label;
                format = column.format;
            }
            
            var expression = Exhibit.ExpressionParser.parse(expr);
            if (expression.isPath()) {
                var path = expression.getPath();
                if (format != null && format.length > 0) {
                    format = Exhibit.FormatParser.parse(view._uiContext, format, 0);
                } else {
                    format = "list";
                }
                
                view._columns.push({
                    expression: expression,
                    styler:     styler,
                    label:      label,
                    format:     format,
                    uiContext:  view._uiContext 
                });
            }
        }
    }
    
    if ("rowStyler" in configuration) {
        view._settings.rowStyler = configuration.rowStyler;
    }
    if ("tableStyler" in configuration) {
        view._settings.tableStyler = configuration.tableStyler;
    }
};

Exhibit.TabularView.prototype._internalValidate = function() {
    if (this._columns.length == 0) {
        var database = this._uiContext.getDatabase();
        var propertyIDs = database.getAllProperties();
        for (var i = 0; i < propertyIDs.length; i++) {
            var propertyID = propertyIDs[i];
            if (propertyID != "uri") {
                this._columns.push(
                    {   expression: Exhibit.ExpressionParser.parse("." + propertyID),
                        styler:     null,
                        label:      database.getProperty(propertyID).getLabel(),
                        format:     "list"
                    }
                );
            }
        }
    }
    this._settings.sortColumn = 
        Math.max(0, Math.min(this._settings.sortColumn, this._columns.length - 1));
};

Exhibit.TabularView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);
    
    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    
    this._collectionSummaryWidget.dispose();
    this._collectionSummaryWidget = null;
    
    this._uiContext.dispose();
    this._uiContext = null;
    
    this._div.innerHTML = "";
    
    this._dom = null;
    this._div = null;
};

Exhibit.TabularView.prototype._initializeUI = function() {
    var self = this;
    
    this._div.innerHTML = "";
    this._dom = Exhibit.TabularView.createDom(this._div);
    this._collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create(
        {}, 
        this._dom.collectionSummaryDiv, 
        this._uiContext
    );
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function() {
            return self._dom.bodyDiv.innerHTML;
        };
    }
    
    if (!this._settings.showSummary) {
        this._dom.collectionSummaryDiv.style.display = "none";
    }
    
    this._reconstruct();
};

Exhibit.TabularView.prototype._reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    
    var bodyDiv = this._dom.bodyDiv;
    bodyDiv.innerHTML = "";

    /*
     *  Get the current collection and check if it's empty
     */
    var items = [];
    var originalSize = collection.countAllItems();
    if (originalSize > 0) {
        var currentSet = collection.getRestrictedItems();
        currentSet.visit(function(itemID) { items.push({ id: itemID, sortKey: "" }); });
    }
    
    if (items.length > 0) {
        /*
         *  Sort the items
         */
        var sortColumn = this._columns[this._settings.sortColumn];
	var sorter = this._createSortFunction(items, sortColumn.expression, this._settings.sortAscending);
        items.sort(this._stabilize(sorter,
				   this._settings.indexMap, originalSize+1));
    
	//preserve order for next time
	for (i=0; i<items.length; i++) {
	    this._settings.indexMap[items[i].id]=i;
	}

        /*
         *  Style the table
         */
        var table = document.createElement("table");
        table.className = "exhibit-tabularView-body";
        if (this._settings.tableStyler != null) {
            this._settings.tableStyler(table, database);
        } else {
            table.cellSpacing = this._settings.cellSpacing;
            table.cellPadding = this._settings.cellPadding;
            table.border = this._settings.border;
        }
        
        /*
         *  Create the column headers
         */
        var tr = table.insertRow(0);
        var createColumnHeader = function(i) {
            var column = self._columns[i];
            if (column.label == null) {
                column.label = self._getColumnLabel(column.expression);
            }

            var td = document.createElement("th");
            Exhibit.TabularView.createColumnHeader(
                exhibit, td, column.label, i == self._settings.sortColumn, self._settings.sortAscending,
                function(elmt, evt, target) {
                    self._doSort(i);
                    SimileAjax.DOM.cancelEvent(evt);
                    return false;
                }
            );

            tr.appendChild(td);
        };
        for (var i = 0; i < this._columns.length; i++) {
            createColumnHeader(i);
        }

        /*
         *  Create item rows
         */
        var renderItem;
        if (this._rowTemplate != null) {
            renderItem = function(i) {
                var item = items[i];
                var tr = Exhibit.Lens.constructFromLensTemplate(item.id, self._rowTemplate, table, self._uiContext);
                
                if (self._settings.rowStyler != null) {
                    self._settings.rowStyler(item.id, database, tr, i);
                }
            }
        } else {
            renderItem = function(i) {
                var item = items[i];
                var tr = table.insertRow(table.rows.length);
                
                for (var c = 0; c < self._columns.length; c++) {
                    var column = self._columns[c];
                    var td = tr.insertCell(c);
                    
                    var results = column.expression.evaluate(
                        { "value" : item.id }, 
                        { "value" : "item" }, 
                        "value",
                        database
                    );
                    
                    var valueType = column.format == "list" ? results.valueType : column.format;
                    column.uiContext.formatList(
                        results.values, 
                        results.size,
                        valueType,
                        function(elmt) { td.appendChild(elmt); }
                    );
                    
                    if (column.styler != null) {
                        column.styler(item.id, database, td);
                    }
                }
                
                if (self._settings.rowStyler != null) {
                    self._settings.rowStyler(item.id, database, tr, i);
                }
            }
        }
        
        var start, end;
        var generatePagingControls = false;
        if (this._settings.paginate) {
            start = this._settings.page * this._settings.pageSize;
            end = Math.min(start + this._settings.pageSize, items.length);
            
            generatePagingControls = (items.length > this._settings.pageSize) || (items.length > 0 && this._settings.alwaysShowPagingControls);
        } else {
            start = 0;
            end = items.length;
        }
        for (var i = start; i < end; i++) {
            renderItem(i);
        }

        bodyDiv.appendChild(table);
        
        if (generatePagingControls) {
            if (this._settings.pagingControlLocations == "top" || this._settings.pagingControlLocations == "topbottom") {
                this._renderPagingDiv(this._dom.topPagingDiv, items.length, this._settings.page);
                this._dom.topPagingDiv.style.display = "block";
            }
            
            if (this._settings.pagingControlLocations == "bottom" || this._settings.pagingControlLocations == "topbottom") {
                this._renderPagingDiv(this._dom.bottomPagingDiv, items.length, this._settings.page);
                this._dom.bottomPagingDiv.style.display = "block";
            }
        } else {
            this._dom.topPagingDiv.style.display = "none";
            this._dom.bottomPagingDiv.style.display = "none";
        }
    }
};

Exhibit.TabularView.prototype._renderPagingDiv = function(parentElmt, itemCount, page) {
    var pageCount = Math.ceil(itemCount / this._settings.pageSize);
    var self = this;
    
    Exhibit.OrderedViewFrame.renderPageLinks(
        parentElmt, 
        page,
        pageCount,
        this._settings.pageWindow,
        function(p) {
            self._gotoPage(p);
        }
    );
};

Exhibit.TabularView.prototype._getColumnLabel = function(expression) {
    var database = this._uiContext.getDatabase();
    var path = expression.getPath();
    var segment = path.getSegment(path.getSegmentCount() - 1);
    var propertyID = segment.property;
    var property = database.getProperty(propertyID);
    if (property != null) {
        return segment.forward ? property.getLabel() : property.getReverseLabel();
    } else {
        return propertyID;
    }
};

/*
Stablize converts an arbitrary sorting function into one that breaks ties 
in that function according to item indices stored in indexMap.  Thus if
indexMap contains the indices of items under a previous order, then the
sort will preserve that previous order in the case of ties.

If sorting is interleaved with faceting, items that go out-of and back-into 
view will not be stabilized as their past index will be forgotten while they
are out of view.
*/
Exhibit.TabularView.prototype._stabilize = function(f, indexMap)  {
    var stable = function(item1, item2) {
	var cmp=f(item1, item2);
	if (cmp) {
	    return cmp;
	}
	else {
	    i1 = item1.id in indexMap ? indexMap[item1.id] : -1;
	    i2 = item2.id in indexMap ? indexMap[item2.id] : -1;
	    return i1-i2;
	}
    }
    return stable;
}

Exhibit.TabularView.prototype._createSortFunction = function(items, expression, ascending) {
    var database = this._uiContext.getDatabase();
    var multiply = ascending ? 1 : -1;
    
    var numericFunction = function(item1, item2) {
        var val = multiply * (item1.sortKey - item2.sortKey);
	return isNaN(val) ? 0 : val;
    };
    var textFunction = function(item1, item2) {
        return multiply * item1.sortKey.localeCompare(item2.sortKey);
    };
    
    var valueTypes = [];
    var valueTypeMap = {};
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var r = expression.evaluate(
            { "value" : item.id }, 
            { "value" : "item" }, 
            "value",
            database
        );
        r.values.visit(function(value) {
            item.sortKey = value;
        });
        
        if (!(r.valueType in valueTypeMap)) {
            valueTypeMap[r.valueType] = true;
            valueTypes.push(r.valueType);
        }
    }
    
    var coercedValueType = "text"
    if (valueTypes.length == 1) {
        coercedValueType = valueTypes[0];
    } else {
        coercedValueType = "text";
    }
    
    var coersion;
    var sortingFunction;
    if (coercedValueType == "number") {
        sortingFunction = numericFunction;
        coersion = function(v) {
            if (v == null) {
                return Number.NEGATIVE_INFINITY;
            } else if (typeof v == "number") {
                return v;
            } else {
                var n = parseFloat(v);
                if (isNaN(n)) {
                    return Number.MAX_VALUE;
                } else {
                    return n;
                }
            }
        }
    } else if (coercedValueType == "date") {
        sortingFunction = numericFunction;
        coersion = function(v) {
            if (v == null) {
                return Number.NEGATIVE_INFINITY;
            } else if (v instanceof Date) {
                return v.getTime();
            } else {
                try {
                    return SimileAjax.DateTime.parseIso8601DateTime(v).getTime();
                } catch (e) {
                    return Number.MAX_VALUE;
                }
            }
	}
    } else if (coercedValueType == "boolean") {
	sortingFunction = numericFunction;
	coersion = function(v) {
	    if (v == null) {
		return Number.MAX_VALUE;
	    } else if (typeof v == "boolean") {
		return v ? 1 : 0;
	    } else {
		return v.toString().toLowerCase() == "true";
	    }
	}
    } else if (coercedValueType == "item") {
        sortingFunction = textFunction;
        coersion = function(v) {
            if (v == null) {
                return Exhibit.l10n.missingSortKey;
            } else {
                var label = database.getObject(v, "label");
                return (label == null) ? v : label;
            }
        }
    } else {
        sortingFunction = textFunction;
        coersion = function(v) {
            if (v == null) {
                return Exhibit.l10n.missingSortKey;
            } else {
                return v.toString();
            }
        }
    }
    
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        item.sortKey = coersion(item.sortKey);
    }
    
    return sortingFunction;
};

Exhibit.TabularView.prototype._doSort = function(columnIndex) {
    var oldSortColumn = this._settings.sortColumn;
    var oldSortAscending = this._settings.sortAscending;
    var newSortColumn = columnIndex;
    var newSortAscending = oldSortColumn == newSortColumn ? !oldSortAscending : true;
    var oldPage = this._settings.page;
    var newPage = 0;
    var settings = this._settings;
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.sortColumn = newSortColumn;
            settings.sortAscending = newSortAscending;
            settings.page = newPage;
            self._reconstruct();
        },
        function() {
            settings.sortColumn = oldSortColumn;
            settings.sortAscending = oldSortAscending;
            settings.page = oldPage;
            self._reconstruct();
        },
        Exhibit.TabularView.l10n.makeSortActionTitle(this._columns[columnIndex].label, newSortAscending)
    );
};

Exhibit.TabularView.prototype._gotoPage = function(page) {
    var oldPage = this._settings.page;
    var newPage = page;
    var settings = this._settings;
    
    var self = this;
    SimileAjax.History.addLengthyAction(
        function() {
            settings.page = newPage;
            self._reconstruct();
        },
        function() {
            settings.page = oldPage;
            self._reconstruct();
        },
        Exhibit.OrderedViewFrame.l10n.makePagingActionTitle(page)
    );
};

Exhibit.TabularView._constructDefaultValueList = function(values, valueType, parentElmt, uiContext) {
    uiContext.formatList(values, values.size(), valueType, function(elmt) {
        parentElmt.appendChild(elmt);
    });
};

Exhibit.TabularView.createDom = function(div) {
    var l10n = Exhibit.TabularView.l10n;
    var l10n2 = Exhibit.OrderedViewFrame.l10n;
    
    var headerTemplate = {
        elmt:       div,
        className:  "exhibit-collectionView-header",
        children: [
            {   tag:    "div",
                field:  "collectionSummaryDiv"
            },
            {   tag:        l10n2.pagingControlContainerElement,
                className:  "exhibit-tabularView-pagingControls",
                field:      "topPagingDiv"
            },
            {   tag:    "div",
                field:  "bodyDiv"
            },
            {   tag:        l10n2.pagingControlContainerElement,
                className:  "exhibit-tabularView-pagingControls",
                field:      "bottomPagingDiv"
            }
        ]
    };
    return SimileAjax.DOM.createDOMFromTemplate(headerTemplate);
};

Exhibit.TabularView.createColumnHeader = function(
    exhibit, 
    th,
    label,
    sort,
    sortAscending,
    sortFunction
) {
    var l10n = Exhibit.TabularView.l10n;
    var template = {
        elmt:       th,
        className:  sort ? 
                    "exhibit-tabularView-columnHeader-sorted" : 
                    "exhibit-tabularView-columnHeader",
        title: sort ? l10n.columnHeaderReSortTooltip : l10n.columnHeaderSortTooltip,
        children: [ label ]
    };
    if (sort) {
        template.children.push({
            elmt: Exhibit.UI.createTranslucentImage(
                sortAscending ? "images/up-arrow.png" : "images/down-arrow.png")
        });
    }
    SimileAjax.WindowManager.registerEvent(th, "click", sortFunction, null);
    
    var dom = SimileAjax.DOM.createDOMFromTemplate(template);
    return dom;
};
