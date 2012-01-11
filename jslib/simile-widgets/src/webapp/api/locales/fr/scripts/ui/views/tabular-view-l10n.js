/*==================================================
 *  Exhibit.TabularView French localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Tableau";
Exhibit.TabularView.l10n.viewTooltip = "Voir les items dans un tableau";
    
Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Cliquer pour trier sur cette colonne";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "Cliquer pour trier dans l'ordre inverse";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return (ascending ? "triés par ordre croissant selon " : "triés par ordre décroissant selon ") + label;
};
