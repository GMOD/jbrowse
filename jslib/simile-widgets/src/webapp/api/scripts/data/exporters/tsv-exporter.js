/*==================================================
 *  Exhibit.TSVExporter
 *==================================================
 */
 
Exhibit.TSVExporter = {
    getLabel: function() {
        return Exhibit.l10n.tsvExporterLabel;
    }
};

Exhibit.TSVExporter.exportOne = function(itemID, database) {
    return Exhibit.TSVExporter._wrap(
        Exhibit.TSVExporter._exportOne(itemID, database), database);
};

Exhibit.TSVExporter.exportMany = function(set, database) {
    var s = "";
    set.visit(function(itemID) {
        s += Exhibit.TSVExporter._exportOne(itemID, database) + "\n";
    });
    return Exhibit.TSVExporter._wrap(s, database);
};

Exhibit.TSVExporter._exportOne = function(itemID, database) {
    var s = "";
    
    var allProperties = database.getAllProperties();
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        
        s += values.toArray().join("; ") + "\t";
    }
    
    return s;
};

Exhibit.TSVExporter._wrap = function(s, database) {
    var header = "";
    
    var allProperties = database.getAllProperties();
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var valueType = property.getValueType();
        header += propertyID + ":" + valueType + "\t";
    }
    
    return header + "\n" + s;
}