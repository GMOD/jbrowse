/*==================================================
 *  Exhibit.TabularView Norwegian localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Tabell";
Exhibit.TabularView.l10n.viewTooltip = "Vis i en tabell";
    
Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Klikk her for å sortere etter denne kolonna";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "Klikk her for å sortere i omvendt rekkefølge";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return (ascending ? "sortert i stigende rekkefølge etter " : "sortert i synkende rekkefølge etter ") + label;
};
