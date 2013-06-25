define([ 'dojo/_base/declare',
         'JBrowse/Store/SeqFeature',
         'JBrowse/Util',
         'dojo/io-query'
       ],
       function( declare, SeqFeatureStore, Util, ioQuery ) {

return declare( SeqFeatureStore,

/**
 * @lends JBrowse.Store.SeqFeature.SPARQL
 */
{


    /**
     * JBrowse feature backend to retrieve features from a SPARQL endpoint.
     * @constructs
     */
    constructor: function(args) {
        this.url = this.urlTemplate;
        this.refSeq = args.refSeq;
        this.baseUrl = args.baseUrl;
        this.density = 0;
        this.url = Util.resolveUrl(
            this.baseUrl,
            Util.fillTemplate( args.urlTemplate,
                               { 'refseq': this.refSeq.name }
                             )
        );
        this.queryTemplate = args.queryTemplate;
        if( ! this.queryTemplate ) {
            console.error("No queryTemplate set for SPARQL backend, no data will be displayed");
        }
    },

    load: function() {
        // ping the endpoint to see if it's there
        dojo.xhrGet({ url: this.url+'?'+ioQuery.objectToQuery({ query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1' }),
                      handleAs: "text",
                      failOk: false,
                      load:  Util.debugHandler( this, function(o) { this.loadSuccess(o); }),
                      error: dojo.hitch( this, function(error) { this.loadFail(error, this.url); } )
        });
    },

    _makeQuery: function( startBase, endBase ) {
        return Util.fillTemplate( this.queryTemplate, { start: startBase, end: endBase, refseq: this.refSeq.name } );
    },

    loadSuccess: function( o ) {
        this.empty = false;
        this.setLoaded();
    },

    loadFail: function() {
        this.empty = true;
        this.setLoaded();
    },

    iterate: function( startBase, endBase, featCallback, finishCallback ) {
        if( this.queryTemplate ) {
            dojo.xhrGet({ url: this.url+'?'+ioQuery.objectToQuery({
                              query: this._makeQuery( startBase, endBase )
                          }),
                          headers: { "Accept": "application/json" },
                          handleAs: "json",
                          failOk: true,
                          load:  Util.debugHandler( this, function(o) {
                              this._resultsToFeatures( o, featCallback );
                              finishCallback();
                          }),
                          error: dojo.hitch( this, function(error) { this.loadFail(error, this.url); })
            });
        } else {
            finishCallback();
        }
    },

    _resultsToFeatures: function( results, featCallback ) {
        var rows = ((results||{}).results||{}).bindings || [];
        if( ! rows.length )
            return;
        var fields = results.head.vars;
        var requiredFields = ['start','end','strand','id'];
        for( var i = 0; i<4; i++ ) {
            if( fields.indexOf( requiredFields[i] ) == -1 ) {
                console.error("Required field "+requiredFields[i]+" missing from feature data");
                return;
            }
        };
        var get  = function(n) { return this[n]; };
        var tags = function() { return fields;   };
        dojo.forEach( rows, function( row ) {
            var f = { get: get, tags: tags };
            dojo.forEach( fields, function(field) {
                f[field] = row[field].value;
            });
            featCallback( f, f.id );
        },this);
    }
});

});

