/*==================================================
 *  This file is used to detect that all outstanding
 *  javascript files have been loaded. You can put
 *  a function reference into SimileAjax_onLoad
 *  to have it executed once all javascript files
 *  have loaded.
 *==================================================
 */
(function() {
    var substring = SimileAjax.urlPrefix + "scripts/signal.js";
    var heads = document.documentElement.getElementsByTagName("head");
    for (var h = 0; h < heads.length; h++) {
        var node = heads[h].firstChild;
        while (node != null) {
            if (node.nodeType == 1 && node.tagName.toLowerCase() == "script") {
                var url = node.src;
                var i = url.indexOf(substring);
                if (i >= 0) {
                    heads[h].removeChild(node); // remove it so we won't hit it again

                    var count = parseInt(url.substr(url.indexOf(substring) + substring.length + 1));
                    SimileAjax.loadingScriptsCount -= count;
                    if (SimileAjax.loadingScriptsCount == 0) {
                        var f = null;
                        if (typeof SimileAjax_onLoad == "string") {
                            f = eval(SimileAjax_onLoad);
                            SimileAjax_onLoad = null;
                        } else if (typeof SimileAjax_onLoad == "function") {
                            f = SimileAjax_onLoad;
                            SimileAjax_onLoad = null;
                        }
                        
                        if (f != null) {
                            f();
                        }
                    }
                    return;
                }
            }
            node = node.nextSibling;
        }
    }
})();
