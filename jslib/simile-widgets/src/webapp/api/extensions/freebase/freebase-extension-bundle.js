

/* freebase-importer.js */
Exhibit.FreebaseImporter={};
Exhibit.importers["application/freebase"]=Exhibit.FreebaseImporter;
(function(){var $=SimileAjax.jQuery;
var parseQuery=function(link){return eval($(link).attr("ex:query"));
};
function rename(item,oldAttr,newAttr){if(item&&item[oldAttr]){item[newAttr]=item[oldAttr];
delete item[oldAttr];
}}var imageURLPrefix="http://www.freebase.com/api/trans/raw";
var imageType="/common/topic/image";
function extractImage(item,attr){var image=item[imageType];
if(image&&image.id){item[attr]=imageURLPrefix+image.id;
}delete item[imageType];
}var defaultResponseTransformer=function(response){return response.map(function(item){extractImage(item,"image");
rename(item,"name","label");
item.type="item";
return item;
});
};
var parseTransformer=function(link){var transformer=$(link).attr("ex:transformer");
return transformer?eval(transformer):defaultResponseTransformer;
};
var makeResponseHandler=function(database,respTransformer,cont){return function(resp){try{Exhibit.UI.hideBusyIndicator();
var processedResponse=respTransformer(resp);
var baseURL=Exhibit.Persistence.getBaseURL("freebase");
var data={"items":processedResponse};
database.loadData(data,baseURL);
}catch(e){SimileAjax.Debug.exception(e);
}finally{if(cont){cont();
}}};
};
Exhibit.FreebaseImporter.load=function(link,database,cont){var query=parseQuery(link);
var respTransformer=parseTransformer(link);
try{Exhibit.UI.showBusyIndicator();
var handler=makeResponseHandler(database,respTransformer,cont);
Metaweb.read(query,handler);
}catch(e){SimileAjax.Debug.exception(e);
if(cont){cont();
}}};
})();


/* metaweb.js */
var JSON=SimileAjax.JSON;
JSON.serialize=JSON.toJSONString;
Metaweb={};
Metaweb.HOST="http://www.freebase.com";
Metaweb.QUERY_SERVICE="/api/service/mqlread";
Metaweb.counter=0;
Metaweb.read=function(E,D){var F="_"+Metaweb.counter++;
Metaweb[F]=function(J){var I=J.qname;
if(I.code.indexOf("/api/status/ok")!=0){var H=I.messages[0];
throw H.code+": "+H.message;
}var G=I.result;
document.body.removeChild(A);
delete Metaweb[F];
D(G);
};
envelope={qname:{query:E}};
var C=encodeURIComponent(JSON.serialize(envelope));
var B=Metaweb.HOST+Metaweb.QUERY_SERVICE+"?queries="+C+"&callback=Metaweb."+F;
var A=document.createElement("script");
A.src=B;
document.body.appendChild(A);
};
