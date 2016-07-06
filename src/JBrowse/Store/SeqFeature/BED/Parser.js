/* The function to parse the bed files. The standard file format is "chr\tstart(0based)\tEnd(1based)\tname\tscore\tstrand" with optional header lines */
define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/Util/TextIterator'
        ],
        function (
            declare,
            lang,
            TextIterator
        ) {

return declare( null, {

    /**
     * Parse the bytes that contain the BED header, storing the parsed
     * data in this.header.
     */
    parseHeader: function( headerBytes ) {

        // parse the header lines
        var headData = {};
        var lineIterator = new TextIterator.FromBytes({ bytes: headerBytes });
        var line;
        while(( line = lineIterator.getline() )) {

            // only interested in meta and header lines
            if( line[0] != '#' )
                continue;

            // parse meta line using the parseHeader configuration callback function
            var metaData = (this.config.parseHeader||function() {})(line);
            var key = metaData.key;
            headData[key] = metaData.value;
        }

        this.header = headData;
        return headData;
    }

});
});
