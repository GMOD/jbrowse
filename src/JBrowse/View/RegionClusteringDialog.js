define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/aspect',
            'dijit/focus',
            'dijit/form/Button',
            'dijit/form/RadioButton',
            'dijit/form/MultiSelect',
            'dijit/form/TextBox',
            'dijit/form/FilteringSelect',
            'dijit/Dialog',
            'dojo/dom-construct',
            'dojo/_base/window',
            'dojo/on',
            'dojo/store/Memory',
            './RegionClusteringDialog/AddMultipleTracks',
            './Overlay',
            './RegionClustering'
        ],
        function( declare,
                  array,
                  aspect,
                  dijitFocus,
                  Button,
                  RadioButton,
                  MultiSelect,
                  TextBox,
                  FilteringSelect,
                  Dialog,
                  dom,
                  window,
                  on,
                  memory,
                  AddMultipleTracks,
                  Overlay,
                  RegionClustering ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.browserSupports = {
            dnd: 'draggable' in document.createElement('span')
        };
        this.supportedWiggleTracks = ['JBrowse/View/Track/Wiggle/XYFunction',
                                      'JBrowse/View/Track/Wiggle/Density',
                                      'JBrowse/View/Track/Wiggle/XYPlot'];
        this.supportedHTMLTracks = ['JBrowse/View/Track/HTMLFeatures'];
        this.trackNames = [];
        for (var ID in args.browser.trackConfigsByName ) {
            if ( args.browser.trackConfigsByName.hasOwnProperty( ID ) ) {
                this.trackNames.push(args.browser.trackConfigsByName[ID].label);;
            }
        }
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: 'Select regions for clustering', className: 'regionClusteringDialog' }
            );
        var contentContainer = dom.create( 'div', { className: 'contentContainer'});
        dialog.containerNode.parentNode.appendChild(contentContainer);
        dojo.destroy(dialog.containerNode)

        var actionBar = this._makeActionBar();
        var displaySelector = this._makeStoreSelector({ title: 'Tracks For Analysis',
                                                        supportedTracks: this.supportedWiggleTracks });
        var regionSelector = this._makeStoreSelector({ title: 'Region sources',
                                                        supportedTracks: this.supportedHTMLTracks });
        var nameField = this._makeNameField( "type desired track name here" );

        on( displaySelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            // disable the "create track" button if there is no display data available..
            actionBar.createTrackButton.set('disabled', !(dojo.query('option', displaySelector.domNode).length > 0) );
        }));

        this.storeFetch = { data : { display: displaySelector.sel, regions: regionSelector.sel },
                            fetch : dojo.hitch(this.storeFetch, function() {
                                    var storeLists = { display: this.data.display.get('value')[0]
                                                                ? this.data.display.get('value').map(
                                                                    function(arg){return arg.split(',')[0];})
                                                                : undefined,
                                                       regions: this.data.regions.get('value')[0]
                                                                ? this.data.regions.get('value').map(
                                                                    function(arg){return arg.split(',')[0];})
                                                                : undefined };
                                    // remove duplicates. Multiple tracks may have the same store.
                                    storeLists.display = storeLists.display
                                                         ?  storeLists.display.filter(function(elem, pos) {
                                                                return storeLists.display.indexOf(elem) == pos;
                                                            })
                                                         : undefined;
                                    storeLists.regions = storeLists.regions
                                                         ?  storeLists.regions.filter(function(elem, pos) {
                                                                return storeLists.regions.indexOf(elem) == pos;
                                                            })
                                                         : undefined;
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
                                             innerHTML: 'Select tracks for clustering.' } ),
                            div( { className: 'storeSelectors' },
                             [ displaySelector.domNode, regionSelector.domNode ]
                            ),
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

    _makeActionBar: function() {
        var thisB = this;
        // Adapted from the file dialogue.
        var actionBar = dom.create( 'div', { className: 'dijitDialogPaneActionBar' });

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
                                new RegionClustering({ browser: thisB.browser, storeNames: thisB.storeFetch.fetch(), numOfBins: 20 }).show()
                                thisB.dialog.hide();
                            })
                    })
            .placeAt( actionBar );

        return { domNode: actionBar, createTrackButton: createTrack };
    },

    _makeStoreSelector: function( args ) { // consider making this a new class. It's big and resonably well encapsulated.
        var selectorTitle = args.title;
        var supportedTracks = args.supportedTracks;

        var container = dom.create( 'div', { className: 'selectorContainer'} )


        var title = dom.create( 'div', { className: 'selectorTitle', innerHTML: selectorTitle } );

        // a multiselect to hold the track list
        var selector = new MultiSelect();
        selector.containerNode.className = 'storeSelections';

        // add default text for when the track selector is empty
        var defaultText = dom.create( 'div', { className: 'selectorDefaultText',
                                       innerHTML: 'Add tracks using the controls below'
                                     } )
        container.appendChild(defaultText);

        on(selector.domNode, 'change', dojo.hitch(this, function(){
            // hide the default text if the selector contains tracks.
            if (selector.domNode.firstChild)
                defaultText.style.visibility = 'hidden';
            else
                defaultText.style.visibility = 'visible';
        }));

        var tracks = {};
        for ( var ID in this.browser.trackConfigsByName ) {
            if ( this.browser.trackConfigsByName.hasOwnProperty(ID) ) {
                var tmp = this.browser.trackConfigsByName;
                tracks[ tmp[ID].key || tmp[ID].label ] = { type: tmp[ID].type,
                                                           value: tmp[ID].store+','+tmp[ID].type,
                                                           disabled: false,
                                                           valid: ( supportedTracks.indexOf(tmp[ID].type ) > -1 ) ? true : false
                                                         };
            }
        }

        var opBar = dom.create( 'div', { className: 'operationBar' } );

        var trackStore = new memory( { data: [/* { name: '', id: ''} */] } );

        // populate the trackStore
        (function() {
            for ( var key in tracks ) {
                if ( tracks.hasOwnProperty(key) && tracks[key].valid ) {
                    trackStore.put( { name: key, id: key } );
                }
            }
        })();

        var updateStore = trackStore.updateStore = function( type ) {
            if (type) {
                for (var key in tracks ) {
                    if (tracks.hasOwnProperty(key) && (tracks[key].type != type)) {
                        trackStore.remove(key);
                        tracks[key].disabled = true;
                    }
                }
            }
            else {
                trackStore.data = [];
                for (var key in tracks ) {
                    if (tracks.hasOwnProperty(key)) {
                        trackStore.put( { name: key, id: key } );
                        tracks[key].disabled = false;
                    }
                }
            }
        }

        var cBox = new FilteringSelect( { id: selectorTitle+'TrackFinder',
                                          name: 'track',
                                          value: '',
                                          store: trackStore,
                                          required: false,
                                          searchAttr: 'name',
                                          invalidMessage: 'Not a valid track.'
                                        }, 'trackFinder');

        opBar.appendChild( dom.create( 'div', { className: 'button1 jbrowseIconMinus',
                                                multiselect: selector,
                                                onclick: function() {
                                                    // Orphan the selected children :D
                                                    dojo.query('option', selector.domNode)
                                                        .filter(function(n){return n.selected;}).orphan();
                                                    if (args.filter && dojo.query('option', selector.domNode).length <= 0)
                                                        updateStore();
                                                    // trigger selector event
                                                    on.emit(selector.domNode, "change", {
                                                        bubbles: true,
                                                        cancelable: true
                                                    });
                                                },
                                                // make the border change color when the "button" is clicked
                                                onmousedown: function() {
                                                    this.style.border = '1px dotted grey';
                                                },
                                                onmouseup: function() {
                                                    this.style.border = '1px solid transparent';
                                                },
                                                onmouseleave: function() {
                                                    this.style.border = '1px solid transparent';
                                                }
                                        })
                         );

        opBar.appendChild( dom.create( 'div', { className: 'button1 jbrowseIconPlus',
                                                multiselect: selector,
                                                onclick: dojo.hitch(this, function() {
                                                    var key = cBox.get('value');
                                                    if ( !key )
                                                        return;
                                                    if (args.filter) {
                                                        updateStore(tracks[key].type);
                                                    }
                                                    var op = window.doc.createElement('option');
                                                    op.innerHTML = key;
                                                    op.type = tracks[key].type;
                                                    op.value = tracks[key].value;
                                                    selector.containerNode.appendChild(op);
                                                    // trigger selector event
                                                    on.emit(selector.domNode, "change", {
                                                        bubbles: true,
                                                        cancelable: true
                                                    });
                                                }),
                                                // make the border change color when the "button" is clicked
                                                onmousedown: function() {
                                                    this.style.border = '1px dotted grey';
                                                },
                                                onmouseup: function() {
                                                    this.style.border = '1px solid transparent';
                                                },
                                                onmouseleave: function() {
                                                    this.style.border = '1px solid transparent';
                                                }
                                        })
                         );

        opBar.appendChild( dom.create( 'div', { className: 'button2 jbrowseIconBars',
                                                onclick: function() {
                                                   new AddMultipleTracks({multiselect: selector, tracks: tracks}).show({store: trackStore, filtering: args.filter});
                                                }
                                               })
                         );

        cBox.placeAt( opBar );

        container.appendChild(title);
        container.appendChild(selector.domNode);
        container.appendChild(opBar);

        return { domNode: container, sel: selector };
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