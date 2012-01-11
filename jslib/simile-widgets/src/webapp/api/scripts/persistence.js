/*======================================================================
 *  Persistence Utility Functions
 *======================================================================
 */
Exhibit.Persistence = {};

Exhibit.Persistence.getBaseURL = function(url) {
    // HACK: for some unknown reason Safari keeps throwing
    //      TypeError: no default value
    // when this function is called from the RDFa importer. So I put a try catch here.
    try {
        if (url.indexOf("://") < 0) {
            var url2 = Exhibit.Persistence.getBaseURL(document.location.href);
            if (url.substr(0,1) == "/") {
                url = url2.substr(0, url2.indexOf("/", url2.indexOf("://") + 3)) + url;
            } else {
                url = url2 + url;
            }
        }
        
        var i = url.lastIndexOf("/");
        if (i < 0) {
            return "";
        } else {
            return url.substr(0, i+1);
        }
    } catch (e) {
        return url;
    }
};

Exhibit.Persistence.resolveURL = function(url) {
    if (url.indexOf("://") < 0) {
        var url2 = Exhibit.Persistence.getBaseURL(document.location.href);
        if (url.substr(0,1) == "/") {
            url = url2.substr(0, url2.indexOf("/", url2.indexOf("://") + 3)) + url;
        } else if (url.substr(0,1) == "#") {
	    url2=document.location.href;
	    index=(url2+'#').indexOf("#");
	    url = url2.substr(0,index)+url;
	}
	else {
            url = url2 + url;
        }
    }
    return url;
};

Exhibit.Persistence.getURLWithoutQueryAndHash = function() {
    var url;
    if ("_urlWithoutQueryAndHash" in Exhibit) {
        url = Exhibit.Persistence._urlWithoutQueryAndHash;
    } else {
        url = document.location.href;
        
        var hash = url.indexOf("#");
        var question = url.indexOf("?");
        if (question >= 0) {
            url = url.substr(0, question);
        } else if (hash >= 0) {
            url = url.substr(0, hash);
        }
        
        Exhibit.Persistence._urlWithoutQueryAndHash = url;
    }
    return url;
};

Exhibit.Persistence.getURLWithoutQuery = function() {
    var url;
    if ("_urlWithoutQuery" in Exhibit.Persistence) {
        url = Exhibit.Persistence._urlWithoutQuery;
    } else {
        url = document.location.href;
        
        var question = url.indexOf("?");
        if (question >= 0) {
            url = url.substr(0, question);
        }
        
        Exhibit.Persistence._urlWithoutQuery = url;
    }
    return url;
};

Exhibit.Persistence.getItemLink = function(itemID) {
    return Exhibit.Persistence.getURLWithoutQueryAndHash() + "#" + encodeURIComponent(itemID);
};