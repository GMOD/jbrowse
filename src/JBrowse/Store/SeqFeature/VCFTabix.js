define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/Deferred',
           'JBrowse/Store/SeqFeature',
           'JBrowse/Store/DeferredStatsMixin',
           'JBrowse/Store/DeferredFeaturesMixin',
           'JBrowse/Store/TabixIndexedFile',
           'JBrowse/Model/SimpleFeature',
           'JBrowse/Store/SeqFeature/GlobalStatsEstimationMixin',
           'JBrowse/Model/XHRBlob',
           'JBrowse/Digest/Crc32'
       ],
       function(
           declare,
           array,
           Deferred,
           SeqFeatureStore,
           DeferredStatsMixin,
           DeferredFeaturesMixin,
           TabixIndexedFile,
           SimpleFeature,
           GlobalStatsEstimationMixin,
           XHRBlob,
           Digest
       ) {
return declare( [SeqFeatureStore,DeferredStatsMixin,DeferredFeaturesMixin,GlobalStatsEstimationMixin],
{

    constructor: function( args ) {
        var thisB = this;

        var tbiBlob = args.tbiBlob ||
            new XHRBlob( this.resolveUrl(
                             this.getConf('tbiUrlTemplate',[]) || this.getConf('urlTemplate',[])+'.tbi',
                             {'refseq': (this.refSeq||{}).name }
                         )
                       );

        var fileBlob = args.fileBlob ||
            new XHRBlob( this.resolveUrl( this.getConf('urlTemplate',[]),
                             {'refseq': (this.refSeq||{}).name }
                           )
                       );

        this.indexedData = new TabixIndexedFile({ tbi: tbiBlob, file: fileBlob });

        this._loadHeader().then( function() {
            thisB._estimateGlobalStats( function( stats, error ) {
                if( error )
                    thisB._failAllDeferred( error );
                else {
                    thisB.globalStats = stats;
                    thisB._deferred.stats.resolve({success:true});
                    thisB._deferred.features.resolve({success:true});
                }
            });
        });
    },

    _loadHeader: function() {
        var thisB = this;
        return this._parsedHeader = this._parsedHeader || function() {
            var d = new Deferred();

            thisB.indexedData.indexLoaded.then( function() {
                var maxFetch = thisB.indexedData.index.firstDataLine
                    ? thisB.indexedData.index.firstDataLine.block + thisB.indexedData.data.blockSize
                    : null;

                thisB.indexedData.data.read(
                    0,
                    maxFetch,
                    function( bytes ) {

                        var headerLines = String.fromCharCode( Array.prototype.slice.call( Array, bytes ) ).split("\n");
                        thisB.header = thisB._parseHeader( headerLines );

                        d.resolve({ success:true});
                    },
                    dojo.hitch( d, 'reject' )
                );
            });

            return d;
        }.call();
    },

    _parseHeader: function( headerLines ) {
        // parse the header lines
        var headData = {};
        array.forEach( headerLines, function( line ) {
            var match = /^##([^\s#=]+)=(.+)/.exec( line);
            if( ! match || !match[1] )
                return;

            var metaField = match[1].toLowerCase();
            var metaData = (match[2]||'').toLowerCase().trim();

            // TODO: do further parsing for some fields

            if( ! headData[metaField] )
                headData[metaField] = [];

            headData[metaField].push( metaData );
        });
        return headData;
    },

    _lineToFeature: function( line ) {
        var fields = line.fields;
        for( var i=0; i<fields.length; i++ )
            if( fields[i] == '.' )
                fields[i] = null;

        var ref = fields[3];
        var alt = fields[4];
        var SO_type = this._so_type( ref, alt );
        var featureData = {
            start:  line.start-1,
            end:    line.start-1+ref.length,
            seq_id: line.ref,
            note:   ref+" -> "+alt,
            name:   fields[2],
            type:   SO_type,
            ref:    ref,
            alt:    alt,
            qual:   fields[5],
            filter: fields[6],
            info:   fields[7],
            format: fields[8],
            other:  fields.slice( 9 )
        };
        var f = new SimpleFeature({
            id: fields[2] || Digest.objectFingerprint( fields.slice( 0, 9 ) ),
            data: featureData
        });
        return f;
    },

    _so_type: function( ref, alt ) {
        // it's just a remark if there are no alternate alleles
        if( alt == '.' )
            return 'remark';

        alt = (alt||'.').split(',');
        var minAltLen = Infinity;
        var maxAltLen = -Infinity;
        var altLen = array.map( alt, function(a) {
            var l = a.length;
            if( l < minAltLen )
                minAltLen = l;
            if( l > maxAltLen )
                maxAltLen = l;
            return a.length;
        });

        if( ref.length == 1 && minAltLen == 1 && maxAltLen == 1 )
            return 'SNV'; // use SNV because definition of SNP is
                          // abundance must be at least 1% in
                          // population, and can't be sure we meet
                          // that

        if( ref.length == minAltLen && ref.length == maxAltLen )
            if( alt.length == 1 && ref.split('').reverse().join('') == alt[0] )
                return 'inversion';
            else
                return 'substitution';

        if( ref.length == minAltLen && ref.length < maxAltLen )
            return 'insertion';

        if( ref.length > minAltLen && ref.length == maxAltLen )
            return 'deletion';

        return 'indel';
    },

    _getFeatures: function( query, featureCallback, finishedCallback, errorCallback ) {
        var thisB = this;
        thisB._loadHeader().then( function() {
            thisB.indexedData.getLines(
                query.ref || thisB.refSeq.name,
                query.start,
                query.end,
                function( line ) {
                    var f = thisB._lineToFeature( line );
                    //console.log(f);
                    featureCallback( f );
                    //return f;
                },
                finishedCallback,
                errorCallback
            );
        });
    },

    getRefSeqs: function( refSeqCallback, finishedCallback, errorCallback ) {
        return this.indexedData.index.getRefSeqs.apply( this.indexedData.index, arguments );
    }

});
});