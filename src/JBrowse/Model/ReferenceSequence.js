/**
 * A reference sequence, which is a subclass of SimpleFeature, but
 * that has a getSequence() method that returns a deferred string of
 * sequence basepairs.
 */

define(
    [
        'dojo/when',
        'JBrowse/Util',
        'JBrowse/Model/SimpleFeature'
    ],
    function(
        when,
        Util,
        SimpleFeature
    ) {

var ReferenceSequence = function(args) {
    SimpleFeature.call( this, args );
    this.bigSequence = args.bigSequence;
};

ReferenceSequence.prototype = new SimpleFeature();

ReferenceSequence.prototype.getSequence = function( start, end ) {
    if( this.bigSequence )
        return this.bigSequence.getRange( start, end );
    else
        return when( undefined );
};

return ReferenceSequence;

});