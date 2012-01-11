/*==================================================
 *  Exhibit.OrderedViewFrame Spanish localization
 *==================================================
 */

if (!("l10n" in Exhibit.OrderedViewFrame)) {
    Exhibit.OrderedViewFrame.l10n = {};
}

Exhibit.OrderedViewFrame.l10n.removeOrderLabel = "Eliminar este orden";

Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate =
    "ordenados por: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Seguir ordenando elementos'>luego por...</a>";

Exhibit.OrderedViewFrame.l10n.formatSortActionTitle = function(propertyLabel, sortLabel) {
    return "Ordenados por " + propertyLabel + " (" + sortLabel + ")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle = function(propertyLabel, sortLabel) {
    return "Eliminar ordenación por " + propertyLabel + " (" + sortLabel + ")";
};

Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel = "agrupar según orden";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle = "agrupar según orden";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle = "sin agrupar";
    
Exhibit.OrderedViewFrame.l10n.showAllActionTitle = "show all results";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle = "show first few results";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll = function(limitCount) {
    return "Mostrar solamente " + limitCount + " resultados";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll = function(count) {
    return "Mostrar " + count + " resultados";
};
