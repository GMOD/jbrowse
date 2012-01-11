/*==================================================
 *  Exhibit.TileView
 *==================================================
 */

Exhibit.TileView = function(containerElmt, uiContext) {
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

Exhibit.TileView._settingSpecs = {
    "showToolbox":          { type: "boolean", defaultValue: true }
};

Exhibit.TileView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.TileView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    
    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.TileView._settingSpecs, view._settings);
        
    view._orderedViewFrame.configure(configuration);

    view._initializeUI();
    return view;
};

Exhibit.TileView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.TileView(
        containerElmt != null ? containerElmt : configElmt,
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(
        configElmt, Exhibit.TileView._settingSpecs, view._settings);
    Exhibit.SettingsUtilities.collectSettings(
        configuration, Exhibit.TileView._settingSpecs, view._settings);
    
    view._orderedViewFrame.configureFromDOM(configElmt);
    view._orderedViewFrame.configure(configuration);

    view._initializeUI();
    return view;
};

Exhibit.TileView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);

    this._div.innerHTML = "";

    if (this._toolboxWidget) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    
    this._orderedViewFrame.dispose();
    this._orderedViewFrame = null;
    this._dom = null;

    this._div = null;
    this._uiContext = null;
};

Exhibit.TileView.prototype._initializeUI = function() {
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

Exhibit.TileView.prototype._reconstruct = function() {
    var view = this;
    var state = {
        div:            this._dom.bodyDiv,
        contents:       null,
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
        state.contents = null;
    }

    this._orderedViewFrame.onNewGroup = function(groupSortKey, keyType, groupLevel) {
        closeGroups(groupLevel);

        var groupDom = Exhibit.TileView.constructGroup(groupLevel, groupSortKey);

        state.div.appendChild(groupDom.elmt);
        state.div = groupDom.contentDiv;

        state.groupDoms.push(groupDom);
        state.groupCounts.push(0);
    };

    this._orderedViewFrame.onNewItem = function(itemID, index) {
        if (state.contents == null) {
            state.contents = Exhibit.TileView.constructList();
            state.div.appendChild(state.contents);
        }

        for (var i = 0; i < state.groupCounts.length; i++) {
            state.groupCounts[i]++;
        }

        var itemLensItem = document.createElement("li");
        var itemLens = view._uiContext.getLensRegistry().createLens(itemID, itemLensItem, view._uiContext);
        state.contents.appendChild( itemLensItem );
    };

    this._div.style.display = "none";

    this._dom.bodyDiv.innerHTML = "";
    this._orderedViewFrame.reconstruct();
    closeGroups(0);

    this._div.style.display = "block";
};

Exhibit.TileView.constructGroup = function(groupLevel, label) {
    var template = {
        tag: "div",
        className: "exhibit-collectionView-group",
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

Exhibit.TileView.constructList = function() {
    var div = document.createElement("ol");
    div.className = "exhibit-tileView-body";
    return div;
};
