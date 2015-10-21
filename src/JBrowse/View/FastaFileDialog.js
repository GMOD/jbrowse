define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/aspect',
            'dijit/focus',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dojo/dom-construct',
            'dijit/Dialog',

            'dojox/form/Uploader',
            'dojox/form/uploader/plugins/IFrame',

            'JBrowse/Browser'
        ],
        function(
            declare,
            array,
            aspect,
            dijitFocus,
            Button,
            RadioButton,
            dom,
            Dialog,

            Uploaded,
            IFramePlugin,

	    Browser
        ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.config = dojo.clone( args.config || {} );
        this.browserSupports = {
            dnd: 'draggable' in document.createElement('span')
        };
    },

    _makeActionBar: function( openCallback, cancelCallback ) {
        var actionBar = dom.create(
            'div', {
                className: 'dijitDialogPaneActionBar'
            });

        new Button({ iconClass: 'dijitIconDelete', label: 'Cancel',
                     onClick: dojo.hitch( this, function() {
                                              cancelCallback && cancelCallback();
                                              this.dialog.hide();
                                          })
                   })
            .placeAt( actionBar );
        new Button({ iconClass: 'dijitIconFolderOpen',
                     label: 'Open',
                     onClick: dojo.hitch( this, function() {
			 if (openCallback && this.localFiles && this.localFiles.length)
			     openCallback(this.localFiles[0])
			 else if (cancelCallback)
			     cancelCallback()
                         this.dialog.hide();
                     })
                   })
            .placeAt( actionBar );

        return { domNode: actionBar };
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "Open FASTA file", className: 'fileDialog' }
            );

        var localFilesControl   = this._makeLocalFilesControl();
        var actionBar           = this._makeActionBar( args.openCallback, args.cancelCallback );

        // connect the local files control
	var noFileHTML = "<i>No file selected</i>"
        dojo.connect( localFilesControl.uploader, 'onChange', dojo.hitch (this, function() {
            this.localFiles = localFilesControl.uploader._files;
	    this.filenameDiv.innerHTML = this.localFiles.length ? ("<b>Filename:</b> " + this.localFiles[0].name) : noFileHTML
        }));

        var div = function( attr, children ) {
            var d = dom.create('div', attr );
            array.forEach( children, dojo.hitch( d, 'appendChild' ));
            return d;
        };

	var filenameDiv = this.filenameDiv = div ( { className: 'resourceList', innerHTML: noFileHTML } )

        var content = [
                dom.create( 'div', { className: 'intro', innerHTML: 'Select a FASTA file containing the new reference sequences.' } ),
                div( { className: 'soleResourceControl' }, [ localFilesControl.domNode ] ),
                filenameDiv,
                actionBar.domNode
        ];
        dialog.set( 'content', content );
        dialog.show();

        aspect.after( dialog, 'hide', dojo.hitch( this, function() {
                              dijitFocus.curNode && dijitFocus.curNode.blur();
                              setTimeout( function() { dialog.destroyRecursive(); }, 500 );
                      }));
    },

    _makeLocalFilesControl: function() {
        var container = dom.create('div', { className: 'localFilesControl' });

        var dragArea = dom.create('div', { className: 'dragArea' }, container );

        var fileBox = new dojox.form.Uploader({
	    label: "Select File...",
            multiple: false
        });
        fileBox.placeAt( dragArea );

        if( this.browserSupports.dnd ) {
            // let the uploader process any files dragged into the dialog
            fileBox.addDropTarget( this.dialog.domNode );

            // add a message saying you can drag files in
            dom.create(
                'div', {
                    className: 'dragMessage',
                    innerHTML: 'Select or drag file here.'
                }, dragArea
            );
        }

        return { domNode: container, uploader: fileBox };
    },
});
});
