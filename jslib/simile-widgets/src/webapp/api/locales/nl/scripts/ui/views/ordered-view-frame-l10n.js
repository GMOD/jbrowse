/*==================================================
 *  Exhibit.OrderedViewFrame Dutch localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Verwijder deze sortering";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="Sortering: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Sorteer deze items'>daarna door...</a>";


Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Sortering is " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Verwijder sortering " + propertyLabel + " (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="Groepering zoals gesorteerd";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="Groepeer zoals gesorteerd";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="Hef groupering zoals gesorteerd op";

Exhibit.OrderedViewFrame.l10n.showAllActionTitle="Toon alle resultaten";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="Toon alleen de eerste paar resultaten";

Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Toon alleen de eerste " + limitCount + " resultaten";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Toon alle " + count + " resultaten";
};