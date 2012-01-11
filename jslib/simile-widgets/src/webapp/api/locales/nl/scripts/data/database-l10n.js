/*==================================================
 *  Exhibit.Database Dutch localization
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
    label:                  "Type",
    pluralLabel:            "Typen",
    reverseLabel:           "Type van",
    reversePluralLabel:     "Typen van"
};
Exhibit.Database.l10n.uriProperty = {
    label:                  "URI",
    pluralLabel:            "URIs",
    reverseLabel:           "URI van",
    reversePluralLabel:     "URIs van"
};
Exhibit.Database.l10n.sortLabels = {
    "text": {
        ascending:  "a - z",
        descending: "z - a"
    },
    "number": {
        ascending:  "kleinste eerst",
        descending: "grootste eerst"
    },
    "date": {
        ascending:  "eerste eerst",
        descending: "laatste eerst"
    },
    "boolean": {
        ascending:  "foutief eerst",
        descending: "correct eerst"
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
