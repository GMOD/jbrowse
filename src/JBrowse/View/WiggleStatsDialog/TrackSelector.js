define([
        'dojo/_base/declare',
        'dijit/form/MultiSelect',
        'dojo/store/Memory',
        'dijit/form/FilteringSelect',
        './AddMultipleTracks',
        'dojo/on',
        'dojo/dom-construct',
        'dojo/_base/window'
        ],
        function(
                    declare,
                    MultiSelect,
                    memory,
                    FilteringSelect,
                    AddMultipleTracks,
                    on,
                    dom,
                    window
                ) {
return declare( null, {

    constructor: function(args) {
        this.browser = args.browser;
        this.supportedTracks = args.supportedTracks;
    },

    /* Returns a series of tools that can be used to select
     * existing tracks.*/
    makeStoreSelector: function( args ) {
        var selectorTitle = args.title;

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
                                                           valid: ( this.supportedTracks.indexOf(tmp[ID].type ) > -1 ) ? true : false
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
    }
});
});