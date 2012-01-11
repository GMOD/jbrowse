/*==================================================
 *  Exhibit.BabelBasedImporter
 *==================================================
 */

Exhibit.BabelBasedImporter = {
    mimetypeToReader: {
        "application/rdf+xml" : "rdf-xml",
        "application/n3" : "n3",
        
        "application/msexcel" : "xls",
        "application/x-msexcel" : "xls",
        "application/x-ms-excel" : "xls",
        "application/vnd.ms-excel" : "xls",
        "application/x-excel" : "xls",
        "application/xls" : "xls",
        "application/x-xls" : "xls",
        
        "application/x-bibtex" : "bibtex"
    },
    babelTranslatorURL: "http://service.simile-widgets.org/babel/translator",
    
    _initialize: function() {
        var links = [];
        var heads = document.documentElement.getElementsByTagName("head");
        for (var h = 0; h < heads.length; h++) {
            var linkElmts = heads[h].getElementsByTagName("link");
            for (var l = 0; l < linkElmts.length; l++) {
                var link = linkElmts[l];
                if (link.rel.match(/\bexhibit\/babel-translator\b/)) {
                    Exhibit.BabelBasedImporter.babelTranslatorURL = link.href;
                }
            }
        }
        Exhibit.BabelBasedImporter._initialize = function() {}
    }
};

Exhibit.importers["application/rdf+xml"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/n3"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/msexcel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-msexcel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/vnd.ms-excel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-excel"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/xls"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-xls"] = Exhibit.BabelBasedImporter;
Exhibit.importers["application/x-bibtex"] = Exhibit.BabelBasedImporter;

Exhibit.BabelBasedImporter.load = function(link, database, cont) {
    Exhibit.BabelBasedImporter._initialize();
    
    var url = (typeof link == "string") ?
        Exhibit.Persistence.resolveURL(link) :
        Exhibit.Persistence.resolveURL(link.href);

    var reader = "rdf-xml";
    var writer = "exhibit-jsonp";
    if (typeof link != "string") {
        var mimetype = link.type;
        if (mimetype in Exhibit.BabelBasedImporter.mimetypeToReader) {
            reader = Exhibit.BabelBasedImporter.mimetypeToReader[mimetype];
        }
    }
    if (reader == "bibtex") {
        writer = "bibtex-exhibit-jsonp";
    }
    
    var babelURL = Exhibit.BabelBasedImporter.babelTranslatorURL + "?" + [
        "reader=" + reader,
        "writer=" + writer,
        "url=" + encodeURIComponent(url)
    ].join("&");

    return Exhibit.JSONPImporter.load(babelURL, database, cont);
};
