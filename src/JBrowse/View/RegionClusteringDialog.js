define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/fx',
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
                  FX,
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
        // create the dialog box
        var dialog = this.dialog = new Dialog(
            { title: 'Select regions for clustering', className: 'regionClusteringDialog' }
            );
        this.fade = function(){
            FX.fadeOut({node: dialog.domNode, duration: 100}).play();
            // prevents the user from clicking it multiple times
            setTimeout(function(){dialog.domNode.style.zIndex = -1;})
        }; // called on button press
        var contentContainer = this.contentContainer = dom.create( 'div', { className: 'contentContainer'});
        dialog.containerNode.parentNode.appendChild(contentContainer);
        dojo.destroy(dialog.containerNode);

        // action bar contains buttons
        var actionBar = this._makeActionBar();
        // track selectors to... select tracks.
        var displaySelector = new TrackSelector({browser: this.browser, supportedTracks: this.supportedWiggleTracks})
                                .makeStoreSelector({ title: 'Tracks For Analysis', supportedTracks: this.supportedWiggleTracks });
        var regionSelector = new TrackSelector({browser: this.browser, supportedTracks: this.supportedHTMLTracks})
                                .makeStoreSelector({ title: 'Region sources', supportedTracks: this.supportedHTMLTracks });
        // number fields to customize behaviour.
        var bin = this._makeNumField( 6, 'Number of bins: ' );
        var HMlen = this._makeNumField( 1000, 'Length of queried regions (bp): ');
        var numClust = this._makeNumField( null, 'Number of clusters: ');
        numClust.number.set({ placeHolder: 'Defaults to sqrt(n/2)' });

        // Clustering requires tracks form both selectors. Disable button otherwise.
        // disable the "create track" button if there is no display/region data available.
        on( displaySelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            actionBar.makeClustersButton.set('disabled',
                !(dojo.query('option', displaySelector.domNode).length > 0 &&
                  dojo.query('option', regionSelector.domNode).length > 0 ) );
        }));
        on( regionSelector.domNode, 'change', dojo.hitch(this, function ( e ) {
            actionBar.makeClustersButton.set('disabled',
                !(dojo.query('option', displaySelector.domNode).length > 0 &&
                  dojo.query('option', regionSelector.domNode).length > 0 ) );
        }));

        // create an object that allows us to fetch user input more easilly.
        this.storeFetch = { data : { display: displaySelector.sel, regions: regionSelector.sel },
                            numbers: { bin: bin, HMlen: HMlen, numClust: numClust },
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
                                             innerHTML: '<p>Select data to be analyzed (left), \
                                                         and region sources (right). Add \
                                                         tracks either by finding them in \
                                                         the searchable drop-down menu and \
                                                         pressing the + icon, or by using the \
                                                         multiple track selection button to \
                                                         the right of the drop-down menu. \
                                                         Tracks may be removed from the \
                                                         list using the - icon.</p><p>See the \
                                                         help button (?) for additional \
                                                         information</p><p>Note: not all \
                                                         track types are compatible with \
                                                         this tool. Availble track choices \
                                                         will be updated as you use \
                                                         this selector.' } ),
                        div( { className: 'storeSelectors' },
                         [ displaySelector.domNode, regionSelector.domNode ]
                        ),
                        bin,
                        HMlen,
                        numClust,
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
        var actionBar = dom.create( 'div', { className: 'actionBar' });

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

                                // select everything in the multiselects.
                                for ( var key in thisB.storeFetch.data ) {
                                    if ( thisB.storeFetch.data.hasOwnProperty(key) ) {
                                        dojo.query('option', thisB.storeFetch.data[key].domNode)
                                           .forEach(function(node, index, nodelist){
                                                node.selected = true;
                                            });
                                    }
                                }
                                // create wait message
                                // Note, appending it to the body places it above the dijit dialog underlay
                                var clusterWaitMessage = document.createElement('div')
                                clusterWaitMessage.className = 'cluster-wait';
                                clusterWaitMessage.innerHTML = 'Performing clustering.<br> Please wait...';
                                document.body.appendChild(clusterWaitMessage);
                                // hide without destroying
                                this.fade(); // defined earlier.
                                setTimeout(function(){
                                    new RegionClustering({ browser: thisB.browser,
                                                           storeNames: thisB.storeFetch.fetch(),
                                                           numOfBins: thisB.storeFetch.numbers.bin.number.get('value'),
                                                           queryLength: thisB.storeFetch.numbers.HMlen.number.get('value'),
                                                           numClusters: thisB.storeFetch.numbers.numClust.number.get('value'),
                                                        }).show(
                                                        (function(){document.body.removeChild(clusterWaitMessage);
                                                                    thisB.dialog.hide()}));
                                    }, 200);
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