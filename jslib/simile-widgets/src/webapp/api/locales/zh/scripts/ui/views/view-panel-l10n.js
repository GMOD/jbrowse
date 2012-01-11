/*==================================================
 *  Exhibit.ViewPanel Chinese localization
 *==================================================
 */

if (!("l10n" in Exhibit.ViewPanel)) {
    Exhibit.ViewPanel.l10n = {};
}

Exhibit.ViewPanel.l10n.createSelectViewActionTitle = function(viewLabel) {
    return "select " + viewLabel + " view";
};
Exhibit.ViewPanel.l10n.missingViewClassMessage = "The specification for one of the views is missing the viewClass field.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage = function(expr) {
    return "The viewClass attribute value '" + expr + "' you have specified\n" +
        "for one of the views does not evaluate to a Javascript function.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage = function(expr) {
    return "The viewClass attribute value '" + expr + "' you have specified\n" +
        "for one of the views is not a valid Javascript expression.";
};
