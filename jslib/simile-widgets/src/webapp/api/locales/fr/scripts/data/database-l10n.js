/*==================================================
 *  Exhibit.Database French localization
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
    label:                  "libellé",
    pluralLabel:            "libellés",
    reverseLabel:           "libellé de",
    reversePluralLabel:     "libellés de"
};
Exhibit.Database.l10n.typeProperty = {
    label:                  "type",
    pluralLabel:            "types",
    reverseLabel:           "type de",
    reversePluralLabel:     "types de"
};
Exhibit.Database.l10n.uriProperty = {
    label:                  "URI",
    pluralLabel:            "URIs",
    reverseLabel:           "URI de",
    reversePluralLabel:     "URIs de"
};
Exhibit.Database.l10n.sortLabels = {
    "text": {
        ascending:  "a - z",
        descending: "z - a"
    },
    "number": {
        ascending:  "du plus petit au plus grand",
        descending: "du plus grand au plus petit"
    },
    "date": {
        ascending:  "du plus ancien au plus récent",
        descending: "du plus récent au plus ancien"
    },
    "boolean": {
        ascending:  "faux en premier",
        descending: "vrai en premier"
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
