define([
           'dojo/_base/declare',
           'dojo/dom-construct',

           'dijit/Toolbar',
           'dijit/form/Button',
           'JBrowse/Util',
           'JBrowse/has'
       ],
       function( declare, dom, Toolbar, Button, Util, has ) {

return declare(null,
{

    constructor: function( args ) {
        this.width       = args.width || 78;
        this.htmlMaxRows = args.htmlMaxRows || 15;
        this.track = args.track;
        this.canSaveFiles = args.track &&  args.track._canSaveFiles && args.track._canSaveFiles();
    },
    renderHTML: function( region, seq, parent ) {
        var text = this.renderText( region, seq );
        var lineCount = text.match( /\n/g ).length + 1;
        var container = dom.create('div', { className: 'fastaView' }, parent );

        if( this.canSaveFiles ) {
            var toolbar = new Toolbar().placeAt( container );
            var thisB = this;
            toolbar.addChild( new Button(
                                  { iconClass: 'dijitIconSave',
                                    label: 'FASTA',
                                    title: 'save as FASTA',
                                    disabled: ! has('save-generated-files'),
                                    onClick: function() {
                                        thisB.track._fileDownload(
                                            { format: 'FASTA',
                                              filename: Util.assembleLocString(region)+'.fasta',
                                              data: text
                                            });
                                    }
                                  }));
        }

        var textArea = dom.create('textarea', {
                        className: 'fasta',
                        cols: this.width,
                        rows: Math.min( lineCount, this.htmlMaxRows ),
                        readonly: true
                    }, container );
        var c = 0;
        textArea.innerHTML = text.replace(/\n/g, function() { return c++ ? '' : "\n"; });
        return container;
    },
    renderText: function( region, seq ) {
        return '>' + region.ref
            + ' '+Util.assembleLocString(region)
            + ( region.type ? ' class='+region.type : '' )
            + ' length='+(region.end - region.start)
            + "\n"
            + this._wrap( seq, this.width );
    },
    _wrap: function( string, length ) {
        length = length || this.width;
        return string.replace( new RegExp('(.{'+length+'})','g'), "$1\n" );
    }
});
});
