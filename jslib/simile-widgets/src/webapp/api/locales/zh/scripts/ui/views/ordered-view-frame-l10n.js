/*==================================================
 *  Exhibit.OrderedViewFrame Chinese localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel = "Remove this order";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate =
    "sorted by: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Further sort the items'>then by...</a>";

Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Sorted by " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Removed order by " + propertyLabel + " (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel = "grouped as sorted";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle = "group as sorted";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle = "ungroup as sorted";

Exhibit.OrderedViewFrame.l10n.showAllActionTitle = "show all results";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle = "show first few results";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Show only the first " + limitCount + " results";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Show all " + count + " results";
};