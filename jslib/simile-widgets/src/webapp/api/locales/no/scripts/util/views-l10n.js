/*==================================================
 *  Exhibit.ViewUtilities Norwegian localization
 *==================================================
 */

if (!("l10n" in Exhibit.ViewUtilities)) {
    Exhibit.ViewUtilities.l10n = {};
}

Exhibit.ViewUtilities.l10n.unplottableMessageFormatter = function(totalCount, unplottableItems, uiContext) {
    var count = unplottableItems.length;
    
    return String.substitute(
        "<a class='exhibit-action exhibit-views-unplottableCount' href='javascript:void' id='unplottableCountLink'>%0</a> "+
        "av <class class='exhibit-views-totalCount'>%1</span> kunne ikke vises på kart.",
        [ count == 1 ? (count + " treff") : (count + " treff"), totalCount ]
    );
};
