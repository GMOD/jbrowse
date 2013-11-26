
define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/store/util/QueryResults',
            'JBrowse/Util',
            'JBrowse/Store/Hash',
            'JBrowse/Model/Location'
        ],
        function(
            declare,
            array,
            QueryResults,
            Util,
            HashStore,
            Location
        ) {

return declare( HashStore,
{
    constructor: function( args ) {
        console.log("loading REST");
    },

    query: function( query, options ) {
        console.log("Query");
        require(["dojo/request/xhr"], function(xhr){
            xhr(("names?equals="+query.name).replace( /\*$/, '' ), {
            handleAs: "json"
            }).then(function(data){
                console.log(JSON.stringify(data))
            }, function(err){
                // Handle the error condition
            }, function(evt){
                // Handle a progress event from the request if the
                // browser supports XHR2
            });
        });
    },

    get: function( id ) {

    }
});
});
