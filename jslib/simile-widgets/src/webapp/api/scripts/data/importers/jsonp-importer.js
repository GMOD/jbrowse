/*==================================================
 *  Exhibit.JSONPImporter
 *==================================================
 */

Exhibit.JSONPImporter = {
    _callbacks: {}
};
Exhibit.importers["application/jsonp"] = Exhibit.JSONPImporter;

// cont gets called with the original feed (so you can pick up details from the
// feed from user code that were of interest to you but not the exhibit itself,
// for instance). load returns the callback that the JSONP payload should call,
// so that even partial static JSONP implementations (with a fixed callback
// name) can assign that variable with the return value, and things will
// work out, as much as they can (i e concurrent requests can get mixed up).

Exhibit.JSONPImporter.getter = function(link, database, parser, cont) {
    var fConvert=function(json,url,link) {
	parser(json,link,url);
    }
    Exhibit.JSONPImporter.load(link, database, cont, fConvert);
}

Exhibit.JSONPImporter.load = function(
    link, database, cont, fConvert, staticJSONPCallback, charset
) {
    var url = link;
    if (typeof link != "string") {
        url = Exhibit.Persistence.resolveURL(link.href);
        fConvert = Exhibit.getAttribute(link, "converter");
        staticJSONPCallback = Exhibit.getAttribute(link, "jsonp-callback");
        charset = Exhibit.getAttribute(link, "charset");
    }
    if (typeof fConvert == "string") {
        var name = fConvert;
        name = name.charAt(0).toLowerCase() + name.substring(1) + "Converter";
        if (name in Exhibit.JSONPImporter) {
            fConvert = Exhibit.JSONPImporter[name];
        } else {
            try {
                fConvert = eval(fConvert);
            } catch (e) {
                fConvert = null;
                // silent
            }
        }
    }
    if (fConvert != null && "preprocessURL" in fConvert) {
        url = fConvert.preprocessURL(url);
    }

    var next = Exhibit.JSONPImporter._callbacks.next || 1;
    Exhibit.JSONPImporter._callbacks.next = next + 1;

    var callbackName = "cb" + next.toString(36);
    var callbackURL = url;
    if (callbackURL.indexOf("?") == -1)
        callbackURL += "?";

    var lastChar = callbackURL.charAt(callbackURL.length - 1);
    if (lastChar != "=") {
        if (lastChar != "&" && lastChar != "?")
            callbackURL += "&";
        callbackURL += "callback=";
    }

    var callbackFull = "Exhibit.JSONPImporter._callbacks." + callbackName;
    callbackURL += callbackFull;
    var cleanup = function( failedURL ) {
        try {
            Exhibit.UI.hideBusyIndicator();

            delete Exhibit.JSONPImporter._callbacks[callbackName+"_fail"];
            delete Exhibit.JSONPImporter._callbacks[callbackName];
            if (script && script.parentNode) {
                script.parentNode.removeChild(script);
            }
        } finally {
            if (failedURL) {
                prompt("Failed to load javascript file:", failedURL);
                cont && cont(undefined); // got no json! signal with undefined
            }
        }
    };

    Exhibit.JSONPImporter._callbacks[callbackName+"_fail"] = cleanup;
    Exhibit.JSONPImporter._callbacks[callbackName] = function(json) {
        try {
            cleanup(null);
            database.loadData(fConvert ? fConvert(json, url, link) : json,
                              Exhibit.Persistence.getBaseURL(url));
        } finally {
            if (cont) cont(json);
        }
    };
    if (staticJSONPCallback) { // fallback for partial JSONP support feeds
        callbackURL = url; // url callback parameter not supported; do not pass
        eval(staticJSONPCallback + "=" + callbackFull);
    }

    var fail = callbackFull + "_fail('"+ callbackURL +"');";
    var script = SimileAjax.includeJavascriptFile(document,
                                                  callbackURL,
                                                  fail,
                                                  charset);
    Exhibit.UI.showBusyIndicator();
    return Exhibit.JSONPImporter._callbacks[callbackName];
};

// Does 90% of the feed conversion for 90% of all (well designed) JSONP feeds.
// Pass the raw json object, an optional index to drill into to get at the
// array of items ("feed.entry", in the case of Google Spreadsheets -- pass
// null, if the array is already the top container, as in a Del.icio.us feed),
// an object mapping the wanted item property name to the properties to pick
// them up from, and an optional similar mapping with conversion callbacks to
// perform on the data value before storing it in the item property. These
// callback functions are invoked with the value, the object it was picked up
// from, its index in the items array, the items array and the feed as a whole
// (for the cases where you need to look up properties from the surroundings).
// Returning the undefined value your converter means the property is not set.
Exhibit.JSONPImporter.transformJSON = function(json, index, mapping, converters) {
    var objects = json, items = [];
    if (index) {
        index = index.split(".");
        while (index.length) {
            objects = objects[index.shift()];
        }
    }
    for (var i = 0, object; object = objects[i]; i++) {
        var item = {};
        for (var name in mapping) {
	    if (mapping.hasOwnProperty(name)) { // gracefully handle poisoned
		var index = mapping[name].split(".");      // Object.prototype
		for (var property=object; index.length && property;
		     property=property[index.shift()]) {}
		if (property && converters && converters.hasOwnProperty(name)) {
                    property = converters[name](property, object, i, objects, json);
		}
		if (typeof property != "undefined") {
                    item[name] = property;
		}
	    }
        }
        items.push(item);
    }
    return items;
};

Exhibit.JSONPImporter.deliciousConverter = function(json, url) {
    var items = Exhibit.JSONPImporter.transformJSON(json, null,
        { label:"u", note:"n", description:"d", tags:"t" });
    return { items:items, properties:{ url:{ valueType:"url" } } };
};

Exhibit.JSONPImporter.googleSpreadsheetsConverter = function(json, url, link) {
    var separator = ";";
    if ((link) && (typeof link != "string")) {
        var s = Exhibit.getAttribute(link, "separator");
        if (s != null && s.length > 0) {
            separator = s;
        }
    }
    
    var items = [];
    var properties = {};
    var types = {};
    var valueTypes = { "text" : true, "number" : true, "item" : true, "url" : true, "boolean" : true, "date" : true };

    var entries = json.feed.entry || []; // if no entries in feed
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var id = entry.id.$t;
        var c = id.lastIndexOf("C");
        var r = id.lastIndexOf("R");
        
        entries[i] = {
            row: parseInt(id.substring(r + 1, c)) - 1,
            col: parseInt(id.substring(c + 1)) - 1,
            val: entry.content.$t
        };
    };
    
    var cellIndex = 0;
    var getNextRow = function() {
        if (cellIndex < entries.length) {
            var firstEntry = entries[cellIndex++];
            var row = [ firstEntry ];
            while (cellIndex < entries.length) {
                var nextEntry = entries[cellIndex];
                if (nextEntry.row == firstEntry.row) {
                    row.push(nextEntry);
                    cellIndex++;
                } else {
                    break;
                }
            }
            return row;
        }
        return null;
    };
    
    var propertyRow = getNextRow();
    if (propertyRow != null) {
        var propertiesByColumn = [];
        for (var i = 0; i < propertyRow.length; i++) {
            var cell = propertyRow[i];
            
            var fieldSpec = cell.val.trim().replace(/^\{/g, "").replace(/\}$/g, "").split(":");
            var fieldName = fieldSpec[0].trim();
            var fieldDetails = fieldSpec.length > 1 ? fieldSpec[1].split(",") : [];
            
            var property = { single: false };
            
            for (var d = 0; d < fieldDetails.length; d++) {
                var detail = fieldDetails[d].trim();
                if (detail in valueTypes) {
                    property.valueType = detail;
                } else if (detail == "single") {
                    property.single = true;
                }
            }
            
            propertiesByColumn[cell.col] = fieldName;
            properties[fieldName] = property;
        }
        
        var row = null;
        while ((row = getNextRow()) != null) {
            var item = {};
            
            for (var i = 0; i < row.length; i++) {
                var cell = row[i];
                var fieldName = propertiesByColumn[cell.col];
                if (typeof fieldName == "string") {

                    // ensure round-trip iso8601 date strings through google docs
                    var googleDocsDateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
                    if (googleDocsDateRegex.exec(cell.val)) {
                        cell.val = Exhibit.Database.makeISO8601DateString(new Date(cell.val));
                    }

                    item[fieldName] = cell.val;
                    
                    var property = properties[fieldName];
                    if (!property.single) {
                        var fieldValues = cell.val.split(separator);
                        for (var v = 0; v < fieldValues.length; v++) {
                            fieldValues[v] = fieldValues[v].trim();
                        }
                        item[fieldName] = fieldValues;
                    } else {
                        item[fieldName] = cell.val.trim();
                    }
                }
            }
            
            items.push(item);
        }
    }
    
    return { types:types, properties:properties, items:items };
};

Exhibit.JSONPImporter.googleSpreadsheetsConverter.preprocessURL = function(url) {
    return url.replace(/\/list\//g, "/cells/");
};
