define([
           'dojo/_base/declare',
           'JBrowse/Util'
       ],
       function( declare, Util ) {

return declare(null,
{

    constructor: function( args ) {
        this.width       = args.width || 78;
        this.htmlMaxRows = args.htmlMaxRows || 15;
    },
    renderHTML: function( region, seq, container ) {
        var text = this.renderText( region, seq );
        var lineCount = text.match( /\n/g ).length + 1;
        var textArea = dojo.create('textarea', {
                        className: 'fasta',
                        cols: this.width,
                        rows: Math.min( lineCount, this.htmlMaxRows ),
                        readonly: true
                    }, container );
        textArea.innerHTML = text;
        return textArea;
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