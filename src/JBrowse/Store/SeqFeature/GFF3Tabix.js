define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Deferred',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Store/SeqFeature/GFF3/Parser',
           'JBrowse/Util/GFF3'
       ],
       function(
           declare,
           lang,
           array,
           Deferred,
           SimpleFeature,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TabixIndexedFile,
           GlobalStatsEstimationMixin,
           XHRBlob,
           Parser,
           GFF3
       ) {


return declare( [ SeqFeatureStore, DeferredStatsMixin, DeferredFeaturesMixin, GlobalStatsEstimationMixin ],
{

    constructor: function( args ) {
        var thisB = this;

        var tbiBlob = args.tbi ||
            new XHRBlob(
                this.resolveUrl(
                    this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi'
                )
            );

        var fileBlob = args.file ||
            new XHRBlob(
                this.resolveUrl( this.getConf('urlTemplate',[]) )
            );

        this.indexedData = new TabixIndexedFile(
            {
                tbi: tbiBlob,
                file: fileBlob,
                browser: this.browser,
                chunkSizeLimit: args.chunkSizeLimit || 1000000
            });




        this.getHeader()
            .then( function( header ) {
                       thisB._deferred.features.resolve({success:true});
                       thisB._estimateGlobalStats()
                            .then(
                                function( stats ) {
                                    thisB.globalStats = stats;
                                    thisB._deferred.stats.resolve( stats );
                                },
                                lang.hitch( thisB, '_failAllDeferred' )
                            );
                   },
                   lang.hitch( thisB, '_failAllDeferred' )
                 );
    },

    getHeader: function() {
        var thisB = this;
        return this._parsedHeader || ( this._parsedHeader = function() {
            var d = new Deferred();
            var reject = lang.hitch( d, 'reject' );

            thisB.indexedData.indexLoaded.then( function() {
                var maxFetch = thisB.indexedData.index.firstDataLine
                    ? thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize - 1
                    : null;

                thisB.indexedData.data.read(
                    0,
                    maxFetch,
                    function( bytes ) {
                        d.resolve( thisB.header );
                    },
                    reject
                );
             },
             reject
            );

            return d;
        }.call(this));
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        var f=featureCallback;
        var parser = new Parser(
            {
                featureCallback: function(fs) {
                    array.forEach( fs, function( feature ) {
                                       var feat = thisB._formatFeature(feature);
                                       f(feat);
                                   });
                },
                endCallback: function() {
                    finishedCallback();
                }
            });

        thisB.getHeader().then( function() {
            thisB.indexedData.getLines(
                query.ref || thisB.refSeq.name,
                query.start,
                query.end,
                function( line ) {
                    parser._buffer_feature( thisB.lineToFeature(line) );
                },
                function() {
                    parser.finish();
                },
                errorCallback
            );
        }, errorCallback );
    },


    getRegionFeatureDensities: function( query, successCallback, errorCallback ) {

        var thisB = this ;

        var numBins, basesPerBin;
        if( query.numBins ) {
            numBins = query.numBins;
            basesPerBin = (query.end - query.start)/numBins;
        }
        else if( query.basesPerBin ) {
            basesPerBin = query.basesPerBin || query.ref.basesPerBin;
            numBins = Math.ceil( (query.end-query.start)/basesPerBin );
        }
        else {
            throw new Error('numBins or basesPerBin arg required for getRegionFeatureDensities');
        }

        var statEntry = (function( basesPerBin, stats ) {
            for (var i = 0; i < stats.length; i++) {
                if( stats[i].basesPerBin >= basesPerBin ) {
                    return stats[i];
                }
            }
            return undefined;
        })( basesPerBin, [] );

        var stats = {};
        stats.basesPerBin = basesPerBin ;

        stats.scoreMax = 0 ;
        stats.max = 0 ;
        var firstServerBin = Math.floor( query.start / basesPerBin);
        var histogram = [];
        var binRatio = 1 / basesPerBin;

        var binStart, binEnd ;

		for(var bin = 0 ; bin < numBins ; bin++){
			histogram[bin] = 0;
		}


        thisB.getHeader().then( function() {
            thisB.indexedData.getLines(
                query.ref || thisB.refSeq.name,
                query.start,
                query.end,
                function( line ) {
                    // var feat = thisB.lineToFeature(line);
					// if(!feat.attributes.parent) // only count if has NO parent
                    var start = line.start ;
                    var binValue = Math.round( (start - query.start )* binRatio)   ;

					// in case it extends over the end, just push it on the end
					binValue = binValue >=0 ? binValue : 0 ;
					binValue = binValue < histogram.length ? binValue : histogram.length -1  ;

					histogram[binValue] += 1;
					if(histogram[binValue] > stats.max){
						stats.max = histogram[binValue];
					}
                },
                function() {
					successCallback({ bins: histogram, stats: stats});
                },
                errorCallback
            );
        }, errorCallback );

    },

    lineToFeature: function( line ) {
        var attributes = GFF3.parse_attributes( line.fields[8] );
        var ref    = line.fields[0];
        var source = line.fields[1];
        var type   = line.fields[2];
        var strand = {'-':-1,'.':0,'+':1}[line.fields[6]];
        var remove_id;
        if( !attributes.ID ) {
            attributes.ID = [line.fields.join('/')];
            remove_id = true;
        }
        var featureData = {
            start:  line.start,
            end:    line.end,
            strand: strand,
            child_features: [],
            seq_id: line.ref,
            attributes: attributes,
            type:   type,
            source: source,
            remove_id: remove_id
        };

        return featureData;
    },

    // flatten array like [ [1,2], [3,4] ] to [ 1,2,3,4 ]
    _flattenOneLevel: function( ar ) {
        var r = [];
        for( var i = 0; i<ar.length; i++ ) {
            r.push.apply( r, ar[i] );
        }
        return r;
    },


    _featureData: function( data ) {
        var f = lang.mixin( {}, data );
        delete f.child_features;
        delete f.data;
        delete f.derived_features;
        f.start -= 1; // convert to interbase
        for( var a in data.attributes ) {
            f[ a.toLowerCase() ] = data.attributes[a].join(',');
        }
        if(f.remove_id) {
            delete f.remove_id;
            delete f.id;
        }
        delete f.attributes;
        var sub = array.map( this._flattenOneLevel( data.child_features ), this._featureData, this );
        if( sub.length )
            f.subfeatures = sub;

        return f;
    },
    _formatFeature: function( data ) {
        var f = new SimpleFeature({
            data: this._featureData( data ),
            id: (data.attributes.ID||[])[0]
        });
        f._reg_seq_id = this.browser.regularizeReferenceName( data.seq_id );
        return f;
    },

    /**
     * Interrogate whether a store has data for a given reference
     * sequence.  Calls the given callback with either true or false.
     *
     * Implemented as a binary interrogation because some stores are
     * smart enough to regularize reference sequence names, while
     * others are not.
     */
    hasRefSeq: function( seqName, callback, errorCallback ) {
        return this.indexedData.index.hasRefSeq( seqName, callback, errorCallback );
    },

    saveStore: function() {
        return {
            urlTemplate: this.config.file.url,
            tbiUrlTemplate: this.config.tbi.url
        };
    }


});
});
