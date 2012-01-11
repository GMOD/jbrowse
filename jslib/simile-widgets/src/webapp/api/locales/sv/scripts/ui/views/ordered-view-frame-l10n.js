/*==================================================
 *  Exhibit.OrderedViewFrame Swedish localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel = "Ta bort det här sorteringskriteriet";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate =
    "sorterat efter: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='sortera ytterligare'>then by...</a>";
    
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Sorterat efter " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Ta bort sorteringskriteriet " + propertyLabel + " (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel = "gruppera som de sorterats";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle = "grupperade som de sorterats";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle = "ogrupperade";

Exhibit.OrderedViewFrame.l10n.showAllActionTitle = "show all results";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle = "show first few results";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Visa bara de första " + limitCount + " resultaten";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Visa samtliga " + count + " resultat";
};
