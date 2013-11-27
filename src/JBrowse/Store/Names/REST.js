
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
        console.log("loading REST");//dbg
        var data;
    },

    query: function( query, options ) {
        console.log("Query called");//dbg
        var thisB = this;
        require(["dojo/request/xhr"], function(xhr){
            xhr(("names?starts="+query.name).replace( /\*$/, '' ), {
            handleAs: "json"
            }).then(function(data){
                console.log(JSON.stringify(data));//dbg
                thisB.data = data;
            }, function(err){
                // Handle the error condition
            }, function(evt){
                // Handle a progress event from the request if the
                // browser supports XHR2
            });
        });
        return this.data;
    },

    get: function( id ) {
        console.log ("GET called"); //dbg
        var thisB = this;
        require(["dojo/request/xhr"], function(xhr){
            xhr(("names?equals="+query.name), {
            handleAs: "json"
            }).then(function(data){
                console.log(JSON.stringify(data));//dbg
                thisB.data = data;
            }, function(err){
            
            }, function(evt){
            
            });
        });
    }
});
});
