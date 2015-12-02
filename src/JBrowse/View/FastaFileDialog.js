define( [
            'dojo/_base/declare',
            'JBrowse/View/FileDialog',
            './FileDialog/TrackList/FASTADriver'
        ],
        function(
            declare,
            FileDialog,
            FASTADriver
        ) {

return declare( FileDialog, {

    constructor: function( args ) {
        this.inherited(arguments);
        this._fileTypeDrivers = [ new FASTADriver() ];
        return this;
    },

    

    show: function( args ) {
        args.introMsg = "Select a FASTA file or indexed FASTA file.";
        this.inherited(arguments);
        this.dialog.set('title','Open sequence file');
    }

   
});
});
