/*==================================================
 *  Exhibit.CollectionSummaryWidget English localization
 *==================================================
 */

if (!("l10n" in Exhibit.CollectionSummaryWidget)) {
    Exhibit.CollectionSummaryWidget.l10n = {};
}

Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel = "Reset All Filters";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip = "Clear all filters and see the original items";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle = "Reset all filters";

Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate =
    "<span class='%0' id='resultDescription'></span>";

Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate =
    "<span class='%0'><span class='%1'>0</span> results</span> (<span id='resetActionLink'></span>)";

Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate =
    "<span class='%0' id='resultDescription'></span> " +
    "filtered from <span id='originalCountSpan'>0</span> originally (<span id='resetActionLink'></span>)";
