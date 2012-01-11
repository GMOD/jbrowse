/*==================================================
 *  Exhibit.TabularView Swedish localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Tabell";
Exhibit.TabularView.l10n.viewTooltip = "Visa i tabell";
    
Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Klicka för att sortera efter den här kolumnen";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "Klicka för att välja omvänd ordning";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return "sortera efter " + (ascending ? "stigande " : "fallande ") + label;
};
