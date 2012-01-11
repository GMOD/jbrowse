/*==================================================
 *  Simile Exhibit Map Extension
 *==================================================
 */

(function() {
    if (typeof(Exhibit)=="undefined") 
	alert("cannot load extensions before Exhibit");

    var isCompiled = ("Exhibit_MapExtension_isCompiled" in window) && 
                    window.Exhibit_MapExtension_isCompiled;
                
    Exhibit.MapExtension = {
        params: {
            bundle:     true,
            service:    "google"
        } 
    };

    var javascriptFiles = [
        "map-view.js",
        "vemap-view.js",
        "olmap-view.js"
    ];
    var cssFiles = [
        "map-view.css",
        "olmap-view.css"
    ];
    
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_MapExtension_urlPrefix == "string") {
        Exhibit.MapExtension.urlPrefix = Exhibit_MapExtension_urlPrefix;
        if ("Exhibit_MapExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_MapExtension_parameters,
                                          Exhibit.MapExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/map-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Map Extension code files"));
            return;
        }
        Exhibit.MapExtension.urlPrefix = url.substr(0, url.indexOf("map-extension.js"));
        
        SimileAjax.parseURLParameters(url, Exhibit.MapExtension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
        
    if ((Exhibit.MapExtension.params.service == "google") &&
	!("google" in window && "maps" in window.google)) {
	scriptURLs.push("http://maps.googleapis.com/maps/api/js?sensor=false");
    } else if (Exhibit.MapExtension.params.service == "openlayers") {
	scriptURLs.push("http://www.openlayers.org/api/OpenLayers.js");
        scriptURLs.push("http://www.openstreetmap.org/openlayers/OpenStreetMap.js");
    } else {
        scriptURLs.push("http://dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=5");
    }
    
    if (Exhibit.MapExtension.params.bundle) {
        scriptURLs.push(Exhibit.MapExtension.urlPrefix + "map-extension-bundle.js");
        cssURLs.push(Exhibit.MapExtension.urlPrefix + "map-extension-bundle.css");
    } else {
        SimileAjax.prefixURLs(scriptURLs, Exhibit.MapExtension.urlPrefix + "scripts/", javascriptFiles);
        SimileAjax.prefixURLs(cssURLs, Exhibit.MapExtension.urlPrefix + "styles/", cssFiles);
    }
    
    for (var i = 0; i < Exhibit.locales.length; i++) {
        scriptURLs.push(Exhibit.MapExtension.urlPrefix + "locales/" + Exhibit.locales[i] + "/map-locale.js");
    };
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();
