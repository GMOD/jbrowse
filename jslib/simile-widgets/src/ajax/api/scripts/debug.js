/*==================================================
 *  Debug Utility Functions
 *==================================================
 */

SimileAjax.Debug = {
    silent: false
};

SimileAjax.Debug.log = function(msg) {
    var f;
    if ("console" in window && "log" in window.console) { // FireBug installed
        f = function(msg2) {
            console.log(msg2);
        }
    } else {
        f = function(msg2) {
            if (!SimileAjax.Debug.silent) {
                alert(msg2);
            }
        }
    }
    SimileAjax.Debug.log = f;
    f(msg);
};

SimileAjax.Debug.warn = function(msg) {
    var f;
    if ("console" in window && "warn" in window.console) { // FireBug installed
        f = function(msg2) {
            console.warn(msg2);
        }
    } else {
        f = function(msg2) {
            if (!SimileAjax.Debug.silent) {
                alert(msg2);
            }
        }
    }
    SimileAjax.Debug.warn = f;
    f(msg);
};

SimileAjax.Debug.exception = function(e, msg) {
    var f, params = SimileAjax.parseURLParameters();
    if (params.errors == "throw" || SimileAjax.params.errors == "throw") {
        f = function(e2, msg2) {
            throw(e2); // do not hide from browser's native debugging features
        };
    } else if ("console" in window && "error" in window.console) { // FireBug installed
        f = function(e2, msg2) {
            if (msg2 != null) {
                console.error(msg2 + " %o", e2);
            } else {
                console.error(e2);
            }
            throw(e2); // do not hide from browser's native debugging features
        };
    } else {
        f = function(e2, msg2) {
            if (!SimileAjax.Debug.silent) {
                alert("Caught exception: " + msg2 + "\n\nDetails: " + ("description" in e2 ? e2.description : e2));
            }
            throw(e2); // do not hide from browser's native debugging features
        };
    }
    SimileAjax.Debug.exception = f;
    f(e, msg);
};

SimileAjax.Debug.objectToString = function(o) {
    return SimileAjax.Debug._objectToString(o, "");
};

SimileAjax.Debug._objectToString = function(o, indent) {
    var indent2 = indent + " ";
    if (typeof o == "object") {
        var s = "{";
        for (n in o) {
            s += indent2 + n + ": " + SimileAjax.Debug._objectToString(o[n], indent2) + "\n";
        }
        s += indent + "}";
        return s;
    } else if (typeof o == "array") {
        var s = "[";
        for (var n = 0; n < o.length; n++) {
            s += SimileAjax.Debug._objectToString(o[n], indent2) + "\n";
        }
        s += indent + "]";
        return s;
    } else {
        return o;
    }
};
