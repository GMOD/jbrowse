/*==================================================
 *  Simile Exhibit Calendar Extension
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_CalendarExtension_isCompiled" in window) && 
                    window.Exhibit_CalendarExtension_isCompiled;
    
    Exhibit.CalendarExtension = {
        params: {
            bundle: false
        } 
    };

    var javascriptFiles = [
        "date-picker-facet.js",
        "date-picker.js",
        "date-util.js",
        "calendar-view.js"
    ];
    var cssFiles = [
        "date-picker-facet.css",
        "calendar-view.css"
    ];
        
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_CalendarExtension_urlPrefix == "string") {
        Exhibit.CalendarExtension.urlPrefix = Exhibit_CalendarExtension_urlPrefix;
        if ("Exhibit_CalendarExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_CalendarExtension_parameters,
                                          Exhibit.CalendarExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/calendar-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Calendar Extension code files"));
            return;
        }
        Exhibit.CalendarExtension.urlPrefix = url.substr(0, url.indexOf("calendar-extension.js"));
        
        SimileAjax.parseURLParameters(url, Exhibit.CalendarExtension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
        
    if (Exhibit.CalendarExtension.params.bundle) {
        scriptURLs.push(Exhibit.CalendarExtension.urlPrefix + "calendar-extension-bundle.js");
        cssURLs.push(Exhibit.CalendarExtension.urlPrefix + "calendar-extension-bundle.css");
    } else {
        SimileAjax.prefixURLs(scriptURLs, Exhibit.CalendarExtension.urlPrefix + "scripts/", javascriptFiles);
        SimileAjax.prefixURLs(cssURLs, Exhibit.CalendarExtension.urlPrefix + "styles/", cssFiles);
    }
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();
