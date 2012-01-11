/*==================================================
 *  Exhibit.ThumbnailView
 *==================================================
 */
 
Exhibit.ThumbnailView = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    this._settings = {};
    
    var view = this;
    this._listener = { 
        onItemsChanged: function() {
            view._orderedViewFrame._settings.page = 0;
            view._reconstruct(); 
        } 
    };
    uiContext.getCollection().addListener(this._listener);
    
    this._orderedViewFrame = new Exhibit.OrderedViewFrame(uiContext);
    this._orderedViewFrame.parentReconstruct = function() {
        view._reconstruct();
    };
};

Exhibit.ThumbnailView._settingSpecs = {
    "showToolbox":          { type: "boolean", defaultValue: true },
    "columnCount":          { type: "int", defaultValue: -1 }
};

Exhibit.ThumbnailView._itemContainerClass = SimileAjax.Platform.browser.isIE ?
    "exhibit-thumbnailView-itemContainer-IE" :
    "exhibit-thumbnailView-itemContainer";

Exhibit.ThumbnailView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.ThumbnailView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext, true)
    );
    
    view._lensRegistry = Exhibit.UIContext.createLensRegistry(configuration, uiContext.getLensRegistry());
    
    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.ThumbnailView._settingSpecs, view._settings);
        
    view._orderedViewFrame.configure(configuration);
    
    view._initializeUI();
    return view;
};

Exhibit.ThumbnailView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.ThumbnailView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext, true)
    );
    
    view._lensRegistry = Exhibit.UIContext.createLensRegistryFromDOM(configElmt, configuration, uiContext.getLensRegistry());
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(
        configElmt, Exhibit.ThumbnailView._settingSpecs, view._settings);
    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.ThumbnailView._settingSpecs, view._settings);
        
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);
    
    view._initializeUI();
    return view;
};

Exhibit.ThumbnailView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);
    
    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    
    this._orderedViewFrame.dispose();
    this._orderedViewFrame = null;
    
    this._lensRegistry = null;
    this._dom = null;
    
    this._div.innerHTML = "";
    
    this._div = null;
    this._uiContext = null;
};

Exhibit.ThumbnailView.prototype._initializeUI = function() {
    var self = this;
    
    this._div.innerHTML = "";
    var template = {
        elmt: this._div,
        children: [
            {   tag: "div",
                field: "headerDiv"
            },
            {   tag: "div",
                className: "exhibit-collectionView-body",
                field: "bodyDiv"
            },
            {   tag: "div",
                field: "footerDiv"
            }
        ]
    };
    this._dom = SimileAjax.DOM.createDOMFromTemplate(template);
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
        this._toolboxWidget.getGeneratedHTML = function() {
            return self._dom.bodyDiv.innerHTML;
        };
    }
    
    this._orderedViewFrame._divHeader = this._dom.headerDiv;
    this._orderedViewFrame._divFooter = this._dom.footerDiv;
    this._orderedViewFrame._generatedContentElmtRetriever = function() {
        return self._dom.bodyDiv;
    };
    this._orderedViewFrame.initializeUI();
        
    this._reconstruct();
};

Exhibit.ThumbnailView.prototype._reconstruct = function() {
    if (this._settings.columnCount < 2) {
        this._reconstructWithFloats();
    } else {
        this._reconstructWithTable();
    }
};

Exhibit.ThumbnailView.prototype._reconstructWithFloats = function() {
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
        itemLensDiv.className = Exhibit.ThumbnailView._itemContainerClass;
        
        var itemLens = view._lensRegistry.createLens(itemID, itemLensDiv, view._uiContext);
        state.itemContainer.appendChild(itemLensDiv);
    };
                
    this._div.style.display = "none";
    
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    
    this._div.style.display = "block";
};

Exhibit.ThumbnailView.prototype._reconstructWithTable = function() {
    var view = this;
    var state = {
        div:            this._dom.bodyDiv,
        groupDoms:      [],
        groupCounts:    [],
        table:          null,
        columnIndex:    0
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
        state.table = null;
        state.columnIndex = 0;
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
        
        if (state.columnIndex >= view._settings.columnCount) {
            state.columnIndex = 0;
        }
        
        if (state.table == null) {
            state.table = Exhibit.ThumbnailView.constructTableItemContainer();
            state.div.appendChild(state.table);
        }
        if (state.columnIndex == 0) {
            state.table.insertRow(state.table.rows.length);
        }
        var td = state.table.rows[state.table.rows.length - 1].insertCell(state.columnIndex++);
        
        for (var i = 0; i < state.groupCounts.length; i++) {
            state.groupCounts[i]++;
        }
        
        var itemLensDiv = document.createElement("div");
        itemLensDiv.className = Exhibit.ThumbnailView._itemContainerClass;
        
        var itemLens = view._lensRegistry.createLens(itemID, itemLensDiv, view._uiContext);
        td.appendChild(itemLensDiv);
    };
                
    this._div.style.display = "none";
    
    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);
    
    this._div.style.display = "block";
};

Exhibit.ThumbnailView.constructGroup = function(
    groupLevel,
    label
) {
    var l10n = Exhibit.ThumbnailView.l10n;
    var template = {
        tag: "div",
        className: "exhibit-thumbnailView-group",
        children: [
            {   tag: "h" + (groupLevel + 1),
                children: [ 
                    label,
                    {   tag:        "span",
                        className:  "exhibit-collectionView-group-count",
                        children: [
                            " (",
                            {   tag: "span",
                                field: "countSpan"
                            },
                            ")"
                        ]
                    }
                ],
                field: "header"
            },
            {   tag: "div",
                className: "exhibit-collectionView-group-content",
                field: "contentDiv"
            }
        ]
    };
    return SimileAjax.DOM.createDOMFromTemplate(template);
};

Exhibit.ThumbnailView.constructItemContainer = function() {
    var div = document.createElement("div");
    div.className = "exhibit-thumbnailView-body";
    return div;
};
    
Exhibit.ThumbnailView.constructTableItemContainer = function() {
    var table = document.createElement("table");
    table.className = "exhibit-thumbnailView-body";
    return table;
};
