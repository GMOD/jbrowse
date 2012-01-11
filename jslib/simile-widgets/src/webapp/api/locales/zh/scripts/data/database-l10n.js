/*==================================================
 *  Exhibit.Database Chinese localization
 *==================================================
 */

if (!("l10n" in Exhibit.Database)) {
    Exhibit.Database.l10n = {};
}

Exhibit.Database.l10n.itemType = {
    label:          "Item",
    pluralLabel:    "Items",
    uri:            "http://simile.mit.edu/2006/11/exhibit#Item"
};
Exhibit.Database.l10n.labelProperty = {
    label:                  "label",
    pluralLabel:            "labels",
    reverseLabel:           "label of",
    reversePluralLabel:     "labels of"
};
Exhibit.Database.l10n.typeProperty = {
    label:                  "type",
    pluralLabel:            "types",
    reverseLabel:           "type of",
    reversePluralLabel:     "types of"
};
Exhibit.Database.l10n.uriProperty = {
    label:                  "URI",
    pluralLabel:            "URIs",
    reverseLabel:           "URI of",
    reversePluralLabel:     "URIs of"
};
Exhibit.Database.l10n.sortLabels = {
    "text": {
        ascending:  "a - z",
        descending: "z - a"
    },
    "number": {
        ascending:  "smallest first",
        descending: "largest first"
    },
    "date": {
        ascending:  "earliest first",
        descending: "latest first"
    },
    "boolean": {
        ascending:  "false first",
        descending: "true first"
    },
    "item": {
        ascending:  "a - z",
        descending: "z - a"
    }
};

Exhibit.Database.l10n.labelItemsOfType = function(count, typeID, database, countStyleClass) {
    var label = Exhibit.Database.l10n.itemType.label;
    var measureWord = "个";
    
    var type = database.getType(typeID);
    if (type) {
        label = type.getLabel();
        
        var measureWord2 = type.getProperty("measureWord");
        if (measureWord2) {
            measureWord = measureWord2;
        }
    }
    
    var span = document.createElement("span");
    span.innerHTML = "<span class='" + countStyleClass + "'>" + count + "</span>" + measureWord + label;
    
    return span;
};
