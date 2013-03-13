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
            './BooleanDialog/TrackTypeDialog',
            './BooleanDialog/settingViewer',
            'dojo/on'
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
                  TrackTypeDialog,
                  settingViewer,
                  on ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.browserSupports = {
            dnd: 'draggable' in document.createElement('span')
        };
        this.supportedTracks = ['JBrowse/View/Track/HTMLFeatures',
                                'JBrowse/View/Track/Wiggle/Density',
                                'JBrowse/View/Track/Wiggle/XYPlot',
                                'JBrowse/View/Track/SNPCoverage',
                                'JBrowse/View/Track/Alignments2'];
        this.trackNames = [];
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "New boolean track", className: 'booleanDialog' }
            );
        var contentContainer = dom.create( 'div', { className: 'contentContainer'});
        dialog.containerNode.parentNode.appendChild(contentContainer);
        dojo.destroy(dialog.containerNode)

        var actionBar         = this._makeActionBar( args.openCallback );
        var displaySelector   = this._makeStoreSelector();
        var maskSelector      = this._makeStoreSelector();
        var invMaskSelector   = this._makeStoreSelector();
        var nameField         = this._makeNameField( "type desired track name here" );
        var opSelector        = this._makeOPSelector();

        on( displaySelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            // prevent users from selecting multiple track types for display.
            var options = displaySelector.domNode.children;
            var selectedType = null;
            for ( var key in options ) {
                if ( options.hasOwnProperty(key) && options[key].selected ) {
                    selectedType = options[key].type;
                    break;
                }
            }
            // If nothing is selected, enable all available options
            if ( !selectedType ) {
                for ( var key in options ) {
                    if ( options.hasOwnProperty(key) && (this.supportedTracks.indexOf(options[key].type ) > -1) ) {
                        options[key].disabled = false;
                    }
                }
                return;
            }
            // else, disable and deselect relevant options
            for ( var key in options ) {
                if ( options.hasOwnProperty(key) && options[key].type != selectedType ) {
                    options[key].disabled = 'disabled';
                    options[key].selected = false;
                }
            }
        }));

        this.storeFetch = { data   : { display: displaySelector.sel,
                                       mask   : maskSelector.sel,
                                       invMask: invMaskSelector.sel },
                            name   : nameField,
                            getName: dojo.hitch(this, function() {
                                    var name = this.storeFetch.name.get('value');
                                    if ( !(this.trackNames.indexOf(name) > -1) ) { return [name] }
                                    var counter = 0;
                                    while ( this.trackNames.indexOf(name+counter) > -1 ) {
                                        counter++;
                                    }
                                    return [name,name+counter];

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

        var canvas = new settingViewer();
        // setup the preview canvas
        var c = canvas.can;
        var canvasCont = dom.create( 'div', {className: 'canvasContainer'});
        canvasCont.appendChild(c);
        canvas.drawOR();
        on( this.trackOperationChoice[0], 'change', dojo.hitch(this, function ( e ) {
            // change the preview when the OR-AND if changed
            if ( this.trackOperationChoice[0].checked ) {
                canvas.drawOR();
            }
            else {
                canvas.drawAND();
            }
        }));

        var div = function( attr, children ) {
            var d = dom.create('div', attr );
            array.forEach( children, dojo.hitch( d, 'appendChild' ));
            return d;
        };

        var textCont = dom.create( 'div', { className: 'textFieldContainer'});
        textCont.appendChild(nameField.domNode);

        var content = [
                        dom.create( 'div', { className: 'instructions',
                                             innerHTML: 'Select data to be displayed (right), data to mask (center), and data to make inverse masks (left). Masks will hide data contained in the covered regions. Inverse masks hide data not contained in the covered regions. Use "OR" and "AND" to choose how these two interact. (See preview below.)' } ),
                            div( { className: 'storeSelectors' },
                             [ displaySelector.domNode, invMaskSelector.domNode, maskSelector.domNode ]
                            ),
                        opSelector.domNode,
                        textCont,
                        actionBar.domNode,
                        canvasCont
                      ];

        for ( var node in content ) {
            if ( content.hasOwnProperty ) {
                contentContainer.appendChild(content[node]);
            }
        }
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

        var aux1 = dom.create( 'div', {className:'openImmediatelyButton'}, actionBar );
        disChoices[0].placeAt(aux1);
        dom.create('label', { for: 'openImmediately', innerHTML: 'Open immediately' }, aux1 );
        var aux2 = dom.create( 'div', {className:'addToTrackListButton'}, actionBar );
        disChoices[1].placeAt(aux2);
        dom.create('label', { for: 'addToTrackList', innerHTML: 'Add to tracks' }, aux2 );


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
                                    var name = thisB.storeFetch.getName();
                                    console.log(name);
                                    openCallback({
                                        trackConf: { key: name[0],
                                                     label: name[1]||name[0],
                                                     type:  arg,
                                                     store: { name: name[1]||name[0],
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

        var aux = dom.create('div',{className:'and-or-selector'});
        OPChoices[0].placeAt(aux);
        dom.create('label', { for: 'OR', innerHTML: 'OR  ' }, aux ),
        OPChoices[1].placeAt(aux);
        dom.create('label', { for: 'AND', innerHTML: 'AND' }, aux );

        return { domNode: aux }
    },

    _makeStoreSelector: function() {
        var selector = new MultiSelect();
        selector.containerNode.className = 'storeSelector';
        var tracks = this.browser.trackConfigsByName;
        for (var ID in tracks ) {
            if ( tracks.hasOwnProperty( ID ) ) {
                var op = window.doc.createElement('option');
                op.innerHTML = tracks[ID].key || tracks[ID].label;
                this.trackNames.push(tracks[ID].label);
                op.type = tracks[ID].type;
                op.value = tracks[ID].store+','+tracks[ID].type;
                if ( ! ( this.supportedTracks.indexOf(tracks[ID].type ) > -1 ) ) { 
                    op.disabled = 'disabled'; // disable tracks that aren't supported
                }
                selector.containerNode.appendChild(op);
            }
        }
        return { domNode: selector.containerNode, sel: selector };
    },

    _makeNameField: function( text ) {
        var name = new TextBox( { value: "",
                                  placeHolder: text
                                } );
        name.domNode.className = 'nameField';
        return name;
    }

});
});