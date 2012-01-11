/*==================================================
 *  Exhibit.VEMapView
 *==================================================
 */
 

/**
 * @constructor
 */
Exhibit.VEMapView = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;

    this._settings = {};
    this._accessors = {
        getProxy: function(itemID, database, visitor) { visitor(itemID); },
        getColorKey: null,
        getIcon:     null 
    };
    this._colorCoder = null;
    
    var view = this;
    this._listener = { 
        onItemsChanged: function() {
            view._reconstruct(); 
        }
    };
    uiContext.getCollection().addListener(this._listener);
};

Exhibit.VEMapView._id = 1;
Exhibit.VEMapView._settingSpecs = {
    "center":           { type: "float",    defaultValue: [20,0],   dimensions: 2 },
    "zoom":             { type: "float",    defaultValue: 2         },
    "size":             { type: "text",     defaultValue: "small"   },
    "scaleControl":     { type: "boolean",  defaultValue: true      },
    "overviewControl":  { type: "boolean",  defaultValue: false     },
    "type":             { type: "enum",     defaultValue: "normal", choices: [ "normal", "satellite", "hybrid" ] },
    "bubbleTip":        { type: "enum",     defaultValue: "top",    choices: [ "top", "bottom" ] },
    "mapHeight":        { type: "int",      defaultValue: 400       },
    "mapConstructor":   { type: "function", defaultValue: null      },
    "color":            { type: "text",     defaultValue: "#FF9000" },
    "colorCoder":       { type: "text",     defaultValue: null      },
    "iconScale":        { type: "float",    defaultValue: 1         }, 
    "iconOffsetX":      { type: "float",    defaultValue: 0         }, 
    "iconOffsetY":      { type: "float",    defaultValue: 0         }, 
    "shape":            { type: "text",     defaultValue: "circle"  }, 
    "bodyWidth":        { type: "int",      defaultValue: 24        }, 
    "bodyHeight":       { type: "int",      defaultValue: 24        }, 
    "pin":              { type: "boolean",  defaultValue: true      }, 
    "pinHeight":        { type: "int",      defaultValue: 6         }, 
    "pinWidth":         { type: "int",      defaultValue: 6         } 
};

Exhibit.VEMapView._accessorSpecs = [
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
    {   accessorName:   "getColorKey",
        attributeName:  "marker", // backward compatibility
        type:           "text"
    },
    {   accessorName:   "getColorKey",
        attributeName:  "colorKey",
        type:           "text"
    },
    {   accessorName : "getIcon",
        attributeName:  "icon", 
        type:           "url"
     }
];

Exhibit.VEMapView.create = function(configuration, containerElmt, uiContext) {
    var view = new Exhibit.VEMapView(
        containerElmt,
        Exhibit.UIContext.create(configuration, uiContext)
    );  
    Exhibit.VEMapView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.VEMapView.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var view = new Exhibit.VEMapView(
        containerElmt != null ? containerElmt : configElmt, 
        Exhibit.UIContext.createFromDOM(configElmt, uiContext)
    );   
    
    Exhibit.SettingsUtilities.createAccessorsFromDOM(configElmt, Exhibit.VEMapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.VEMapView._settingSpecs, view._settings);
    Exhibit.VEMapView._configure(view, configuration);
    
    view._internalValidate();
    view._initializeUI();
    return view;
};

Exhibit.VEMapView._configure = function(view, configuration) {
    Exhibit.SettingsUtilities.createAccessors(configuration, Exhibit.VEMapView._accessorSpecs, view._accessors);
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.VEMapView._settingSpecs, view._settings);
    
    var accessors = view._accessors;
    view._getLatlng = function(itemID, database, visitor) {
        accessors.getProxy(itemID, database, function(proxy) {
            accessors.getLatlng(proxy, database, visitor);
        });
    };
};

Exhibit.VEMapView.prototype.dispose = function() {
    this._uiContext.getCollection().removeListener(this._listener);
    
    this._map = null;
    
    this._toolboxWidget.dispose();
    this._toolboxWidget = null;
    
    this._dom.dispose();
    this._dom = null;
    
    this._uiContext.dispose();
    this._uiContext = null;
    
    this._div.innerHTML = "";
    this._div = null;
    
    //change for VE? GUnload();
};

Exhibit.VEMapView.prototype._internalValidate = function() {
    if ("getColorKey" in this._accessors) {
        if ("colorCoder" in this._settings) {
            this._colorCoder = this._uiContext.getExhibit().getComponent(this._settings.colorCoder);
        }
        
        if (this._colorCoder == null) {
            this._colorCoder = new Exhibit.DefaultColorCoder(this._uiContext);
        }
    }
};

Exhibit.VEMapView.prototype._initializeUI = function() {
    var self = this;
    var settings = this._settings;
    var legendWidgetSettings="_gradientPoints" in this._colorCoder ? "gradient" :
        {markerGenerator:function(color){
            var shape="square";
            return SimileAjax.Graphics.createTranslucentImage(
            Exhibit.MapView._markerUrlPrefix+
            "?renderer=map-marker&shape="+Exhibit.MapView._defaultMarkerShape+
            "&width=20&height=20&pinHeight=0&background="+color.substr(1),
            "middle"
            );
            }
        };
    
    this._div.innerHTML = "";
    this._dom = Exhibit.ViewUtilities.constructPlottingViewDom(
        this._div, 
        this._uiContext, 
        true, // showSummary
        {}, // resizableDivWidgetSettings 
        legendWidgetSettings
    );    
    this._toolboxWidget = Exhibit.ToolboxWidget.createFromDOM(this._div, this._div, this._uiContext);
    
    var mapDiv = this._dom.plotContainer;
    mapDiv.style.height = settings.mapHeight + "px";
    mapDiv.className = "exhibit-mapView-map";
    mapDiv.style.position = "relative";
    mapDiv.id = "map-" + Exhibit.VEMapView._id++;  // VEMap takes a string ID
    
    var settings = this._settings;
    if (settings._mapConstructor != null) {
        this._map = settings._mapConstructor(mapDiv);
    } 
    else {
        this._map = new VEMap(mapDiv.id);
        this._map.LoadMap(new VELatLong(settings.center[0], settings.center[1]), settings.zoom);
    }
    this._reconstruct();
};

Exhibit.VEMapView.prototype._reconstruct = function() {
    var self = this;
    var collection = this._uiContext.getCollection();
    var database = this._uiContext.getDatabase();
    var settings = this._settings;
    var accessors = this._accessors;
    var originalSize = collection.countAllItems();
    var currentSize = collection.countRestrictedItems();
    var unplottableItems = [];
    
    this._map.DeleteAllShapeLayers();
    this._dom.legendWidget.clear();

    if (currentSize > 0) {
        var currentSet = collection.getRestrictedItems();
        var locationToData = {};
        var hasColorKey = (this._accessors.getColorKey != null);
        var hasIcon = (this._accessors.getIcon != null); 
        
        currentSet.visit(function(itemID) {
            var latlngs = [];
            self._getLatlng(itemID, database, function(v) { 
                if (v != null && "lat" in v && "lng" in v) latlngs.push(v); 
                }
            );
            
            if (latlngs.length > 0) {
                var colorKeys = null;
                if (hasColorKey) {
                    colorKeys = new Exhibit.Set();
                    accessors.getColorKey(itemID, database, function(v) { colorKeys.add(v); });
                }
                
                // collecting lat/long data
                for (var n = 0; n < latlngs.length; n++) {
                    var latlng = latlngs[n];
                    var latlngKey = latlng.lat + "," + latlng.lng;
                    if (latlngKey in locationToData) {
                        var locationData = locationToData[latlngKey];
                        locationData.items.push(itemID);
                        if (hasColorKey) {
                            locationData.colorKeys.addSet(colorKeys);
                        }
                    } else {
                        var locationData = {
                            latlng:     latlng,
                            items:      [ itemID ]
                        };
                        if (hasColorKey) {
                            locationData.colorKeys = colorKeys;
                        }
                        locationToData[latlngKey] = locationData;
                    }
                }
            } else {
                unplottableItems.push(itemID);
            }
        });
        
        var colorCodingFlags = { mixed: false, missing: false, others: false, keys: new Exhibit.Set() };
        var bounds, maxAutoZoom = Infinity;
        var addMarkerAtLocation = function(locationData) {
            var itemCount = locationData.items.length;    
            var shape = self._settings.shape;
            var color = self._settings.color;
            if (hasColorKey) {
                color = self._colorCoder.translateSet(locationData.colorKeys, colorCodingFlags);
            } 
     
            var icon = null;  
            if (itemCount == 1) { 
               if (hasIcon) { 
                  accessors.getIcon(locationData.items[0], database, function(v) { icon = v; }); 
                 }
            }
            
            var icon = Exhibit.VEMapView._makeIcon(
                shape, 
                color, 
                itemCount == 1 ? "" : itemCount.toString(),
                icon, 
                self._settings
            );

            var layer = new VEShapeLayer();
            var point = new VELatLong(locationData.latlng.lat, locationData.latlng.lng);
            var marker = new VEShape(VEShapeType.Pushpin, point);
            var title = locationData.items[0];
            var description = self._createDescription(locationData.items);
            
            marker.SetCustomIcon(icon); 
            marker.SetTitle(title);
            marker.SetDescription(description); 
            marker.SetIconAnchor(point); // anchor for info box
            
            self._map.AddShapeLayer(layer);
            layer.AddShape(marker);
        }
        for (var latlngKey in locationToData) {
            addMarkerAtLocation(locationToData[latlngKey]);
        }
        
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

/**
 * Makes the html that fills the info box associated with a marker.
 * @returns HTML String
 */
Exhibit.VEMapView.prototype._createDescription = function(items) {
    var bubbleElmt = Exhibit.ViewUtilities.fillBubbleWithItems(
        null, 
        items, 
        this._uiContext
    );
    var newElmt = document.createElement("div");
    newElmt.appendChild(bubbleElmt);
    
    return newElmt.innerHTML;
};

Exhibit.VEMapView._iconData = null;
Exhibit.VEMapView._markerUrlPrefix = "http://simile.mit.edu/painter/painter?";
Exhibit.VEMapView._defaultMarkerShape = "circle";

/**
 * Creates icon specifation that will determine appearance of marker.
 * @returns VECustomIconSpecification
 */
Exhibit.VEMapView._makeIcon = function(shape, color, label, iconURL, settings) {
    var extra = label.length * 3;
    var halfWidth = Math.ceil(settings.bodyWidth / 2) + extra; 
    var bodyHeight = settings.bodyHeight;
    var width = halfWidth * 2;
    var height = bodyHeight;
    
    var icon = new VECustomIconSpecification

    var imageParameters = [
        "renderer=map-marker",
        "shape=" + shape,
        "width=" + width,
        "height=" + bodyHeight,
        "background=" + color.substr(1),
        "label=" + label
    ];
    
    var pinParameters = [];

    if (iconURL != null) {
        imageParameters.push("icon=" + iconURL);
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
        var pinHalfWidth = Math.ceil(settings.pinWidth / 4);
        
        height += pinHeight;
        
        pinParameters.push("pinHeight=" + pinHeight);
        pinParameters.push("pinWidth=" + (pinHalfWidth * 2));

        /*
         * There's an inconsistency here. This will offset some icons correctly,
         * but not others of different sizes.
         * This error seems to occur when there is an image inside the bubble. We think 
         * that the marker is being plotted based on the upper left corner of the image,
         * unrelated to the png painter image.
         */
        //icon.ImageOffset = new VEPixel(pinHalfWidth, -(height / 2));
    } else {
        pinParameters.push("pin=false");
    }

    icon.TextContent = " " // this makes ImageOffset work (VE bug!)
    icon.Image = Exhibit.MapView._markerUrlPrefix + imageParameters.concat(pinParameters).join("&");
    icon.ImageHeight = height;
    icon.ImageWidth = width;

    // icon shadows with VE?
    
    return icon

};
