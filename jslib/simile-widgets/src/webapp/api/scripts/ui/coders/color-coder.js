/*==================================================
 *  Exhibit.ColorCoder
 *==================================================
 */

Exhibit.ColorCoder = function(uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    
    this._map = {};
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

Exhibit.ColorCoder._settingSpecs = {
};

Exhibit.ColorCoder.create = function(configuration, uiContext) {
    var coder = new Exhibit.ColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.ColorCoder._configure(coder, configuration);
    return coder;
};

Exhibit.ColorCoder.createFromDOM = function(configElmt, uiContext) {
    configElmt.style.display = "none";
    
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.ColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.ColorCoder._settingSpecs, coder._settings);
    
    try {
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
        SimileAjax.Debug.exception(e, "ColorCoder: Error processing configuration of coder");
    }
    
    Exhibit.ColorCoder._configure(coder, configuration);
    return coder;
};

Exhibit.ColorCoder._configure = function(coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.ColorCoder._settingSpecs, coder._settings);
    
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0; i < entries.length; i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].color);
        }
    }
}

Exhibit.ColorCoder.prototype.dispose = function() {
    this._uiContext = null;
    this._settings = null;
};

Exhibit.ColorCoder._colorTable = {
    "red" :     "#ff0000",
    "green" :   "#00ff00",
    "blue" :    "#0000ff",
    "white" :   "#ffffff",
    "black" :   "#000000",
    "gray" :    "#888888"
};

Exhibit.ColorCoder.prototype._addEntry = function(kase, key, color) {
    if (color in Exhibit.ColorCoder._colorTable) {
        color = Exhibit.ColorCoder._colorTable[color];
    }
    
    var entry = null;
    switch (kase) {
    case "others":  entry = this._othersCase; break;
    case "mixed":   entry = this._mixedCase; break;
    case "missing": entry = this._missingCase; break;
    }
    if (entry != null) {
        entry.label = key;
        entry.color = color;
    } else {
        this._map[key] = { color: color };
    }
};

Exhibit.ColorCoder.prototype.translate = function(key, flags) {
    if (key in this._map) {
        if (flags) flags.keys.add(key);
        return this._map[key].color;
    } else if (key == null) {
        if (flags) flags.missing = true;
        return this._missingCase.color;
    } else {
        if (flags) flags.others = true;
        return this._othersCase.color;
    }
};

Exhibit.ColorCoder.prototype.translateSet = function(keys, flags) {
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

Exhibit.ColorCoder.prototype.getOthersLabel = function() {
    return this._othersCase.label;
};
Exhibit.ColorCoder.prototype.getOthersColor = function() {
    return this._othersCase.color;
};

Exhibit.ColorCoder.prototype.getMissingLabel = function() {
    return this._missingCase.label;
};
Exhibit.ColorCoder.prototype.getMissingColor = function() {
    return this._missingCase.color;
};

Exhibit.ColorCoder.prototype.getMixedLabel = function() {
    return this._mixedCase.label;
};
Exhibit.ColorCoder.prototype.getMixedColor = function() {
    return this._mixedCase.color;
};
