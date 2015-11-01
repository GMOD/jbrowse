define( [
            'dojo/_base/declare',
            'JBrowse/View/InfoDialog'
        ],
        function(
            declare,
            InfoDialog
        ) {
return declare( InfoDialog, {

    title: "Open data directory",

    constructor: function(args) {
        this.browser = args.browser;
        this.defaultContent = this._makeDefaultContent();

        if( ! args.content && ! args.href ) {
            // make a div containing our help text
            this.content = this.defaultContent;
        }
    },

    _makeDefaultContent: function() {
        return    '<div>'
                + '<input type="file" webkitdirectory directory multiple/>'
                + '</div>'
            ;
    }
});
});
