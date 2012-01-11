/*==================================================
 *  Default Unit
 *==================================================
 */

SimileAjax.NativeDateUnit = new Object();

SimileAjax.NativeDateUnit.makeDefaultValue = function() {
    return new Date();
};

SimileAjax.NativeDateUnit.cloneValue = function(v) {
    return new Date(v.getTime());
};

SimileAjax.NativeDateUnit.getParser = function(format) {
    if (typeof format == "string") {
        format = format.toLowerCase();
    }
    
    var parser = (format == "iso8601" || format == "iso 8601") ?
                    SimileAjax.DateTime.parseIso8601DateTime : 
                    SimileAjax.DateTime.parseGregorianDateTime;
                    
    return function(d) {
        if (typeof d != 'undefined' && typeof d.toUTCString == "function") {
            return d;
        } else {
            return parser(d);
        }
    };
};

SimileAjax.NativeDateUnit.parseFromObject = function(o) {
    return SimileAjax.DateTime.parseGregorianDateTime(o);
};

SimileAjax.NativeDateUnit.toNumber = function(v) {
    return v.getTime();
};

SimileAjax.NativeDateUnit.fromNumber = function(n) {
    return new Date(n);
};

SimileAjax.NativeDateUnit.compare = function(v1, v2) {
    var n1, n2;
    if (typeof v1 == "object") {
        n1 = v1.getTime();
    } else {
        n1 = Number(v1);
    }
    if (typeof v2 == "object") {
        n2 = v2.getTime();
    } else {
        n2 = Number(v2);
    }
    
    return n1 - n2;
};

SimileAjax.NativeDateUnit.earlier = function(v1, v2) {
    return SimileAjax.NativeDateUnit.compare(v1, v2) < 0 ? v1 : v2;
};

SimileAjax.NativeDateUnit.later = function(v1, v2) {
    return SimileAjax.NativeDateUnit.compare(v1, v2) > 0 ? v1 : v2;
};

SimileAjax.NativeDateUnit.change = function(v, n) {
    return new Date(v.getTime() + n);
};

