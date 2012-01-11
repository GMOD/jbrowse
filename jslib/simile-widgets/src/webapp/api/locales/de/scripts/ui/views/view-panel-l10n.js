/*==================================================
 *  Exhibit.ViewPanel German localization
 *==================================================
 */

if (!("l10n" in Exhibit.ViewPanel)) {
    Exhibit.ViewPanel.l10n = {};
}

Exhibit.ViewPanel.l10n.createSelectViewActionTitle = function(viewLabel) {
    return "Wähle Sicht " + viewLabel;
};
Exhibit.ViewPanel.l10n.missingViewClassMessage = "Der Beschreibung einer der Sichten fehlt das viewClass Attribut.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage = function(expr) {
    return "Der angegebene Wert '" + expr + "' des viewClass Attributs\n" +
        "einer der Sichten ist keine Javascript Funktion.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage = function(expr) {
    return "Der angegebene Wert '" + expr + "' des viewClass Attributs\n" +
        "einer der Sichten ist kein gültiger Javascript Ausdruck.";
};
