/*==================================================
 *  Exhibit.SizeCoder
 *==================================================
 */

Exhibit.SizeCoder = function(uiContext) {
    this._uiContext = uiContext;
    this._settings = {};
    
    this._map = {};
    this._mixedCase = { label: "mixed", size: 10 };
    this._missingCase = { label: "missing", size: 10 };
    this._othersCase = { label: "others", size: 10 };
};

Exhibit.SizeCoder._settingSpecs = {
};

Exhibit.SizeCoder.create = function(configuration, uiContext) {
    var coder = new Exhibit.SizeCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.SizeCoder._configure(coder, configuration);
    return coder;
};

Exhibit.SizeCoder.createFromDOM = function(configElmt, uiContext) {
    configElmt.style.display = "none";
    
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var coder = new Exhibit.SizeCoder(Exhibit.UIContext.create(configuration, uiContext));
    
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.SizeCoder._settingSpecs, coder._settings);
    
    try {
        var node = configElmt.firstChild;
        while (node != null) {
            if (node.nodeType == 1) {
                coder._addEntry(
                    Exhibit.getAttribute(node, "case"), 
                    node.firstChild.nodeValue.trim(), 
                    Exhibit.getAttribute(node, "size"));
            }
            node = node.nextSibling;
        }
    } catch (e) {
        SimileAjax.Debug.exception(e, "SizeCoder: Error processing configuration of coder");
    }
    
    Exhibit.SizeCoder._configure(coder, configuration);
    return coder;
};

Exhibit.SizeCoder._configure = function(coder, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.SizeCoder._settingSpecs, coder._settings);
    
    if ("entries" in configuration) {
        var entries = configuration.entries;
        for (var i = 0; i < entries.length; i++) {
            coder._addEntry(entries[i].kase, entries[i].key, entries[i].size);
        }
    }
}

Exhibit.SizeCoder.prototype.dispose = function() {
    this._uiContext = null;
    this._settings = null;
};

Exhibit.SizeCoder.prototype._addEntry = function(kase, key, size) {  
    var entry = null;
    switch (kase) {
    case "others":  entry = this._othersCase; break;
    case "mixed":   entry = this._mixedCase; break;
    case "missing": entry = this._missingCase; break;
    }
    if (entry != null) {
        entry.label = key;
        entry.size = size;
    } else {
        this._map[key] = { size: size };
    }
};

Exhibit.SizeCoder.prototype.translate = function(key, flags) {
    if (key in this._map) {
        if (flags) flags.keys.add(key);
        return this._map[key].size;
    } else if (key == null) {
        if (flags) flags.missing = true;
        return this._missingCase.size;
    } else {
        if (flags) flags.others = true;
        return this._othersCase.size;
    }
};

Exhibit.SizeCoder.prototype.translateSet = function(keys, flags) {
    var size = null;
    var self = this;
    keys.visit(function(key) {
        var size2 = self.translate(key, flags);
        if (size == null) {
            size = size2;
        } else if (size != size2) {
            if (flags) flags.mixed = true;
            size = self._mixedCase.size;
            return true;
        }
        return false;
    });
    
    if (size != null) {
        return size;
    } else {
        if (flags) flags.missing = true;
        return this._missingCase.size;
    }
};

Exhibit.SizeCoder.prototype.getOthersLabel = function() {
    return this._othersCase.label;
};
Exhibit.SizeCoder.prototype.getOthersSize = function() {
    return this._othersCase.size;
};

Exhibit.SizeCoder.prototype.getMissingLabel = function() {
    return this._missingCase.label;
};
Exhibit.SizeCoder.prototype.getMissingSize = function() {
    return this._missingCase.size;
};

Exhibit.SizeCoder.prototype.getMixedLabel = function() {
    return this._mixedCase.label;
};
Exhibit.SizeCoder.prototype.getMixedSize = function() {
    return this._mixedCase.size;
};
