/*==================================================
 *  Exhibit.Functions
 *  http://simile.mit.edu/wiki/Exhibit/API/Functions
 *==================================================
 */
Exhibit.Functions = {};

Exhibit.FunctionUtilities = {};
Exhibit.FunctionUtilities.registerSimpleMappingFunction = function(name, f, valueType) {
    Exhibit.Functions[name] = {
        f: function(args) {
            var set = new Exhibit.Set();
            for (var i = 0; i < args.length; i++) {
                args[i].forEachValue(function(v) {
                    var v2 = f(v);
                    if (v2 != undefined) {
                        set.add(v2);
                    }
                });
            }
            return new Exhibit.Expression._Collection(set, valueType);
        }
    };
};

Exhibit.Functions["union"] = {
    f: function(args) {
        var set = new Exhibit.Set();
        var valueType = null;
        
        if (args.length > 0) {
            var valueType = args[0].valueType;
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg.size > 0) {
                    if (valueType == null) {
                        valueType = arg.valueType;
                    }
                    set.addSet(arg.getSet());
                }
            }
        }
        return new Exhibit.Expression._Collection(set, valueType != null ? valueType : "text");
    }
};

Exhibit.Functions["contains"] = {
    f: function(args) {
        var result = args[0].size > 0;
        var set = args[0].getSet();
        
        args[1].forEachValue(function(v) {
            if (!set.contains(v)) {
                result = false;
                return true;
            }
        });
        
        return new Exhibit.Expression._Collection([ result ], "boolean");
    }
};

Exhibit.Functions["exists"] = {
    f: function(args) {
        return new Exhibit.Expression._Collection([ args[0].size > 0 ], "boolean");
    }
};

Exhibit.Functions["count"] = {
    f: function(args) {
        return new Exhibit.Expression._Collection([ args[0].size ], "number");
    }
};

Exhibit.Functions["not"] = {
    f: function(args) {
        return new Exhibit.Expression._Collection([ !args[0].contains(true) ], "boolean");
    }
};

Exhibit.Functions["and"] = {
    f: function(args) {
        var r = true;
        for (var i = 0; r && i < args.length; i++) {
            r = r && args[i].contains(true);
        }
        return new Exhibit.Expression._Collection([ r ], "boolean");
    }
};

Exhibit.Functions["or"] = {
    f: function(args) {
        var r = false;
        for (var i = 0; !r && i < args.length; i++) {
            r = r || args[i].contains(true);
        }
        return new Exhibit.Expression._Collection([ r ], "boolean");
    }
};

Exhibit.Functions["add"] = {
    f: function(args) {
        var total = 0;
        for (var i = 0; i < args.length; i++) {
            args[i].forEachValue(function(v) {
                if (v != null) {
                    if (typeof v == "number") {
                        total += v;
                    } else {
                        var n = parseFloat(v);
                        if (!isNaN(n)) {
                            total += n;
                        }
                    }
                }
            });
        }
        
        return new Exhibit.Expression._Collection([ total ], "number");
    }
};

// Note: arguments expanding to multiple items get concatenated in random order
Exhibit.Functions["concat"] = {
    f: function(args) {
        var result = [];
        for (var i = 0; i < args.length; i++) {
            args[i].forEachValue(function(v) {
                if (v != null) {
                    result.push(v);
                }
            });
        }

        return new Exhibit.Expression._Collection([ result.join('') ], "text");
    }
};

Exhibit.Functions["multiply"] = {
    f: function(args) {
        var product = 1;
        for (var i = 0; i < args.length; i++) {
            args[i].forEachValue(function(v) {
                if (v != null) {
                    if (typeof v == "number") {
                        product *= v;
                    } else {
                        var n = parseFloat(v);
                        if (!isNaN(n)) {
                            product *= n;
                        }
                    }
                }
            });
        }
        
        return new Exhibit.Expression._Collection([ product ], "number");
    }
};

Exhibit.Functions["date-range"] = {
    _parseDate: function (v) {
        if (v == null) {
            return Number.NEGATIVE_INFINITY;
        } else if (v instanceof Date) {
            return v.getTime();
        } else {
            try {
                return SimileAjax.DateTime.parseIso8601DateTime(v).getTime();
            } catch (e) {
                return Number.NEGATIVE_INFINITY;
            }
        }
    },
    _factors: {
        second:     1000,
        minute:     60 * 1000,
        hour:       60 * 60 * 1000,
        day:        24 * 60 * 60 * 1000,
        week:       7 * 24 * 60 * 60 * 1000,
        month:      30 * 24 * 60 * 60 * 1000,
        quarter:    3 * 30 * 24 * 60 * 60 * 1000,
        year:       365 * 24 * 60 * 60 * 1000,
        decade:     10 * 365 * 24 * 60 * 60 * 1000,
        century:    100 * 365 * 24 * 60 * 60 * 1000
    },
    _computeRange: function(from, to, interval) {
        var range = to - from;
        if (isFinite(range)) {
            if (interval in this._factors) {
                range = Math.round(range / this._factors[interval]);
            }
            return range;
        }
        return null;
    },
    f: function(args) {
        var self = this;
        
        var from = Number.POSITIVE_INFINITY;
        args[0].forEachValue(function(v) {
            from = Math.min(from, self._parseDate(v));
        });
        
        var to = Number.NEGATIVE_INFINITY;
        args[1].forEachValue(function(v) {
            to = Math.max(to, self._parseDate(v));
        });
        
        var interval = "day";
        args[2].forEachValue(function(v) {
            interval = v;
        });
            
        var range = this._computeRange(from, to, interval);
        return new Exhibit.Expression._Collection(range != null ? [ range ] : [], "number");
    }
};

Exhibit.Functions["distance"] = {
    _units: {
        km:         1e3,
        mile:       1609.344
    },
    _computeDistance: function(from, to, unit, roundTo) {
        var range = from.distanceFrom(to);
        if (!roundTo) roundTo = 1;
        if (isFinite(range)) {
            if (this._units.hasOwnProperty(unit)) {
                range = range / this._units[unit];
            }
            return Exhibit.Util.round(range, roundTo);
        }
        return null;
    },
    f: function(args) {
        var self = this;
        var data = {};
        var name = ["origo", "lat", "lng", "unit", "round"];
        for (var i = 0, n; n = name[i]; i++) {
            args[i].forEachValue(function(v) { data[n] = v; });
        }

        var latlng = data.origo.split(",");
        var from = new GLatLng( latlng[0], latlng[1] );
        var to = new GLatLng( data.lat, data.lng );
        
        var range = this._computeDistance(from, to, data.unit, data.round);
        return new Exhibit.Expression._Collection(range != null ? [ range ] : [], "number");
    }
};

Exhibit.Functions["min"] = {
    f: function(args) {
        var returnMe = function (val) { return val; };
        var min = Number.POSITIVE_INFINITY;
        var valueType = null;
        
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            var currentValueType = arg.valueType ? arg.valueType : 'text';
            var parser = Exhibit.SettingsUtilities._typeToParser(currentValueType);
                
            arg.forEachValue(function(v) {
                parsedV = parser(v, returnMe);
                if (parsedV < min || min == Number.POSITIVE_INFINITY) {
                    min = parsedV;
                    valueType = (valueType == null) ? currentValueType : 
                        (valueType == currentValueType ? valueType : "text") ;
                }
            });
        }
        
        return new Exhibit.Expression._Collection([ min ], valueType != null ? valueType : "text");
    }
};

Exhibit.Functions["max"] = {
    f: function(args) {
        var returnMe = function (val) { return val; };
        var max = Number.NEGATIVE_INFINITY;
        var valueType = null;
        
        for (var i = 0; i < args.length; i++) {
            var arg = args[i];
            var currentValueType = arg.valueType ? arg.valueType : 'text';
            var parser = Exhibit.SettingsUtilities._typeToParser(currentValueType);
            
            arg.forEachValue(function(v) {
                parsedV = parser(v, returnMe);
                if (parsedV > max || max == Number.NEGATIVE_INFINITY) {
                    max = parsedV;
                    valueType = (valueType == null) ? currentValueType : 
                        (valueType == currentValueType ? valueType : "text") ;
               }
            });
        }
        return new Exhibit.Expression._Collection([ max ],  valueType != null ? valueType : "text");
    }
};

Exhibit.Functions["remove"] = {
    f: function(args) {
        var set = args[0].getSet();
        var valueType = args[0].valueType;
        for (var i = 1; i < args.length; i++) {
            var arg = args[i];
            if (arg.size > 0) {
                set.removeSet(arg.getSet());
            }
        }
        return new Exhibit.Expression._Collection(set, valueType);
    }
};

Exhibit.Functions["now"] = {
    f: function(args) {
        return new Exhibit.Expression._Collection([ new Date() ], "date");
    }
};
