define([ 'dojo/_base/declare',
         'dojo/_base/lang',
         'dojo/_base/array',
         'dojo/request/xhr',
         'JBrowse/Store/SeqFeature',
         'JBrowse/Store/DeferredStatsMixin',
         'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
         'JBrowse/Util',
         'JBrowse/Model/SimpleFeature',
         'dojo/io-query'
       ],
       function(
           declare,
           lang,
           array,
           xhr,
           SeqFeatureStore,
           DeferredStatsMixin,
           GlobalStatsEstimationMixin,
           Util,
           SimpleFeature,
           ioQuery
       ) {

return declare( [ SeqFeatureStore, DeferredStatsMixin, GlobalStatsEstimationMixin ],

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
        this.featureQueryTemplate = args.featureQueryTemplate || args.queryTemplate;
        if( ! this.featureQueryTemplate ) {
            console.error("No featureQueryTemplate set for SPARQL backend, no data will be displayed");
        }

        this.refSeqQueryTemplate = args.refSeqQueryTemplate;

        var thisB = this;
        this._estimateGlobalStats()
            .then(
                function( stats ) {
                    thisB.globalStats = stats;
                    thisB._deferred.stats.resolve( stats );
                },
                lang.hitch( this, '_failAllDeferred' )
            );
    },

    // load: function() {
    //     // ping the endpoint to see if it's there
    //     dojo.xhrGet({ url: this.url+'?'+ioQuery.objectToQuery({ query: 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1' }),
    //                   handleAs: "text",
    //                   failOk: false,
    //                   load:  Util.debugHandler( this, function(o) { this.loadSuccess(o); }),
    //                   error: dojo.hitch( this, function(error) { this.loadFail(error, this.url); } )
    //     });
    // },

    _makeFeatureQuery: function( templateVars ) {
        return Util.fillTemplate( this.featureQueryTemplate, templateVars );
    },

    _getFeatures: function() {
        this.getFeatures.apply( this, arguments );
    },

    _executeQuery: function( sparqlQuery ) {
        var qvars = lang.clone( this.config.queryVariables || {} );
        qvars.query = sparqlQuery;
        return xhr.get(
            this.url+'?'+ioQuery.objectToQuery( qvars ),
            {
                headers: { "Accept": "application/json" },
                handleAs: "json",
                failOk: true
            });
    },

    getFeatures: function( fquery, featCallback, finishCallback, errorCallback ) {
        if( this.featureQueryTemplate ) {
            var thisB = this;
            this._executeQuery( this._makeFeatureQuery( fquery ) )
                .then( function( data ) {
                           thisB._resultsToFeatures( data, featCallback );
                           finishCallback();
                       },
                       lang.hitch( this, '_failAllDeferred' )
                     );
        } else {
            finishCallback();
        }
    },

    _forRows: function( results, rowCallback ) {
        var rows = ((results||{}).results||{}).bindings || [];
        if( ! rows.length ) {
            return;
        }

        var fields = results.head.vars;

        for( var i = 0; i<rows.length; i++ ) {
            var row = rows[i];
            for( var j = 0; j<fields.length; j++ ) {
                var item = {};
                if( field in row )
                    item[field] = row[field].value;
                rowCallback( item );
            }
        }
    },

    _resultsToFeatures: function( results, featCallback ) {
        var fields = results.head.vars;
        var requiredFields = ['start','end','strand','uniqueID'];
        for( var i = 0; i<requiredFields.length; i++ ) {
            if( fields.indexOf( requiredFields[i] ) == -1 ) {
                console.error("Required field "+requiredFields[i]+" missing from feature data");
                return;
            }
        };

        var seenFeatures = {};
        this._forRows( results, function( data ) {
            data.start = parseInt( data.start );
            data.end = parseInt( data.end );
            data.strand = parseInt( data.strand );
            data.subfeatures = [];

            var id = data.uniqueID;
            delete data.uniqueID;
            seenFeatures[ id ] = { data: data, id: id };
        },this);

        // resolve subfeatures, keeping only top-level features in seenFeatures
        for( var id in seenFeatures ) {
            var f = seenFeatures[id];
            var pid = f.data.parentUniqueID;
            delete f.data.parentUniqueID;
            if( pid ) {
                var p = seenFeatures[ pid ];
                if( p ) {
                    p.data.subfeatures.push( f.data );
                    delete seenFeatures[id];
                }
            }
        }

        for( var id in seenFeatures ) {
            featCallback( new SimpleFeature( seenFeatures[id] ) );
        }
    },

    getRefSeqMetadata: function( query, refSeqCallback, finishCallback, errorCallback ) {
        var sparql = this._makeRefSeqQuery( query );
        if( ! sparql ) {
            finishCallback();
            return;
        }

        var thisB = this;
        this._executeQuery( sparql )
            .then( function( data ) {
                       thisB._forRows( data, refSeqCallback );
                       finishCallback();
                   }
                 );
    },

    _makeRefSeqQuery: function( templateVars ) {
        return this.refSeqQueryTemplate && Util.fillTemplate( this.refSeqQueryTemplate, templateVars );
    }

});
});

