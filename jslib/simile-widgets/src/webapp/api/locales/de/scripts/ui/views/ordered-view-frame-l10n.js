/*==================================================
 *  Exhibit.OrderedViewFrame German localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel = "Diese Sortierung aufheben";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate =
    "sortiert nach: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Sortiere die Elemente ferner nach'>sowie nach...</a>";

Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Sortiert nach " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Hebe Sortierung nach " + propertyLabel + " auf (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel = "Gruppierung wie Sortierung";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle = "Gruppierung nach Sortierung";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle = "hebe Gruppierung nach Sortierung auf";

Exhibit.OrderedViewFrame.l10n.showAllActionTitle = "zeige alle Ergebnisse";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle = "zeige die ersten paar Ergebnisse";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Zeige nur die ersten " + limitCount + " Ergebnisse";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Zeige alle " + count + " Ergebnisse";
};