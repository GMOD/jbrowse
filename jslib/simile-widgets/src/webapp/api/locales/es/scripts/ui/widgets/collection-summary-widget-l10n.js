/*==================================================
 *  Exhibit.CollectionSummaryWidget Spanish localization
 *==================================================
 */

if (!("l10n" in Exhibit.CollectionSummaryWidget)) {
    Exhibit.CollectionSummaryWidget.l10n = {};
}

Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel = "Reset All Filters";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip = "Elimina algunos filtros para obtener resultados.";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle = "Reset all filters";

Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate =
    "<span class='%0' id='resultDescription'></span>";

Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate =
    "<span class='%0'>0</span> <span class='%1' id='typesSpan'>resultados</span> (<span id='resetActionLink'></span>)";

Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate =
    "<span class='%0' id='resultDescription'></span> " +
    "filtered from <span id='originalCountSpan'>0</span> originally (<span id='resetActionLink'></span>)";
