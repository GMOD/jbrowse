define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/aspect',
            'dijit/focus',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dijit/form/TextBox',
            'dijit/Dialog',
            'dojo/dom-construct',
            'dojo/Deferred',
            './MaskDialog/settingViewer',
            './MaskDialog/TrackSelector',
            'dojo/on'
        ],
        function( declare,
                  array,
                  aspect,
                  dijitFocus,
                  Button,
                  RadioButton,
                  TextBox,
                  Dialog,
                  dom,
                  Deferred,
                  settingViewer,
                  TrackSelector,
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
        for (var ID in args.browser.trackConfigsByName ) {
            if ( args.browser.trackConfigsByName.hasOwnProperty( ID ) ) {
                this.trackNames.push(args.browser.trackConfigsByName[ID].label);;
            }
        }
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "New masking track", className: 'maskDialog' }
            );
        var contentContainer = dom.create( 'div', { className: 'contentContainer'});
        dialog.containerNode.parentNode.appendChild(contentContainer);
        dojo.destroy(dialog.containerNode)

        var actionBar         = this._makeActionBar( args.openCallback );
        var displaySelector   = new TrackSelector({ browser: this.browser, supportedTracks: this.supportedTracks }).
                                    makeStoreSelector({ title: 'Display', filter: true });
        var invMaskSelector   = new TrackSelector({ browser: this.browser, supportedTracks: this.supportedTracks }).
                                    makeStoreSelector({ title: 'Inverse Mask' });
        var maskSelector      = new TrackSelector({ browser: this.browser, supportedTracks: this.supportedTracks }).
                                    makeStoreSelector({ title: 'Mask'});
        var nameField         = this._makeNameField( "type desired track name here" );
        var opSelector        = this._makeOPSelector();

        on( displaySelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            // disable the "create track" button if there is no display data available..
            actionBar.createTrackButton.set('disabled', !(dojo.query('option', displaySelector.domNode).length > 0) );
        }));

        this.storeFetch = { data   : { display: displaySelector.sel,
                                       mask   : maskSelector.sel,
                                       invMask: invMaskSelector.sel },
                            name   : nameField,
                            getName: dojo.hitch(this, function() {
                                    var name = this.storeFetch.name.get('value') || 'masked track ';
                                    name = name.replace(/\s+/g,'_').toLowerCase();
                                    if ( !(this.trackNames.indexOf(name) > -1) ) {
                                        return [name]
                                    }
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
                                                console.error('multiple track types selected for display data (should not be possible).');
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
                                             innerHTML: 'Select data to be displayed (right), data to mask (center), and data to make inverse masks (left). Add tracks either by finding them in the searchable drop-down menu and pressing the + icon, or by using the multiple track selection button to the right of the drop-down menu. Tracks may be removed from the list using the - icon. Masks will hide data contained in the covered regions. Inverse masks hide data not contained in the covered regions. Use "OR" and "AND" to choose how these two interact. (See preview below.) Note: not all track types or track combinations are compatible with this tool. Availble track choices will be updated as you use this selector.'} ),
                            div( { className: 'storeSelectors' },
                             [ displaySelector.domNode, maskSelector.domNode, invMaskSelector.domNode ]
                            ),
                        canvasCont,
                        opSelector.domNode,
                        textCont,
                        actionBar.domNode
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
                              setTimeout( function() { dialog.destroyRecursive(); }, 500 );
                      }));
    },

    _makeActionBar: function( openCallback ) {
        var thisB = this;
        // Adapted from the file dialogue.
        var actionBar = dom.create( 'div', { className: 'dijitDialogPaneActionBar' });

        var disChoices = thisB.trackDispositionChoice = [
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
                     onClick: function() { thisB.dialog.hide(); }
                   })
            .placeAt( actionBar );
        var createTrack = new Button({ label: 'Create track',
                     disabled: true,
                     onClick: dojo.hitch( thisB, function() {
                                // first, select everything in the multiselects.
                                for ( var key in thisB.storeFetch.data ) {
                                    if ( thisB.storeFetch.data.hasOwnProperty(key) ) {
                                        dojo.query('option', thisB.storeFetch.data[key].domNode)
                                           .forEach(function(node, index, nodelist){
                                                node.selected = true;
                                            });
                                    }
                                }
                                d = new Deferred();
                                thisB.storeFetch.displayTypes(d);
                                dojo.when(d, function( arg ){
                                    var name = thisB.storeFetch.getName();
                                    openCallback({
                                        trackConf: { key: name[0],
                                                     label: name[1] ? name[1].replace(/\s+/g,'_').toLowerCase() 
                                                                    : name[0].replace(/\s+/g,'_').toLowerCase(),
                                                     type:  arg,
                                                     store: { name: name[1] ? name[1].replace(/\s+/g,'_').toLowerCase() 
                                                                            : name[0].replace(/\s+/g,'_').toLowerCase(),
                                                              booleanOP: thisB.trackOperationChoice[0].checked ? thisB.trackOperationChoice[0].value :
                                                                         thisB.trackOperationChoice[1].checked ? thisB.trackOperationChoice[1].value :
                                                                         undefined,
                                                              browser: thisB.browser,
                                                              refSeq:  thisB.browser.refSeq,
                                                              type: 'JBrowse/Store/SeqFeature/Mask',
                                                              storeNames: thisB.storeFetch.fetch()
                                                            }
                                                    },
                                        trackDisposition: thisB.trackDispositionChoice[0].checked ? thisB.trackDispositionChoice[0].value :
                                                          thisB.trackDispositionChoice[1].checked ? thisB.trackDispositionChoice[1].value :
                                                          undefined
                                    });
                                })
                                thisB.dialog.hide();
                            })
                    })
            .placeAt( actionBar );

        return { domNode: actionBar, createTrackButton: createTrack };
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

    _makeNameField: function( text ) {
        var name = new TextBox( { value: "",
                                  placeHolder: text
                                } );
        name.domNode.className = 'nameField';
        return name;
    }

});
});