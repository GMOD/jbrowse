/**
 * A JBrowse component keeps a reference to the main browser object, and is configurable.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'JBrowse/Util',
           'JBrowse/_MessagingMixin',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,
           array,
           Util,
           MessagingMixin,
           ConfigurationMixin
       ) {

var serialNumber = 0;

var Component = declare( [ MessagingMixin, ConfigurationMixin ], {

    constructor: function( args ) {
        args = args || {};
        this.serialNumber = ++serialNumber;
        this.browser = args.browser;
    },

    /**
     * Given a string with templating strings like {refseq}, fill them
     * in using the given values.
     *
     * With no additional values given, knows how to interpolate
     * {refseq}, {refSeq}, {refSeqNum}, and {refSeqNumNoLeadingZeroes}.
     *
     * @param {String} str string to interpolate values into
     * @param {Object} values optional object with additional values that can be interpolated
     * @returns new string with interpolations
     */
    fillTemplate: function( str, values ) {

        // skip if it's not a string or the string has no interpolations
        if( typeof str != 'string' || str.indexOf('{') == -1 )
            return str;

        // fill in a bunch of args for this.refSeq or this.ref
        var thisB = this;
        var templateFillArgs = {
            'refseq': (this.refSeq||{}).name || (this.ref||{}).name || this.ref || '',
            callback: function(varname) { return thisB.getConf(varname); }
        };
        templateFillArgs.refSeq = templateFillArgs.refseq;

        if( templateFillArgs.refSeq ) {
            templateFillArgs.refSeqNum = ( /\d+/.exec( templateFillArgs.refSeq ) || [] )[0] || '';
        }
        // make refseqNumNoLeadingZeroes
        if( templateFillArgs.refSeqNum ) {
            templateFillArgs.refSeqNumNoLeadingZeroes = ( /^0*(\d+)/.exec( templateFillArgs.refSeqNum ) || [] )[1] || '';
        }

        if( values )
            lang.mixin( templateFillArgs, values );

        return Util.fillTemplate( str, templateFillArgs );
    }
});
return Component;
});