define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/aspect',
            'dijit/focus',
            'dijit/form/Button',
            'dijit/form/NumberTextBox',
            'dijit/Dialog',
            'dojo/dom-construct',
            'dojo/on',
            './RegionClusteringDialog/TrackSelector',
            './RegionClustering'
        ],
        function( declare,
                  array,
                  aspect,
                  dijitFocus,
                  Button,
                  NumberTextBox,
                  Dialog,
                  dom,
                  on,
                  TrackSelector,
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
        var displaySelector = new TrackSelector({browser: this.browser, supportedTracks: this.supportedWiggleTracks})
                                .makeStoreSelector({ title: 'Tracks For Analysis', supportedTracks: this.supportedWiggleTracks });
        var regionSelector = new TrackSelector({browser: this.browser, supportedTracks: this.supportedHTMLTracks})
                                .makeStoreSelector({ title: 'Region sources', supportedTracks: this.supportedHTMLTracks });
        var bin = this._makeNumField( 6, 'Number of bins: ' );
        var HMlen = this._makeNumField( 1000, 'Length of queried regions (bp): ');

        // Clustering requires tracks form bothe selectors. Disable button otherwise.
        on( displaySelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            // disable the "create track" button if there is no display/region data available.
            actionBar.makeClustersButton.set('disabled',
                !(dojo.query('option', displaySelector.domNode).length > 0 &&
                  dojo.query('option', regionSelector.domNode).length > 0 ) );
        }));
        on( regionSelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            // disable the "create track" button if there is no display/region data available.
            actionBar.makeClustersButton.set('disabled',
                !(dojo.query('option', displaySelector.domNode).length > 0 &&
                  dojo.query('option', regionSelector.domNode).length > 0 ) );
        }));

        this.storeFetch = { data : { display: displaySelector.sel, regions: regionSelector.sel },
                            numbers: { bin: bin, HMlen: HMlen },
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
                        bin,
                        HMlen,
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
        var makeClusters = new Button({ label: 'Perform clustering',
                     disabled: true,
                     onClick: dojo.hitch( thisB, function() {
                                if ( thisB.storeFetch.numbers.bin.number.get('value') 
                                     > thisB.storeFetch.numbers.HMlen.number.get('value') ) {
                                    alert('Number of bins must be smaller than heatmap length');
                                    return; // prevent meaningless bin/length assignments.
                                }

                                // first, select everything in the multiselects.
                                for ( var key in thisB.storeFetch.data ) {
                                    if ( thisB.storeFetch.data.hasOwnProperty(key) ) {
                                        dojo.query('option', thisB.storeFetch.data[key].domNode)
                                           .forEach(function(node, index, nodelist){
                                                node.selected = true;
                                            });
                                    }
                                }
                                thisB.dialog.hide();
                                new RegionClustering({ browser: thisB.browser,
                                                       storeNames: thisB.storeFetch.fetch(),
                                                       numOfBins: thisB.storeFetch.numbers.bin.number.get('value'),
                                                       queryLength: thisB.storeFetch.numbers.HMlen.number.get('value'),
                                                    }).show()
                            })
                    })
            .placeAt( actionBar );

        return { domNode: actionBar, makeClustersButton: makeClusters };
    },

    _makeNumField: function( defaultNum, text ) {
        var container = dom.create('div', {className: 'numFieldContainer' });
        dom.create('div', {className: 'numField-text', innerHTML: text }, container);
        var num = new NumberTextBox( { value: defaultNum,
                                       constraints: { min: 1, places: 0 }
                                      } );
        num.domNode.className += ' numField';
        container.number = num;
        container.appendChild(num.domNode);
        return container;
    }

});
});