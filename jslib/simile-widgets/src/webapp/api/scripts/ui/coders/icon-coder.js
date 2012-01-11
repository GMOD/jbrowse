/*==================================================
 *  Exhibit.IconCoder
 *==================================================
 */

Exhibit.IconCoder = function(uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    
    this._map = {};
    this._mixedCase = { label: "mixed", icon: null };
    this._missingCase = { label: "missing", icon: null };
    this._othersCase = { label: "others", icon: null };
};

Exhibit.IconCoder._settingSpecs = {
};

Exhibit.IconCoder.create = function(configuration, uiContext) {
    var coder = new Exhibit.IconCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.IconCoder._configure(coder, configuration);
    return coder;
};

Exhibit.IconCoder.createFromDOM = function(configElmt, uiContext) {
    configElmt.style.display = "none";
    
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.IconCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.IconCoder._settingSpecs, coder._settings);
    
    try {
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(
                    Exhibit.getAttribute(node, "case"), 
                    node.firstChild.nodeValue.trim(), 
                    Exhibit.getAttribute(node, "icon"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "IconCoder: Error processing configuration of coder");
    }
    
    Exhibit.IconCoder._configure(coder, configuration);
    return coder;
};

Exhibit.IconCoder._configure = function(coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.IconCoder._settingSpecs, coder._settings);
    
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0; i < entries.length; i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].icon);
        }
    }
}

Exhibit.IconCoder.prototype.dispose = function() {
    this._uiContext = null;
    this._settings = null;
};

Exhibit.IconCoder._iconTable = {
    // add built-in icons?
};

Exhibit.IconCoder.prototype._addEntry = function(kase, key, icon) {
    // used if there are built-in icons
    if (icon in Exhibit.IconCoder._iconTable) {
        icon = Exhibit.IconCoder._iconTable[icon];
    }
    
    var entry = null;
    switch (kase) {
    case "others":  entry = this._othersCase; break;
    case "mixed":   entry = this._mixedCase; break;
    case "missing": entry = this._missingCase; break;
    }
    if (entry != null) {
        entry.label = key;
        entry.icon = icon;
    } else {
        this._map[key] = { icon: icon };
    }
};

Exhibit.IconCoder.prototype.translate = function(key, flags) {
    if (key in this._map) {
        if (flags) flags.keys.add(key);
        return this._map[key].icon;
    } else if (key == null) {
        if (flags) flags.missing = true;
        return this._missingCase.icon;
    } else {
        if (flags) flags.others = true;
        return this._othersCase.icon;
    }
};

Exhibit.IconCoder.prototype.translateSet = function(keys, flags) {
    var icon = null;
    var self = this;
    keys.visit(function(key) {
        var icon2 = self.translate(key, flags);
        if (icon == null) {
            icon = icon2;
        } else if (icon != icon2) {
            if (flags) flags.mixed = true;
            icon = self._mixedCase.icon;
            return true;
        }
        return false;
    });
    
    if (icon != null) {
        return icon;
    } else {
        if (flags) flags.missing = true;
        return this._missingCase.icon;
    }
};

Exhibit.IconCoder.prototype.getOthersLabel = function() {
    return this._othersCase.label;
};
Exhibit.IconCoder.prototype.getOthersIcon = function() {
    return this._othersCase.icon;
};

Exhibit.IconCoder.prototype.getMissingLabel = function() {
    return this._missingCase.label;
};
Exhibit.IconCoder.prototype.getMissingIcon = function() {
    return this._missingCase.icon;
};

Exhibit.IconCoder.prototype.getMixedLabel = function() {
    return this._mixedCase.label;
};
Exhibit.IconCoder.prototype.getMixedIcon = function() {
    return this._mixedCase.icon;
};
