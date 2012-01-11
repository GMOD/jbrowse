/*
  RFC4180 gives specific rules for csv that seem as good to follow as any
  the only complexity arises from use of " as discussed there.  We don't yet 
  seem to obey the spec: 

  5.  Each field may or may not be enclosed in double quotes (however
  some programs, such as Microsoft Excel, do not use double quotes
  at all).  If fields are not enclosed with double quotes, then
  double quotes may not appear inside the fields.  For example:

  "aaa","bbb","ccc" CRLF
  zzz,yyy,xxx

  6.  Fields containing line breaks (CRLF), double quotes, and commas
  should be enclosed in double-quotes.  For example:

  "aaa","b CRLF
  bb","ccc" CRLF
  zzz,yyy,xxx

  7.  If double-quotes are used to enclose fields, then a double-quote
  appearing inside a field must be escaped by preceding it with
  another double quote.  For example:

  "aaa","b""bb","ccc"
*/

Exhibit.TsvImporter = {
};
Exhibit.CsvImporter = {
};
Exhibit.TsvCsvImporter = {
};


//the importer will be called with any of the following MIME types
Exhibit.importers["text/comma-separated-values"] = Exhibit.CsvImporter;
Exhibit.importers["text/csv"] = Exhibit.CsvImporter;
Exhibit.importers["text/tab-separated-values"] = Exhibit.TsvImporter;
Exhibit.importers["text/tsv"] = Exhibit.TsvImporter;

Exhibit.TsvImporter.parse = function(content, link, url) {
    return Exhibit.TsvCsvImporter.parse(content, link, url, "\t")
}
Exhibit.CsvImporter.parse = function(content, link, url) {
    return Exhibit.TsvCsvImporter.parse(content, link, url, ",")
}

Exhibit.TsvCsvImporter.parse = function(content, link, url, separator) {
    var url=link;
    var hasColumnTitles=true;
    var expressionString=null;

    if (typeof link != "string") {//link tag; get attributes
	url = link.href;
	expressionString = Exhibit.getAttribute(link, "properties"); 
	if (expressionString) {
	    //if properties specified in link, assume no column titles
	    //unless overridden by specifying hasColumnTitle=true
	    hasColumnTitles = Exhibit.getAttribute(link, "hasColumnTitles");
	    if (hasColumnTitles)
		hasColumnTitles = (hasColumnTitles.toLowerCase() == "true");
	}
    }
    var valueSeparator=Exhibit.getAttribute(link,"valueSeparator");

    var o = null;
    try {
        o = Exhibit.TsvCsvImporter._parseInternal(content, separator, expressionString, hasColumnTitles, valueSeparator); //text is converted to Exhibit JSON
    } catch (e) {
	SimileAjax.Debug.exception(e, "Error parsing tsv/csv from " + url);
    }
    return o;
}

Exhibit.TsvCsvImporter._parseInternal = function(text, separator, expressionString, hasColumnTitles, valueSeparator) {
    var data = Exhibit.TsvCsvImporter.CsvToArray(text, separator);
    var exprs= null;
    var propNames = [];
    var properties = [];

    if (hasColumnTitles) {
	exprs = data.shift();
    }
    if (expressionString) {
	exprs = expressionString.split(",");
	//can override header row from column titles 
    }
    if (!exprs) {
	SimileAjax.Debug.exception(new Error("No property names defined for tsv/csv file"));
    }
    for (i=0; i<exprs.length; i++) {
	var expr = exprs[i].split(":");
	propNames[i] = expr[0];
	if (expr.length > 1) {
	    properties[propNames[i]] = {valueType: expr[1]};
	}
    }
    var items=[];
    for (i=0; i<data.length; i++) {
	var row=data[i];
	var item={};
	var len=row.length > exprs.length ? row.length : exprs.length;
	for (j=0; j<len; j++) {
	    if (valueSeparator && (row[j].indexOf(valueSeparator) >= 0)) {
		row[j]=row[j].split(valueSeparator);
	    }
	    item[propNames[j]]=row[j];
	}
	items.push(item);
    }
    return {items: items, properties: properties}
}


Exhibit.TsvCsvImporter.CsvToArray =function(text,separator){
    var i;
    if (text.indexOf('"') < 0) { 
	//fast case: no quotes
	var lines=text.split(/\r?\n/);
	var items;
	for (i=0; i<lines.length; i++) {
	    if (lines[i].length > 0)
		output.push(lines[i].split(separator));
	} 
	return output;
    }

    /*end of early return from simple case.  
      below we have to handle strings with quotemarks
      single quotes alternately activate and deactivate quoting
      inside a quoted string, 
         commas and newlines aren't special
         a single quote is escaped as two quotes

      we want to split lines on newlines that are not "inside" quotes.  
      in other words, with an even number of quotes preceding

      we use a lookahead pattern at the end to avoid including the newline in the match
      and use nongreedy matching so we find ALL unquoted newlines
    */
    text = text.replace(/\r?\n/g,"\n"); //handle IE newline convention
    var lines=text.match(/([^"\n]|("[^"]*"))+?(?=\r?\n|$)/g);

    /*it would be nice to use the same trick for splitting fields
      unfortunately empty strings are meaningful field values in csv
      if we modify the above regexp to allow empty strings, 
         javascript regexp matching becomes complicated
	 http://www.regexguru.com/2008/04/watch-out-for-zero-length-matches/
      so we take a different approach

      \uFFFF is a "private use character" that will not appear in parsed text
      http://en.wikipedia.org/wiki/Mapping_of_Unicode_characters#Private_use_characters
    */
    
    var records=[];
    for (i=0; i<lines.length; i++) {
	if (lines[i].length > 0) {
	    records.push(lines[i]
			 //prepare to split at separator:
			 .replace(new RegExp(separator,"g"),'\uFFFF')
			 //but clean up quoted regions:
			 .replace(/"([^"]*"")*[^"]*"/g,
				  function(quoted) {
				      return quoted
				      //trim outer quotes
					  .slice(1,-1)
				      //bring back original quoted separator
					  .replace(/\uFFFF/g,separator)
				      //unescape quotes
					  .replace(/""/,'"')
				  })
			 .split('\uFFFF')
			);
	}
    }
return records;
}

