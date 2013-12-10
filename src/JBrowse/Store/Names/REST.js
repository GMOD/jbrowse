define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/store/util/QueryResults',
            'JBrowse/Store/Hash',
            'JBrowse/Model/Location',
            'dojo/request/xhr'
        ],
        function(
            declare,
            array,
            QueryResults,
            HashStore,
            Location,
            xhr
        ) {

return declare( HashStore,
{
    constructor: function( args ) {
        var data;
    },

    query: function( query, options ) {
        var thisB = this;
        return xhr(("names?starts="+query.name), {
            handleAs: "json"
        }).then(function(data){
            for (var i = 0; i < data.length; i++){
                var dat = data[i];
                var loc = data[i].location;
                dat.label = dat.name+"<span class=\"locString\">"+loc.ref+":"+loc.start+".."+loc.end+"("+dat.name+")</span>";
            }
            return QueryResults( data );
        }, function(err){
            // Handle the error condition
        }, function(evt){
            // Handle a progress event from the request if the
            // browser supports XHR2
        });
    },

    get: function( id ) {
        return this.query(id, undefined);
    }
});
});
