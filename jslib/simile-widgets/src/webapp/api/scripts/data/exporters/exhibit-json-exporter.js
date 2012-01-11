/*==================================================
 *  Exhibit.ExhibitJsonExporter
 *==================================================
 */
 
Exhibit.ExhibitJsonExporter = {
    getLabel: function() {
        return Exhibit.l10n.exhibitJsonExporterLabel;
    }
};

Exhibit.ExhibitJsonExporter.exportOne = function(itemID, database) {
    return Exhibit.ExhibitJsonExporter._wrap(
        Exhibit.ExhibitJsonExporter._exportOne(itemID, database) + "\n");
};

Exhibit.ExhibitJsonExporter.exportMany = function(set, database) {
    var s = "";
    var size = set.size();
    var count = 0;
    set.visit(function(itemID) {
        s += Exhibit.ExhibitJsonExporter._exportOne(itemID, database) + ((count++ < size - 1) ? ",\n" : "\n");
    });
    return Exhibit.ExhibitJsonExporter._wrap(s);
};

Exhibit.ExhibitJsonExporter._exportOne = function(itemID, database) {
    function quote(s) {
        if (/[\\\x00-\x1F\x22]/.test(s)) {
            return '"' + s.replace(/([\\\x00-\x1f\x22])/g, function(a, b) {
                var c = { '\b':'\\b', '\t':'\\t', '\n':'\\n', '\f':'\\f',
                          '\r':'\\r',  '"':'\\"', '\\':'\\\\' }[b];
                if (c) {
                    return c;
                }
                c = b.charCodeAt();
                return '\\x' +
                    Math.floor(c / 16).toString(16) +
                    (c % 16).toString(16);
            }) + '"';
        }
        return '"' + s + '"';
    }
    var s = "";
    var uri = database.getObject(itemID, "uri");
    
    s += "  {\"id\":" + quote(itemID) + ",\n";
    
    var allProperties = database.getAllProperties();
    
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        
        if (values.size() > 0) {
            var array;
            if (valueType == "url") {
                array = [];
                values.visit(function(value) {
                    array.push(Exhibit.Persistence.resolveURL(value));
                });
            } else {
                array = values.toArray();
            }
            
            s += "   " + quote(propertyID) + ":";
            if (array.length == 1) {
                s += quote(array[0]);
            } else {
                s += "[";
                for (var j = 0; j < array.length; j++) {
                    s += (j > 0 ? "," : "") + quote(array[j]);
                }
                s += "]";
            }
            s += ",\n";
        }
    }
    s += "   \"origin\":"+ quote(Exhibit.Persistence.getItemLink(itemID)) +"\n";
    s += "  }";
    
    return s;
};

Exhibit.ExhibitJsonExporter._wrap = function(s) {
    return "{\n" +
        " \"items\":[\n" +
            s +
        " ]\n" +
    "}";
}
