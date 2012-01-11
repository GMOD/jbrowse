/*==================================================
 *  Exhibit.ColorGradientCoder
 *==================================================
 */

Exhibit.ColorGradientCoder = function(uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    
    this._gradientPoints = [];
    this._mixedCase = { 
        label: Exhibit.Coders.l10n.mixedCaseLabel, 
        color: Exhibit.Coders.mixedCaseColor
    };
    this._missingCase = { 
        label: Exhibit.Coders.l10n.missingCaseLabel, 
        color: Exhibit.Coders.missingCaseColor 
    };
    this._othersCase = { 
        label: Exhibit.Coders.l10n.othersCaseLabel, 
        color: Exhibit.Coders.othersCaseColor 
    };
};

Exhibit.ColorGradientCoder._settingSpecs = {
};

Exhibit.ColorGradientCoder.create = function(configuration, uiContext) {
    var coder = new Exhibit.ColorGradientCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.ColorGradientCoder._configure(coder, configuration);
    return coder;
};

Exhibit.ColorGradientCoder.createFromDOM = function(configElmt, uiContext) {
    configElmt.style.display = "none";
    
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.ColorGradientCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ColorGradientCoder._settingSpecs, coder._settings);
    
    try {
		var gradientPoints = Exhibit.getAttribute(configElmt, "gradientPoints", ";")
		for (var i = 0; i < gradientPoints.length; i++) {
			var point = gradientPoints[i];
			var value = parseFloat(point);
			var colorIndex = point.indexOf("#") + 1;
			var red = parseInt(point.slice(colorIndex, colorIndex + 2), 16);
			var green = parseInt(point.slice(colorIndex + 2, colorIndex + 4), 16);
			var blue = parseInt(point.slice(colorIndex + 4), 16);
			coder._gradientPoints.push({ value: value, red: red, green: green, blue: blue });
		}
		
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(
                    Exhibit.getAttribute(node, "case"), 
                    node.firstChild.nodeValue.trim(), 
                    Exhibit.getAttribute(node, "color"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "ColorGradientCoder: Error processing configuration of coder");
    }
    
    Exhibit.ColorGradientCoder._configure(coder, configuration);
    return coder;
};

Exhibit.ColorGradientCoder._configure = function(coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ColorGradientCoder._settingSpecs, coder._settings);
    
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0; i < entries.length; i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].color);
        }
    }
}

Exhibit.ColorGradientCoder.prototype.dispose = function() {
    this._uiContext = null;
    this._settings = null;
};

Exhibit.ColorGradientCoder.prototype._addEntry = function(kase, key, color) {
    var entry = null;
    switch (kase) {
    case "others":  entry = this._othersCase; break;
    case "mixed":   entry = this._mixedCase; break;
    case "missing": entry = this._missingCase; break;
    }
    if (entry != null) {
        entry.label = key;
        entry.color = color;
	}
};

Exhibit.ColorGradientCoder.prototype.translate = function(key, flags) {
	var gradientPoints = this._gradientPoints;
	var getColor = function(key) {
		for (var j = 0; j < gradientPoints.length; j++) {
			if (key == gradientPoints[j].value) {
				return rgbToHex(gradientPoints[j].red, gradientPoints[j].green, gradientPoints[j].blue);
			} else if (gradientPoints[j+1] != null) {
				if (key < gradientPoints[j+1].value) {
					var fraction = (key - gradientPoints[j].value)/(gradientPoints[j+1].value - gradientPoints[j].value);
					var newRed = Math.floor(gradientPoints[j].red + fraction*(gradientPoints[j+1].red - gradientPoints[j].red));
					var newGreen = Math.floor(gradientPoints[j].green + fraction*(gradientPoints[j+1].green - gradientPoints[j].green));
					var newBlue = Math.floor(gradientPoints[j].blue + fraction*(gradientPoints[j+1].blue - gradientPoints[j].blue));
					return rgbToHex(newRed, newGreen, newBlue)
				}
			}
		}
	}

	var rgbToHex = function(r, g, b) {
		var decToHex = function(n) {
		    if (n == 0) {return "00"}
		    else if (n < 16) {return "0"+n.toString(16)}
		    else {return n.toString(16)}
		}
		return "#" + decToHex(r) + decToHex(g) + decToHex(b);
	}
	
    if (key.constructor != Number) {
	key = parseFloat(key);
    }
    if (key >= gradientPoints[0].value & key <= gradientPoints[gradientPoints.length-1].value) {
        if (flags) flags.keys.add(key);
        return getColor(key);
    } else if (key == null) {
        if (flags) flags.missing = true;
        return this._missingCase.color;
    } else {
        if (flags) flags.others = true;
        return this._othersCase.color;
    }
};

Exhibit.ColorGradientCoder.prototype.translateSet = function(keys, flags) {
    var color = null;
    var self = this;
    keys.visit(function(key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
        } else if (color != color2) {
            if (flags) flags.mixed = true;
            color = self._mixedCase.color;
            return true;
        }
        return false;
    });
    
    if (color != null) {
        return color;
    } else {
        if (flags) flags.missing = true;
        return this._missingCase.color;
    }
};

Exhibit.ColorGradientCoder.prototype.getOthersLabel = function() {
    return this._othersCase.label;
};
Exhibit.ColorGradientCoder.prototype.getOthersColor = function() {
    return this._othersCase.color;
};

Exhibit.ColorGradientCoder.prototype.getMissingLabel = function() {
    return this._missingCase.label;
};
Exhibit.ColorGradientCoder.prototype.getMissingColor = function() {
    return this._missingCase.color;
};

Exhibit.ColorGradientCoder.prototype.getMixedLabel = function() {
    return this._mixedCase.label;
};
Exhibit.ColorGradientCoder.prototype.getMixedColor = function() {
    return this._mixedCase.color;
};
