define( [ 'dojo/_base/declare',
          'dojo/_base/lang',
          'dojo/request',
          'dojo/promise/all',
          'dojo/Deferred',
          'JBrowse/Store/SeqFeature',
          'JBrowse/Util',
          'JBrowse/Model/SimpleFeature',
          'JBrowse/Digest/Crc32',
          'JBrowse/Model/XHRBlob',
          'JBrowse/Store/DeferredFeaturesMixin',
          './IndexedFasta/File',
        ],
        function(
            declare,
            lang,
            request,
            all,
            Deferred,
            SeqFeatureStore,
            Util,
            SimpleFeature,
            Crc32,
            XHRBlob,
            DeferredFeaturesMixin,
            FASTAFile
        ) {

return declare( [ SeqFeatureStore, DeferredFeaturesMixin ],
{

/**
 * Storage backend for sequences in indexed fasta files
 * served as static text files.
 * @constructs
 */
    constructor: function(args) {
        var fastaBlob = args.fasta ||
            new XHRBlob( this.resolveUrl(
                             args.urlTemplate || 'data.fasta'
                         )
                       );

        var faiBlob = args.fai ||
            new XHRBlob( this.resolveUrl(
                             args.faiUrlTemplate || ( args.urlTemplate ? args.urlTemplate+'.fai' : 'data.fasta.fai' )
                         )
                       );
        this.index = {}

        var thisB = this;
        this.fasta = new FASTAFile({
            store: this,
            data: fastaBlob,
            fai: faiBlob
        });

        this.fasta.init({
            success: lang.hitch( this,
                                 function() {
                                     this._deferred.features.resolve({success:true});
                                 }),
            failure: lang.hitch( this, '_failAllDeferred' )
        });

    },

    _getFeatures: function( query, featureCallback, endCallback, errorCallback ) {

        var thisB = this;
        errorCallback = errorCallback || function(e) { console.error(e); };

        var refname = query.ref;
        if( ! this.browser.compareReferenceNames( this.refSeq.name, refname ) )
            refname = this.refSeq.name;

        var refindex = thisB.index[refname];
        var offset = thisB._fai_offset(refindex, query.start);
        var readlen = thisB._fai_offset(refindex, query.end) - offset;

        thisB.fasta.read(offset, readlen,
            function (data) {
                featureCallback(
                    new SimpleFeature({
                      data: {
                          start:    query.start,
                          end:      query.end,
                          residues: String.fromCharCode.apply(null, new Uint8Array(data)).replace(/\s+/g, ''),
                          seq_id:   refname,
                          name:     refname
                      }
                    })
                );
                endCallback();
            },
            function (err) {
                errorCallback(err)
            }
        );
    },

    _fai_offset: function(idx, pos) {
        return idx.offset + idx.linebytelen * Math.floor(pos / idx.linelen) + pos % idx.linelen;
    }

});
});
