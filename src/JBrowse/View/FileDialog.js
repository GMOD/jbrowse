define( [ 'dojo/_base/declare',
          'dojo/aspect',
          'dojo/on',
          'dijit/Dialog',
          'dijit/form/ValidationTextBox',
          'dijit/form/Select',
          'dijit/form/Button',
          'dijit/form/RadioButton',
          'dojox/form/Uploader',
          'dojox/form/uploader/plugins/IFrame',
          './FileDialog/SuperFileList',
          './FileDialog/TrackList'
        ],
        function( declare, aspect, on, Dialog, TextBox, Select, Button, RadioButton, Uploader, ignore, FileList, TrackList ) {

return declare(null,{
    constructor: function( args ) {
        this.browser = args.browser;
        this.config = dojo.clone( args.config || {} );
    },

    _remoteControls: function() {
        var inputUniq = 0;
        var inputCount = 0;
        var blankCount = 0;

        var table = dojo.create('table');
        var inputs = this.inputs = {};
        var that = this;

        var addInput = function() {
            var id = 'remoteInput'+(inputUniq++);
            inputCount++;
            blankCount++;
            var tr = dojo.create( 'tr', {}, table );
            dojo.create( 'label', { for: id, innerHTML: 'URL' }, dojo.create('td',{},tr) );
            var typeSelect,
                textBox = new TextBox({
                    id: id,
                    regExpGen: function() { return '^(https?|file):\/\/.+'; },
                    onChange: function() {
                        var value = this.get('value');
                        if( this.isValid() ) {
                            typeSelect.set(
                                'value',
                                that.guessType( value )
                            );
                         }

                        updateInputs();
                        that.trackList.update();
                    },
                    onMouseOut: updateInputs
                });
            textBox.placeAt( dojo.create('td',{},tr) );

            typeSelect = new Select({
                id: id+'_type',
                options: [
                    { label: '<span class="ghosted">file type?</span>', value: null     },
                    { label: "GFF3",   value: "gff3"   },
                    { label: "BigWig", value: "bigwig" },
                    { label: "BAM",    value: "bam"    },
                    { label: "BAI",    value: "bai"    }
                ]
            });
            typeSelect.placeAt( dojo.create('td',{},tr) );

            inputs[id] = { url: textBox, type: typeSelect, tr: tr };
        };

        var updateInputs = function() {
            // add or delete rows in the table of inputs as needed
            var blankCount = 0;
            for( var i in inputs ) {
                if( ! /\S/.test( inputs[i].url.get('value')) ) {
                    blankCount++;
                    if( blankCount > 1 ) {
                        inputs[i].tr.parentNode.removeChild( inputs[i].tr );
                        delete inputs[i];
                        blankCount--;
                    }
                }
            }
            if( blankCount == 0 ) {
                // make another one
                addInput();
            }
        };

        addInput();

        return table;
    },

    guessType: function( value ) {
        return /\.bam$/i.test( value )          ? 'bam'    :
               /\.bai$/i.test( value )          ? 'bai'    :
               /\.gff3?$/i.test( value )        ? 'gff3'   :
                /\.(bw|bigwig)$/i.test( value ) ? 'bigwig' :
                                                   null;
    },

    _localControls: function( mainContainer ) {
        var dndSupported = 'draggable' in document.createElement('span');

        var inputCounter = 0;
        var id = 'localInput'+(inputCounter++);

        var cont = dojo.create('div', {
            innerHTML: '<h3>'
                       + (dndSupported ? 'Drag or select files to open.' : 'Select files to open.')
                       + '</h3>'
        });

        var fileBox = new dojox.form.Uploader({
            multiple: true
        });
        fileBox.placeAt( cont );
        if( dndSupported ) {
            fileBox.addDropTarget( mainContainer );
        }

        var list = new FileList({ uploader: fileBox });
        list.placeAt(cont);
        this.localFileList = list;

        return cont;
    },

    _actionBar: function( openCallback, cancelCallback ) {
        var actionBar = dojo.create(
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

        return actionBar;
    },

    // files and URLS
    // -> stores
    // -> tracks
    // -> tracks with user modifications
    _makeTrackList: function( container ) {
        this.trackList = new TrackList({ dialog: this });
        dojo.connect( this.localFileList, 'onChange', this.trackList, 'update' );
        return this.trackList.domNode;
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "Open files", className: 'fileDialog' }
            );

        var content = [
                dojo.create('hr'),
                dojo.create('h2',{ innerHTML: 'Local files' }),
                this._localControls( dialog.domNode ),
                dojo.create('hr'),
                dojo.create('h2',{ innerHTML: 'Remote files' }),
                this._remoteControls(),
                this._actionBar( args.openCallback, args.cancelCallback )
            ];
        content.unshift( this._makeTrackList() );
        content.unshift( dojo.create('h2',{ innerHTML: 'Tracks' }) );


        dialog.set( 'content', content );
        dialog.show();

        aspect.after( dialog, 'hide', function() {
                          dialog.destroyRecursive();
                      });
    },

    filesToOpen: function() {
        if( ! this.localFileList )
            return [];

        return this.localFileList.getFiles();
    },

    urlsToOpen: function() {
        var urls = [];
        for( var id in this.inputs ) {
            var input = this.inputs[id];
            var type = input.type.get('value') || undefined;
            if( type && input.url.textbox && input.url.isValid() ) {
                var value = input.url.get('value');
                if( /\S/.test( value || '') )
                    urls.push( { url: value, type: type });
            }
        }
        return urls;
    }
});
});