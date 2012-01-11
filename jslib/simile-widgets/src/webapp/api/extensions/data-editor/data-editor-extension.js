/*==================================================
 *  Simile Exhibit Data Editor Extension
 *==================================================
 */


(function() {
    var isCompiled = ("Exhibit_DataEditorExtension_isCompiled" in window) && 
                    window.Exhibit_DataEditorExtension_isCompiled;
                    
    Exhibit.DataEditorExtension = {
        params: {
            bundle: true
        } 
    };
	
	var javascriptFiles = [
        "data-editor.js" ,
		"editor.js" ,
		"jquery-ui-1.8.16.custom.min.js" ,
		"text-field.js" ,
		"number-field.js" ,
		"enum-field.js" ,
		"list-field.js" ,
		"ticklist-field.js"
    ];
    var cssFiles = [
        "data-editor.css" ,
		"jquery-ui-1.8.16.custom.css"
    ];
	
    var paramTypes = { bundle: Boolean };
    if (typeof Exhibit_DataEditorExtension_urlPrefix == "string") {
        Exhibit.DataEditorExtension.urlPrefix = Exhibit_DataEditorExtension_urlPrefix;
        if ("Exhibit_DataEditorExtension_parameters" in window) {
            SimileAjax.parseURLParameters(Exhibit_DataEditorExtension_parameters,
                                          Exhibit.DataEditorExtension.params,
                                          paramTypes);
        }
    } else {
        var url = SimileAjax.findScript(document, "/data-editor-extension.js");
        if (url == null) {
            SimileAjax.Debug.exception(new Error("Failed to derive URL prefix for Simile Exhibit Data Editor Extension code files"));
            return;
        }
        Exhibit.DataEditorExtension.urlPrefix = url.substr(0, url.indexOf("data-editor-extension.js"));
        
        var paramTypes = { bundle: Boolean };
        SimileAjax.parseURLParameters(url, Exhibit.DataEditorExtension.params, paramTypes);
    }
    
    var scriptURLs = [];
    var cssURLs = [];
        
    if (Exhibit.DataEditorExtension.params.bundle) {
        scriptURLs.push(Exhibit.DataEditorExtension.urlPrefix + "data-editor-extension-bundle.js");
        cssURLs.push(Exhibit.DataEditorExtension.urlPrefix + "data-editor-extension-bundle.css");
    } else {
        SimileAjax.prefixURLs(scriptURLs, Exhibit.DataEditorExtension.urlPrefix + "scripts/", javascriptFiles);
        SimileAjax.prefixURLs(cssURLs, Exhibit.DataEditorExtension.urlPrefix + "styles/", cssFiles);
    }
    
    for (var i = 0; i < Exhibit.locales.length; i++) {
        scriptURLs.push(Exhibit.DataEditorExtension.urlPrefix + "locales/" + Exhibit.locales[i] + "/data-editor-locale.js");
    };
    
    if (!isCompiled) {
        SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
        SimileAjax.includeCssFiles(document, "", cssURLs);
    }
})();
