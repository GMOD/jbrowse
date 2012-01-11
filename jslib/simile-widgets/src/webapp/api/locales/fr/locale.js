/*==================================================
 *  French localization 
 *==================================================
 */
(function() {
    var isCompiled = ("Exhibit_isCompiled" in window) && window.Exhibit_isCompiled;
    if (!isCompiled) {
        var javascriptFiles = [
            "exhibit-l10n.js",
            "data/database-l10n.js",
            "ui/ui-context-l10n.js",
            "ui/lens-l10n.js",
            "ui/formatter-l10n.js",
            "ui/widgets/collection-summary-widget-l10n.js",
            "ui/views/view-panel-l10n.js",
            "ui/views/ordered-view-frame-l10n.js",
            "ui/views/tile-view-l10n.js",
            "ui/views/thumbnail-view-l10n.js",
            "ui/views/tabular-view-l10n.js",
            "util/coders-l10n.js",
            "util/facets-l10n.js",
            "util/views-l10n.js"
        ];
        var cssFiles = [
        ];

        var urlPrefix = Exhibit.urlPrefix + "locales/fr/";
        if (Exhibit.params.bundle) {
            SimileAjax.includeJavascriptFiles(document, urlPrefix, [ "exhibit-fr-bundle.js" ]);
            if (cssFiles.length > 0) {
                SimileAjax.includeCssFiles(document, urlPrefix, [ "exhibit-fr-bundle.css" ]);
            }
        } else {
            SimileAjax.includeJavascriptFiles(document, urlPrefix + "scripts/", javascriptFiles);
            SimileAjax.includeCssFiles(document, urlPrefix + "styles/", cssFiles);
        }
    }
})();
