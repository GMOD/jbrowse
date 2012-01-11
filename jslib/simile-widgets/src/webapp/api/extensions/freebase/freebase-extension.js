/*==================================================
 *  Simile Exhibit Freebase Extension
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_FreebaseExtension_isCompiled" in window) && 
                    window.Exhibit_FreebaseExtension_isCompiled;
                    
    Exhibit.FreebaseExtension = {
        params: {
            bundle: false
        } 
    };

    var javascriptFiles = [
        "freebase-importer.js",
        "metaweb.js"
    ];
    var cssFiles = [
    ];
        
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_FreebaseExtension_urlPrefix == "string") {
        Exhibit.FreebaseExtension.urlPrefix = Exhibit_FreebaseExtension_urlPrefix;
        if ("Exhibit_FreebaseExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_FreebaseExtension_parameters,
                                          Exhibit.FreebaseExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/freebase-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Freebase Extension code files"));
            return;
        }
        Exhibit.FreebaseExtension.urlPrefix = url.substr(0, url.indexOf("freebase-extension.js"));
        
        SimileAjax.parseURLParameters(url, Exhibit.FreebaseExtension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
    
    // Bundling and localization are ignored atm
    
    SimileAjax.prefixURLs(scriptURLs    , Exhibit.FreebaseExtension.urlPrefix + "scripts/", javascriptFiles);
    SimileAjax.prefixURLs(cssURLs, Exhibit.FreebaseExtension.urlPrefix + "styles/", cssFiles);
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();