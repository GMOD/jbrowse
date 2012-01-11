/*==================================================
 *  Exhibit.OrderedViewFrame French localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel = "Retirer ce critère";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate =
    "Trier par : <span id='ordersSpan'></span>, <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Ajouter un item'>puis par...</a>";

Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Trier par " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Critère de tri retiré : " + propertyLabel + " (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel = "Grouper selon le tri";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle = "Grouper selon le tri";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle = "Dégrouper selon le tri";

Exhibit.OrderedViewFrame.l10n.showAllActionTitle = "Voir tous les résultats";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle = "Voir les premiers résultats";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Montrer seulement les " + limitCount + " premiers résultats";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Montrer l'ensemble des " + count + " résultats";
};