/*==================================================
 *  Exhibit.RDFaImporter
 *  author: Keith Alexander (with the assistance of Johan Sundström and Ben Adida)
 *==================================================
 */

var RDFA = new Object();
RDFA.url = 'http://www.w3.org/2006/07/SWD/RDFa/impl/js/20070301/rdfa.js';

Exhibit.RDFaImporter = {
};

Exhibit.importers["application/RDFa"] = Exhibit.RDFaImporter;

Exhibit.RDFaImporter.load = function(link, database, cont) {
    try {
        if ((link.getAttribute('href') || "").length == 0) {
            // use current document
            // not sure what to do about hiding the existing content -  how to know what is exhibit markup, and what isn't?
            Exhibit.RDFaImporter.loadRDFa(null, document, database);
        } else {
            iframe = document.createElement("iframe");
            iframe.style.display = 'none';
            iframe.setAttribute('onLoad', 'Exhibit.RDFaImporter.loadRDFa(this, this.contentDocument, database)');
            iframe.src = link.href
            document.body.appendChild(iframe);
        }
    } catch (e) {
        SimileAjax.Debug.exception(e);
    } finally {
        if (cont) {
            cont();
        }
    }
};

Exhibit.RDFaImporter.loadRDFa = function(iframe, rdfa, database) {
    // helper functions
    var textOf = function(n) { return n.textContent || n.innerText || ""; };
    var readAttributes = function (node, attributes) {
        var result = {}, found = false, attr, value, i;
        for (i = 0; attr = attributes[i]; i++) {
            value = Exhibit.getAttribute(node, attr);
            if (value) {
                    result[attr] = value;
                    found = true;
            }
        }
        return found && result;
    };
    
    // callback when the RDF/A parsing is done.
    RDFA.CALLBACK_DONE_PARSING = function() {
        if (iframe != null) {
            document.body.removeChild(iframe);
        }
        
        this.cloneObject = function (what) {
            for (var i in what) {
                this[i] = what[i];
            }
        };
        
        var triples = this.triples;
        var parsed = { "classes": {}, "properties": {},"items": [] };
        for (var i in triples) {
            var item = {};
            
            item['id'], item['uri'], item['label'] = i; // shouldn't have to do this, not sure if it's been fixed in the exporter or not yet
            
            var tri = triples[i];
            for (var j in tri) {
                for (var k = 0; k < tri[j].length; k++)  {
                    if (tri[j][k].predicate.ns) {
                        var p_label = tri[j][k].predicate.ns.prefix+':'+tri[j][k].predicate.suffix;
                        
                        //item[p_label] = tri[j][k]['object'];
                        
                        if (j == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')  {
                            try {
                                var type_uri = tri[j][k]['object'];
                                var matches = type_uri.match(/(.+?)(#|\/)([a-zA-Z_]+)?$/);
                                var type_label = matches[3]+'('+matches[1]+')';
                                parsed['classes'][type_label] = {"label":type_label,"uri": type_uri}
                                item['type'] = type_label;
                            } catch(e) {
                                //ERRORS GO HERE
                            };
                        } else {
                            parsed['properties'][p_label] = { "uri": j, "label": tri[j][k]['predicate']['suffix'] };
                            try {
                                if (!item[p_label]) {
                                    item[p_label] = [];
                                }
                                item[p_label].push(tri[j][k]['object']);
                            } catch(e) {
                                SimileAjax.Debug.log("problem adding property value: " + e);
                            }
                            
                            if (j == 'http://purl.org/dc/elements/1.1/title' || 
                                j == 'http://www.w3.org/2000/01/rdf-schema#' || 
                                j == 'http://xmlns.com/foaf/0.1/name') {
                                item.label = item[p_label];
                            }
                        }
                    } 
                    else { 
                        item[j] = tri[j][k]['object']; 
                    }
                }
            }
            
            parsed['items'].push(new this.cloneObject(item));
        }
        database.loadData(parsed, Exhibit.Persistence.getBaseURL(document.location.href));
    }

    // callback when the RDF/A loading is done.
    RDFA.CALLBACK_DONE_LOADING = function() {
        RDFA.parse(rdfa);
    };

    /**
     * Dynamically include the 
     *
     *      RDFa Javascript parser
     *
     *      Ben Adida - ben@mit.edu
     *      2006-03-21
     *      2006-05-22 moved to W3C
     *
     *      licensed under GPL v2
     *
     * Dynamic include nullifies license incompatibility.
     */
    
    SimileAjax.includeJavascriptFile(document, RDFA.url);
};
