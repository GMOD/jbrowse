/*==================================================
 *  Exhibit.HtmlTableImporter
 *==================================================
 */

Exhibit.HtmlTableImporter = {};
Exhibit.importers["text/html"] = Exhibit.HtmlTableImporter;


Exhibit.ProxyGetter = function(link, database, parser, cont) {
    var url = typeof link == "string" ? link : link.href;
    if (typeof link != "string") {
        var xpath = link.getAttribute('ex:xpath'); 
    }
    var babelURL = "http://service.simile-widgets.org/babel/html-extractor?" +
        "url=" + encodeURIComponent(url);
    if (xpath) babelURL += "xpath=" + xpath;
    var fConvert = function(string) {
	//babel returns desired elements inside BODY tags
        var div = document.createElement("div");
        div.innerHTML = string;
        var e = div.firstChild;

	var string=string.slice(string.search(/<BODY>/)+6, string.search(/<\/BODY>/));
        return parser(string, link);
    }
    return Exhibit.JSONPImporter.load(babelURL, database, cont, fConvert);
}

Exhibit.HtmlTableImporter.parse = function(table, link, url) {
    var $=SimileAjax.jQuery; //since we'll use it a lot

    //table can be a string or a dom element
    var jq=$(table);
    table = jq.get(0); //now table is for sure of type Element

    var readAttributes = function( node, attributes ) {
        var result = {}, found = false, attr, value, i;
        for( i = 0; attr = attributes[i]; i++ ) {
            value = Exhibit.getAttribute( node, attr );
            if( value ) {
                        result[attr] = value;
                        found = true;
            }
        }
        return found && result;
    }

    // FIXME: it's probably a better idea to ask database.js for these lists:
    var typelist = [ "uri", "label", "pluralLabel" ];
    var proplist = [ "uri", "valueType", // [text|number|date|boolean|item|url|textwithlink]
                     "label", "reverseLabel",
                     "pluralLabel", "reversePluralLabel",
                     "groupingLabel", "reverseGroupingLabel" ];
    var columnProplist = [ "valueParser", "arity", "hrefProperty", "srcProperty" ];


    var types={}, properties={};

    var type = Exhibit.getAttribute(link,'itemType');
    var typeSchema = type && readAttributes( link, typelist );
    var separator = Exhibit.getAttribute(link, "separator") || ';';
    if( typeSchema ) {
        types[type] = types;
    }
    

    /*heuristic for identifying property names
      The first one to succeed wins.

      First look for ex:columns identifier in link
      Then look for <col> tags with ex:property attributes
      Then look in first <tr> for either <th> or <td> tags
         First check ex:property attribute
	 If none, use text content of each tr/th

      If after all this a particular col has no property, don't parse it

    */
    
    var columns = Exhibit.getAttribute(link, 'property');
    var columnAttrs=[]; //rules for parsing each col
    var headerRow=Exhibit.getAttribute(link,"headerRow");
    if (columns) {
	columns=columns.split(',');
    } else {
	var hasProps = function() {
	    return Exhibit.getAttribute(this,'property');
	}
	if (jq.find("col").filter(hasProps).length > 0) {
	    columns = jq.find("col");
	}
	else {
	    //assume top row is property names
	    headerRow=true;
	    columns = jq.find("tr").eq(0).children();
	}
	columns = columns.map(function(i) {
	    var property = Exhibit.getAttribute(this, 'property') ||
		$(this).text(); //should never be null/undefined but maybe ""
	    var propSchema=readAttributes(this, proplist);
	    if (propSchema && property) {
		properties[property]=propSchema;
	    }
	    columnAttrs[i]=readAttributes(this,columnProplist) || {};
	    return property;
	}).get();
    }

    //now parse the rows
    var rows=jq.find("tr");
    if (headerRow) {
	rows=rows.slice(1);
    }
    rows=rows.filter(":has(td)");
    var parseRow = function() {
	var item={};
	var fields=$("td",this);
	fields.each(function(i) {
	    var prop=columns[i];
	    if (prop) {//parse this property
		var attrs=columnAttrs[i];
		if (attrs.valueParser) {
		    item[prop]=attrs.valueParser(this);
		}
		else {
		    if (attrs.hrefProperty || 
			attrs.srcProperty) {
			//user is extracting links
			//so can template own html with links from data
			//so clean up the contents to just text
			item[prop]=$(this).text();
		    } 
		    else {
			//keep html if not separately parsing links
			item[prop]=$(this).html();
		    }
		    if (attrs.arity != "single") {
			item[prop]=item[prop].split(separator);
		    }
		}
	    }
	    if (attrs.hrefProperty) {
		item[attrs.hrefProperty]=$("[href]",this).attr("href");
	    }
	    if (attrs.srcProperty) {
		item[attrs.srcProperty]=$("[src]",this).attr("src");
	    }
	    if (type) {
		item.type=type;
	    }
	});
	return item;
    }
    var items=rows.map(parseRow).get();
		    
    return( {types:types, properties: properties, items:items}) ;
};
