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
        return xhr((thisB.browser.config.names.url+"?starts="+query.name), {
            handleAs: "json",
        }).then(function(data){
            for (var i = 0; i < data.length; i++){
                var dat = data[i];
                dat.label = dat.name + (dat.location ? 
                    '<span class="locString">'+dat.location.ref+":"+dat.location.start+".."+dat.location.end+"("+dat.name+")</span>"
                    : "");
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
