/*==================================================
 *  Exhibit.OrderedViewFrame Norwegian localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel = "Fjern denne sorteringsrekkefølgen";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate =
    "sortert etter: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Further sort the items'>then by...</a>";

Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Sorter etter " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Fjernet sorteringsrekkefølge " + propertyLabel + " (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel = "gruppert som sortert";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle = "grupper etter sortering";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle = "avgrupper slik de er sortert";

Exhibit.OrderedViewFrame.l10n.showAllActionTitle = "vis alle";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle = "vis bare de første";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Vis bare de første " + limitCount + " ";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Vis alle " + count + " ";
};