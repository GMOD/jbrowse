/**
 * A JBrowse component keeps a reference to the main browser object,
 * and is configurable.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',

           'JBrowse/Util',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,
           array,

           Util,
           ConfigurationMixin
       ) {

var serialNumber = 0;

var Component = declare( [ ConfigurationMixin ], {

    constructor: function( args ) {
        args = args || {};
        this.serialNumber = ++serialNumber;
        this.browser = this.app = args.app || args.browser;
        if( ! this.app )
            throw new Error('app arg required');
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

        var thisB = this;
        var templateFillArgs = {
            callback: function(varname) { return thisB.getConf(varname); }
        };
        if( values )
            lang.mixin( templateFillArgs, values );

        return Util.fillTemplate( str, templateFillArgs );
    }
});
return Component;
});