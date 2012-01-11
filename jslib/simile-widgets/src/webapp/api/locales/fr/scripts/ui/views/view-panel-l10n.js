/*==================================================
 *  Exhibit.ViewPanel French localization
 *==================================================
 */

if (!("l10n" in Exhibit.ViewPanel)) {
    Exhibit.ViewPanel.l10n = {};
}

Exhibit.ViewPanel.l10n.createSelectViewActionTitle = function(viewLabel) {
    return "Sélectionner la vue " + viewLabel;
};
Exhibit.ViewPanel.l10n.missingViewClassMessage = "La spécification pour une des vues ne contient pas le champ viewClass.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage = function(expr) {
	return "La valeur '" + expr + "' de l'attribut viewClass que vous avez spécifiée\n" +
            "pour une des vues ne correspond pas à une fonction Javascript.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage = function(expr) {
	return "La valeur '" + expr + "' de l'attribut viewClass que vous avez spécifiée\n" +
            "pour une des vues n'est pas une expression Javascript valide.";
};
