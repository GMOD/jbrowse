define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',

           'JBrowse/ConfigAdaptor/JB_json_v1'
       ],
       function(
           declare,
           lang,
           array,

           JB_json
       ) {
return declare( [JB_json], {

parse_conf: function( text, load_args ) {
    var section, key, value;
    var data = {};

    array.forEach( text.split("\n"), function( line ) {
        line = line.replace(/#.+/,'');
        var match;

        // new section
        if(( match = line.match( /^\s*\[([^\]]+)/ ))) { // new section
            section = match[1].trim().split(/\s*[\/\.]\s*/);
            if( section.length == 1 && section[0].toLowerCase() == 'general' )
                section = [];
        }
        // new value
        else if(( match = line.match( value == undefined ? /^([^=]+)=(.*)/ : /^(\S[^=]+)=(.*)/ ))) {
            key = match[1].trim();
            value = match[2].trim();
            if( /^[\+\-]?[\d\.,]+([eE][\-\+]?\d+)?$/.test(value) ) // parseFloat if it looks numeric
                value = parseFloat( value.replace(/,/g,'') );

            lang.setObject( section.concat(key).join('.'), value, data );
        }
        // add to existing value
        else if( value !== undefined && (match = line.match( /^\s+(\S.+)/ ))) {
            value += value.length ? ' '+match[1].trim() : match[1].trim();

            lang.setObject( section.concat(key).join('.'), value, data );
        }
        // done with last value
        else {
            key = value = undefined;
        }
    },this);

    return data;
}

});
});
