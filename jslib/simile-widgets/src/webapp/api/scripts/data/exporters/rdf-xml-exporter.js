/*==================================================
 *  Exhibit.RdfXmlExporter
 *==================================================
 */
 
Exhibit.RdfXmlExporter = {
    getLabel: function() {
        return Exhibit.l10n.rdfXmlExporterLabel;
    }
};

Exhibit.RdfXmlExporter.exportOne = function(itemID, database) {
    var propertyIDToQualifiedName = {};
    var prefixToBase = {};
    database.getNamespaces(propertyIDToQualifiedName, prefixToBase);
    
    return Exhibit.RdfXmlExporter._wrapRdf(
        Exhibit.RdfXmlExporter._exportOne(
            itemID, 
            database,
            propertyIDToQualifiedName, 
            prefixToBase
        ),
        prefixToBase
    );
};

Exhibit.RdfXmlExporter.exportMany = function(set, database) {
    var s = "";
    
    var propertyIDToQualifiedName = {};
    var prefixToBase = {};
    database.getNamespaces(propertyIDToQualifiedName, prefixToBase);
    
    set.visit(function(itemID) {
        s += Exhibit.RdfXmlExporter._exportOne(
            itemID, 
            database,
            propertyIDToQualifiedName, 
            prefixToBase
        ) + "\n";
    });
    return Exhibit.RdfXmlExporter._wrapRdf(s, prefixToBase);
};

Exhibit.RdfXmlExporter._exportOne = function(itemID, database, propertyIDToQualifiedName, prefixToBase) {
    var s = "";
    var uri = database.getObject(itemID, "uri");
    s += "<rdf:Description rdf:about='" + uri + "'>\n"
    
    var allProperties = database.getAllProperties();
    for (var i = 0; i < allProperties.length; i++) {
        var propertyID = allProperties[i];
        var property = database.getProperty(propertyID);
        var values = database.getObjects(itemID, propertyID);
        var valueType = property.getValueType();
        
        var propertyString;
        if (propertyID in propertyIDToQualifiedName) {
            var qname = propertyIDToQualifiedName[propertyID];
            propertyString = qname.prefix + ":" + qname.localName;
        } else {
            propertyString = property.getURI();
        }
        
        if (valueType == "item") {
            values.visit(function(value) {
                s += "\t<" + propertyString + " rdf:resource='" + value + "' />\n";
            });
        } else if (propertyID != "uri") {
            if (valueType == "url") {
                values.visit(function(value) {
                    s += "\t<" + propertyString + ">" + Exhibit.Persistence.resolveURL(value) + "</" + propertyString + ">\n";
                });
            } else {
                values.visit(function(value) {
                    s += "\t<" + propertyString + ">" + value + "</" + propertyString + ">\n";
                });
            }
        }
    }
    s += "\t<exhibit:origin>" + Exhibit.Persistence.getItemLink(itemID) + "</exhibit:origin>\n";
    
    s += "</rdf:Description>";
    return s;
};

Exhibit.RdfXmlExporter._wrapRdf = function(s, prefixToBase) {
    var s2 = "<?xml version='1.0'?>\n" +
        "<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'\n" +
        "\txmlns:exhibit='http://simile.mit.edu/2006/11/exhibit#'";
        
    for (prefix in prefixToBase) {
        s2 += "\n\txmlns:" + prefix + "='" + prefixToBase[prefix] + "'";
    }
    
    s2 += ">\n" + s + "\n</rdf:RDF>";
    return s2;
}