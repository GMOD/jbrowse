/*==================================================
 *  Exhibit.ViewPanel Swedish localization
 *==================================================
 */

if (!("l10n" in Exhibit.ViewPanel)) {
    Exhibit.ViewPanel.l10n = {};
}

Exhibit.ViewPanel.l10n.createSelectViewActionTitle = function(viewLabel) {
    return "välj vyn " + viewLabel;
};
Exhibit.ViewPanel.l10n.missingViewClassMessage = "Specifikationen för en av vyerna saknas i fältet viewClass.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage = function(expr) {
    return "Värdet '" + expr + "' du angivit för attributet viewClass\n" +
        "för en av dessa vyer var inte namnet på en javascriptfunktion.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage = function(expr) {
    return "Värdet '" + expr + "' du angivit för attributet viewClass\n" +
        "för en av dessa vyer är inte ett giltigt javascriptuttryck.";
};
