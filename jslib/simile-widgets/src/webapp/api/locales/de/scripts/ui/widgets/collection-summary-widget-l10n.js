/*==================================================
 *  Exhibit.CollectionSummaryWidget German localization
 *==================================================
 */

if (!("l10n" in Exhibit.CollectionSummaryWidget)) {
    Exhibit.CollectionSummaryWidget.l10n = {};
}

Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel = "Alle Filter zurücksetzen";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip = "Alle Filter zurücksetzen und ursprüngliche Elemente anzeigen";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle = "Alle Filter zurücksetzen";

Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate =
    "<span class='%0' id='resultDescription'></span>";

Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate =
    "<span class='%0'><span class='%1'>0</span> Ergebnisse</span> (<span id='resetActionLink'></span>)";

Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate =
    "<span class='%0' id='resultDescription'></span> " +
    "gefiltert von ursprünglich <span id='originalCountSpan'>0</span> (<span id='resetActionLink'></span>)";
