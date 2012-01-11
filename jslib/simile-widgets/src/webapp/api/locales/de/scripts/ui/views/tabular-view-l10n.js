/*==================================================
 *  Exhibit.TabularView German localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Tabelle";
Exhibit.TabularView.l10n.viewTooltip = "Zeige Elemente in einer Tabelle";
    
Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Nach dieser Spalte sortieren";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "In umgekehrter Reihenfolge sortieren";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return (ascending ? "aufsteigend sortiert nach " : "absteigend sortiert nach ") + label;
};
