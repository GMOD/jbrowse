define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/aspect',
            'dijit/focus',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dijit/form/MultiSelect',
            'dijit/form/TextBox',
            'dijit/Dialog',
            'dojo/dom-construct',
            'dojo/dom-style',
            'dojo/_base/window',
            'dojo/Deferred',
            './BooleanDialog/TrackTypeDialog'
        ],
        function( declare,
                  array,
                  aspect,
                  dijitFocus,
                  Button,
                  RadioButton,
                  MultiSelect,
                  TextBox,
                  Dialog,
                  dom,
                  domStyle,
                  window,
                  Deferred,
                  TrackTypeDialog ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.browserSupports = {
            dnd: 'draggable' in document.createElement('span')
        };
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "New boolean track", className: 'booleanDialog' }
            );

        var actionBar         = this._makeActionBar( args.openCallback );
        var displaySelector   = this._makeStoreSelector();
        var maskSelector      = this._makeStoreSelector();
        var invMaskSelector   = this._makeStoreSelector();
        /* some css */  domStyle.set( displaySelector.domNode, 'height', '15em' );
                        domStyle.set( maskSelector.domNode, 'height', '15em' );
                        domStyle.set( invMaskSelector.domNode, 'height', '15em' );
        var nameField         = this._makeNameField( "type desired track name here" );
        var opSelector        = this._makeOPSelector()

        this.storeFetch = { data   : { display: displaySelector.sel,
                                       mask   : maskSelector.sel,
                                       invMask: invMaskSelector.sel },
                            name   : nameField,
                            getName: dojo.hitch(this.storeFetch, function() {
                                    return this.name.get('value');
                                }),
                            displayTypes: dojo.hitch(this.storeFetch, function(d) {
                                            var tracks = this.data.display.get('value')[0]
                                            ? this.data.display.get('value').map(
                                            function(arg){return arg.split(',');})
                                            : undefined;
                                            if ( !tracks ) {
                                                console.error('No display data chosen');
                                                thisB.dialog.hide();
                                                return;
                                            }
                                            tracks = tracks.reduce( function(a,b){ 
                                                                        if (!(a.indexOf(b[1]) > -1)) {
                                                                            a.push(b[1]);}
                                                                        return a
                                                                        }, [] );
                                            if ( tracks.length == 1 ) {
                                                d.resolve(tracks[0], true);
                                            }
                                            else {
                                                new TrackTypeDialog({ browser: this.browser, tracks: tracks, deferred: d }).show();
                                            }
                                }),
                            fetch  : dojo.hitch(this.storeFetch, function() {
                                    var storeLists = { display: this.data.display.get('value')[0]
                                                                ? this.data.display.get('value').map(
                                                                    function(arg){return arg.split(',')[0];})
                                                                : undefined,
                                                       mask   : this.data.mask.get('value')[0]
                                                                ? this.data.mask.get('value').map(
                                                                    function(arg){return arg.split(',')[0];})
                                                                : undefined,
                                                       invMask: this.data.invMask.get('value')[0]
                                                                ? this.data.invMask.get('value').map(
                                                                    function(arg){return arg.split(',')[0];})
                                                                : undefined };
                                    return storeLists;
                                })
                          };

        var div = function( attr, children ) {
            var d = dom.create('div', attr );
            array.forEach( children, dojo.hitch( d, 'appendChild' ));
            return d;
        };

        var content = [
                        dom.create( 'div', { className: 'instructions',
                                             innerHTML: 'This is where the instructions will be' } ),
                            div( { className: 'storeSelectors' },
                             [ displaySelector.domNode, invMaskSelector.domNode, maskSelector.domNode ]
                            ),
                        opSelector.domNode,
                        nameField.domNode,
                        actionBar.domNode
                      ];

        dialog.set( 'content', content );
        dialog.show()

        // destroy the dialogue after it has been hidden
        aspect.after( dialog, 'hide', dojo.hitch( this, function() {
                              dijitFocus.curNode && dijitFocus.curNode.blur();
                              dialog.destroyRecursive();
                      }));
    },

    _makeActionBar: function( openCallback ) {
        // Adapted from the file dialogue.
        var actionBar = dom.create( 'div', { className: 'dijitDialogPaneActionBar' });

        var disChoices = this.trackDispositionChoice = [
            new RadioButton({ id: 'openImmediately',
                              value: 'openImmediately',
                              name: 'disposition',
                              checked: true
                            }),
            new RadioButton({ id: 'addToTrackList',
                              value: 'addToTrackList',
                              name: 'disposition'
                            })
        ];

        var aux = dom.create( 'div', {className:'aux'}, actionBar );
        disChoices[0].placeAt(aux);
        dom.create('label', { for: 'openImmediately', innerHTML: 'Open immediately' }, aux ),
        disChoices[1].placeAt(aux);
        dom.create('label', { for: 'addToTrackList', innerHTML: 'Add to tracks' }, aux );


        new Button({ iconClass: 'dijitIconDelete', label: 'Cancel',
                     onClick: dojo.hitch( this, function() {
                                          this.dialog.hide();
                                        })
                   })
            .placeAt( actionBar );
        new Button({ label: 'Create track',
                     onClick: dojo.hitch( this, function() {
                                thisB = this;
                                d = new Deferred();
                                thisB.storeFetch.displayTypes(d);
                                dojo.when(d, function( arg ){
                                openCallback({
                                    trackConf: { label: thisB.storeFetch.getName(),
                                                 type:  arg,//'JBrowse/View/Track/BooleanTrack',
                                                 store: { name: thisB.storeFetch.getName(),
                                                          booleanOP: thisB.trackOperationChoice[0].checked ? thisB.trackOperationChoice[0].value :
                                                                     thisB.trackOperationChoice[1].checked ? thisB.trackOperationChoice[1].value :
                                                                     undefined,
                                                          browser: thisB.browser,
                                                          refSeq:  thisB.browser.refSeq,
                                                          type: 'JBrowse/Store/SeqFeature/Boolean',
                                                          storeNames: thisB.storeFetch.fetch()
                                                        }
                                                },
                                    trackDisposition: thisB.trackDispositionChoice[0].checked ? thisB.trackDispositionChoice[0].value :
                                                      thisB.trackDispositionChoice[1].checked ? thisB.trackDispositionChoice[1].value :
                                                      undefined
                                    });
                                    thisB.dialog.hide();
                            })
                        })
                    })
            .placeAt( actionBar );

        return { domNode: actionBar };
    },

    _makeOPSelector: function() {
        var OPChoices = this.trackOperationChoice = [
            new RadioButton({ id: 'OR',
                              value: 'OR',
                              name: 'operation',
                              checked: true
                            }),
            new RadioButton({ id: 'AND',
                              value: 'AND',
                              name: 'operation'
                            })
        ];

        var aux = dom.create('div',{className:'aux'});
        OPChoices[0].placeAt(aux);
        dom.create('label', { for: 'OR', innerHTML: 'OR' }, aux ),
        OPChoices[1].placeAt(aux);
        dom.create('label', { for: 'AND', innerHTML: 'AND' }, aux );

        return { domNode: aux }
    },

    _makeStoreSelector: function() {
        var selector = new MultiSelect();
        var tracks = this.browser.trackConfigsByName;
        for (var ID in tracks ) {
        if ( tracks.hasOwnProperty( ID ) ) {
            var op = window.doc.createElement('option');
            op.innerHTML = ID;
            op.value = tracks[ID].store+','+tracks[ID].type;
            //op.disabled = 'disabled'; Note for future use: this will grey out a value
            selector.containerNode.appendChild(op);
        }}
        return { domNode: selector.containerNode, sel: selector };
    },

    _makeNameField: function( text ) {
        var name = new TextBox( { value: "",
                                  placeHolder: text
                                } );
        return name;
    }

});
});