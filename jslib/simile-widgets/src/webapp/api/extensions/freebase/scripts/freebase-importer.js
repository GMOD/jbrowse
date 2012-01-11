/*==================================================
 *  Exhibit.FreebaseImporter
 *==================================================
 */
 
Exhibit.FreebaseImporter = {};
Exhibit.importers["application/freebase"] = Exhibit.FreebaseImporter;

(function() {

var $ = SimileAjax.jQuery;

var parseQuery = function(link) {
    return eval($(link).attr('ex:query'));
}

function rename(item, oldAttr, newAttr) {
    if (item && item[oldAttr]) {
        item[newAttr] = item[oldAttr];
        delete item[oldAttr];
    }
}

var imageURLPrefix = 'http://www.freebase.com/api/trans/raw';
var imageType = "/common/topic/image";

function extractImage(item, attr) {
    var image = item[imageType];
    
    if (image && image.id) { 
        item[attr] = imageURLPrefix + image.id;
    }
    
    delete item[imageType];
}

var defaultResponseTransformer = function(response) {
    return response.map(function(item) {
        extractImage(item, 'image')
        rename(item, 'name', 'label');
        item.type = "item";
        return item;
    });
}

var parseTransformer = function(link) {
    var transformer = $(link).attr('ex:transformer');
    return transformer ? eval(transformer) : defaultResponseTransformer;
}

var makeResponseHandler = function(database, respTransformer, cont) {
    return function(resp) {
        try {
            Exhibit.UI.hideBusyIndicator();

            var processedResponse = respTransformer(resp);
            var baseURL = Exhibit.Persistence.getBaseURL('freebase');

            var data = {
                "items": processedResponse
            }
            
            database.loadData(data, baseURL);
        } catch (e) {
            SimileAjax.Debug.exception(e);
        } finally {
            if (cont) { cont(); }
        }
        
    }
}

Exhibit.FreebaseImporter.load = function(link, database, cont) {
    var query = parseQuery(link);
    var respTransformer = parseTransformer(link);
    try {
        Exhibit.UI.showBusyIndicator();
        var handler = makeResponseHandler(database, respTransformer, cont);
        Metaweb.read(query, handler);
    } catch (e) {
        SimileAjax.Debug.exception(e);
        if (cont) { cont(); }
    }
};

})();