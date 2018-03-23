define( [
            'dojo/_base/declare',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dojo/dom-construct',
            'dojo/query',
            'JBrowse/View/FileDialog',
            './FileDialog/TrackList/IndexedFASTADriver',
            './FileDialog/TrackList/TwoBitDriver'
        ],
        function(
            declare,
            Button,
            RadioButton,
            dom,
            query,
            FileDialog,
            IndexedFASTADriver,
            TwoBitDriver
        ) {

return declare( FileDialog, {

    constructor: function( args ) {
        this.inherited(arguments);
        this._fileTypeDrivers = [ new IndexedFASTADriver(), new TwoBitDriver() ];
        return this;
    },



    show: function( args ) {
        args.introMsg = "Select a FASTA file (.fa), indexed FASTA (.fa and .fai), or twobit (.2bit) file";
        this.inherited(arguments);
        this.dialog.set('title', 'Open sequence file');
    },


    _makeActionBar: function( openCallback, cancelCallback ) {
        var actionBar = dom.create(
            'div', {
                className: 'dijitDialogPaneActionBar'
            });
        var disChoices = this.refSeqOrderChoice = [
            new RadioButton({ id: 'sortAlpha',
                              value: 'sortAlpha',
                               checked: true
                             }),
            new RadioButton({ id: 'sortLength',
                              value: 'sortLength'
                            }),
            new RadioButton({ id: 'noSort',
                              value: 'noSort'
                            })
        ];

        var aux = dom.create('div',{className:'aux'},actionBar);
        disChoices[0].placeAt(aux);
        dom.create('label', { "for": 'sortAlpha', innerHTML: 'Sort refseqs by name' }, aux ),
        disChoices[1].placeAt(aux);
        dom.create('label', { "for": 'sortLength', innerHTML: 'Sort refseqs by length' }, aux );
        disChoices[2].placeAt(aux);
        dom.create('label', { "for": 'noSort', innerHTML: 'Use order from file' }, aux );

        this.cancelButton = new Button({ iconClass: 'dijitIconDelete', label: 'Cancel',
                     onClick: dojo.hitch( this, function() {
                                              cancelCallback && cancelCallback();
                                              this.dialog.hide();
                                          })
                   })
       this.cancelButton.placeAt( actionBar );

        this.openButton = new Button({ iconClass: 'dijitIconFolderOpen',
                     label: 'Open',
                     onClick: () => {
                         this._executeOpen(openCallback)
                         this.dialog.hide()
                     }
                   })
       this.openButton.placeAt( actionBar );

        return { domNode: actionBar };
    },

    _executeOpen: async function(openCallback) {
        if (!openCallback) return

        let trackConfs = this.trackList.getTrackConfigurations()

        let refSeqOrder =   this.refSeqOrderChoice[0].checked ? "alphabetic descending" :
                            this.refSeqOrderChoice[1].checked ? "length descending" :
                                                                undefined

        openCallback({
            trackConfs,
            refSeqOrder
        })
    }

});
});
