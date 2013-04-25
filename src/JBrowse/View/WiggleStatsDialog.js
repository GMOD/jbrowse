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
            'dojo/on',
            './WiggleStatsDialog/TrackSelector'
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
                  on,
                  TrackSelector ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;
        this.browserSupports = {
            dnd: 'draggable' in document.createElement('span')
        };
        this.supportedTracks = ['JBrowse/View/Track/Wiggle/XYFunction',
                                'JBrowse/View/Track/Wiggle/Density',
                                'JBrowse/View/Track/Wiggle/XYPlot'];
        this.trackNames = [];
        for (var ID in args.browser.trackConfigsByName ) {
            if ( args.browser.trackConfigsByName.hasOwnProperty( ID ) ) {
                this.trackNames.push(args.browser.trackConfigsByName[ID].label);;
            }
        }
    },

    show: function( args ) {
        var dialog = this.dialog = new Dialog(
            { title: "New wiggle statistics track", className: 'wiggleStatsDialog' }
            );
        var contentContainer = dom.create( 'div', { className: 'contentContainer'});
        dialog.containerNode.parentNode.appendChild(contentContainer);
        dojo.destroy(dialog.containerNode)

        var actionBar         = this._makeActionBar( args.openCallback );
        var displaySelector   = new TrackSelector({ browser: this.browser, supportedTracks: this.supportedTracks })
                                    .makeStoreSelector({ title: 'Tracks For Analysis' }); 
        var nameField         = this._makeNameField();

        on( displaySelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            // disable the "create track" button if there is no display data available..
            actionBar.createTrackButton.set('disabled', !(dojo.query('option', displaySelector.domNode).length > 0) );
        }));

        this.storeFetch = { data   : { display: displaySelector.sel },
                            name   : nameField.trackName,
                            getName: dojo.hitch(this, function() {
                                    var name = this.storeFetch.name.get('value') || 'masked track';
                                    var nameParsed = name.replace(/\s+/g,'_').toLowerCase();
                                    if ( !(this.trackNames.indexOf(nameParsed) > -1) ) {
                                        return [name]
                                    }
                                    var counter = 0;
                                    while ( this.trackNames.indexOf(nameParsed+counter) > -1 ) {
                                        counter++;
                                    }
                                    return [name,nameParsed+counter];

                                }),
                            fetch  : dojo.hitch(this.storeFetch, function() {
                                    var storeLists = { display: this.data.display.get('value')[0]
                                                                ? this.data.display.get('value').map(
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

        var textCont = dom.create( 'div', { className: 'textFieldContainer'});
        textCont.appendChild(nameField);

        var content = [
                        dom.create( 'div', { className: 'instructions',
                                             innerHTML: 'Select tracks for analysis. \
                                                         A new track will be \
                                                         created to show the average \
                                                         value, standard deviation and \
                                                         max/min values of the \
                                                         selected tracks.' } ),
                            div( { className: 'storeSelectors' },
                             [ displaySelector.domNode ]
                            ),
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
        var actionBar = dom.create( 'div', { className: 'actionBar' });

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

        var buttonContainer = dom.create('div', {className: 'buttonContainer'}, actionBar);
        new Button({ iconClass: 'dijitIconDelete', label: 'Cancel',
                     onClick: function() { thisB.dialog.hide(); }
                   })
            .placeAt( buttonContainer );
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
                                var name = thisB.storeFetch.getName();
                                openCallback({
                                    trackConf: { key: name[0],
                                                 label: name[1] ? name[1].replace(/\s+/g,'_').toLowerCase()
                                                                : name[0].replace(/\s+/g,'_').toLowerCase(),
                                                 type:  'JBrowse/View/Track/Statistics',
                                                 store: { name: name[1] ? name[1].replace(/\s+/g,'_').toLowerCase()
                                                                        : name[0].replace(/\s+/g,'_').toLowerCase(),
                                                          browser: thisB.browser,
                                                          refSeq:  thisB.browser.refSeq,
                                                          type: 'JBrowse/Store/SeqFeature/WiggleStatistics',
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
            .placeAt( buttonContainer );

        return { domNode: actionBar, createTrackButton: createTrack };
    },

    _makeNameField: function() {
        var container = dom.create('div', {className: 'title-container'});
        container.appendChild(dom.create('div', { className: 'title-container-text',
                                                  innerHTML: 'Track title: ' }));
        var name = new TextBox( { value: "wiggle track statistics" } );
        name.domNode.className += ' nameField';
        name.placeAt(container);
        container.trackName = name;
        return container;
    }

});
});