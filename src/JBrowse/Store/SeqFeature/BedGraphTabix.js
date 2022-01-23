define([
            'dojo/_base/declare',
            'JBrowse/Store/SeqFeature/BEDTabix',
            'JBrowse/Model/SimpleFeature',
        ],
        function(
            declare,
            BEDTabix,
            SimpleFeature,
        ) {

return declare(BEDTabix, {


    //read the line
    lineToFeature: function( columnNumbers, line ){
        const fields = line.split("\t")


        for (var i = 0; i < fields.length; i++) {
            if(fields[i] == '.') {
                fields[i] = null;
            }
        }

        var featureData = {
            start:  parseInt(fields[columnNumbers.start - 1]),
            end:    parseInt(fields[columnNumbers.end - 1]),
            seq_id: fields[columnNumbers.ref - 1],
            score:   fields[3],
        };

        var f = new SimpleFeature({
            id: fields.slice(0,3).join('/'),
            data: featureData,
            fields: fields
        });

        return f;
    }
});
});
