/*==================================================
 *  Exhibit.CollectionSummaryWidget English localization
 *==================================================
 */

if (!("l10n" in Exhibit.CollectionSummaryWidget)) {
    Exhibit.CollectionSummaryWidget.l10n = {};
}

Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel = "visa alla";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip = "Välj bort några filter för fler resultat.";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle = "visa alla";

Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate =
    "<span class='%0' id='resultDescription'></span>";

Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate =
    "<span class='%0'>0</span> <span class='%1' id='typesSpan'>resultat</span>. (<span id='resetActionLink'></span>)";

Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate =
    "<span class='%0' id='resultDescription'></span> " +
    "av <span id='originalCountSpan'>0</span> totalt. (<span id='resetActionLink'></span>)";
