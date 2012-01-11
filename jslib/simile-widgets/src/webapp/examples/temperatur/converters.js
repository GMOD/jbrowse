function format_time( t ) {
    function p( x ){ return x<10 ? '0'+x : x; };
    t = new Date( t*1e3 );
    var Y = t.getFullYear(), M = t.getMonth() + 1, D = t.getDate();
    var h = t.getHours(), m = t.getMinutes();// s = t.getSeconds();
    return Y+'-'+p(M)+'-'+p(D) + ' ' + p(h)+':'+p(m);
}

function name_label( ort, item ) {
    var name = [ort];
    if( item.stadsdel ) {
        name.unshift( item.stadsdel );
/*      if( item.kommun == ort )
            name.pop();
*/
    }
    return name.join(', ');
}

var landsdel = {}, landskap = {}; // Kludge (facet must be a direct property)

function geoconv( json, url ) {
    var items = json.items, item, name;
    for( var i = 0; item = items[i]; i++ ) {
        if( item.type == 'Landskap' ) {
            item['län'] = item['län'].split(';');
            for( var j = 0; name = item['län'][j]; j++ ) { // Kludge
                landsdel[name] = item.landsdel;
                landskap[name] = item.label;
            }
        }
    }
    return json;
}

// Kludge: the landskap/landsdel properties here are needed to make them facets
function tnuconv( json, url ) {
    var map = {id:'id', ort:'ort', temp:'temperatur', time:'last_update',
            lat:'latitud', lon:'longitud', kommun:'kommun', 'län':'län',
            label:'ort', stadsdel:'stadsdel', 'type':'id', landsdel:'län',
            ok:'temperatur', weather:'weatherstation_url', landskap:'län',
            desc:'desc', url:'homepage_url', interval:'fetch_intervall' };
    var conv = { label:name_label, time:format_time,
            landsdel:function(l){ return landsdel[l.replace(' L',' l')]; },
            landskap:function(l){ return landskap[l.replace(' L',' l')]; },
            type:function(){ return 'Plats'; },
            temp:function(t){ return t === null ? undefined : t; },
            ok:function(t){ return t !== null ? 'Ja' : 'Nej'; } };
    var items = Exhibit.JSONPImporter.transformJSON( json, 'platser', map, conv );
    var props = { temp:{ valueType:'number', label:'temperatur (°C)' },
            ok:{ _valueType:'boolean', label:'levererar mätdata' },
            url:{ valueType:'url', label:'hemsida' },
            time:{ valueType:'date' },
            weather:{ valueType:'url', label:'vädersida' } };
    return { items:items, properties:props,
        types:{ Plats:{ pluralLabel:'Platser' } } };
}
