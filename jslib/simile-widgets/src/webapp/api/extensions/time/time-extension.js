/*==================================================
 *  Simile Exhibit Time Extension
 *==================================================
 */

(function() {
    if (typeof(Exhibit)=="undefined") 
	alert("cannot load extensions before Exhibit");

    var isCompiled = ("Exhibit_TimeExtension_isCompiled" in window) && 
                    window.Exhibit_TimeExtension_isCompiled;

    Exhibit.TimeExtension = {
        params: {
            bundle: true
        } 
    };

    var javascriptFiles = [
        "timeline-view.js"
    ];
    var cssFiles = [
        "timeline-view.css"
    ];
        
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_TimeExtension_urlPrefix == "string") {
        Exhibit.TimeExtension.urlPrefix = Exhibit_TimeExtension_urlPrefix;
        if ("Exhibit_TimeExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_TimeExtension_parameters,
                                          Exhibit.TimeExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/time-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Time Extension code files"));
            return;
        }
        Exhibit.TimeExtension.urlPrefix = url.substr(0, url.indexOf("time-extension.js"));
        
        var paramTypes = { bundle: Boolean };
        SimileAjax.parseURLParameters(url, Exhibit.TimeExtension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
    
    if (!("Timeline" in window)) {
        scriptURLs.push("http://api.simile-widgets.org/timeline/2.3.1/timeline-api.js?bundle=true");
    }
        
    if (Exhibit.TimeExtension.params.bundle) {
        scriptURLs.push(Exhibit.TimeExtension.urlPrefix + "time-extension-bundle.js");
        cssURLs.push(Exhibit.TimeExtension.urlPrefix + "time-extension-bundle.css");
    } else {
        SimileAjax.prefixURLs(scriptURLs, Exhibit.TimeExtension.urlPrefix + "scripts/", javascriptFiles);
        SimileAjax.prefixURLs(cssURLs, Exhibit.TimeExtension.urlPrefix + "styles/", cssFiles);
    }
    
    for (var i = 0; i < Exhibit.locales.length; i++) {
        scriptURLs.push(Exhibit.TimeExtension.urlPrefix + "locales/" + Exhibit.locales[i] + "/time-locale.js");
    };
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();
