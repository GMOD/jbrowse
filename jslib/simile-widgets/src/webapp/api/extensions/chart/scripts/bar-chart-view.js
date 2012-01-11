/**==================================================
 *  Exhibit.BarChartView
 *  Creates a bar graph with the items going down the y-axis
 *  and the bars extending out along the x-axis. Supports
 *  logarithmic scales on the x-axis, the color coding True/False
 *  functionality of ScatterPlotView, and an ex:scroll option.
 *
 *  It was born of ScatterPlotView, so there may be unnecessary code
 *  in this file that wasn't pruned.
 *==================================================
 */
Exhibit.BarChartView = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;

    this._settings = {};
    this._accessors = {
        getPointLabel:  function(itemID, database, visitor) { visitor(database.getObject(itemID, "label")); },
        getProxy:       function(itemID, database, visitor) { visitor(itemID); },
        getColorKey:    null
    };
    
    // Function maps that allow for other axis scales (logarithmic, etc.), defaults to identity/linear
    //this._axisFuncs = { x: function (x) { return x; }, y: function (y) { return y; } };
    this._axisFuncs = { x: function (x) { return x; } };
    this._axisInverseFuncs = { x: function (x) { return x; } };
    //this._axisInverseFuncs = { x: function (x) { return x; }, y: function (y) { return y; } };

    this._colorKeyCache = new Object();
    this._maxColor = 0;
    
    var view = this;
    this._listener = { 
        onItemsChanged: function() {
            view._reconstruct(); 
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.BarChartView._settingSpecs = {
    "plotHeight":   { type: "int",   defaultValue: 400 },
    "bubbleWidth":  { type: "int",   defaultValue: 400 },
    "bubbleHeight": { type: "int",   defaultValue: 300 },
    "xAxisMin":     { type: "float", defaultValue: Number.POSITIVE_INFINITY },
    "xAxisMax":     { type: "float", defaultValue: Number.NEGATIVE_INFINITY },
    "xAxisType":    { type: "enum",  defaultValue: "linear", choices: [ "linear", "log" ] },
    "yAxisMin":     { type: "float", defaultValue: Number.POSITIVE_INFINITY },
    "yAxisMax":     { type: "float", defaultValue: Number.NEGATIVE_INFINITY },
    "yAxisType":    { type: "enum",  defaultValue: "linear", choices: [ "linear", "log" ] },
    "xLabel":       { type: "text",  defaultValue: "x" },
    "yLabel":       { type: "text",  defaultValue: "y" },
    "color":        { type: "text",  defaultValue: "#5D7CBA" },
    "colorCoder":   { type: "text",  defaultValue: null },
    "scroll":       { type: "boolean", defaultValue: false }
};

Exhibit.BarChartView._accessorSpecs = [
    {   accessorName:   "getProxy",
        attributeName:  "proxy"
    },
    {   accessorName:   "getPointLabel",
        attributeName:  "pointLabel"
    },
    {   accessorName: "getXY",
        alternatives: [
            {   bindings: [
                    {   attributeName:  "xy",
                        types:          [ "float", "text" ],
                        bindingNames:   [ "x", "y" ]
                    }
                ]
            },
            {   bindings: [
                    {   attributeName:  "x",
                        type:           "float",
                        bindingName:    "x"
                    },
                    {   attributeName:  "y",
                        type:           "text",
                        bindingName:    "y"
                    }
                ]
            }
        ]
    },
    {   accessorName:   "getColorKey",
        attributeName:  "colorKey",
        type:           "text"
    }
];

Exhibit.BarChartView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.BarChartView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.BarChartView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.BarChartView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.BarChartView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );

    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.BarChartView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.BarChartView._settingSpecs, view._settings);
    Exhibit.BarChartView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.BarChartView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.BarChartView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.BarChartView._settingSpecs, view._settings);

    view._axisFuncs.x = Exhibit.BarChartView._getAxisFunc(view._settings.xAxisType);
    view._axisInverseFuncs.x = Exhibit.BarChartView._getAxisInverseFunc(view._settings.xAxisType);
    
//    view._axisFuncs.y = Exhibit.BarChartView._getAxisFunc(view._settings.yAxisType);
//    view._axisInverseFuncs.y = Exhibit.BarChartView._getAxisInverseFunc(view._settings.yAxisType);
    
    var accessors = view._accessors;
    
    //itemID is an item in _uiContext.getCollection().getRestrictedItems()'s _hash, for example.
    //database comes from _uiContext.getDatabase()
    //visitor is a function that takes one argument. In this case it will be:
    // function(xy) { if ("x" in xy && "y" in xy) xys.push(xy); }
    
    view._getXY = function(itemID, database, visitor) {
        accessors.getProxy(itemID, database, function(proxy) {
            accessors.getXY(proxy, database, visitor);
        });
    };
};

// Convenience function that maps strings to respective functions
Exhibit.BarChartView._getAxisFunc = function(s) {
    if (s == "log") {
        return function (x) { return (Math.log(x) / Math.log(10.0)); };
    } else {
        return function (x) { return x; };
    }
}

// Convenience function that maps strings to respective functions
Exhibit.BarChartView._getAxisInverseFunc = function(s) {
    if (s == "log") {
        return function (x) { return Math.pow(10, x); };
    } else {
        return function (x) { return x; };
    };
}


Exhibit.BarChartView._colors = [
    "FF9000",
    "5D7CBA",
    "A97838",
    "8B9BBA",
    "FFC77F",
    "003EBA",
    "29447B",
    "543C1C"
];
Exhibit.BarChartView._mixColor = "FFFFFF";

Exhibit.BarChartView.evaluateSingle = function(expression, itemID, database) {
    return expression.evaluateSingleOnItem(itemID, database).value;
}

Exhibit.BarChartView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);
    
    this._toolboxWidget.dispose();
    this._toolboxWidget = null;
    
    this._dom.dispose();
    this._dom = null;
    
    this._uiContext.dispose();
    this._uiContext = null;
    
    this._div.innerHTML = "";
    this._div = null;
};

Exhibit.BarChartView.prototype._internalValidate = function() {
    if ("getColorKey" in this._accessors) {
        if ("colorCoder" in this._settings) {
            this._colorCoder = this._uiContext.getExhibit().getComponent(this._settings.colorCoder);
        }
        
        if (this._colorCoder == null) {
            this._colorCoder = new Exhibit.DefaultColorCoder(this._uiContext);
        }
    }
};

Exhibit.BarChartView.prototype._initializeUI = function() {
    var self = this;
	var legendWidgetSettings="_gradientPoints" in this._colorCoder ? "gradient" : {}
    
    this._div.innerHTML = "";
    this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(
        this._div, 
        this._uiContext, 
        true, // showSummary
        {   onResize: function() { 
                self._reconstruct();
            } 
        }, 
        legendWidgetSettings
    );
    this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
    
    this._dom.plotContainer.className = "exhibit-barChartView-plotContainer";
    this._dom.plotContainer.style.height = this._settings.plotHeight + "px";
    this._reconstruct();
};

// Why database = this._settings, but scaleX = self._axisFuncs.x ??
// Ah, because one block from david, other from mason

/** Where all the good stuff happens. There is a canvas div, in
 *  which resides a table. The left side is filled up with divs
 *  labeling the bars, and the right side is filled up with divs
 *  serving as the bars.
 */

Exhibit.BarChartView.prototype._reconstruct = function() {
    var self = this;
        
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;
    
    this._dom.plotContainer.innerHTML = "";
    
    var scaleX = self._axisFuncs.x;
//    var scaleY = self._axisFuncs.y;
    var unscaleX = self._axisInverseFuncs.x;
//    var unscaleY = self._axisInverseFuncs.y;
    
    var currentSize = collection.countRestrictedItems();
    var unplottableItems = [];
    
    this._dom.legendWidget.clear();
    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        var hasColorKey = (this._accessors.getColorKey != null);
        
        var xyToData = {};
        var xAxisMin = settings.xAxisMin;
        var xAxisMax = settings.xAxisMax;
//        var yAxisMin = settings.yAxisMin;
//        var yAxisMax = settings.yAxisMax;
        
        /*
         *  Iterate through all items, collecting min and max on both axes
         */
        currentSet.visit(function(itemID) {
            var xys = [];
//            self._getXY(itemID, database, function(xy) { if ("x" in xy && "y" in xy) xys.push(xy); console.log(xy.y);});
            self._getXY(itemID, database, function(xy) { if ("x" in xy && "y" in xy) xys.push(xy); });

            
            if (xys.length > 0) {
                var colorKeys = null;
                if (hasColorKey) {
                    colorKeys = new Exhibit.Set();
                    accessors.getColorKey(itemID, database, function(v) { colorKeys.add(v); });
                }
                
                for (var i = 0; i < xys.length; i++) {
                    var xy = xys[i];
                    var xyKey = xy.x + "," + xy.y;
                    if (xyKey in xyToData) {
                        var xyData = xyToData[xyKey];
                        xyData.items.push(itemID);
                        if (hasColorKey) {
                            xyData.colorKeys.addSet(colorKeys);
                        }
                    } else {
                        try {
                            xy.scaledX = scaleX(xy.x);
//                            xy.scaledY = scaleY(xy.y);
//                            if (!isFinite(xy.scaledX) || !isFinite(xy.scaledY)) {
                            if (!isFinite(xy.scaledX) ) {
                                continue;
                            }
                        } catch (e) {
                            continue; // ignore the point since we can't scale it, e.g., log(0)
                        }
                        
                        var xyData = {
                            xy:         xy,
                            items:      [ itemID ]
                        };
                        if (hasColorKey) {
                            xyData.colorKeys = colorKeys;
                        }
                        xyToData[xyKey] = xyData;
                        
                        xAxisMin = Math.min(xAxisMin, xy.scaledX);
                        xAxisMax = Math.max(xAxisMax, xy.scaledX);
//                        yAxisMin = Math.min(yAxisMin, xy.scaledY);
//                        yAxisMax = Math.max(yAxisMax, xy.scaledY);
                    }
                }
            } else {
                unplottableItems.push(itemID);
            }
        });
        
        /*
         *  Figure out scales, mins, and maxes for both axes
         */
        var xDiff = xAxisMax - xAxisMin;
//        var yDiff = yAxisMax - yAxisMin;
        
        var xInterval = 1;
        if (xDiff > 1) {
            while (xInterval * 20 < xDiff) {
                xInterval *= 10;
            }
        } else {
            while (xInterval < xDiff * 20) {
                xInterval /= 10;
            }
        }
        xAxisMin = Math.floor(xAxisMin / xInterval) * xInterval;
        xAxisMax = Math.ceil(xAxisMax / xInterval) * xInterval;
        
/*        var yInterval = 1;
        if (yDiff > 1) {
            while (yInterval * 20 < yDiff) {
                yInterval *= 10;
            }
        } else {
            while (yInterval < yDiff * 20) {
                yInterval /= 10;
            }
        }
        yAxisMin = Math.floor(yAxisMin / yInterval) * yInterval;
        yAxisMax = Math.ceil(yAxisMax / yInterval) * yInterval;
*/        
        settings.xAxisMin = xAxisMin;
        settings.xAxisMax = xAxisMax;
//        settings.yAxisMin = yAxisMin;
//        settings.yAxisMax = yAxisMax;
        
        /*
         *  Construct plot's frame
         */
        var canvasFrame = document.createElement("div");
        canvasFrame.className = SimileAjax.Platform.browser.isIE ?
            "exhibit-barChartView-canvasFrame-ie" :
            "exhibit-barChartView-canvasFrame";
        this._dom.plotContainer.appendChild(canvasFrame);
        if (self._settings.scroll) {
            canvasFrame.style.overflow="scroll";
        }

//******* Two column, one row table to put the barchart in.
        var theTable = document.createElement("table");
        var tableBody = document.createElement("tbody");
        var theRow = document.createElement("tr");
        var leftCol = document.createElement("td");
        var rightCol = document.createElement("td");
        var labelpart = document.createElement("div");
        var barpart = document.createElement("div");

        theTable.style.width="100%";
        //theTable.style.tableLayout="fixed";
        //rightCol.style.width="100%";
        barpart.style.position="relative";
        barpart.style.width="100%";
        //barpart.style.float="left";

        leftCol.appendChild(labelpart);
        rightCol.appendChild(barpart);
        theRow.appendChild(leftCol);
        theRow.appendChild(rightCol);
        tableBody.appendChild(theRow);
        theTable.appendChild(tableBody);

        canvasFrame.appendChild(theTable);
//*********

    
        var canvasDiv = document.createElement("div");
        canvasDiv.className = "exhibit-barChartView-canvas";
        canvasDiv.style.height = "100%";
        barpart.appendChild(canvasDiv);
        
/*        var theTable = document.createElement("table");
        theTable.style.width="100%";
*/        
        var yAxisDiv = document.createElement("div");
        yAxisDiv.className = SimileAjax.Platform.browser.isIE ?
            "exhibit-barChartView-yAxis-ie" :
            "exhibit-barChartView-yAxis";
        this._dom.plotContainer.appendChild(yAxisDiv);
        
        var yAxisDivInner = document.createElement("div");
        yAxisDivInner.style.position = "relative";
        yAxisDivInner.style.height = "100%";
        yAxisDiv.appendChild(yAxisDivInner);
        

  
    /*        
        for (var y = yAxisMin + yInterval; y < yAxisMax; y += yInterval) {
            var bottom = Math.floor((y - yAxisMin) * yScale);
            
            var div = document.createElement("div");
            div.className = "exhibit-barChartView-gridLine";
            div.style.height = "1px";
            div.style.bottom = bottom + "px";
            div.style.left = "0px";
            div.style.width = "100%";
            canvasDiv.appendChild(div);
            
            var labelDiv = document.createElement("div");
            labelDiv.className = "exhibit-barChartView-yAxisLabel";
            labelDiv.style.bottom = bottom + "px";
            labelDiv.innerHTML = makeLabelY(y);
            yAxisDivInner.appendChild(labelDiv);
        }
*/        var yNameDiv = document.createElement("div");
        yNameDiv.className = "exhibit-barChartView-yAxisName";
        yNameDiv.innerHTML = settings.yLabel;
        yAxisDivInner.appendChild(yNameDiv);
        
    
        
        /*
         *  Plot the points
         */
        var colorCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
        var addBarAtLocation = function(xyData) {
            var items = xyData.items;
            
            var color = settings.color;
            if (hasColorKey) {
                color = self._colorCoder.translateSet(xyData.colorKeys, colorCodingFlags);
            }
            
            var xy = xyData.xy;
//*******            

            var thelabel = document.createElement("div") ;
            var thetext= document.createTextNode(xy.y);
            thelabel.appendChild(thetext);
            thelabel.style.height="1.5em";
            labelpart.appendChild(thelabel);
            
            var bardiv = document.createElement("div") ;
            bardiv.style.position="relative";
            bardiv.style.height="1.5em";
            bardiv.style.zIndex="2";
            var bar= document.createElement("div");
            bar.className = "exhibit-barChartView-bar";
            bar.style.backgroundColor=color;
            bar.style.textAlign="right";
            bar.style.left="0";

            var barwidth = Math.floor(100*(scaleX(xy.x) - xAxisMin)/(xAxisMax-xAxisMin));
            bar.style.width= barwidth + "%";
            bar.style.borderStyle="solid";
            bar.style.borderWidth="1px";
            bar.style.paddingLeft="0px";
            var thetext= document.createTextNode(xy.x);
            bar.appendChild(thetext);
            bardiv.appendChild(bar);
            canvasDiv.appendChild(bardiv);
            SimileAjax.WindowManager.registerEvent(bar, "click", 
                function(elmt, evt, target) { self._openPopup(bar, items); });
            SimileAjax.WindowManager.registerEvent(thelabel, "click", 
                function(elmt, evt, target) { self._openPopup(thelabel, items); });
            
//*******


/*            var marker = Exhibit.BarChartView._makePoint(
                color,
                Math.floor((xy.scaledX - xAxisMin) * xScale),
                Math.floor((xy.scaledY - yAxisMin) * yScale),
                xyData.items + ": " + 
                    settings.xLabel + " = " + xy.x + ", " +
                    settings.yLabel + " = " + xy.y
            );
            
            SimileAjax.WindowManager.registerEvent(marker, "click", 
                function(elmt, evt, target) { self._openPopup(marker, items); });

            canvasDiv.appendChild(marker);
*/
        }
        
        for (xyKey in xyToData) {
            addBarAtLocation(xyToData[xyKey]);
        }
        
        leftCol.style.width="1px";
        theTable.style.tableLayout="auto";
 
        var xAxisDiv = document.createElement("div");
        xAxisDiv.className = "exhibit-barChartView-xAxis";
//        xAxisDiv.style.clear="left";
//        this._dom.plotContainer.appendChild(xAxisDiv);
        


        var xAxisDivInner = document.createElement("div");
        xAxisDivInner.style.position = "relative";
        xAxisDivInner.style.left = 0;
        xAxisDiv.appendChild(xAxisDivInner);
        
        var canvasWidth = canvasDiv.offsetWidth;
        var canvasHeight = canvasDiv.offsetHeight;
        var xScale = canvasWidth / (xAxisMax - xAxisMin);
//        var yScale = canvasHeight / (yAxisMax - yAxisMin);
        
        canvasDiv.style.display = "none";
        
        /*
         *  Construct plot's grid lines and axis labels
         */
        var makeMakeLabel = function(interval, unscale) {
            // Intelligently deal with non-linear scales
            if (interval >= 1000000) {
                return function (n) { return Math.floor(unscale(n) / 1000000) + "M"; };
            } else if (interval >= 1000) {
                return function (n) { return Math.floor(unscale(n) / 1000) + "K"; };
            } else {
                return function (n) { return unscale(n); };
            }
        };
        var makeLabelX = makeMakeLabel(xInterval, unscaleX);
//        var makeLabelY = makeMakeLabel(yInterval, unscaleY);
        
        for (var x = xAxisMin + xInterval; x < xAxisMax; x += xInterval) {
            var left = Math.floor((x - xAxisMin) * xScale);
            
            var div = document.createElement("div");
            div.className = "exhibit-barChartView-gridLine";
            div.style.width = "1px";
            div.style.left = left + "px";
            div.style.top = "0px";
            div.style.height = "100%";
            div.style.zIndex = "1";
            canvasDiv.appendChild(div);
            
            var labelDiv = document.createElement("div");
            labelDiv.className = "exhibit-barChartView-xAxisLabel";
            labelDiv.style.left = left + "px";
            labelDiv.innerHTML = makeLabelX(x);
            xAxisDivInner.appendChild(labelDiv);
        }
        var xNameDiv = document.createElement("div");
        xNameDiv.className = "exhibit-barChartView-xAxisName";
        xNameDiv.innerHTML = settings.xLabel;

        xAxisDivInner.appendChild(xNameDiv);
        barpart.appendChild(xAxisDiv);
        
        canvasDiv.style.display = "block";
        
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
    this._dom.setUnplottableMessage(currentSize, unplottableItems);
};

Exhibit.BarChartView.prototype._openPopup = function(elmt, items) {
    Exhibit.ViewUtilities.openBubbleForItems(elmt, items, this._uiContext);
};


