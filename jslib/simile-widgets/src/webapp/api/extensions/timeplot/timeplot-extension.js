/*==================================================
 *  Simile Exhibit Timeplot Extension
 *
 *  Development partially funded by Zepheira.
 *  http://zepheira.com/
 *  See the main Exhibit LICENSE.txt for licensing.
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_TimeplotExtension_isCompiled" in window) && 
                    window.Exhibit_TimeplotExtension_isCompiled;
                    
    Exhibit.TimeplotExtension = {
        params: {
            bundle: true
        } 
    };
    
    var javascriptFiles = [
        "timeplot-view.js"
    ];
    var cssFiles = [
        "timeplot-view.css"
    ];
        
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_TimeplotExtension_urlPrefix == "string") {
        Exhibit.TimeplotExtension.urlPrefix = Exhibit_TimeplotExtension_urlPrefix;
        if ("Exhibit_TimeplotExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_TimeplotExtension_parameters,
                                          Exhibit.TimeplotExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/timeplot-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Timeplot Extension code files"));
            return;
        }
        Exhibit.TimeplotExtension.urlPrefix = url.substr(0, url.indexOf("timeplot-extension.js"));
        
        SimileAjax.parseURLParameters(url, Exhibit.TimeplotExtension.params, paramTypes);
    }

    // Allowing these separate pieces to load on their own
    // results in backwards order in IE.  Forcing the correct
    // order is heavy handed but works.
    var scriptURLs = [ "http://api.simile-widgets.org/timeline/2.3.1/timeline-api.js?bundle=true", "http://api.simile-widgets.org/timeline/2.3.1/timeline-bundle.js", "http://trunk.simile-widgets.org/timeplot/api/timeplot-api.js?bundle=true", "http://trunk.simile-widgets.org/timeplot/api/timeplot-bundle.js" ];
    var cssURLs = [];
        
    if (Exhibit.TimeplotExtension.params.bundle) {
        scriptURLs.push(Exhibit.TimeplotExtension.urlPrefix + "timeplot-extension-bundle.js");
        cssURLs.push(Exhibit.TimeplotExtension.urlPrefix + "timeplot-extension-bundle.css");
    } else {
        SimileAjax.prefixURLs(scriptURLs, Exhibit.TimeplotExtension.urlPrefix + "scripts/", javascriptFiles);
        SimileAjax.prefixURLs(cssURLs, Exhibit.TimeplotExtension.urlPrefix + "styles/", cssFiles);
    }
    
    for (var i = 0; i < Exhibit.locales.length; i++) {
        scriptURLs.push(Exhibit.TimeplotExtension.urlPrefix + "locales/" + Exhibit.locales[i] + "/timeplot-locale.js");
    };
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();
