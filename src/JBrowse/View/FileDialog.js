define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/aspect',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dojo/dom-construct',
            'dijit/Dialog',
            'dojox/form/Uploader',
            'dojox/form/uploader/plugins/IFrame',
            './FileDialog/ResourceList',
            './FileDialog/TrackList'
        ],
        function(
            declare,
            array,
            aspect,
            Button,
            RadioButton,
            dom,
            Dialog,
            Uploaded,
            ignore,
            ResourceList,
            TrackList
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
                className: 'dijitDialogPaneActionBar',
                innerHTML: '<div class="aux">'
                           + '<input type="radio" checked="checked" data-dojo-type="dijit.form.RadioButton" name="display" id="immediate" value="immediate"/>'
                           + '<label for="immediate">Display immediately</label>'
                           + ' <input type="radio" data-dojo-type="dijit.form.RadioButton" name="display" id="tracksOnly" value="tracksOnly"/>'
                           + '<label for="tracksOnly">Add to tracks</label>'
                           + '</div>'
            });
        new Button({ iconClass: 'dijitIconDelete', onClick: dojo.hitch( this.dialog, 'hide' ), label: 'Cancel' })
            .placeAt( actionBar );
        new Button({ iconClass: 'dijitIconFolderOpen',
                     label: 'Open',
                     onClick: dojo.hitch( this, function() {
                         openCallback && openCallback( this._filesToOpen(), this._urlsToOpen() );
                         this.dialog.hide();
                     })
                   })
            .placeAt( actionBar );

        return { domNode: actionBar };
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "Open files", className: 'fileDialog' }
            );

        var localFilesControl   = this._makeLocalFilesControl();
        var remoteURLsControl   = this._makeRemoteURLsControl();
        var resourceListControl = this._makeResourceListControl();
        var trackListControl    = this._makeTrackListControl();
        var actionBar           = this._makeActionBar();

        // connect the local files control to the resource list
        dojo.connect( localFilesControl.uploader, 'onChange', function() {
            resourceListControl.addLocalFiles( localFilesControl.uploader._files );
        });

        var div = function( attr, children ) {
            var d = dom.create('div', attr );
            array.forEach( children, dojo.hitch( d, 'appendChild' ));
            return d;
        };
        var content = [
                div( { className: 'resourceControls' },
                     [ localFilesControl.domNode, remoteURLsControl.domNode ]
                   ),
                resourceListControl.domNode,
                trackListControl.domNode,
                actionBar.domNode
        ];
        dialog.set( 'content', content );
        dialog.show();

        aspect.after( dialog, 'hide', function() {
                          dialog.destroyRecursive();
                      });
    },

    _makeLocalFilesControl: function() {
        var container = dom.create('div', { className: 'localFilesControl' });

        dom.create('h3', { innerHTML: 'Local files' }, container );

        var dragArea = dom.create('div', { className: 'dragArea' }, container );

        var fileBox = new dojox.form.Uploader({
            multiple: true
        });
        fileBox.placeAt( dragArea );

        if( this.browserSupports.dnd ) {
            // let the uploader process any files dragged into the dialog
            fileBox.addDropTarget( this.dialog.domNode );

            // add a message saying you can drag files in
            dom.create(
                'div', {
                    className: 'dragMessage',
                    innerHTML: 'or drag files here'
                }, dragArea
            );
        }

        return { domNode: container, uploader: fileBox };
    },
    _makeRemoteURLsControl: function() {
        var container = dom.create('div', { className: 'remoteURLsControl' });

        dom.create('h3', { innerHTML: 'Remote URLs - <smaller>one per line</smaller>' }, container );
        var input = dom.create( 'textarea', { className: 'urlInput' }, container );

        return { domNode: container, input: input  };
    },

    _makeResourceListControl: function () {
        var rl = new ResourceList({ dialog: this });
        return rl;
    },
    _makeTrackListControl: function() {
        var tl = new TrackList({});
        return tl;
    }
});
});
