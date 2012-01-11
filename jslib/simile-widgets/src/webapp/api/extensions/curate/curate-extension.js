/*==================================================
 *  Simile Exhibit Curate Extension
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_CurateExtension_isCompiled" in window) && 
                    window.Exhibit_CurateExtension_isCompiled;
    
    Exhibit.CurateExtension = {
        params: {
            bundle: false
        } 
    };

    var javascriptFiles = [
        "change-list.js",
        "item-creator.js",
        "scraper.js",
        "submission-backend.js",
        "submission-widgets.js"
    ];
    var cssFiles = [
        "change-list.css",
        'scraper.css'
    ];
    
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_CurateExtension_urlPrefix == "string") {
        Exhibit.CurateExtension.urlPrefix = Exhibit_CurateExtension_urlPrefix;
        if ("Exhibit_CurateExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_CurateExtension_parameters,
                                          Exhibit.CurateExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/curate-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Curate Extension code files"));
            return;
        }
        Exhibit.CurateExtension.urlPrefix = url.substr(0, url.indexOf("curate-extension.js"));
        
        SimileAjax.parseURLParameters(url, Exhibit.CurateExtension.params, paramTypes);
    }
            
    var scriptURLs = [];
    var cssURLs = [];
    
    // Bundling and localization are ignored atm
    
    SimileAjax.prefixURLs(scriptURLs, Exhibit.CurateExtension.urlPrefix + "scripts/", javascriptFiles);
    SimileAjax.prefixURLs(cssURLs, Exhibit.CurateExtension.urlPrefix + "styles/", cssFiles);
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();