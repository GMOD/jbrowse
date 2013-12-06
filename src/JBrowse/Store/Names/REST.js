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
        console.log("loading REST");//dbg
        var data;
    },

    query: function( query, options ) {
        console.log("Query called");//dbg
        var thisB = this;
        return xhr(("names?starts="+query.name).replace( /\*$/, '' ), {
            handleAs: "json"
        }).then(function(data){
            console.log(JSON.stringify(data));//dbg
            return QueryResults( data );
        }, function(err){
            // Handle the error condition
        }, function(evt){
            // Handle a progress event from the request if the
            // browser supports XHR2
        });
    },

    get: function( id ) {
        console.log ("GET called"); //dbg
        return this.query(id);
    }
});
});
