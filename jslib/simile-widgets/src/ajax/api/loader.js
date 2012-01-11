(function() {
    if ("SimileWidgets_styles" in window) {
        var head = document.getElementsByTagName("head")[0];
        var styles = SimileWidgets_styles;
        for (var i = 0; i < styles.length; i++) {
            var link = document.createElement("link");
            link.href = styles[i];
            link.rel = "stylesheet";
            link.type = "text/css";
            head.appendChild(link);
        }
    }
    if ("SimileWidgets_scripts" in window) {
        var onLoad = window.SimileWidgets_onLoad;
        
        var scripts = SimileWidgets_scripts;
        var i = 0;
        var next = function() {
            if (i < scripts.length) {
                var url = scripts[i++];
                
                window.SimileWidgets_onLoad = arguments.callee;
                
                var script = document.createElement("script");
                script.src = url;
                script.type = "text/javascript";
                document.body.appendChild(script);
            } else {
                onLoad();
            }
        };
        next();
    }
})();