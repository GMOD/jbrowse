/*==================================================
 *  Exhibit.OrderedColorCoder
 *  Reads the color coder entries as if they were
 *  in order.  Eliminates the mixed case and uses
 *  either the highest or lowest 'color' in any set.
 *  Note the 'other' and 'missing' cases will be
 *  included in the ordering.  If they are not
 *  included in the coder definition, they will be
 *  added as the lowest priority, other, then
 *  missing.
 *==================================================
 */

Exhibit.OrderedColorCoder = function(uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    
    this._map = {};
    this._order = new Exhibit.OrderedColorCoder._OrderedHash();
    this._usePriority = "highest";
    this._mixedCase = { 
        label: null,
        color: null,
	isDefault: true
    };
    this._missingCase = { 
        label: Exhibit.Coders.l10n.missingCaseLabel, 
        color: Exhibit.Coders.missingCaseColor,
	isDefault: true
    };
    this._othersCase = { 
        label: Exhibit.Coders.l10n.othersCaseLabel, 
        color: Exhibit.Coders.othersCaseColor,
	isDefault: true
    };
};

Exhibit.OrderedColorCoder._OrderedHash = function() {
    this.size = 0;
    this.hash = {};
}
Exhibit.OrderedColorCoder._OrderedHash.prototype.add = function(key) {
    this.hash[key] = this.size++;
}
Exhibit.OrderedColorCoder._OrderedHash.prototype.size = function() {
    return this.size;
}
Exhibit.OrderedColorCoder._OrderedHash.prototype.get = function(key) {
    return this.hash[key];
}

Exhibit.OrderedColorCoder._settingSpecs = {
};

Exhibit.OrderedColorCoder.create = function(configuration, uiContext) {
    var coder = new Exhibit.OrderedColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.OrderedColorCoder._configure(coder, configuration);
    return coder;
};

Exhibit.OrderedColorCoder.createFromDOM = function(configElmt, uiContext) {
    configElmt.style.display = "none";
    
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.OrderedColorCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.OrderedColorCoder._settingSpecs, coder._settings);
    
    try {
	this._usePriority = coder._settings.usePriority;
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
	if (coder.getOthersIsDefault()) {
	    coder._addEntry(
		    "other",
		    coder.getOthersLabel(),
		    coder.getOthersColor());
	}
	if (coder.getMissingIsDefault()) {
	    coder._addEntry(
		    "missing",
		    coder.getMissingLabel(),
		    coder.getMissingColor());
	}
    } catch (e) {
        SimileAjax.Debug.exception(e, "OrderedColorCoder: Error processing configuration of coder");
    }
    
    Exhibit.OrderedColorCoder._configure(coder, configuration);
    return coder;
};

Exhibit.OrderedColorCoder._configure = function(coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.OrderedColorCoder._settingSpecs, coder._settings);
    
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0; i < entries.length; i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].color);
        }
	if (this.getOthersIsDefault()) {
	    coder._addEntry(
		    "other",
		    this.getOthersLabel(),
		    this.getOthersColor());
	}
	if (this.getMissingIsDefault()) {
	    coder._addEntry(
		    "missing",
		    this.getMissingLabel(),
		    this.getMissingColor());
	}
    }
}

Exhibit.OrderedColorCoder.prototype.dispose = function() {
    this._uiContext = null;
    this._settings = null;
};

Exhibit.OrderedColorCoder._colorTable = {
    "red" :     "#ff0000",
    "green" :   "#00ff00",
    "blue" :    "#0000ff",
    "white" :   "#ffffff",
    "black" :   "#000000",
    "gray" :    "#888888"
};

Exhibit.OrderedColorCoder.prototype._addEntry = function(kase, key, color) {
    if (color in Exhibit.OrderedColorCoder._colorTable) {
        color = Exhibit.OrderedColorCoder._colorTable[color];
    }
    
    var entry = null;
    var mixed = false;
    switch (kase) {
    case "others":  entry = this._othersCase; break;
    case "missing": entry = this._missingCase; break;
    case "mixed": mixed = true; break;
    }
    if (entry != null) {
        entry.label = key;
        entry.color = color;
	entry.isDefault = false;
	this._order.add(key);
    } else {
	// the 'mixed' case will be entirely ignored
        if (!mixed) {
            this._map[key] = { color: color };
	    this._order.add(key);
	}
    }
};

Exhibit.OrderedColorCoder.prototype.translate = function(key, flags) {
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

Exhibit.OrderedColorCoder.prototype.translateSet = function(keys, flags) {
    var color = null;
    var lastKey = null;
    var self = this;
    keys.visit(function(key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
	    lastKey = key;
        } else if (color != color2) {
	    if (key == null) {
	        key = self.getMissingLabel();
	    } else if (!(key in self._map)) {
	        key = self.getOthersLabel();
	    }
	    var keyOrder = self._order.get(key);
	    var lastKeyOrder = self._order.get(lastKey);
	    if (self._usePriority == "highest") {
		if (keyOrder < lastKeyOrder) {
		    color = color2;
		    lastKey = key;
		}
	    } else if (self._usePriority == "lowest") {
		if (keyOrder > lastKeyOrder) {
		    color = color2;
		    lastKey = key;
		}
	    } else {
		// an incorrect setting value will cause problems
		return false;
	    }
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

Exhibit.OrderedColorCoder.prototype.getOthersLabel = function() {
    return this._othersCase.label;
};
Exhibit.OrderedColorCoder.prototype.getOthersColor = function() {
    return this._othersCase.color;
};
Exhibit.OrderedColorCoder.prototype.getOthersIsDefault = function() {
    return this._othersCase.isDefault;
};

Exhibit.OrderedColorCoder.prototype.getMissingLabel = function() {
    return this._missingCase.label;
};
Exhibit.OrderedColorCoder.prototype.getMissingColor = function() {
    return this._missingCase.color;
};
Exhibit.OrderedColorCoder.prototype.getMissingIsDefault = function() {
    return this._missingCase.isDefault;
};

Exhibit.OrderedColorCoder.prototype.getMixedLabel = function() {
    return this._mixedCase.label;
};
Exhibit.OrderedColorCoder.prototype.getMixedColor = function() {
    return this._mixedCase.color;
};
Exhibit.OrderedColorCoder.prototype.getMixedIsDefault = function() {
    return this._mixedCase.isDefault;
};
