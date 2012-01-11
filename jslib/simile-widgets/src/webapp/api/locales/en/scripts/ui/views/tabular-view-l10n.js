/*==================================================
 *  Exhibit.TabularView English localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Table";
Exhibit.TabularView.l10n.viewTooltip = "View items in a table";
    
Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Click to sort by this column";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "Click to sort in the reverse order";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return (ascending ? "sorted ascending by " : "sorted descending by ") + label;
};
