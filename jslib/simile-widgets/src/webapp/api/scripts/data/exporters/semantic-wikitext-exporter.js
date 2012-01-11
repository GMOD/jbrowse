/*==================================================
 *  Exhibit.SemanticWikitextExporter
 *==================================================
 */
 
Exhibit.SemanticWikitextExporter = {
    getLabel: function() {
        return Exhibit.l10n.smwExporterLabel;
    }
};

Exhibit.SemanticWikitextExporter.exportOne = function(itemID, database) {
    return Exhibit.SemanticWikitextExporter._wrap(
        Exhibit.SemanticWikitextExporter._exportOne(itemID, database));
};

Exhibit.SemanticWikitextExporter.exportMany = function(set, database) {
    var s = "";
    set.visit(function(itemID) {
        s += Exhibit.SemanticWikitextExporter._exportOne(itemID, database) + "\n";
    });
    return Exhibit.SemanticWikitextExporter._wrap(s);
};

Exhibit.SemanticWikitextExporter._exportOne = function(itemID, database) {
    var s = "";
    var uri = database.getObject(itemID, "uri");
    s += uri + "\n"
    
    var allProperties = database.getAllProperties();
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        
        if (valueType == "item") {
            values.visit(function(value) {
                s += "[[" + propertyID + "::" + value + "]]\n";
            });
        } else {
            if (valueType == "url") {
                values.visit(function(value) {
                    s += "[[" + propertyID + ":=" + Exhibit.Persistence.resolveURL(value) + "]]\n";
                });
            } else {
                values.visit(function(value) {
                    s += "[[" + propertyID + ":=" + value + "]]\n";
                });
            }
        }
    }
    s += "[[origin:=" + Exhibit.Persistence.getItemLink(itemID) + "]]\n";
    
    s += "\n";
    return s;
};

Exhibit.SemanticWikitextExporter._wrap = function(s) {
    return s;
}