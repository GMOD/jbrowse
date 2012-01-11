/*==================================================
 *  Exhibit.MapView
 *==================================================
 */

Exhibit.MapView = function(containerElmt, uiContext) {
    Exhibit.MapView._initialize();
    
    this._div = containerElmt;
    this._uiContext = uiContext;

    this._overlays=[];
    this._settings = {};
    this._accessors = {
        getProxy:    function(itemID, database, visitor) { visitor(itemID); },
        getColorKey: null,
        getSizeKey:  null,
        getIconKey:  null,
        getIcon:     null
    };
    this._colorCoder = null;
    this._sizeCoder = null;
    this._iconCoder = null;
    
    this._selectListener = null;
    this._itemIDToMarker = {};
    
    var view = this;
    this._listener = { 
        onItemsChanged: function() {
            view._reconstruct(); 
        }
    };
    uiContext.getCollection().addListener(this._listener);


};

Exhibit.MapView._settingSpecs = {
    "latlngOrder":      { type: "enum",     defaultValue: "latlng", choices: [ "latlng", "lnglat" ] },
    "latlngPairSeparator": { type: "text",  defaultValue: ";"   },
    "center":           { type: "float",    defaultValue: [20,0],   dimensions: 2 },
    "zoom":             { type: "float",    defaultValue: 2         },
    "autoposition":     { type: "boolean",  defaultValue: false     },
    "scrollWheelZoom":  { type: "boolean",  defaultValue: true      },
    "size":             { type: "text",     defaultValue: "small"   },
    "scaleControl":     { type: "boolean",  defaultValue: true      },
    "overviewControl":  { type: "boolean",  defaultValue: false     },
    "type":             { type: "enum",     defaultValue: "normal", choices: [ "normal", "satellite", "hybrid" ] },
    "bubbleTip":        { type: "enum",     defaultValue: "top",    choices: [ "top", "bottom" ] },
    "mapHeight":        { type: "int",      defaultValue: 400       },
    "mapConstructor":   { type: "function", defaultValue: null      },
    "color":            { type: "text",     defaultValue: "#FF9000" },
    "colorCoder":       { type: "text",     defaultValue: null      },
    "sizeCoder":        { type: "text",     defaultValue: null      },
    "iconCoder":        { type: "text",     defaultValue: null      },
    "selectCoordinator":  { type: "text",   defaultValue: null      },
    
    "iconSize":         { type: "int",      defaultValue: 0         },
    "iconFit":          { type: "text",     defaultValue: "smaller" },
    "iconScale":        { type: "float",    defaultValue: 1         },
    "iconOffsetX":      { type: "float",    defaultValue: 0         },
    "iconOffsetY":      { type: "float",    defaultValue: 0         },
    "shape":            { type: "text",     defaultValue: "circle"  },
    "shapeWidth":       { type: "int",      defaultValue: 24        },
    "shapeHeight":      { type: "int",      defaultValue: 24        },
    "shapeAlpha":       { type: "float",    defaultValue: 0.7       },
    "pin":              { type: "boolean",  defaultValue: true      },
    "pinHeight":        { type: "int",      defaultValue: 6         },
    "pinWidth":         { type: "int",      defaultValue: 6         },
    
//settings for polygons
    "borderOpacity":    { type: "float",    defaultValue: 0.5       },
    "borderWidth":      { type: "int",      defaultValue: 1         },
    "borderColor":      { type: "text",     defaultValue: null      },
    "opacity":          { type: "float",    defaultValue: 0.7       },
    
    "sizeLegendLabel":  { type: "text",     defaultValue: null      },
    "colorLegendLabel": { type: "text",     defaultValue: null      },
    "iconLegendLabel":  { type: "text",     defaultValue: null      },
    "markerScale":      { type: "text",     defaultValue: null      },
    "showHeader":       { type: "boolean",  defaultValue: true      },
    "showSummary":      { type: "boolean",  defaultValue: true      },
    "showFooter":       { type: "boolean",  defaultValue: true      },
    "showToolbox":      { type: "boolean",  defaultValue: true      }
};

Exhibit.MapView._accessorSpecs = [
    {   accessorName:   "getProxy",
        attributeName:  "proxy"
    },
    {   accessorName: "getLatlng",
        alternatives: [
            {   bindings: [
                    {   attributeName:  "latlng",
                        types:          [ "float", "float" ],
                        bindingNames:   [ "lat", "lng" ]
                    },
                    {   attributeName:  "maxAutoZoom",
                        type:           "float",
                        bindingName:    "maxAutoZoom",
                        optional:       true
                    }
                ]
            },
            {   bindings: [
                    {   attributeName:  "lat",
                        type:           "float",
                        bindingName:    "lat"
                    },
                    {   attributeName:  "lng",
                        type:           "float",
                        bindingName:    "lng"
                    },
                    {   attributeName:  "maxAutoZoom",
                        type:           "float",
                        bindingName:    "maxAutoZoom",
                        optional:       true
                    }
                ]
            }
        ]
    },
    {   accessorName:   "getPolygon",
        attributeName:  "polygon",
        type:           "text"
    },
    {   accessorName:   "getPolyline",
        attributeName:  "polyline",
        type:           "text"
    },
    {   accessorName:   "getColorKey",
        attributeName:  "marker", // backward compatibility
        type:           "text"
    },
    {   accessorName:   "getColorKey",
        attributeName:  "colorKey",
        type:           "text"
    },
    {   accessorName:   "getSizeKey",
        attributeName:  "sizeKey",
        type:           "text"
    },
    {   accessorName:   "getIconKey",
        attributeName:  "iconKey",
        type:           "text"
    },
    {   accessorName:   "getIcon",
        attributeName:  "icon",
        type:           "url"
    }
];



Exhibit.MapView._initialize = function() {
    
    var links = [];
    var heads = document.documentElement.getElementsByTagName("head");
    for (var h = 0; h < heads.length; h++) {
        var linkElmts = heads[h].getElementsByTagName("link");
        for (var l = 0; l < linkElmts.length; l++) {
            var link = linkElmts[l];
            if (link.rel.match(/\bexhibit\/map-painter\b/)) {
                Exhibit.MapView._markerUrlPrefix = link.href + "?";
            }
        }
    }

    var canvas=document.createElement("canvas");
    Exhibit.MapView._hasCanvas=(canvas.getContext && canvas.getContext("2d"));

    Exhibit.MapView._initialize = function() {};    
};


Exhibit.MapView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.MapView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.MapView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.MapView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.MapView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );
    
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.MapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.MapView._settingSpecs, view._settings);
    Exhibit.MapView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.MapView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.MapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.MapView._settingSpecs, view._settings);
    
    var accessors = view._accessors;
    view._getLatlng = accessors.getLatlng != null ?
        function(itemID, database, visitor) {
            accessors.getProxy(itemID, database, function(proxy) {
                accessors.getLatlng(proxy, database, visitor);
            });
        } : 
        null;
};

Exhibit.MapView.lookupLatLng = function(set, addressExpressionString, outputProperty, outputTextArea, database, accuracy) {
    if (accuracy == undefined) {
        accuracy = 4;
    }
    
    var expression = Exhibit.ExpressionParser.parse(addressExpressionString);
    var jobs = [];
    set.visit(function(item) {
        var address = expression.evaluateSingle(
            { "value" : item },
            { "value" : "item" },
            "value",
            database
        ).value
        if (address != null) {
            jobs.push({ item: item, address: address });
        }
    });
    
    var results = [];
    var geocoder = new GClientGeocoder();
    var cont = function() {
        if (jobs.length > 0) {
            var job = jobs.shift();
            geocoder.getLocations(
                job.address,
                function(json) {
                    if ("Placemark" in json) {
                        json.Placemark.sort(function(p1, p2) {
                            return p2.AddressDetails.Accuracy - p1.AddressDetails.Accuracy;
                        });
                    }
                    
                    if ("Placemark" in json && 
                        json.Placemark.length > 0 && 
                        json.Placemark[0].AddressDetails.Accuracy >= accuracy) {
                        
                        var coords = json.Placemark[0].Point.coordinates;
                        var lat = coords[1];
                        var lng = coords[0];
                        results.push("\t{ id: '" + job.item + "', " + outputProperty + ": '" + lat + "," + lng + "' }");
                    } else {
                        var segments = job.address.split(",");
                        if (segments.length == 1) {
                            results.push("\t{ id: '" + job.item + "' }");
                        } else {
                            job.address = segments.slice(1).join(",").replace(/^\s+/, "");
                            jobs.unshift(job); // do it again
                        }
                    }
                    cont();
                }
            );
        } else {
            outputTextArea.value = results.join(",\n");
        }
    };
    cont();
};

Exhibit.MapView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);
    
    this._clearOverlays();
    this._map = null;
    
    if (this._selectListener != null) {
        this._selectListener.dispose();
        this._selectListener = null;
    }
    this._itemIDToMarker = {};
    
    if (this._settings.showToolbox) {
        this._toolboxWidget.dispose();
        this._toolboxWidget = null;
    }
    
    this._dom.dispose();
    this._dom = null;
    
    this._uiContext.dispose();
    this._uiContext = null;
    
    this._div.innerHTML = "";
    this._div = null;
};

Exhibit.MapView.prototype._internalValidate = function() {
    var exhibit = this._uiContext.getExhibit();
    if (this._accessors.getColorKey != null) {
        if (this._settings.colorCoder != null) {
            this._colorCoder = exhibit.getComponent(this._settings.colorCoder);
        }
        
        if (this._colorCoder == null) {
            this._colorCoder = new Exhibit.DefaultColorCoder(this._uiContext);
        }
    }
    if (this._accessors.getSizeKey != null) {  
        if (this._settings.sizeCoder != null) {
            this._sizeCoder = exhibit.getComponent(this._settings.sizeCoder);
            if ("markerScale" in this._settings) {
                this._sizeCoder._settings.markerScale = this._settings.markerScale;
            }
        }
    }
    if (this._accessors.getIconKey != null) {  
        if (this._settings.iconCoder != null) {
            this._iconCoder = exhibit.getComponent(this._settings.iconCoder);
        }
    }
    if ("selectCoordinator" in this._settings) {
        var selectCoordinator = exhibit.getComponent(this._settings.selectCoordinator);
        if (selectCoordinator != null) {
            var self = this;
            this._selectListener = selectCoordinator.addListener(function(o) {
                self._select(o);
            });
        }
    }
};

Exhibit.MapView.prototype._initializeUI = function() {
    var self = this;
    
    var legendWidgetSettings = {};
    legendWidgetSettings.colorGradient = (this._colorCoder != null && "_gradientPoints" in this._colorCoder);
    legendWidgetSettings.colorMarkerGenerator = this._createColorMarkerGenerator();
    legendWidgetSettings.sizeMarkerGenerator = this._createSizeMarkerGenerator();
    legendWidgetSettings.iconMarkerGenerator = this._createIconMarkerGenerator();
    
    this._div.innerHTML = "";
    this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(
        this._div, 
        this._uiContext, 
        this._settings.showSummary && this._settings.showHeader,
        {   onResize: function() { 
	    google.maps.event.trigger(self._map, 'resize');
            } 
        },
        legendWidgetSettings
    );    
    
    if (this._settings.showToolbox) {
        this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
    }
    
    var mapDiv = this._dom.plotContainer;
    mapDiv.style.height = this._settings.mapHeight + "px";
    mapDiv.className = "exhibit-mapView-map";
    
    this._map = this._constructGMap(mapDiv);
    this._reconstruct();
};

Exhibit.MapView.prototype._constructGMap = function(mapDiv) {
    var settings = this._settings;
    if (settings.mapConstructor != null) {
        return settings.mapConstructor(mapDiv);
    } else {
	var mapOptions={
	    center: new google.maps.LatLng(settings.center[0],settings.center[1]),
	    zoom: settings.zoom,
	    panControl: true,
	    zoomControl: {style: google.maps.ZoomControlStyle.DEFAULT},
	    mapTypeId: google.maps.MapTypeId.ROADMAP
	}
	if (settings.size == "small")
	    mapOptions.zoomControl.style = google.maps.ZoomControlStyle.SMALL;
	else if (settings.size == "large")
	    mapOptions.zoomControl.style = google.maps.ZoomControlStyle.LARGE;

	if ("overviewControl" in settings)
	    mapOptions.overviewControl = settings.overviewControl;

	if ("scaleControl" in settings)
	    mapOptions.scaleControl = settings.scaleControl;
   
	if ("scrollWheelZoom" in settings && !settings.scrollWheelZoom)
	    mapOptions.scrollWheel=false;
        
        switch (settings.type) {
        case "satellite":
            mapOptions.mapTypeId=google.maps.MapTypeId.SATELLITE;
            break;
        case "hybrid":
            mapOptions.mapTypeId=google.maps.MapTypeId.HYBRID;
            break;
        case "terrain":
            mapOptions.mapTypeId=google.maps.MapTypeId.TERRAIN;
            break;
        }

        var map = new google.maps.Map(mapDiv,mapOptions);

        google.maps.event.addListener(map, "click", function() {
            SimileAjax.WindowManager.cancelPopups();
        });
        
        return map;
    }
};

Exhibit.MapView.prototype._createColorMarkerGenerator = function() {
    var shape = this._settings.shape;
    
    return function(color) {
        return SimileAjax.Graphics.createTranslucentImage(
            Exhibit.MapView._markerUrlPrefix +
                "?renderer=map-marker&shape=" + shape +
                "&width=20&height=20&pinHeight=5&background=" + color.substr(1),
            "middle"
        );
    };
};

Exhibit.MapView.prototype._createSizeMarkerGenerator = function() {
    var shape = this._settings.shape;
    
    return function(iconSize) {
        return SimileAjax.Graphics.createTranslucentImage(
            Exhibit.MapView._markerUrlPrefix +
                "?renderer=map-marker&shape=" + shape +
                "&width=" + iconSize +
                "&height=" + iconSize +
                "&pinHeight=0",
            "middle"
        );
    };
};

Exhibit.MapView.prototype._createIconMarkerGenerator = function() {
    return function(iconURL) {
        elmt = document.createElement('img');
        elmt.src = iconURL;
        elmt.style.verticalAlign = "middle";
        elmt.style.height = "40px";
        return elmt;
    };
};

Exhibit.MapView.prototype._clearOverlays = function() {
    if (this._infoWindow) {
	this._infoWindow.setMap(null);
    }
    for (var i=0; i<this._overlays.length; i++) {
	this._overlays[i].setMap(null);
    }
    this._overlays=[];
}

Exhibit.MapView.prototype._reconstruct = function() {
    this._clearOverlays();
    if (this._dom.legendWidget)
	this._dom.legendWidget.clear();
    if (this._dom.legendGradientWidget)
	this._dom.legendGradientWidget.clear();
    this._itemIDToMarker = {};
    
    var currentSize = this._uiContext.getCollection().countRestrictedItems();
    var unplottableItems = [];

    if (currentSize > 0) {
        this._rePlotItems(unplottableItems);
    }
    this._dom.setUnplottableMessage(currentSize, unplottableItems);
};

Exhibit.MapView.prototype._rePlotItems = function(unplottableItems) {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;

    var currentSet = collection.getRestrictedItems();
    var locationToData = {};
    var hasColorKey = (accessors.getColorKey != null);
    var hasSizeKey = (accessors.getSizeKey != null);
    var hasIconKey = (accessors.getIconKey != null);
    var hasIcon = (accessors.getIcon != null);
    
    var hasPoints = (this._getLatlng != null);
    var hasPolygons = (accessors.getPolygon != null);
    var hasPolylines = (accessors.getPolyline != null);
    
    var makeLatLng = settings.latlngOrder == "latlng" ? 
        function(first, second) { return new google.maps.LatLng(first, second); } :
    function(first, second) { return new google.maps.LatLng(second, first); };

    var colorCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
    var sizeCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
    var iconCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
    var bounds, maxAutoZoom = Infinity;


    
    currentSet.visit(function(itemID) {
        var latlngs = [];
        var polygons = [];
        var polylines = [];
        
        if (hasPoints) {
            self._getLatlng(itemID, database, function(v) { 
		if (v != null && "lat" in v && "lng" in v) 
		    latlngs.push(v); });
        }
        if (hasPolygons) {
            accessors.getPolygon(itemID, database, function(v) { if (v != null) polygons.push(v); });
        }
        if (hasPolylines) {
            accessors.getPolyline(itemID, database, function(v) { if (v != null) polylines.push(v); });
        }
        
        if (latlngs.length > 0 || polygons.length > 0 || polylines.length > 0) {
            var color = self._settings.color;
            
            var colorKeys = null;
            if (hasColorKey) {
                colorKeys = new Exhibit.Set();
                accessors.getColorKey(itemID, database, function(v) { colorKeys.add(v); });
                
                color = self._colorCoder.translateSet(colorKeys, colorCodingFlags);
            }
            
            if (latlngs.length > 0) {
                var sizeKeys = null;
                if (hasSizeKey) {
                    sizeKeys = new Exhibit.Set();
                    accessors.getSizeKey(itemID, database, function(v) { sizeKeys.add(v); });
                }
                var iconKeys = null;
                if (hasIconKey) {
                    iconKeys = new Exhibit.Set();
                    accessors.getIconKey(itemID, database, function(v) { iconKeys.add(v); });
                }
                for (var n = 0; n < latlngs.length; n++) {
                    var latlng = latlngs[n];
                    var latlngKey = latlng.lat + "," + latlng.lng;
                    if (latlngKey in locationToData) {
                        var locationData = locationToData[latlngKey];
                        locationData.items.push(itemID);
                        if (hasColorKey) { locationData.colorKeys.addSet(colorKeys); }
                        if (hasSizeKey) { locationData.sizeKeys.addSet(sizeKeys); }
                        if (hasIconKey) { locationData.iconKeys.addSet(iconKeys); }
                    } else {
                        var locationData = {
                            latlng:     latlng,
                            items:      [ itemID ]
                        };
                        if (hasColorKey) { locationData.colorKeys = colorKeys;}
                        if (hasSizeKey) { locationData.sizeKeys = sizeKeys; }
                        if (hasIconKey) { locationData.iconKeys = iconKeys; }
                        locationToData[latlngKey] = locationData;
                    }
                }
            }
            
            for (var p = 0; p < polygons.length; p++) {
                self._plotPolygon(itemID, polygons[p], color, makeLatLng); 
            }
            for (var p = 0; p < polylines.length; p++) {
                self._plotPolyline(itemID, polylines[p], color, makeLatLng); 
            }
        } else {
            unplottableItems.push(itemID);
        }
    });
    
    var addMarkerAtLocation = function(locationData) {
        var itemCount = locationData.items.length;
        if (!bounds) {
            bounds = new google.maps.LatLngBounds();
        }
        
        var shape = self._settings.shape;
        
        var color = self._settings.color;
        if (hasColorKey) {
            color = self._colorCoder.translateSet(locationData.colorKeys, colorCodingFlags);
        }
        var iconSize = self._settings.iconSize;
        if (hasSizeKey) {
            iconSize = self._sizeCoder.translateSet(locationData.sizeKeys, sizeCodingFlags);
        }
        
        var icon = null;
        if (itemCount == 1) {
            if (hasIcon) {
                accessors.getIcon(locationData.items[0], database, function(v) { icon = v; });
            }
        }
        if (hasIconKey) {
            icon = self._iconCoder.translateSet(locationData.iconKeys, iconCodingFlags);
        }
	
	var point= new google.maps.LatLng(locationData.latlng.lat, locationData.latlng.lng);

	if (maxAutoZoom > locationData.latlng.maxAutoZoom) {
            maxAutoZoom = locationData.latlng.maxAutoZoom;
        }
        bounds.extend(point);

        var marker = Exhibit.MapView._makeMarker(
	    point,
            shape, 
            color, 
            iconSize,
            icon,
            itemCount == 1 ? "" : itemCount.toString(),
            self._settings
        );

//	marker=new google.maps.Marker({position: point, map: self._map});
        google.maps.event.addListener(marker, "click", function() { 
	    self._showInfoWindow(locationData.items,null,marker)
	    
            if (self._selectListener != null) {
                self._selectListener.fire({ itemIDs: locationData.items });
            }
        });
        marker.setMap(self._map);
	self._overlays.push(marker);
	
        
        for (var x = 0; x < locationData.items.length; x++) {
            self._itemIDToMarker[locationData.items[x]] = marker;
        }
    }

    try {
	for (var latlngKey in locationToData) {
	    addMarkerAtLocation(locationToData[latlngKey]);
	}
    } catch(e) {
	alert(e);
    }

//create all legends for the map, one each for icons, colors, and sizes

    if (hasColorKey) {
        var legendWidget = this._dom.legendWidget;
        var colorCoder = this._colorCoder;
        var keys = colorCodingFlags.keys.toArray().sort();
        if (settings.colorLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.colorLegendLabel, 'color');
        }
        if (colorCoder._gradientPoints != null) {
            var legendGradientWidget = this._dom.legendGradientWidget;
            legendGradientWidget.addGradient(this._colorCoder._gradientPoints);
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
        if (colorCodingFlags.mixed && legendWidget) {
            legendWidget.addEntry(colorCoder.getMixedColor(), colorCoder.getMixedLabel());
        }
        if (colorCodingFlags.missing) {
            legendWidget.addEntry(colorCoder.getMissingColor(), colorCoder.getMissingLabel());
        }
    }
    
    if (hasSizeKey) {
        var legendWidget = this._dom.legendWidget;
        var sizeCoder = this._sizeCoder;
        var keys = sizeCodingFlags.keys.toArray().sort();    
        if (settings.sizeLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.sizeLegendLabel, 'size');
        }
        if (sizeCoder._gradientPoints != null) {
            var points = sizeCoder._gradientPoints;
            var space = (points[points.length - 1].value - points[0].value)/5;
            keys = [];
            for (var i = 0; i < 6; i++) { keys.push(Math.floor(points[0].value + space*i)); }
            for (var k = 0; k < keys.length; k++) {
                var key = keys[k];
                var size = sizeCoder.translate(key);
                legendWidget.addEntry(size, key, 'size');
            }
        } else {       
            for (var k = 0; k < keys.length; k++) {
                var key = keys[k];
                var size = sizeCoder.translate(key);
                legendWidget.addEntry(size, key, 'size');
            }
            if (sizeCodingFlags.others) {
                legendWidget.addEntry(sizeCoder.getOthersSize(), sizeCoder.getOthersLabel(), 'size');
            }
            if (sizeCodingFlags.mixed) {
                legendWidget.addEntry(sizeCoder.getMixedSize(), sizeCoder.getMixedLabel(), 'size');
            }
            if (sizeCodingFlags.missing) {
                legendWidget.addEntry(sizeCoder.getMissingSize(), sizeCoder.getMissingLabel(), 'size');
            }
        }
    }        

    if (hasIconKey) {
        var legendWidget = this._dom.legendWidget;
        var iconCoder = this._iconCoder;
        var keys = iconCodingFlags.keys.toArray().sort();    
        if (settings.iconLegendLabel != null) {
            legendWidget.addLegendLabel(settings.iconLegendLabel, 'icon');
        }      
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var icon = iconCoder.translate(key);
            legendWidget.addEntry(icon, key, 'icon');
        }
        if (iconCodingFlags.others) {
            legendWidget.addEntry(iconCoder.getOthersIcon(), iconCoder.getOthersLabel(), 'icon');
        }
        if (iconCodingFlags.mixed) {
            legendWidget.addEntry(iconCoder.getMixedIcon(), iconCoder.getMixedLabel(), 'icon');
        }
        if (iconCodingFlags.missing) {
            legendWidget.addEntry(iconCoder.getMissingIcon(), iconCoder.getMissingLabel(), 'icon');
        }
    }  


//on first show, allow map to position itself based on content    
    if (bounds && settings.autoposition && !this._shown) {
	self._map.fitBounds(bounds);
	if (self._map.getZoom > maxAutoZoom) {
	    self._map_setZoom(maxAutoZoom);
	}
    }
    this._shown=true; //don't reposition map again
};

Exhibit.MapView.prototype._plotPolygon = function(itemID, polygonString, color, makeLatLng) {
    var coords = this._parsePolygonOrPolyline(polygonString, makeLatLng);
    if (coords.length > 1) {
        var settings = this._settings;
        var borderColor = settings.borderColor != null ? settings.borderColor : color;
	
	var polygon = new google.maps.Polygon({
	    paths: coords,
	    strokeColor: borderColor,
	    strokeWeight: settings.borderWidth,
	    strokeOpacity: settings.borderOpacity,
	    fillColor: color,
	    fillOpacity: settings.opacity
	});
        
        return this._addPolygonOrPolyline(itemID, polygon);
    }
    return null;
};

Exhibit.MapView.prototype._plotPolyline = function(itemID, polylineString, color, makeLatLng) {
    var coords = this._parsePolygonOrPolyline(polylineString, makeLatLng);
    if (coords.length > 1) {
        var settings = this._settings;
        var borderColor = settings.borderColor != null ? settings.borderColor : color;
	var polyline = new google.maps.Polyline({
	    path: coords,
	    strokeColor: borderColor,
	    strokeWidth: settings.borderWidth,
	    strokeOpacity: settings.borderOpacity
	});

        return this._addPolygonOrPolyline(itemID, polyline);
    }
    return null;
};

Exhibit.MapView.prototype._addPolygonOrPolyline = function(itemID, poly) {
    poly.setMap(this._map);
    this._overlays.push(poly);
    
    var self = this;
    var onclick = function(latlng) {
	self._showInfoWindow([itemID],latlng);

        if (self._selectListener != null) {
            self._selectListener.fire({ itemIDs: [itemID] });
        }
    }
    google.maps.event.addListener(poly, "click", onclick);
    
    this._itemIDToMarker[itemID] = poly;
    
    return poly;
};

Exhibit.MapView.prototype._parsePolygonOrPolyline = function(s, makeLatLng) {
    var coords = [];
    
    var a = s.split(this._settings.latlngPairSeparator);
    for (var i = 0; i < a.length; i++) {
        var pair = a[i].split(",");
        coords.push(makeLatLng(parseFloat(pair[0]), parseFloat(pair[1])));
    }
    
    return coords;
};

Exhibit.MapView.prototype._select = function(selection) {
    var itemID = selection.itemIDs[0];
    var marker = this._itemIDToMarker[itemID];
    if (marker) {
	this._showInfoWindow([itemID],null,marker)
    }
};

Exhibit.MapView.prototype._showInfoWindow = function(items, pos, marker) {
    if (this._infoWindow) 
	this._infoWindow.setMap(null);

    var content= this._createInfoWindow(items);

    var window = new google.maps.InfoWindow({
	content: content
    });
    if (pos) window.setPosition(pos);

    window.open(this._map, marker);

    this._infoWindow = window;
}

Exhibit.MapView.prototype._createInfoWindow = function(items) {
    return Exhibit.ViewUtilities.fillBubbleWithItems(
        null, 
        items, 
        this._uiContext
    );
};


Exhibit.MapView.makeCanvasIcon = function(width,height,color,label,iconImg,iconSize,settings) {
    var drawShadow=function(icon) {
	var width=icon.width;
	var height=icon.height;
	var shadowWidth=width+height;
	var canvas=document.createElement("canvas");
	canvas.width=shadowWidth;
	canvas.height=height;
	var context=canvas.getContext("2d");
	
	context.scale(1,1/2);
	context.translate(height/2,height);
	context.transform(1,0,-1/2,1,0,0);  //shear the shadow diagonally
	context.fillRect(0,0,width,height);
	context.globalAlpha=settings.shapeAlpha;
	context.globalCompositeOperation="destination-in";
	context.drawImage(icon,0,0);
	return canvas;
    }

    var pin=settings.pin;
    var pinWidth=settings.pinWidth;
    var pinHeight=settings.pinHeight;
    var lineWidth=settings.borderWidth;
    var lineColor=settings.borderColor;
    var alpha=settings.shapeAlpha;
    var bodyWidth=width-lineWidth; //stroke is half outside circle on both sides
    var bodyHeight=height-lineWidth;
    var markerHeight=height+(pin? pinHeight:0);
    var radius;

    var canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=markerHeight;
    var context=canvas.getContext("2d");
    context.clearRect(0,0,width,markerHeight);

    context.beginPath();
    if (settings && (settings.shape == "circle")) {
	radius = bodyWidth/2.0;
	if (!pin) {
	    context.arc(width/2.0,height/2.0,radius,0,2*Math.PI);
	}
	else {
	    var meetAngle = Math.atan2(pinWidth/2.0, bodyHeight/2.0);
	    context.arc(width/2.0,height/2.0,radius,Math.PI/2+meetAngle,Math.PI/2-meetAngle);
	    context.lineTo(width/2.0,height+pinHeight-lineWidth/2); //pin base
	}
    }
    else { //"square"
	radius = bodyWidth/4.0;
	var topY = leftX = lineWidth/2.0;
	var botY = height - lineWidth/2.0;
	var rightX = width - lineWidth/2.0

	context.moveTo(rightX - radius, topY);
	context.arcTo(rightX, topY, rightX, topY + radius, radius);
	context.lineTo(rightX, botY-radius);
	context.arcTo(rightX, botY, rightX-radius, botY, radius);
	if (pin) { 
	    context.lineTo(width/2.0+pinWidth/2.0, botY);
	    context.lineTo(width/2.0, height+pinHeight-lineWidth/2);
	    context.lineTo(width/2.0-pinWidth/2.0, botY);
	   }
	context.lineTo(leftX+radius, botY);
	context.arcTo(leftX, botY, leftX, botY-radius, radius);
	context.lineTo(leftX, topY+radius);
	context.arcTo(leftX, topY, leftX+radius, topY, radius);
    }
    context.closePath();


    context.fillStyle=color;
    context.globalAlpha=alpha;
    context.fill();

    if (iconImg) {
	context.save();
	context.clip();
	context.globalAlpha=1;
	context.translate(width/2+settings.iconOffsetX, 
			  height/2+settings.iconOffsetY);
	var scale;
	var heightScale = 1.0*height/iconImg.naturalHeight;
	var widthScale = 1.0* width/iconImg.naturalWidth;
	switch(settings.iconFit) {
	case "width":
	    scale = widthScale;
	    break;
	case "height":
	    scale = heightScale;
	    break;
	case "both":
	case "larger":
	    scale = Math.min(heightScale, widthScale);
	    break;
	case "smaller":
	    scale = Math.max(heightScale, widthScale);
	    break;
	}	
	context.scale(scale,scale);
	context.scale(settings.iconScale,settings.iconScale);
	context.drawImage(iconImg,
			  -iconImg.naturalWidth/2.0, -iconImg.naturalHeight/2.0);
	context.restore();
    }

    context.strokeStyle=lineColor;
    context.lineWidth=lineWidth;
    context.stroke();

//now we have what we need to make its shadow
    var shadow=drawShadow(canvas);

//now decorate the marker's inside
    if (label) {
	context.font="bold 12pt Arial";
	context.textBaseline="middle";
	context.textAlign="center";
	context.globalAlpha=1;
	context.fillStyle=lineColor;
	context.fillText(label,width/2.0,height/2.0,width/1.4);
    }


    return {iconURL: canvas.toDataURL(), shadowURL: shadow.toDataURL()};
} //end MakeCanvasIcon

Exhibit.MapView.makePainterIcon = function(width, height, color, label, iconURL, iconSize, settings) {
    var imageParameters = [
        "renderer=map-marker",
        "shape=" + settings.shape,
        "alpha=" + settings.shapeAlpha,
        "width=" + width,
        "height=" + height,
        "background=" + color.substr(1),
        "label=" + label
    ];
    var shadowParameters = [
        "renderer=map-marker-shadow",
        "shape=" + settings.shape,
        "width=" + width,
        "height=" + height
    ];
    var pinParameters = [];
    if (settings.pin && !(iconSize > 0)) {
        var pinHeight = settings.pinHeight;
        var pinHalfWidth = Math.ceil(settings.pinWidth / 2);
        
        pinParameters.push("pinHeight=" + pinHeight);
        pinParameters.push("pinWidth=" + (pinHalfWidth * 2));
    }
    else {
	pinParameters.push("pin=false");
    }

    if (iconURL != null) {
        imageParameters.push("icon=" + iconURL);
        if (settings.iconFit != "smaller") {
            imageParameters.push("iconFit=" + settings.iconFit);
        }
        if (settings.iconScale != 1) {
            imageParameters.push("iconScale=" + settings.iconScale);
        }
        if (settings.iconOffsetX != 1) {
            imageParameters.push("iconX=" + settings.iconOffsetX);
        }
        if (settings.iconOffsetY != 1) {
            imageParameters.push("iconY=" + settings.iconOffsetY);
        }
    }


    return {
	iconURL: Exhibit.MapView._markerUrlPrefix + imageParameters.concat(pinParameters).join("&") + "&.png",
	shadowURL: Exhibit.MapView._markerUrlPrefix + shadowParameters.concat(pinParameters).join("&") + "&.png" 
    }

}

Exhibit.MapView._markerUrlPrefix = "http://service.simile-widgets.org/painter/painter?";

Exhibit.MapView.markerCache={};

/*
Two cases here are easy.  
* If canvas isn't implemented, we need to use painter
* If canvas is implemented and there is no image, we can easily use canvas

It gets more complicated if we have canvas but need to include images.  Most of the time we can use canvas, fetching the image and drawing it on the canvas.  But if the image is from a different site, html's XSS protections may prevent us from extracting the resulting drawing.  In which case we need to revert to painter.

Even worse is the need to fetch images asynchronously and only add them to the marker after they arrive.  I also want to assure that _some_ marker gets plotted even if the image is not available.  To support this, the code will start by plotting the marker without the image, but place a callback that adds the image to the marker if it is successfully fetched.  We also want to cache the resulting icon so we don't have to fetch again.

*/

Exhibit.MapView._makeMarker = function(position, shape, color, iconSize, iconURL, label, settings) {
    var key = "#"+shape+"#"+color+"#"+iconSize+"#"+iconURL+"#"+label;
    var cached = Exhibit.MapView.markerCache[key];
    if (cached && (cached.settings == settings)) {
	return  new google.maps.Marker(
	{icon: cached.markerImage,
	 shadow: cached.shadowImage,
	 shape: cached.markerShape,
	 position: position
	});
    }


    var extra =  label.length * 3;
    var halfWidth = Math.ceil(settings.shapeWidth / 2) + extra;
    var bodyHeight = settings.shapeHeight+2*extra; //try to keep circular
    var width = halfWidth * 2;
    var height = bodyHeight;
    var pin=settings.pin;

    if (iconSize > 0) {
        width = iconSize;
        halfWidth = Math.ceil(iconSize / 2);
        height = iconSize;
        bodyHeight = iconSize;
    }   
    var markerImage={};
    var markerShape={type: 'poly'};
    var shadowImage={};

    if (pin) {
        var pinHeight = settings.pinHeight;
        var pinHalfWidth = Math.ceil(settings.pinWidth / 2);
        
        height += pinHeight;

        markerImage.anchor = new google.maps.Point(halfWidth, height);
        shadowImage.anchor = new google.maps.Point(halfWidth, height);
	
	markerShape.coords = [
	    0, 0, 
	    0, bodyHeight, 
	    halfWidth - pinHalfWidth, bodyHeight,
	    halfWidth, height,
	    halfWidth + pinHalfWidth, bodyHeight,
	    width, bodyHeight,
	    width, 0
        ];
    } else {
        
        markerImage.anchor = new google.maps.Point(halfWidth, Math.ceil(height / 2));
        shadowImage.anchor = new google.maps.Point(halfWidth, Math.ceil(height / 2));

        markerShape.coords = [ 
	    0, 0, 
	    0, bodyHeight, 
	    width, bodyHeight,
	    width, 0
        ];
    }

    markerImage.size = new google.maps.Size(width, height);
    shadowImage.size = new google.maps.Size(width+height/2, height);
   
    var markerPair;
    if ((!Exhibit.MapView._hasCanvas) || (iconURL == null)) {
	//easy cases
	if (!Exhibit.MapView._hasCanvas) {
	    markerPair=Exhibit.MapView.makePainterIcon(width,bodyHeight,color,label,iconURL,iconSize,settings);
	}
	else {
	    markerPair=Exhibit.MapView.makeCanvasIcon(width,bodyHeight,color,label,null,iconSize,settings);
	}
	markerImage.url=markerPair.iconURL;
	shadowImage.url=markerPair.shadowURL;

	cached = Exhibit.MapView.markerCache[key] = 
	    {markerImage: markerImage, shadowImage: shadowImage,
	     markerShape: markerShape};

    
	return  new google.maps.Marker(
	    {icon: cached.markerImage,
	     shadow: cached.shadowImage,
	     shape: cached.markerShape,
	     position: position
	    });
    }
    else {
	//hard case: canvas needs to fetch image
	//return a marker without the image
	//add a callback that adds the image when available.
	var marker = Exhibit.MapView._makeMarker(position, shape, color, iconSize, null, label, settings);
	cached = {
	    markerImage: marker.getIcon(),
	    shadowImage: marker.getShadow(),
	    markerShape: marker.getShape(),
	    settings: settings
	}
	var image = new Image();
	image.onload = function() {
	    try {
		cached.markerImage.url=Exhibit.MapView.makeCanvasIcon(width,bodyHeight,color,label,image,iconSize,settings).iconURL;
	    } 
	    catch(e) {
		//remote icon fetch caused canvas tainting
		cached.markerImage.url=Exhibit.MapView.makePainterIcon(width,bodyHeight,color,label,iconURL,iconSize,settings).iconURL;
	    }

	    Exhibit.MapView.markerCache[key] = cached;
	    marker.setIcon(cached.markerImage);
            }
	image.src = iconURL;
	
	return marker;
    }
};
