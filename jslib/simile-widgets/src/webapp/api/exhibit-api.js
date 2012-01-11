/*==================================================
 *  Simile Exhibit API
 *
 *  Include Exhibit in your HTML file as follows:
 *    <script src="http://simile-widgets.org/exhibit/api/exhibit-api.js" type="text/javascript"></script>
 *
 *==================================================
 */

(function() {
    var isCompiled = ("Exhibit_isCompiled" in window) && window.Exhibit_isCompiled;
    
    var useLocalResources = false;
    var noAuthentication = false;
    

    if (document.location.search.length > 0) {
        var params = document.location.search.substr(1).split("&");
        for (var i = 0; i < params.length; i++) {
            if (params[i] == "exhibit-use-local-resources") {
                useLocalResources = true;
            }
            if (params[i] == 'exhibit-no-authentication') {
                noAuthentication = true;
            }
        }
    }

    var loadMe = function() {
        if (window.Exhibit && window.Exhibit.loaded) {
            return;
        }
	
	window.Exhibit = window.Exhibit || {};
        
        window.Exhibit.version =    "2.3.0",
        window.Exhibit.loaded =     false,
        window.Exhibit.params =     { bundle: !useLocalResources, authenticated: !noAuthentication, autoCreate: true, safe: false },
        window.Exhibit.namespace =  "http://simile.mit.edu/2006/11/exhibit#",
        window.Exhibit.importers =  {},
        window.Exhibit.locales =    [ "en" ]
    
        var javascriptFiles = [
            "exhibit.js",
            "persistence.js",
            "authentication.js",
            "util/set.js",
            "util/util.js",
            "util/settings.js",
            "util/views.js",
            "util/facets.js",
            "util/coders.js",
            
            "data/database.js",
            "data/expression.js",
            "data/expression-parser.js",
            "data/functions.js",
            "data/controls.js",
            "data/collection.js",
            
            "data/importers/authenticated-importer.js",
            "data/importers/exhibit-json-importer.js",
            "data/importers/html-table-importer.js",
            "data/importers/jsonp-importer.js",
            "data/importers/babel-based-importer.js",
            "data/importers/rdfa-importer.js",
            "data/importers/xml-importer.js",
            "data/importers/tsv-csv-importer.js",
            "data/importers/json-importer.js",
            
            "data/exporters/rdf-xml-exporter.js",
            "data/exporters/semantic-wikitext-exporter.js",
            "data/exporters/exhibit-json-exporter.js",
            "data/exporters/tsv-exporter.js",
            "data/exporters/bibtex-exporter.js",
            "data/exporters/facet-selection-exporter.js",
            
            "ui/ui.js",
            "ui/ui-context.js",
            "ui/lens.js",
            "ui/format-parser.js",
            "ui/formatter.js",
            "ui/coordinator.js",
            
            "ui/facets/list-facet.js",
            "ui/facets/numeric-range-facet.js",
            "ui/facets/text-search-facet.js",
            "ui/facets/cloud-facet.js",
            "ui/facets/hierarchical-facet.js",
            "ui/facets/image-facet.js",
	          "ui/facets/slider-facet.js",
	          "ui/facets/slider.js",
	          "ui/facets/alpha-range-facet.js",
      	    
            "ui/coders/color-coder.js",
            "ui/coders/default-color-coder.js",
            "ui/coders/color-gradient-coder.js",
            "ui/coders/size-coder.js",
            "ui/coders/size-gradient-coder.js",
            "ui/coders/icon-coder.js",
            
            "ui/widgets/logo.js",
            "ui/widgets/collection-summary-widget.js",
            "ui/widgets/resizable-div-widget.js",
            "ui/widgets/legend-widget.js",
            "ui/widgets/legend-gradient-widget.js",
            "ui/widgets/option-widget.js",
            "ui/widgets/toolbox-widget.js",
            
            "ui/views/view-panel.js",
            "ui/views/ordered-view-frame.js",
            "ui/views/tile-view.js",
            "ui/views/thumbnail-view.js",
            "ui/views/tabular-view.js",
            "ui/views/html-view.js"
        ];
        var cssFiles = [
            "exhibit.css",
            "browse-panel.css",
            "lens.css",
            
            "util/facets.css",
            "util/views.css",
            
            "widgets/collection-summary-widget.css",
            "widgets/resizable-div-widget.css",
            "widgets/legend-widget.css",
            "widgets/option-widget.css",
            "widgets/toolbox-widget.css",
            
            "views/view-panel.css",
            "views/tile-view.css",
            "views/thumbnail-view.css",
            "views/tabular-view.css"
        ];
        
        var includeMap = false;
        var includeTimeline = false;
        
        var defaultClientLocales = ("language" in navigator ? navigator.language : navigator.browserLanguage).split(";");
        for (var l = 0; l < defaultClientLocales.length; l++) {
            var locale = defaultClientLocales[l];
            if (locale != "en") {
                var segments = locale.split("-");
                if (segments.length > 1 && segments[0] != "en") {
                    Exhibit.locales.push(segments[0]);
                }
                Exhibit.locales.push(locale);
            }
        }

        var paramTypes = { bundle:Boolean, js:Array, css:Array, autoCreate:Boolean, safe:Boolean };
        if (typeof Exhibit_urlPrefix == "string") {
            Exhibit.urlPrefix = Exhibit_urlPrefix;
            if ("Exhibit_parameters" in window) {
                SimileAjax.parseURLParameters(Exhibit_parameters,
                                              Exhibit.params,
                                              paramTypes);
            }
        } else {
            var url = SimileAjax.findScript(document, "/exhibit-api.js");
            if (url == null) {
                Exhibit.error = new Error("Failed to derive URL prefix for Simile Exhibit API code files");
                return;
            }
            Exhibit.urlPrefix = url.substr(0, url.indexOf("exhibit-api.js"));
        
            SimileAjax.parseURLParameters(url, Exhibit.params, paramTypes);
        }
        
        /*
         * Enable logging
         */
        if (Exhibit.params.log) {
            SimileAjax.RemoteLog.logActive = true;
            SimileAjax.RemoteLog.url = SimileAjax.RemoteLog.defaultURL;
            if (Exhibit.params.logServer) {
                SimileAjax.RemoteLog.url = Exhibit.params.logServer;                
            }

            var dat = {"action":"ExhibitLoad"};
            for (k in Exhibit.params) {
                dat[k] = "" + Exhibit.params[k];
            }
            SimileAjax.RemoteLog.possiblyLog(dat);
        }
        
        if (useLocalResources) {
            Exhibit.urlPrefix = "http://127.0.0.1:8888/exhibit/api/";
        }

        if (Exhibit.params.locale) { // ISO-639 language codes,
            // optional ISO-3166 country codes (2 characters)
            if (Exhibit.params.locale != "en") {
                var segments = Exhibit.params.locale.split("-");
                if (segments.length > 1 && segments[0] != "en") {
                    Exhibit.locales.push(segments[0]);
                }
                Exhibit.locales.push(Exhibit.params.locale);
            }
        }
        if (Exhibit.params.gmapkey) {
            includeMap = true;
        }
        if (Exhibit.params.views) {
            var views = Exhibit.params.views.split(",");
            for (var j = 0; j < views.length; j++) {
                var view = views[j];                
                if (view == "timeline") {
                    includeTimeline = true;
                } else if (view == "map") {
                    includeMap = true;
                }
            }
        }

        var scriptURLs = Exhibit.params.js || [];
        var cssURLs = Exhibit.params.css || [];
                
        /*
         *  Core scripts and styles
         */
        if (Exhibit.params.bundle) {
            scriptURLs.push(Exhibit.urlPrefix + "exhibit-bundle.js");
            cssURLs.push(Exhibit.urlPrefix + "exhibit-bundle.css");
        } else {
            SimileAjax.prefixURLs(scriptURLs, Exhibit.urlPrefix + "scripts/", javascriptFiles);
            SimileAjax.prefixURLs(cssURLs, Exhibit.urlPrefix + "styles/", cssFiles);
        }
        
        /*
         *  Localization
         */
        for (var i = 0; i < Exhibit.locales.length; i++) {
            scriptURLs.push(Exhibit.urlPrefix + "locales/" + Exhibit.locales[i] + "/locale.js");
        };
        
        if (Exhibit.params.callback) {
            window.SimileAjax_onLoad = function() {
                eval(Exhibit.params.callback + "()");
            }
        } else if (Exhibit.params.autoCreate) {
            scriptURLs.push(Exhibit.urlPrefix + "scripts/create.js");
        }

        /*
         *  Extensions (for backward compatibility)
         */
        if (includeTimeline) {
            scriptURLs.push(Exhibit.urlPrefix + "extensions/time/time-extension.js");
        }
        if (includeMap) {
            scriptURLs.push(Exhibit.urlPrefix + "extensions/map/map-extension.js");
        }
        
        if (!isCompiled) {
            SimileAjax.includeJavascriptFiles(document, "", scriptURLs);
            SimileAjax.includeCssFiles(document, "", cssURLs);
        }
        
        Exhibit.loaded = true;
    };

    /*
     *  Load SimileAjax if it's not already loaded
     */
    if (typeof SimileAjax == "undefined" && !isCompiled) {
        window.SimileAjax_onLoad = loadMe;
        
        var url = useLocalResources ?
            "http://127.0.0.1:8888/ajax/api/simile-ajax-api.js?bundle=false" :
            "http://api.simile-widgets.org/ajax/2.2.3/simile-ajax-api.js";
          
        var createScriptElement = function() {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.language = "JavaScript";
            script.src = url;
            document.getElementsByTagName("head")[0].appendChild(script);
        }
        if (document.body == null) {
            try {
                document.write("<script src='" + url + "' type='text/javascript'></script>");
            } catch (e) {
                createScriptElement();
            }
        } else {
            createScriptElement();
        }
    } else {
        loadMe();
    }
})();
