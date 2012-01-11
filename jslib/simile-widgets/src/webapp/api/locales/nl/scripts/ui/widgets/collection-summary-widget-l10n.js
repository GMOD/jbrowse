/*==================================================
 *  Exhibit.CollectionSummaryWidget English localization
 *==================================================
 */

if (!("l10n" in Exhibit.CollectionSummaryWidget)) {
    Exhibit.CollectionSummaryWidget.l10n = {};
}

Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel = "Reset alle filters";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip = "Maak alle filters leeg en toon de oorspronkelijke items";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle = "Reset alle filters";

Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate =
    "<span class='%0' id='resultDescription'></span>";

Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate =
    "<span class='%0'><span class='%1'>0</span> resultaten</span> (<span id='resetActionLink'></span>)";

Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate =
    "<span class='%0' id='resultDescription'></span> " +
    "<span id='originalCountSpan'>0</span> gefilterd van oorspronkelijk (<span id='resetActionLink'></span>)";
