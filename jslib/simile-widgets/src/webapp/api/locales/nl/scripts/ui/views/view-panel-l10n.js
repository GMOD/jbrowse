/*==================================================
 *  Exhibit.ViewPanel Dutch localization
 *==================================================
 */

if (!("l10n" in Exhibit.ViewPanel)) {
    Exhibit.ViewPanel.l10n = {};
}

Exhibit.ViewPanel.l10n.createSelectViewActionTitle = function(viewLabel) {
    return "selecteer " + viewLabel + " toon";
};
Exhibit.ViewPanel.l10n.missingViewClassMessage = "De beschrijving voor een van de zichten mist het viewClass-veld.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage = function(expr) {
  return "De waarde van het viewClass attribuut '" + expr + "' die u heeft aangegeven\nvoor een van de zichten lijkt geen javascriptfunctie te zijn.";

};
Exhibit.ViewPanel.l10n.badViewClassMessage = function(expr) {
    return "De waarde van het viewClass attribuut '" + expr + "' die u heeft aangegeven\n" +
        "voor een van de zichten lijkt geen javascriptexpressie te zijn.";
};
