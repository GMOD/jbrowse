/*==================================================
 *  Exhibit.DefaultColorCoder
 *==================================================
 */

Exhibit.DefaultColorCoder = function(uiContext) {
};

Exhibit.DefaultColorCoder.colors = [
    "#FF9000",
    "#5D7CBA",
    "#A97838",
    "#8B9BBA",
    "#FFC77F",
    "#003EBA",
    "#29447B",
    "#543C1C"
];
Exhibit.DefaultColorCoder._map = {};
Exhibit.DefaultColorCoder._nextColor = 0;

Exhibit.DefaultColorCoder.prototype.translate = function(key, flags) {
    if (key == null) {
        if (flags) flags.missing = true;
        return Exhibit.Coders.missingCaseColor;
    } else {
        if (flags) flags.keys.add(key);
        if (key in Exhibit.DefaultColorCoder._map) {
            return Exhibit.DefaultColorCoder._map[key];
        } else {
            var color = Exhibit.DefaultColorCoder.colors[Exhibit.DefaultColorCoder._nextColor];
            Exhibit.DefaultColorCoder._nextColor = 
                (Exhibit.DefaultColorCoder._nextColor + 1) % Exhibit.DefaultColorCoder.colors.length;
                
            Exhibit.DefaultColorCoder._map[key] = color;
            return color;
        }
    }
};

Exhibit.DefaultColorCoder.prototype.translateSet = function(keys, flags) {
    var color = null;
    var self = this;
    keys.visit(function(key) {
        var color2 = self.translate(key, flags);
        if (color == null) {
            color = color2;
        } else if (color != color2) {
            color = Exhibit.Coders.mixedCaseColor;
            flags.mixed = true;
            return true; // exit visitation
        }
        return false;
    });
    
    if (color != null) {
        return color;
    } else {
        flags.missing = true;
        return Exhibit.Coders.missingCaseColor;
    }
};

Exhibit.DefaultColorCoder.prototype.getOthersLabel = function() {
    return Exhibit.Coders.l10n.othersCaseLabel;
};
Exhibit.DefaultColorCoder.prototype.getOthersColor = function() {
    return Exhibit.Coders.othersCaseColor;
};

Exhibit.DefaultColorCoder.prototype.getMissingLabel = function() {
    return Exhibit.Coders.l10n.missingCaseLabel;
};
Exhibit.DefaultColorCoder.prototype.getMissingColor = function() {
    return Exhibit.Coders.missingCaseColor;
};

Exhibit.DefaultColorCoder.prototype.getMixedLabel = function() {
    return Exhibit.Coders.l10n.mixedCaseLabel;
};
Exhibit.DefaultColorCoder.prototype.getMixedColor = function() {
    return Exhibit.Coders.mixedCaseColor;
};
