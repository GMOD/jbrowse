define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/json',
           'JBrowse/Util/TextIterator',
           'JBrowse/Digest/Crc32',
           './LazyFeature'
       ],
       function(
           declare,
           array,
           JSON,
           TextIterator,
           Digest,
           LazyFeature
       ) {

return declare( null, {

    

    /**
     * Given a line from a TabixIndexedFile, convert it into a feature
     * and return it.  Assumes that the header has already been parsed
     * and stored (i.e. _parseHeader has already been called.)
     */
    lineToFeature: function( line ) {
        var fields = line.fields;
        var ids = [];
        for( var i=0; i<fields.length; i++ )
            if( fields[i] == '.' )
                fields[i] = null;

        var ref = fields[3];
        var alt = fields[4];

        var SO_term = this._find_SO_term( ref, alt );
        var featureData = {
            start:  line.start,
            end:    line.start+ref.length,
            seq_id: line.ref,
            description: this._makeDescriptionString( SO_term, ref, alt ),
            type:   SO_term,
            reference_allele:    ref
        };

        if( fields[2] !== null ) {
            ids = (fields[2]||'').split(';');
            featureData.name = ids[0];
            if( ids.length > 1 )
                featureData.aliases = ids.slice(1).join(',');
        }

        if( fields[5] !== null )
            featureData.score = parseFloat( fields[5] );
        if( fields[6] !== null ) {
            featureData.filter = {
                meta: {
                    description: 'List of filters that this site has not passed, or PASS if it has passed all filters',
                    filters: this.header.filter
                },
                values: fields[6].split(';')
            };
        }

        if( alt && alt[0] != '<' )
            featureData.alternative_alleles = {
                meta: {
                    description: 'VCF ALT field, list of alternate non-reference alleles called on at least one of the samples'
                },
                values: alt
            };

        // parse the info field and store its contents as attributes in featureData
        this._parseInfoField( featureData, fields );

        var f = new LazyFeature({
            id: ids[0] || fields.slice( 0, 9 ).join('/'),
            data: featureData,
            fields: fields,
            parser: this
        });

        return f;
    }


});
});
