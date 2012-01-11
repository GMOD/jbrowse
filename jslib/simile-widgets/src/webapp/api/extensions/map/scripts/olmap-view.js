/*==================================================
 *  Exhibit.OLMapView
 *
 *  Utilizing OpenLayers map API
 *  http://openlayers.org/
 *
 *  Funding for development of this extension in part
 *  by Zepheira.  Copyright (c) Zepheira 2009.
 *  http://zepheira.com/
 *  See the main Exhibit LICENSE.txt for licensing.
 *==================================================
 */

// FUTURE PLANS
//  extend map type concept to cover custom map layers via OL in exhibit; this could be done with the generic mapConstructor setting, but perhaps a less programming intensive way can be made available
//  change popup on polygon to location of click instead of centroid
//  hide/show instead of erase/redraw features
//  test cases
//  incorporate an editor based on OL editing API

Exhibit.OLMapView = function(containerElmt, uiContext) {
    Exhibit.OLMapView._initialize();
    
    this._div = containerElmt;
    this._uiContext = uiContext;

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

Exhibit.OLMapView.contexts = {};

Exhibit.OLMapView._settingSpecs = {
    "latlngOrder":      { type: "enum",     defaultValue: "latlng", choices: [ "latlng", "lnglat" ] },
    "latlngPairSeparator": { type: "text",  defaultValue: ";"   },
    "center":           { type: "float",    defaultValue: null,     dimensions: 2 },
    "zoom":             { type: "float",    defaultValue: null      },

    "scrollWheelZoom":  { type: "boolean",  defaultValue: true      },
    "scaleControl":     { type: "boolean",  defaultValue: true      },
    "overviewControl":  { type: "boolean",  defaultValue: false     },
    "type":             { type: "enum",     defaultValue: "osm", choices: [ "osm", "wms", "gmap", "gsat", "ghyb", "gter", "vmap", "vsat", "vhyb", "ymap", "ysat", "yhyb" ] },
    "bubbleTip":        { type: "enum",     defaultValue: "top",    choices: [ "top", "bottom" ] },
    "mapHeight":        { type: "int",      defaultValue: 400       },
    "mapConstructor":   { type: "function", defaultValue: null      },
    "projection":       { type: "function", defaultValue: null      },
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
    "showToolbox":      { type: "boolean",  defaultValue: true      },
    "osmURL":           { type: "text",     defaultValue: "http://tah.openstreetmap.org/Tiles/tile/${z}/${x}/${y}.png" },
    "wmsURL":           { type: "text",     defaultValue: "http://labs.metacarta.com/wms/vmap0" }
};

Exhibit.OLMapView._accessorSpecs = [
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

Exhibit.OLMapView._initialize = function() {
    var links = [];
    var heads = document.documentElement.getElementsByTagName("head");
    for (var h = 0; h < heads.length; h++) {
        var linkElmts = heads[h].getElementsByTagName("link");
        for (var l = 0; l < linkElmts.length; l++) {
            var link = linkElmts[l];
            if (link.rel.match(/\bexhibit\/map-painter\b/)) {
                Exhibit.OLMapView._markerUrlPrefix = link.href + "?";
            }
        }
    }
    Exhibit.OLMapView._initialize = function() {};
};

Exhibit.OLMapView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.OLMapView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );
    Exhibit.OLMapView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.OLMapView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.OLMapView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );
    
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.OLMapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.OLMapView._settingSpecs, view._settings);
    Exhibit.OLMapView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.OLMapView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.OLMapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.OLMapView._settingSpecs, view._settings);
    
    var accessors = view._accessors;
    view._getLatlng = accessors.getLatlng != null ?
        function(itemID, database, visitor) {
            accessors.getProxy(itemID, database, function(proxy) {
                accessors.getLatlng(proxy, database, visitor);
            });
        } : 
        null;
};

Exhibit.OLMapView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);

    this._map.destroy();    
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

Exhibit.OLMapView.prototype._internalValidate = function() {
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

Exhibit.OLMapView.prototype._initializeUI = function() {
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
                self._map.checkResize(); 
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
    
    this._map = this._constructMap(mapDiv);
    this._reconstruct();
};

Exhibit.OLMapView.prototype._constructMap = function(mapDiv) {
    var settings = this._settings;

    if (settings.projection != null) {
	this._projection = settings.projection();
    } else {
        this._projection = new OpenLayers.Projection("EPSG:4326");
    }

    if (settings.mapConstructor != null) {
        return settings.mapConstructor(mapDiv);
    } else {
        var map = new OpenLayers.Map({
		"div": mapDiv,
		"controls": [],
		"projection": new OpenLayers.Projection("EPSG:900913"),
		"displayProjection": this._projection,
	        "units": "m",
	        "numZoomLevels": 18,
	        "maxResolution": 156543.0339,
	        "maxExtent": new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34)});
	var osm = new OpenLayers.Layer.OSM(
                      "Street",
                      settings.osmURL,
                      { "wrapDateLine": true });
	osm.setVisibility(false);
        var wms = new OpenLayers.Layer.WMS(
		       "World Map",
		       settings.wmsURL,
                       {"layers": "basic" }, {"wrapDateLine": true});
	wms.setVisibility(false);
	var availableLayers = [osm, wms];
	var availability = { "osm" : osm, "wms" : wms };

	if (typeof G_HYBRID_MAP != "undefined") {
	    var gmap = new OpenLayers.Layer.Google(
		       "Street (Google)",
                       { "sphericalMercator": true });
            gmap.setVisibility(false);
	    var gsat = new OpenLayers.Layer.Google(
		       "Satellite (Google)",
                       { "type": G_SATELLITE_MAP, "sphericalMercator": true });
	    gsat.setVisibility(false);
	    var ghyb = new OpenLayers.Layer.Google(
		       "Street (Google)",
                       { "type": G_HYBRID_MAP, "sphericalMercator": true });
	    ghyb.setVisibility(false);
	    var gter = new OpenLayers.Layer.Google(
		       "Terrain (Google)",
                       { "type": G_PHYSICAL_MAP, "sphericalMercator": true });
	    gter.setVisibility(false);
	    availableLayers.push(gmap, gsat, ghyb, gter);
	    availability["gmap"] = gmap;
	    availability["gsat"] = gsat;
	    availability["ghyb"] = ghyb;
	    availability["gter"] = gter;
	}

	if (typeof VEMapStyle != "undefined") {
            var vmap = new OpenLayers.Layer.VirtualEarth(
                       "Street (Virtual Earth)",
                       {"type": VEMapStyle.Road, "sphericalMercator": true});
	    vmap.setVisibility(false);
	    var vsat = new OpenLayers.Layer.VirtualEarth(
                       "Satellite (Virtual Earth)",
                       {"type": VEMapStyle.Aerial, "sphericalMercator": true});
	    vsat.setVisibility(false);
	    var vhyb = new OpenLayers.Layer.VirtualEarth(
                       "Street (Virtual Earth)",
                       {"type": VEMapStyle.Hybrid, "sphericalMercator": true});
	    vhyb.setVisibility(false);
	    availableLayers.push(vmap, vsat, vhyb);
	    availability["vmap"] = vmap;
	    availability["vsat"] = vsat;
	    availability["vhyb"] = vhyb;
	}

	if (typeof YAHOO_MAP_SAT != "undefined") {
	    var ymap = new OpenLayers.Layer.Yahoo(
		       "Street (Yahoo)",
                       {"sphericalMercator": true});
	    ymap.setVisibility(false);
	    var ysat = new OpenLayers.Layer.Yahoo(
		       "Satellite (Yahoo)",
                       {"type": YAHOO_MAP_SAT, "sphericalMercator": true});
	    ysat.setVisibility(false);
	    var yhyb = new OpenLayers.Layer.Yahoo(
                       "Yahoo Hybrid",
                       {"type": YAHOO_MAP_HYB, "sphericalMercator": true});
	    yhyb.setVisibility(false);
	    availableLayers.push(ymap, ysat, yhyb);
	    availability["ymap"] = ymap;
	    availability["ysat"] = ysat;
	    availability["yhyb"] = yhyb;
	}

	var vectors = new OpenLayers.Layer.Vector("Features", { "wrapDateLine": true });
	availableLayers.push(vectors);

	if (typeof availability[settings.type] != "undefined") {
	    availability[settings.type].setVisibility(true);
	} else {
	    osm.setVisibility(true);
	}

        map.addLayers(availableLayers);
	availability = null;
	availableLayers = null;

        if (settings.center != null && typeof settings.center[0] != "undefined" && typeof settings.center[1] != "undefined") {
            if (settings.zoom != null) {
                map.setCenter(new OpenLayers.LonLat(settings.center[1], settings.center[0]).transform(this._projection, map.getProjectionObject()), settings.zoom);
            } else {
                map.setCenter(new OpenLayers.LonLat(settings.center[1], settings.center[0]).transform(this._projection, map.getProjectionObject()));
            }
        }

        map.addControl(new OpenLayers.Control.PanPanel());
        if (settings.overviewControl) {
            map.addControl(new OpenLayers.Control.OverviewMap());
        }
        if (settings.scaleControl) {
            map.addControl(new OpenLayers.Control.ZoomPanel());
        }

	var self = this;
        var selectControl = new OpenLayers.Control.SelectFeature(vectors, {
            onSelect: function(feature) {
		self._onFeatureSelect(self, feature);
	    },
	    onUnselect: function(feature) {
	        self._onFeatureUnselect(self, feature);
	    }
	});
        map.addControl(selectControl);
	selectControl.activate();
        
	map.addControl(new OpenLayers.Control.Navigation(settings.scrollWheelZoom, true, OpenLayers.Handler.MOD_SHIFT, true));
        
        map.addControl(new OpenLayers.Control.LayerSwitcher());

        map.events.register("click", null, SimileAjax.WindowManager.cancelPopups);
        return map;
    }
};

Exhibit.OLMapView.prototype._createColorMarkerGenerator = function() {
    var shape = this._settings.shape;
    
    return function(color) {
        return SimileAjax.Graphics.createTranslucentImage(
            Exhibit.OLMapView._markerUrlPrefix +
                "?renderer=map-marker&shape=" + shape +
                "&width=20&height=20&pinHeight=5&background=" + color.substr(1),
            "middle"
        );
    };
};

Exhibit.OLMapView.prototype._createSizeMarkerGenerator = function() {
    var shape = this._settings.shape;
    
    return function(iconSize) {
        return SimileAjax.Graphics.createTranslucentImage(
            Exhibit.OLMapView._markerUrlPrefix +
                "?renderer=map-marker&shape=" + shape +
                "&width=" + iconSize +
                "&height=" + iconSize +
                "&pinHeight=0",
            "middle"
        );
    };
};

Exhibit.OLMapView.prototype._createIconMarkerGenerator = function() {
    return function(iconURL) {
        elmt = document.createElement('img');
        elmt.src = iconURL;
        elmt.style.verticalAlign = "middle";
        elmt.style.height = "40px";
        return elmt;
    };
};

Exhibit.OLMapView.prototype._clearOverlays = function() {
    var vectorLayer = this._map.getLayersByClass("OpenLayers.Layer.Vector");
    if (vectorLayer.length == 1) {
        vectorLayer[0].destroyFeatures();
    }
    while (this._map.popups.length > 0) {
        this._map.removePopup(this._map.popups[0]);
    }
};

Exhibit.OLMapView.prototype._reconstruct = function() {
    this._clearOverlays();
    this._dom.legendWidget.clear();
    this._itemIDToMarker = {};
    
    var currentSize = this._uiContext.getCollection().countRestrictedItems();
    var unplottableItems = [];

    if (currentSize > 0) {
        this._rePlotItems(unplottableItems);
    }
    this._dom.setUnplottableMessage(currentSize, unplottableItems);
};

Exhibit.OLMapView.prototype._rePlotItems = function(unplottableItems) {
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

    var colorCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
    var sizeCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
    var iconCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };

    var makeLatLng = settings.latlngOrder == "latlng" ? 
    function(first, second) { return new OpenLayers.Geometry.Point(second, first); } :
    function(first, second) { return new OpenLayers.Geometry.Point(first, second); };
    currentSet.visit(function(itemID) {
        var latlngs = [];
        var polygons = [];
        var polylines = [];
        
        if (hasPoints) {
            self._getLatlng(itemID, database, function(v) { if (v != null && "lat" in v && "lng" in v) latlngs.push(v); });
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
    
    var bounds, maxAutoZoom = Infinity;
    var addMarkerAtLocation = function(locationData) {
        var itemCount = locationData.items.length;
        if (!bounds) {
            bounds = new OpenLayers.Bounds();
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
        
        var icon = Exhibit.OLMapView._makeIcon(
            shape, 
            color, 
            iconSize,
            itemCount == 1 ? "" : itemCount.toString(),
            icon,
            self._settings
        );
        var point = new OpenLayers.Geometry.Point(locationData.latlng.lng, locationData.latlng.lat).transform(self._projection, self._map.getProjectionObject());
	var layer = self._map.getLayersByClass("OpenLayers.Layer.Vector")[0];
	var marker = new OpenLayers.Feature.Vector(point, {locationData: locationData}, {
		"externalGraphic": icon.url,
		"graphicWidth": icon.size.w,
		"graphicHeight": icon.size.h,
		"graphicXOffset": icon.offset.x,
		"graphicYOffset": icon.offset.y,
		"fillColor": "white",
		"fillOpacity": 1.0,
		"strokeWidth": 0});
        var popup = new OpenLayers.Popup.FramedCloud(
                "markerPoup"+Math.floor(Math.random() * 10000),
                new OpenLayers.LonLat(locationData.latlng.lng, locationData.latlng.lat).transform(self._projection, self._map.getProjectionObject()),
		null,
                self._createInfoWindow(locationData.items).innerHTML,
                icon,
                true,
                function() {
                    SimileAjax.WindowManager.cancelPopups();
                    self._map.removePopup(this);
                });
	marker.popup = popup;
	popup.feature = marker;
	layer.addFeatures([marker]);

        if (maxAutoZoom > locationData.latlng.maxAutoZoom) {
            maxAutoZoom = locationData.latlng.maxAutoZoom;
        }
        bounds.extend(point);
        
        for (var x = 0; x < locationData.items.length; x++) {
            self._itemIDToMarker[locationData.items[x]] = marker;
        }
    }
    for (var latlngKey in locationToData) {
        addMarkerAtLocation(locationToData[latlngKey]);
    }
    if (hasColorKey) {
        var legendWidget = this._dom.legendWidget;
        var colorCoder = this._colorCoder;
        var keys = colorCodingFlags.keys.toArray().sort();
        if (settings.colorLegendLabel !== null) {
            legendWidget.addLegendLabel(settings.colorLegendLabel, 'color');
        }
        if (colorCoder._gradientPoints != null) {
            var legendGradientWidget = this._dom.legendWidget;
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
        if (colorCodingFlags.mixed) {
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

    if (bounds && settings.zoom == null) {
        if (maxAutoZoom > 12) maxAutoZoom = 12;
        var zoom = Math.max(0, self._map.getZoomForExtent(bounds) - 1);
        zoom = Math.min(zoom, maxAutoZoom);
        self._map.zoomTo(zoom);
    } else {
	self._map.zoomTo(settings.zoom);
    }

    if (bounds && settings.center == null) {
        self._map.setCenter(bounds.getCenterLonLat());
    }
};

Exhibit.OLMapView.prototype._plotPolygon = function(itemID, polygonString, color, makeLatLng) {
    var coords = this._parsePolygonOrPolyline(polygonString, makeLatLng);
    if (coords.length > 1) {
        var settings = this._settings;
        var borderColor = settings.borderColor != null ? settings.borderColor : color;
        var polygon = new OpenLayers.Geometry.LinearRing(coords).transform(this._projection, this._map.getProjectionObject());
	var polygonStyle = {
	    "strokeColor": borderColor,
	    "strokeWidth": settings.borderWidth,
	    "strokeOpacity": settings.borderOpacity,
	    "fillColor": color,
	    "fillOpacity": settings.opacity
	};
	var polygonFeature = new OpenLayers.Feature.Vector(polygon, null, polygonStyle);
        
        return this._addPolygonOrPolyline(itemID, polygonFeature);
    }
    return null;
};

Exhibit.OLMapView.prototype._plotPolyline = function(itemID, polylineString, color, makeLatLng) {
    var coords = this._parsePolygonOrPolyline(polylineString, makeLatLng);
    if (coords.length > 1) {
        var settings = this._settings;
        var borderColor = settings.borderColor != null ? settings.borderColor : color;
        var polyline = new OpenLayers.Geometry.LineString(coords).transform(this._projection, this._map.getProjectionObject());
	var polylineStyle = {
	    "strokeColor": borderColor,
	    "strokeWidth": settings.borderWidth,
	    "strokeOpacity": settings.borderOpacity
	};
	var polylineFeature = new OpenLayers.Feature.Vector(polyline, null, polylineStyle);

        return this._addPolygonOrPolyline(itemID, polylineFeature);
    }
    return null;
};

Exhibit.OLMapView.prototype._addPolygonOrPolyline = function(itemID, poly) {
    var vectors = this._map.getLayersByClass("OpenLayers.Layer.Vector");
    if (vectors.length > 0) {
	var vectorLayer = vectors[0];
	vectorLayer.addFeatures([poly]);
    } else {
	return null;
    }
    
    var self = this;
    var centroid = poly.geometry.getCentroid();
    var popup = new OpenLayers.Popup.FramedCloud(
        "vectorPopup"+Math.floor(Math.random() * 10000),
        new OpenLayers.LonLat(centroid.x, centroid.y),
        null,
        self._createInfoWindow([ itemID ]).innerHTML,
        null,
        true,
        function() {
            SimileAjax.WindowManager.cancelPopups();
            self._map.removePopup(this);
        });
    poly.popup = popup;
    popup.feature = poly;

    this._itemIDToMarker[itemID] = poly;
    
    return poly;
};

Exhibit.OLMapView.prototype._parsePolygonOrPolyline = function(s, makeLatLng) {
    var coords = [];
    
    var a = s.split(this._settings.latlngPairSeparator);
    for (var i = 0; i < a.length; i++) {
        var pair = a[i].split(",");
        coords.push(makeLatLng(parseFloat(pair[0]), parseFloat(pair[1])));
    }
    
    return coords;
};

Exhibit.OLMapView.prototype._onFeatureSelect = function(self, feature) {
    self._map.addPopup(feature.popup, true);
    if (self._selectListener != null) {
        self._selectListener.fire({ itemIDs: feature.attributes.locationData.items });
    }
};

Exhibit.OLMapView.prototype._onFeatureUnselect = function(self, feature) {
    SimileAjax.WindowManager.cancelPopups();
    self._map.removePopup(feature.popup);
};

Exhibit.OLMapView.prototype._select = function(selection) {
    var self = this;
    var itemID = selection.itemIDs[0];
    var marker = this._itemIDToMarker[itemID];
    if (marker) {
        self._map.addPopup(marker.popup, true);
    }
};

Exhibit.OLMapView.prototype._createInfoWindow = function(items) {
    var contextId = "context"+Math.random()*1000;
    var selfuic = this._uiContext;
    var selfdb = this._uiContext.getDatabase();
    var selfreg = this._uiContext.getLensRegistry();
    var olContext = {};
    olContext.getSetting = function(setting) {
	return selfuic.getSetting(setting);
    };
    olContext.getDatabase = function() {
	return selfdb;
    };
    olContext.getLensRegistry = function() {
	return selfreg;
    };
    olContext.isBeingEdited = function(a) {
	return false;
    };
    olContext.formatList = function(iterator, count, valueType, appender) {
	return selfuic.formatList(iterator, count, valueType, appender);
    };
    olContext.format = function(value, valueType, appender) {
        // assume this is the only thing being done with context,
	// and that the only thing be formmatted is items; currently
	// a safe assumption
	var f = new Exhibit.Formatter._ItemFormatter(olContext);
        f.format = function(v, a) {
	    var title = this.formatText(v);
	    Exhibit.OLMapView.contexts[contextId] = selfuic;
	    // it seems OpenLayers quashes events that are
	    // programatically registered?  sneaking it in as an
	    // attribute is the only thing that works, sadly.
	    // the contexts array is a hack to coordinate global
	    // variables with a randomly ID'd view context.
	    var anchor = SimileAjax.DOM.createElementFromString("<a href=\"" + Exhibit.Persistence.getItemLink(v) + "\" class='exhibit-item' onclick='Exhibit.UI.showItemInPopup(\""+v+"\", this, Exhibit.OLMapView.contexts[\""+contextId+"\"]); return false;'>" + title + "</a>");
	    a(anchor);
	};
        f.format(value, appender);
    };
    return Exhibit.ViewUtilities.fillBubbleWithItems(
        null, 
        items, 
        olContext
    );
};

Exhibit.OLMapView._iconData = null;
Exhibit.OLMapView._markerUrlPrefix = "http://service.simile-widgets.org/painter/painter?";
Exhibit.OLMapView._defaultMarkerShape = "circle";

Exhibit.OLMapView._makeIcon = function(shape, color, iconSize, label, iconURL, settings) {
    var extra = label.length * 3;
    var halfWidth = Math.ceil(settings.shapeWidth / 2) + extra;
    var bodyHeight = settings.shapeHeight;
    var width = halfWidth * 2;
    var height = bodyHeight;
    if (iconSize > 0) {
        width = iconSize;
        halfWidth = Math.ceil(iconSize / 2);
        height = iconSize;
        bodyHeight = iconSize;
        settings.pin = false;
    }   

    var icon = new Object();
    var imageParameters = [
        "renderer=map-marker",
        "shape=" + shape,
        "alpha=" + settings.shapeAlpha,
        "width=" + width,
        "height=" + bodyHeight,
        "background=" + color.substr(1),
        "label=" + label
    ];
    // no shadows for OL yet
    //var shadowParameters = [
    //    "renderer=map-marker-shadow",
    //    "shape=" + shape,
    //    "width=" + width,
    //    "height=" + bodyHeight
    //];
    var pinParameters = [];
    
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

    if (settings.pin) {
        var pinHeight = settings.pinHeight;
        var pinHalfWidth = Math.ceil(settings.pinWidth / 2);
        
        height += pinHeight;
        
        pinParameters.push("pinHeight=" + pinHeight);
        pinParameters.push("pinWidth=" + (pinHalfWidth * 2));
        
        icon.iconAnchor = new OpenLayers.Pixel(-halfWidth, -height);
        icon.imageMap = [ 
            0, 0, 
            0, bodyHeight, 
            halfWidth - pinHalfWidth, bodyHeight,
            halfWidth, height,
            halfWidth + pinHalfWidth, bodyHeight,
            width, bodyHeight,
            width, 0
        ];
        icon.shadowSize = new OpenLayers.Size(width * 1.5, height - 2);
        icon.infoWindowAnchor = (settings.bubbleTip == "bottom") ? new OpenLayers.Pixel(halfWidth, height) : new OpenLayers.Pixel(halfWidth, 0);
    } else {
        pinParameters.push("pin=false");
        
        icon.iconAnchor = new OpenLayers.Pixel(-halfWidth, -Math.ceil(height / 2));
        icon.imageMap = [ 
            0, 0, 
            0, bodyHeight, 
            width, bodyHeight,
            width, 0
        ];
        icon.infoWindowAnchor = new OpenLayers.Pixel(halfWidth, 0);
    }
    
    icon.image = Exhibit.OLMapView._markerUrlPrefix + imageParameters.concat(pinParameters).join("&") + "&.png";
    // if (iconSize == 0) { icon.shadow = Exhibit.OLMapView._markerUrlPrefix + shadowParameters.concat(pinParameters).join("&") + "&.png"; }
    icon.iconSize = new OpenLayers.Size(width, height);
    // icon.shadowSize = new OpenLayers.Size(width * 1.5, height - 2);

    var olicon = new OpenLayers.Icon(icon.image, icon.iconSize, icon.iconAnchor);

    return olicon;
};
