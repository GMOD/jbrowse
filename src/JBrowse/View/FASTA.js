define([
           'dojo/_base/declare',
           'JBrowse/Util'
       ],
       function( declare, Util ) {

return declare(null,
{

    constructor: function( args ) {
        this.width = args.width || 78;
    },
    renderHTML: function( region, seq, container ) {
        return dojo.create('textarea', {
                        className: 'fasta',
                        cols: this.width,
                        rows: 10,
                        readonly: true,
                        style: { width: (this.width*1.37)+4+'ex' },
                        innerHTML: this.renderText( region, seq )
                    }, container );
    },
    renderText: function( region, seq ) {
        return '>' + region.ref
            +' '+Util.assembleLocString(region)
            +' length:'+(region.end - region.start)+"\n"
            + this._wrap( seq, this.width );
    },
    _wrap: function( string, length ) {
        length = length || this.width;
        return string.replace( new RegExp('(.{'+length+'})','g'), "$1\n" );
    }
});
});