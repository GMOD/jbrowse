/*==================================================
 *  Exhibit.TabularView Spanish localization
 *==================================================
 */
if (!("l10n" in Exhibit.TabularView)) {
    Exhibit.TabularView.l10n = {};
}

Exhibit.TabularView.l10n.viewLabel = "Tabla";
Exhibit.TabularView.l10n.viewTooltip = "Ver elementos como una tabla";

Exhibit.TabularView.l10n.columnHeaderSortTooltip = "Click para ordenar por esta columna";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip = "Click para ordenar inversamente";
Exhibit.TabularView.l10n.makeSortActionTitle = function(label, ascending) {
    return (ascending ? "ordenado acendentemente por " : "ordenado descendentemente por ") + label;
};
