/**
 * Support for Sequin Feature table export.  See
 * http://www.ncbi.nlm.nih.gov/Sequin/table.html.
 */

define([ 'dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Export'
       ],
       function( declare, array, ExportBase ) {

return declare( ExportBase,

{

    /**
     * Format a feature into a string.
     * @param {Object} feature feature object (like those returned from JBrowse/Store/SeqFeature/*)
     * @returns {String} BED string representation of the feature
     */
    formatFeature: function( feature ) {
        var thisB = this;

        var featLine = [ feature.get('start')+1,
                         feature.get('end'),
                         feature.get('type') || 'region'
                       ];
        if( feature.get('strand') == -1 ) {
            var t = featLine[0];
            featLine[0] = featLine[1];
            featLine[1] = t;
        }

        // make the qualifiers
        var qualifiers = array.map(
            array.filter( feature.tags(), function(t) {
                              return ! { start: 1, end: 1, type: 1, strand: 1, seq_id: 1 }[ t.toLowerCase() ];
                          }),
            function( tag ) {
                return [ tag.toLowerCase(), thisB.stringifyAttributeValue( feature.get(tag) ) ];
            });

        var str = featLine.join("\t")+"\n" + array.map( qualifiers, function( q ) { return "\t\t\t"+q.join("\t")+"\n"; } ).join('');

        if( ! this.headerPrinted ) {
            str = '>Feature '+feature.get('seq_id')+"\n" + str;
            this.headerPrinted = true;
        }

        return str;
    },

    stringifyAttributeValue: function( val ) {
        return val.hasOwnProperty( 'toString' )
                   ? val.toString() :
               val.values
                   ? function(val) {
                       return val instanceof Array
                           ? val.join(',')
                           : val;
                   }.call(this,val.values) :
               val instanceof Array
                   ? val.join(',')
                   : val;
    }
});
});