/*==================================================
 *  Platform Utility Functions and Constants
 *==================================================
 */

/*  This must be called after our jQuery has been loaded 
    but before control returns to user-code.
*/


/*==================================================
 *  REMEMBER to update the Version!
 *==================================================
 */
SimileAjax.version = '2.2.1';

SimileAjax.jQuery = jQuery.noConflict(true);
if (typeof window["$"] == "undefined") {
    window.$ = SimileAjax.jQuery;
}

SimileAjax.Platform.os = {
    isMac:   false,
    isWin:   false,
    isWin32: false,
    isUnix:  false
};
SimileAjax.Platform.browser = {
    isIE:           false,
    isNetscape:     false,
    isMozilla:      false,
    isFirefox:      false,
    isOpera:        false,
    isSafari:       false,

    majorVersion:   0,
    minorVersion:   0
};

(function() {
    var an = navigator.appName.toLowerCase();
	var ua = navigator.userAgent.toLowerCase(); 
    
    /*
     *  Operating system
     */
	SimileAjax.Platform.os.isMac = (ua.indexOf('mac') != -1);
	SimileAjax.Platform.os.isWin = (ua.indexOf('win') != -1);
	SimileAjax.Platform.os.isWin32 = SimileAjax.Platform.isWin && (   
        ua.indexOf('95') != -1 || 
        ua.indexOf('98') != -1 || 
        ua.indexOf('nt') != -1 || 
        ua.indexOf('win32') != -1 || 
        ua.indexOf('32bit') != -1
    );
	SimileAjax.Platform.os.isUnix = (ua.indexOf('x11') != -1);
    
    /*
     *  Browser
     */
    SimileAjax.Platform.browser.isIE = (an.indexOf("microsoft") != -1);
    SimileAjax.Platform.browser.isNetscape = (an.indexOf("netscape") != -1);
    SimileAjax.Platform.browser.isMozilla = (ua.indexOf("mozilla") != -1);
    SimileAjax.Platform.browser.isFirefox = (ua.indexOf("firefox") != -1);
    SimileAjax.Platform.browser.isOpera = (an.indexOf("opera") != -1);
    SimileAjax.Platform.browser.isSafari = (an.indexOf("safari") != -1);
    
    var parseVersionString = function(s) {
        var a = s.split(".");
        SimileAjax.Platform.browser.majorVersion = parseInt(a[0]);
        SimileAjax.Platform.browser.minorVersion = parseInt(a[1]);
    };
    var indexOf = function(s, sub, start) {
        var i = s.indexOf(sub, start);
        return i >= 0 ? i : s.length;
    };
    
    if (SimileAjax.Platform.browser.isMozilla) {
        var offset = ua.indexOf("mozilla/");
        if (offset >= 0) {
            parseVersionString(ua.substring(offset + 8, indexOf(ua, " ", offset)));
        }
    }
    if (SimileAjax.Platform.browser.isIE) {
        var offset = ua.indexOf("msie ");
        if (offset >= 0) {
            parseVersionString(ua.substring(offset + 5, indexOf(ua, ";", offset)));
        }
    }
    if (SimileAjax.Platform.browser.isNetscape) {
        var offset = ua.indexOf("rv:");
        if (offset >= 0) {
            parseVersionString(ua.substring(offset + 3, indexOf(ua, ")", offset)));
        }
    }
    if (SimileAjax.Platform.browser.isFirefox) {
        var offset = ua.indexOf("firefox/");
        if (offset >= 0) {
            parseVersionString(ua.substring(offset + 8, indexOf(ua, " ", offset)));
        }
    }
    
    if (!("localeCompare" in String.prototype)) {
        String.prototype.localeCompare = function (s) {
            if (this < s) return -1;
            else if (this > s) return 1;
            else return 0;
        };
    }
})();

SimileAjax.Platform.getDefaultLocale = function() {
    return SimileAjax.Platform.clientLocale;
};