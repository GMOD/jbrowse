define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/json',
           'JBrowse/Util/TextIterator',
           'JBrowse/Digest/Crc32',
           'JBrowse/Util/GFF3',
           './LazyFeature'
       ],
       function(
           declare,
           array,
           JSON,
           TextIterator,
           Digest,
           GFF3,
           LazyFeature
       ) {

return declare( null, {


    /**
     * Given a line from a TabixIndexedFile, convert it into a feature
     * and return it.  Assumes that the header has already been parsed
     * and stored (i.e. _parseHeader has already been called.)
     */
    lineToFeature: function( line ) {
        var attributes = GFF3.parse_attributes( line.fields[8] );
        var ref =    line.fields[0];
        var source = line.fields[1];
        var type =   line.fields[2];
        var strand = line.fields[6];


        var id = attributes.ID?attributes.ID[0]:null;
        var parent = attributes.Parent?attributes.Parent[0]:null;
        var name = attributes.Name?attributes.Name[0]:null;

        var featureData = {
            id:     id,
            parent: parent,
            name:   name,
            start:  line.start,
            end:    line.start+ref.length,
            seq_id: line.ref,
            description: attributes.Description||attributes.Note||attributes.name,
            type:   type,
            source: source,
            strand: strand
        };

        var f = new LazyFeature({
            id:   id,
            parent: parent,
            data: featureData,
            fields: attributes,
            parser: this
        });

        return f;
    }


});
});
