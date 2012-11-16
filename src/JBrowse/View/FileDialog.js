define( [ 'dojo/_base/declare',
          'dojo/aspect',
          'dojo/on',
          'dijit/Dialog',
          'dijit/form/ValidationTextBox',
          'dijit/form/Select',
          'dijit/form/Button',
          'dijit/form/RadioButton'
        ],
        function( declare, aspect, on, Dialog, TextBox, Select, Button, RadioButton ) {

return declare(null,{
    constructor: function( args ) {
        this.browser = args.browser;
        this.config = dojo.clone( args.config || {} );
    },

    _remoteControls: function() {
        var inputCounter = 0;
        var id = 'remoteInput'+(inputCounter++);

        var tr = dojo.create( 'tr', {} );
        dojo.create( 'label', { for: id, innerHTML: 'URL' }, dojo.create('td',{},tr) );

        var textBox = new TextBox({
            id: id,
            regExpGen: function() { return '^(https?|file):\/\/.+'; },
            onChange: function() {
                typeSelect.set(
                    'value',
                        /\.bam$/i.test(this.get('value')) ? 'bam' :
                        /\.bai$/i.test(this.get('value')) ? 'bai' :
                        /\.gff3?$/i.test(this.get('value') ) ? 'gff3' :
                        /\.(bw|bigwig)$/i.test(this.get('value') ) ? 'bigwig' :
                        null
                );
            }
        });
        textBox.placeAt( dojo.create('td',{},tr) );

        var typeSelect = new Select({
            options: [
                { label: '<span class="ghosted">file type?</span>', value: null     },
                { label: "GFF3",   value: "gff3"   },
                { label: "BigWig", value: "bigwig" },
                { label: "BAM",    value: "bam"    },
                { label: "BAI",    value: "bai"    }
            ]
        });
        typeSelect.placeAt( dojo.create('td',{},tr) );

        return tr;
    },

    _localControls: function() {
        var inputCounter = 0;
        var id = 'localInput'+(inputCounter++);

        var tr = dojo.create( 'tr', {} );

        var fileBox = dojo.create('input', { type: 'file',
            id: id
        }, dojo.create('td',{colspan: 2},tr));
        on( fileBox, 'change', function() {
                console.log(this.value);
                typeSelect.set(
                    'value',
                        /\.bam$/i.test(this.value)    ? 'bam' :
                        /\.bai$/i.test(this.value)    ? 'bai' :
                        /\.gff3?$/i.test(this.value ) ? 'gff3' :
                        /\.(bw|bigwig)$/i.test(this.value ) ? 'bigwig' :
                        null
                );
        });

        var typeSelect = new Select({
            options: [
                { label: '<span class="ghosted">file type?</span>', value: null   },
                { label: "GFF3",   value: "gff3"   },
                { label: "BigWig", value: "bigwig" },
                { label: "BAM",    value: "bam"    },
                { label: "BAI",    value: "bai"    }
            ]
        });
        typeSelect.placeAt( dojo.create( 'td', {}, tr ) );

        return tr;
    },

    _actionBar: function() {
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
        new Button({ iconClass: 'dijitIconFolderOpen', onClick: dojo.hitch( this.dialog, 'hide' ), label: 'Open' })
            .placeAt( actionBar );

        return actionBar;
    },

    open: function() {
        var dialog = this.dialog = new Dialog(
            { title: "Open", className: 'fileDialog' }
            );
        var table = dojo.create('table');
        dojo.forEach(
            [dojo.create('tr',{ innerHTML: '<td colspan="3"><h2>Local Files</h2></td>'})]
                .concat( this._localControls() )
                .concat( dojo.create('tr',{innerHTML: '<td colspan="3"><hr></td>'}) )
                .concat( dojo.create('tr',{innerHTML: '<td colspan="3"><h2>Remote Files</h2></td>'}) )
                .concat( this._remoteControls() ),
            dojo.hitch( table, 'appendChild' )
        );

        dialog.set( 'content', [ table, this._actionBar() ] );
        dialog.show();

        aspect.after( dialog, 'hide', function() {
                          dialog.destroyRecursive();
                      });
    }
});
});