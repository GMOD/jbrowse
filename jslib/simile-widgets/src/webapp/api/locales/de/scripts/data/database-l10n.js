/*==================================================
 *  Exhibit.Database German localization
 *==================================================
 */

if (!("l10n" in Exhibit.Database)) {
    Exhibit.Database.l10n = {};
}

Exhibit.Database.l10n.itemType = {
    label:          "Element",
    pluralLabel:    "Elemente",
    uri:            "http://simile.mit.edu/2006/11/exhibit#Item"
};
Exhibit.Database.l10n.labelProperty = {
    label:                  "Bezeichnung",
    pluralLabel:            "Bezeichnungen",
    reverseLabel:           "Bezeichnung von",
    reversePluralLabel:     "Bezeichnungen von"
};
Exhibit.Database.l10n.typeProperty = {
    label:                  "Typ",
    pluralLabel:            "Typen",
    reverseLabel:           "Typ von",
    reversePluralLabel:     "Typen von"
};
Exhibit.Database.l10n.uriProperty = {
    label:                  "URI",
    pluralLabel:            "URIs",
    reverseLabel:           "URI von",
    reversePluralLabel:     "URIs von"
};
Exhibit.Database.l10n.sortLabels = {
    "text": {
        ascending:  "a - z",
        descending: "z - a"
    },
    "number": {
        ascending:  "kleinstes zuerst",
        descending: "größtes zuerst"
    },
    "date": {
        ascending:  "frühestes zuerst",
        descending: "spätestes zuerst"
    },
    "boolean": {
        ascending:  "falsch zuerst",
        descending: "wahr zuerst"
    },
    "item": {
        ascending:  "a - z",
        descending: "z - a"
    }
};

Exhibit.Database.l10n.labelItemsOfType = function(count, typeID, database, countStyleClass) {
    var label = count == 1 ? Exhibit.Database.l10n.itemType.label :
        Exhibit.Database.l10n.itemType.pluralLabel
        
    var type = database.getType(typeID);
    if (type) {
        label = type.getLabel();
        if (count != 1) {
            var pluralLabel = type.getProperty("pluralLabel");
            if (pluralLabel) {
                label = pluralLabel;
            }
        }
    }
    
    var span = document.createElement("span");
    span.innerHTML = "<span class='" + countStyleClass + "'>" + count + "</span> " + label;
    
    return span;
};
