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
        return dojo.create('div', {
                        className: 'fasta',
                        innerHTML: this.renderText( region, seq ).replace(/\n/g,'<br>')
                    }, container );
    },
    renderText: function( region, seq ) {
        return '>' + region.ref
            +' '+Util.assembleLocString(region) + "\n"
            + this._wrap( seq, this.width );
    },
    _wrap: function( string, length ) {
        length = length || this.width;
        return string.replace( new RegExp('(.{'+length+'})','g'), "$1\n" );
    }
});
});