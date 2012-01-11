/*==================================================
 *  Exhibit.TimeplotView
 *
 *  Development partially funded by Zepheira.
 *  http://zepheira.com/
 *  See the main Exhibit LICENSE.txt for licensing.
 *==================================================
 */
 
Exhibit.TimeplotView = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;

    this._settings = {};
    this._accessors = {
        getLabel:  function(itemID, database, visitor) { visitor(database.getObject(itemID, "label")); },
        getProxy:       function(itemID, database, visitor) { visitor(itemID); },
        getColorKey:    null
    };

    this._legend = [];
    this._largestSize = 0;

    var view = this;
    this._listener = { 
        onItemsChanged: function() {
            view._reconstruct(); 
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.TimeplotView._settingSpecs = {
    "timeplotConstructor":     { type: "function",   defaultValue: null },
    "timeGeometry":            { type: "function",   defaultValue: null },
    "valueGeometry":           { type: "function",   defaultValue: null },
    "timeplotHeight":          { type: "int",        defaultValue: 400  },
    "gridColor":               { type: "text",       defaultValue: "#000000" },
    "colorCoder":              { type: "text",       defaultValue: null },
    "showHeader":              { type: "boolean",    defaultValue: true },
    "showSummary":             { type: "boolean",    defaultValue: true },
    "showToolbox":             { type: "boolean",    defaultValue: true }
};

Exhibit.TimeplotView._accessorSpecs = [
    {   accessorName:   "getProxy",
        attributeName:  "proxy"
    },
    {   accessorName:   "getTime",
        attributeName:  "pointTime",
        type:           "date"
    },
    {   accessorName:   "getValue",
        attributeName:  "pointValue",
        type:           "float"
    },
    {   accessorName:   "getSeriesConnector",
        attributeName:  "seriesConnector",
        type:           "text"
    },
    {   accessorName:   "getSeriesTime",
        attributeName:  "seriesTime",
        type:           "text"
    },
    {   accessorName:   "getSeriesValue",
        attributeName:  "seriesValue",
        type:           "text"
    },
    {   accessorName:   "getColorKey",
        attributeName:  "colorKey",
        type:           "text"
    },
    {   accessorName:   "getEventLabel",
        attributeName:  "eventLabel",
        type:           "text"
    }
];

Exhibit.TimeplotView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.TimeplotView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.TimeplotView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.TimeplotView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.TimeplotView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );
    
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.TimeplotView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.TimeplotView._settingSpecs, view._settings);
    Exhibit.TimeplotView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.TimeplotView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.TimeplotView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.TimeplotView._settingSpecs, view._settings);
    
    var accessors = view._accessors;
    view._getTime = function(itemID, database, visitor) {
        accessors.getProxy(itemID, database, function(proxy) {
            accessors.getTime(proxy, database, visitor);
        });
    };
};

Exhibit.TimeplotView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);
    
    this._timeplot = null;
    
    if (this._settings.showToolbox) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    
    this._dom.dispose();
    this._dom = null;
    
    this._div.innerHTML = "";
    this._div = null;
    
    this._uiContext.dispose();
    this._uiContext = null;
};

Exhibit.TimeplotView.prototype._internalValidate = function() {
    if ("getColorKey" in this._accessors) {
        if ("colorCoder" in this._settings) {
            this._colorCoder = this._uiContext.getExhibit().getComponent(this._settings.colorCoder);
        }

        if (this._colorCoder == null) {
            this._colorCoder = new Exhibit.DefaultColorCoder(this._uiContext);
        }
    }
};

Exhibit.TimeplotView.prototype._initializeUI = function() {
    var self = this;
    var legendWidgetSettings = {};
    
    legendWidgetSettings.colorGradient = (this._colorCoder != null && "_gradientPoints" in this._colorCoder);
    
    this._div.innerHTML = "";
    this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(
        this._div, 
        this._uiContext, 
        this._settings.showSummary && this._settings.showHeader,
        {   onResize: function() { 
                self._timeplot.repaint();
            } 
        }, 
        legendWidgetSettings
    );

    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
    }
    
    this._eventSources = [];
    this._eventSource = new Timeplot.DefaultEventSource();
    this._columnSources = [];
    this._reconstruct();
};

Exhibit.TimeplotView.prototype._reconstructTimeplot = function(newEvents) {
    var settings = this._settings;
    if (this._timeplot != null) {
        this._timeplot.dispose();
        this._timeplot = null;
    }
    
    if (newEvents) {
        this._eventSource.addMany(newEvents);
    }

    var timeplotDiv = this._dom.plotContainer;
    if (settings.timeplotConstructor != null) {
        this._timeplot = settings.timeplotConstructor(timeplotDiv, this._eventSource);
    } else {
        timeplotDiv.style.height = settings.timeplotHeight + "px";
        timeplotDiv.className = "exhibit-timeplotView-timeplot";
        timeplotDiv.id = "timeplot-" + Math.floor(Math.random() * 1000);

        var hasColorKey = (this._accessors.getColorKey != null);
        var colorCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };

        var gridColor  = new Timeplot.Color(settings.gridColor);
        var timeGeometry = settings.timeGeometry(gridColor);
        var geometry = settings.valueGeometry(gridColor);

        var plotInfos  = [];
        for (var i = 0; i < this._legend.length; i++) {
            var color = null;
            if (hasColorKey) {
                var colorKeys = new Exhibit.Set();
                colorKeys.add(this._legend[i]);
                color = this._colorCoder.translateSet(colorKeys, colorCodingFlags);
            }

            this._columnSources.push(new Timeplot.ColumnSource(this._eventSource,i+1));
            plotInfos.push(Timeplot.createPlotInfo({
                id: this._legend[i],
                dataSource: this._columnSources[i],
                timeGeometry: timeGeometry,
                valueGeometry: geometry,
                lineColor: new Timeplot.Color(color),
                dotColor: new Timeplot.Color(color),
                showValues: true,
                roundValues: false
            }));
        }
        this._timeplot = Timeplot.create(timeplotDiv, plotInfos);
        setTimeout(this._timeplot.paint, 100);

        if (hasColorKey) {
            var legendWidget = this._dom.legendWidget;
            var colorCoder = this._colorCoder;
            var keys = colorCodingFlags.keys.toArray().sort();
            if(this._colorCoder._gradientPoints != null) {
                legendWidget.addGradient(this._colorCoder._gradientPoints);
            } else {
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    var color = colorCoder.translate(key);
                    legendWidget.addEntry(color, key);
                }
            }

            if (colorCodingFlags.others) {
                legendWidget.addEntry(colorCoder.getOthersColor(), colorCoder.getOthersLabel());
            }
            if (colorCodingFlags.mixed) {
                legendWidget.addEntry(colorCoder.getMixedColor(), colorCoder.getMixedLabel());
            }
            if (colorCodingFlags.missing) {
                legendWidget.addEntry(colorCoder.getMissingColor(), colorCoder.getMissingLabel());
            }
        }
    }
};

Exhibit.TimeplotView.prototype._reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;

    /*
     *  Get the current collection and check if it's empty
     */
    var currentSize = collection.countRestrictedItems();
    var unplottableItems = [];

    this._dom.legendWidget.clear();
    for (var i = 0; i < this._columnSources.length; i++) {
        this._columnSources[i].dispose();
    }
    this._columnSources = [];
    this._eventSource.clear();
    this._eventSource = new Timeplot.DefaultEventSource();

    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        var events = [];
        var table  = {};
        var times  = new SimileAjax.Set([]);
        var seriesSet = new SimileAjax.Set([]);

        // There are two ways to specify a series, either by including all
        // the data in one DB item or by connecting one value across several
        // items.  Across several is checked first during the set.visit() and
        // addEvent is called if found; if not, addSeries is called.
        var addSeries = function(itemID) {
            // data is semicolon separated
            var seriesTimeString;
            accessors.getSeriesTime(itemID, database, function(v) { seriesTimeString = v; return true; });
            var seriesValueString;
            accessors.getSeriesValue(itemID, database, function(v) { seriesValueString = v; return true; });
            var series;
            accessors.getLabel(itemID, database, function(v) { series = v; return true; });
            var seriesTime = seriesTimeString.split(";");
            var seriesValue = seriesValueString.split(";");
            if (seriesTime.length != seriesValue.length) {
                throw "Exhibit-Timeplot Exception: time and value arrays of unequal size, unplottable";
            }
            for (var i = 0; i < seriesTime.length; i++) {
                var idx, value;
                try {
                    idx = SimileAjax.DateTime.parseIso8601DateTime(seriesTime[i]).getTime();
                } catch (e) {
                    throw "Exhibit-Timeplot Exception: cannot parse time";
                }
                try {
                    var value = parseFloat(seriesValue[i]);
                } catch (e) {
                    throw "Exhibit-Timeplot Exception: cannot parse value";
                }
                times.add(idx);
                if (!table[idx]) {
                    table[idx] = {};
                    table[idx][series] = value;
                } else {
                    table[idx][series] = value;
                }
            }
            seriesSet.add(series);
        }

        var addEvent = function(itemID, time) {
            var value;
            accessors.getValue(itemID, database, function(v) { value = v; return true; });
            var series;
            accessors.getSeriesConnector(itemID, database, function(v) { series = v; return true; });
            var idx = time.getTime();
            times.add(idx);
            if (!table[idx]) {
                table[idx] = {};
                table[idx][series] = value;
            } else {
                table[idx][series] = value;
            }
            seriesSet.add(series);
        };

        currentSet.visit(function(itemID) {
            var time;
            self._getTime(itemID, database, function(v) { time = v; return true; });
            if (time) {
                addEvent(itemID, time);
            } else {
                try {
                    addSeries(itemID);
                } catch(e) {
                    unplottableItems.push(itemID);
                }
            }
        });

        var seriesArray = seriesSet.toArray();
        var timesArray = times.toArray();

        this._legend = seriesArray;

        timesArray.sort(function(a,b){return a-b;});

        var lastKnown = {};
        for (var i = 0; i < timesArray.length; i++) {
            var row = [];
            for (var j = 0; j < seriesArray.length; j++) {
                var val = table[timesArray[i]][seriesArray[j]];
                if (val) {
                    row.push(parseFloat(val));
                    lastKnown[seriesArray[j]] = val;
                } else {
                    if (lastKnown[seriesArray[j]]) {
                        row.push(parseFloat(lastKnown[seriesArray[j]]));
                    } else {
                        row.push(0);
                    }
                }
            }

            var evtTime = SimileAjax.NativeDateUnit.fromNumber(parseInt(timesArray[i]));
            var evt = new Timeplot.DefaultEventSource.NumericEvent(evtTime, row);
            events.push(evt);
        }

        var plottableSize = currentSize - unplottableItems.length;
        if (plottableSize > this._largestSize) {
            this._largestSize = plottableSize;
            this._reconstructTimeplot();
            this._eventSource.addMany(events);
        } else {
            this._reconstructTimeplot();
            this._eventSource.addMany(events);
        }
    }
    this._dom.setUnplottableMessage(currentSize, unplottableItems);
};
