define([ 'dojo/_base/declare',
         'dojo/_base/lang',
         'dojo/_base/array',
         'dojo/request/xhr',
         'JBrowse/Store/SeqFeature',
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
           Util,
           SimpleFeature,
           ioQuery
       ) {

return declare( SeqFeatureStore,
{

    /**
     * JBrowse feature backend to retrieve features from a SPARQL endpoint.
     * @constructs
     */
    constructor: function(args) {
        this.urlTemplate = args.urlTemplate;
        this.refSeq = args.refSeq;
        this.baseUrl = args.baseUrl;
        this.density = 0;
        this.featureQueryTemplate = args.featureQueryTemplate || args.queryTemplate;
        if( ! this.featureQueryTemplate ) {
            console.error("No featureQueryTemplate set for SPARQL backend, no data will be displayed");
        }

        this.refSeqQueryTemplate = args.refSeqQueryTemplate;

    },

    configSchema: {
        slots: [
            { name: 'sparqlVariables', type: 'object', shortDesc: 'additional variables available for interpolation into the SPARQL query', defaultValue: {} },
            { name: 'query', type: 'object', defaultValue: {} }
        ]
    },

    _makeFeatureQuery: function( query ) {
        query = lang.mixin( {},
                            this.getConf('sparqlVariables'),
                            query
                          );

        return Util.fillTemplate( this.queryTemplate, query );
    },

    _getFeatures: function() {
        this.getFeatures.apply( this, arguments );
    },


    _executeQuery: function( query, sparqlQuery ) {

        var url = Util.resolveUrl(
            this.baseUrl,
            Util.fillTemplate( this.urlTemplate,
                               { 'refseq': query.ref }
                             )
        );

        var qvars = lang.mixin( {}, this.getConf('query') );
        qvars.query = sparqlQuery;

        return xhr.get(
            url+'?'+ioQuery.objectToQuery( qvars ),
            {
                headers: { "Accept": "application/json" },
                handleAs: "json",
                failOk: true
            });
    },

    getFeatures: function( fquery, featCallback, finishCallback, errorCallback ) {
        if( this.featureQueryTemplate ) {
            var thisB = this;
            this._executeQuery( fquery, this._makeFeatureQuery( fquery ) )
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

    _forRows: function( results, rowCallback, ctx ) {
        var rows = ((results||{}).results||{}).bindings || [];
        if( ! rows.length ) {
            return;
        }

        var fields = results.head.vars;

        for( var i = 0; i<rows.length; i++ ) {
            var row = rows[i];
            for( var j = 0; j<fields.length; j++ ) {
                var item = {};
                var field = fields[i];
                if( field in row )
                    item[field] = row[field].value;
            }
            rowCallback.call( ctx||this, item );
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
        this._executeQuery( query, sparql )
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

