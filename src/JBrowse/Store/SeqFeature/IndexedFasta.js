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
            XHRBlob
        ) {

return declare( SeqFeatureStore,
{

/**
 * Storage backend for sequences in indexed fasta files
 * served as static text files.
 * @constructs
 */
    constructor: function(args) {
        this.fasta = new XHRBlob( this.resolveUrl( args.urlTemplate ));
		this.index = {}

        var thisO = this;
		this.index_promise = request( this.resolveUrl( args.urlTemplateFAI || args.urlTemplate + '.fai' ) ).then( function( text ) {
			text.split(/\r?\n/).forEach( function ( line ) {
				var row = line.split('\t');
				thisO.index[row[0]] = {
					'name': row[0],
					'length': +row[1],
					'offset': +row[2],
					'linelen': +row[3],
					'linebytelen': +row[4]
				};
			});
		}, function( err ) {
			console.log(err);
		});
    },

    getFeatures: function( query, featureCallback, endCallback, errorCallback ) {

		var idxF = this;
		errorCallback = errorCallback || function(e) { console.error(e); };

		var refname = query.ref;
		if( ! this.browser.compareReferenceNames( this.refSeq.name, refname ) )
			refname = this.refSeq.name;

		this.index_promise.then( function ( data ) {
			var refindex = idxF.index[refname];
			var offset = idxF._fai_offset(refindex, query.start);
			var readlen = idxF._fai_offset(refindex, query.end) - offset;

			idxF.fasta.read(offset, readlen,
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
		});
    },

    _fai_offset: function(idx, pos) {
        return idx.offset + idx.linebytelen * Math.floor(pos / idx.linelen) + pos % idx.linelen;
    }

});
});
