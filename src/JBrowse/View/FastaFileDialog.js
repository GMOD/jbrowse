define( [
            'dojo/_base/declare',
            'dijit/form/RadioButton',
            'dojo/dom-construct',
            'dojo/query',
            'JBrowse/View/FileDialog',
            './FileDialog/TrackList/FASTADriver',
            './FileDialog/TrackList/IndexedFASTADriver'
        ],
        function(
            declare,
            RadioButton,
            dom,
            query,
            FileDialog,
            FASTADriver,
            IndexedFASTADriver
        ) {

return declare( FileDialog, {

    constructor: function( args ) {
        this.inherited(arguments);
        this._fileTypeDrivers = [ new FASTADriver(), new IndexedFASTADriver() ];
        return this;
    },

    

    show: function( args ) {
        args.introMsg = "Select a FASTA file (.fa) or indexed FASTA (.fa and .fai) to open";
        this.inherited(arguments);
        this.dialog.set('title','Open sequence file');
    },

    _makeActionBar: function( openCallback, cancelCallback ) {
        var modifiedOpenCallback = dojo.hitch( this, function(data) {
            console.log(data);
            data.refSeqOrder = this.refSeqOrderChoice[0].checked ? "length descending" : "alphabetical descending";
            openCallback(data);
        });
        var func = this.getInherited(arguments);
        ret = func.apply(this, [modifiedOpenCallback, cancelCallback]);

        var disChoices = this.refSeqOrderChoice = [
            new RadioButton({ id: 'sortAlpha',
                              value: 'sortAlpha',
                              checked: true
                            }),
            new RadioButton({ id: 'sortLength',
                              value: 'sortLength'
                            })
        ];
        var aux = query('.aux',ret.domNode)[0];
        dom.empty(aux);
        disChoices[0].placeAt(aux);
        dom.create('label', { "for": 'sortLength', innerHTML: 'Sort refseqs by length' }, aux ),
        disChoices[1].placeAt(aux);
        dom.create('label', { "for": 'sortAlpha', innerHTML: 'Sort refseqs alphanum' }, aux );
        return { domNode: ret.domNode };
    }

   
});
});
