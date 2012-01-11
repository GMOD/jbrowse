/*==================================================
 *  Simile Exhibit Chart Extension
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_ChartExtension_isCompiled" in window) && 
                    window.Exhibit_ChartExtension_isCompiled;
                    
    Exhibit.ChartExtension = {
        params: {
            bundle: true
        } 
    };

    var javascriptFiles = [
        "scatter-plot-view.js",
        "pivot-table-view.js",
        "bar-chart-view.js"
    ];
    var cssFiles = [
        "scatter-plot-view.css",
        "pivot-table-view.css",
        "bar-chart-view.css"
    ];
    
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_ChartExtension_urlPrefix == "string") {
        Exhibit.ChartExtension.urlPrefix = Exhibit_ChartExtension_urlPrefix;
        if ("Exhibit_ChartExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_ChartExtension_parameters,
                                          Exhibit.ChartExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/chart-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Chart Extension code files"));
            return;
        }
        Exhibit.ChartExtension.urlPrefix = url.substr(0, url.indexOf("chart-extension.js"));
        
        SimileAjax.parseURLParameters(url, Exhibit.ChartExtension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
    
    if (Exhibit.ChartExtension.params.bundle) {
        scriptURLs.push(Exhibit.ChartExtension.urlPrefix + "chart-extension-bundle.js");
        cssURLs.push(Exhibit.ChartExtension.urlPrefix + "chart-extension-bundle.css");
    } else {
        SimileAjax.prefixURLs(scriptURLs, Exhibit.ChartExtension.urlPrefix + "scripts/", javascriptFiles);
        SimileAjax.prefixURLs(cssURLs, Exhibit.ChartExtension.urlPrefix + "styles/", cssFiles);
    }
    
    for (var i = 0; i < Exhibit.locales.length; i++) {
        scriptURLs.push(Exhibit.ChartExtension.urlPrefix + "locales/" + Exhibit.locales[i] + "/chart-locale.js");
    };
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();
