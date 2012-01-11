Exhibit.AuthenticatedImporter = {
    _callbacks: {}
};

Exhibit.importers["application/authenticated"] = Exhibit.AuthenticatedImporter;

Exhibit.AuthenticatedImporter.constructURL = function() {
    return "https://www.google.com/accounts/AuthSubRequest?scope=http%3A%2F%2Fspreadsheets.google.com%2Ffeeds%2F&session=1&secure=0&next=" + window.location;
}

Exhibit.AuthenticatedImporter.load = function(link, database, cont) {
    
    // var params = SimileAjax.parseURLParameters();
    // 
    // if (!params.token) {
    //     window.location = Exhibit.AuthenticatedImporter.constructURL();
    // }
    // 
    
            
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);

    var fError = function(statusText, status, xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) cont();
    };
    
    var fDone = function(xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        try {
            var o = null;
            try {
                o = eval("(" + xmlhttp.responseText + ")");
            } catch (e) {
                Exhibit.UI.showJsonFileValidation(Exhibit.l10n.badJsonMessage(url, e), url);
            }
            
            if (o != null) {
                database.loadData(o, Exhibit.Persistence.getBaseURL(url));
            }
        } catch (e) {
            SimileAjax.Debug.exception(e, "Error loading Exhibit JSON data from " + url);
        } finally {
            if (cont) cont();
        }
    };

    Exhibit.UI.showBusyIndicator();
    SimileAjax.XmlHttp.get(url, fError, fDone);
};
