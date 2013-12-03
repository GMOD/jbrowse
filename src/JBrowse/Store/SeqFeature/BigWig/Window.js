define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/Deferred',

            'JBrowse/Util',
            './RequestWorker'
        ],
        function(
            declare,
            lang,
            array,
            Deferred,

            Util,
            RequestWorker
        ) {

var dlog = function(){ console.log.apply(console, arguments); };

return declare( null,
 /**
  * @lends JBrowse.Store.BigWig.Window.prototype
  */
{

    /**
     * View into a subset of the data in a BigWig file.
     *
     * Adapted by Robert Buels from bigwig.js in the Dalliance Genome
     * Explorer by Thomas Down.
     * @constructs
     */
    constructor: function(bwg, cirTreeOffset, cirTreeLength, isSummary) {
        this.bwg = bwg;
        if( !( cirTreeOffset >= 0 ) )
            throw "invalid cirTreeOffset!";
        if( !( cirTreeLength > 0 ) )
            throw "invalid cirTreeLength!";

        this.cirTreeOffset = cirTreeOffset;
        this.cirTreeLength = cirTreeLength;
        this.isSummary = isSummary;
    },

    BED_COLOR_REGEXP: /^[0-9]+,[0-9]+,[0-9]+/,

    readWigData: function( chrName, min, max ) {
        // console.log( 'reading wig data from '+chrName+':'+min+'..'+max);
        var chr = this.bwg.refsByName[chrName];
        if ( ! chr ) {
            // Not an error because some .bwgs won't have data for all chromosomes.

            // dlog("Couldn't find chr " + chrName);
            // dlog('Chroms=' + miniJSONify(this.bwg.refsByName));
            return Util.resolved( [] );
        } else {
            return this.readWigDataById( chr.id, min, max );
        }
    },

    _loadCirHeader: function() {
        return this.cirHeader || (
            this.cirHeader = function() {
                var thisB = this;
                return this.bwg.data
                    .readRange( this.cirTreeOffset, 48 )
                    .then( function( result ) {
                               thisB.cirBlockSize = thisB.bwg.newDataView( result, 4, 4 ).getUint32();
                               return result;
                           });
            }.call(this)
        );
    },

    readWigDataById: function( chr, min, max ) {
        var thisB = this;
        return this._loadCirHeader()
            .then( function() {
                       var d = new Deferred;
                       var worker = new RequestWorker( thisB, chr, min, max, d.resolve, d.reject );
                       worker.cirFobRecur([thisB.cirTreeOffset + 48], 1);
                       return d;
                   });
    }
});

});
