/*==================================================
 *  Exhibit.TabularView Dutch localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Tabel";
Exhibit.TabularView.l10n.viewTooltip = "Toon items in een tabel";
    
Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Klik om deze kolom te sorteren";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "Klik om deze kolom te sorteren in omgekeerde volgorder";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return (ascending ? "Sorteer oplopend " : "sorteer aflopend ") + label;
};
