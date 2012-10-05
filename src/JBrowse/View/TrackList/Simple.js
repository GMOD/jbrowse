define(['dojo/_base/declare',
        'dijit/layout/ContentPane',
        'dojo/dnd/Source',
        'dojo/fx/easing'
       ],
       function( declare, ContentPane, dndSource, animationEasing ) {
return declare( 'JBrowse.View.TrackList.Simple', null,

    /** @lends JBrowse.View.TrackList.Simple.prototype */
    {

    /**
     * Simple drag-and-drop track selector.
     * @constructs
     */
    constructor: function( args ) {
        this.browser = args.browser;

        // make the track list DOM nodes and widgets
        this.createTrackList( args.browser.container );

        // maintain a list of the HTML nodes of inactive tracks, so we
        // can flash them and whatnot
        this.inactiveTrackNodes = {};

        // populate our track list (in the right order)
        this.trackListWidget.insertNodes(
            false,
            args.trackConfigs
        );

        // subscribe to drop events for tracks being DND'ed
        this.browser.subscribe(
            "/dnd/drop",
            dojo.hitch( this,
                        function( source, nodes, copy, target ){
                            if( target !== this.trackListWidget )
                                return;

                            // get the configs from the tracks being dragged in
                            var confs = dojo.filter(
                                dojo.map( nodes, function(n) {
                                              return n.track && n.track.config;
                                          }
                                        ),
                                function(c) {return c;}
                            );

                            // return if no confs; whatever was
                            // dragged here probably wasn't a
                            // track
                            if( ! confs.length )
                                return;

                            this.dndDrop = true;
                            this.browser.publish( '/jbrowse/v1/v/tracks/hide', confs );
                            this.dndDrop = false;
                        }
                      ));

        // subscribe to commands coming from the the controller
        this.browser.subscribe( '/jbrowse/v1/c/tracks/show',
                                dojo.hitch( this, 'setTracksActive' ));

        // subscribe to commands coming from the the controller
        this.browser.subscribe( '/jbrowse/v1/c/tracks/hide',
                                dojo.hitch( this, 'setTracksInactive' ));
    },

    /** @private */
    createTrackList: function( renderTo ) {
        var leftPane = dojo.create(
            'div',
            { id: 'trackPane',
              style: { width: '10em' }
            },
            renderTo
        );

        //splitter on left side
        var leftWidget = new ContentPane({region: "left", splitter: true}, leftPane);

        var trackListDiv = dojo.create(
            'div',
            { id: 'tracksAvail',
              className: 'container handles',
              style: { width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' },
              innerHTML: '<h2>Available Tracks</h2>',
              onclick: dojo.hitch( this, function() { this.trackListWidget.selectNone(); } )
            },
            leftPane
        );

        this.trackListWidget = new dndSource(
            trackListDiv,
            {
                accept: ["track"], // accepts only tracks into left div
                withHandles: false,
                creator: dojo.hitch( this, function( trackConfig, hint ) {
                    var node = dojo.create(
                        'div',
                        { className: 'tracklist-label',
                          title: 'drag or double-click to activate',
                          innerHTML: trackConfig.key
                        }
                    );
                    //in the list, wrap the list item in a container for
                    //border drag-insertion-point monkeying
                    if ("avatar" != hint) {
                        dojo.connect( node, "dblclick", dojo.hitch(this, function() {
                            this.browser.publish( '/jbrowse/v1/v/tracks/show', [trackConfig] );
                        }));
                        var container = dojo.create( 'div', { className: 'tracklist-container' });
                        container.appendChild(node);
                        node = container;
                    }
                    node.id = dojo.dnd.getUniqueId();
                    this.inactiveTrackNodes[trackConfig.label] = node;
                    return {node: node, data: trackConfig, type: ["track"]};
                })
            }
        );

        return trackListDiv;
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
        // remove any tracks in our track list that are being set as visible
        dojo.forEach( trackConfigs || [], function( conf ) {
            this.trackListWidget.forInItems(function(obj, id, map) {
                if( conf.label === obj.data.label ) {

                    this.trackListWidget.delItem( id );

                    var item = dojo.byId(id);
                    if( item && item.parentNode )
                        item.parentNode.removeChild(item);

                    delete this.inactiveTrackNodes[ conf.label ];

                }
            },this);
        },this);
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned off.
     */
    setTracksInactive: function( /**Array[Object]*/ trackConfigs ) {

        // remove any tracks in our track list that are being set as visible
        if( ! this.dndDrop ) {
            var n = this.trackListWidget.insertNodes( false, trackConfigs );

            // scroll the tracklist all the way to the bottom so we can see the blinking nodes
            n.node.scrollTop = n.node.scrollHeight;

            // blink the track(s) that we just turned off to make it
            // easier for users to tell where they went.
            // note that insertNodes will have put its html element in
            // inactivetracknodes
            dojo.forEach( trackConfigs, function(c) {
                var label = this.inactiveTrackNodes[c.label].firstChild;
                dojo.animateProperty({
                                         node: label,
                                         duration: 400,
                                         properties: {
                                             backgroundColor: { start: '#FFDE2B', end: 'white' }
                                         },
                                         easing: animationEasing.sine,
                                         repeat: 2,
                                         onEnd: function() {
                                             label.style.backgroundColor = null;
                                         }
                                     }).play();
            },this);
        }
    },

    /**
     * Make the track selector visible.
     * This does nothing for the Simple track selector, since it is always visible.
     */
    show: function() {
    },

    /**
     * Make the track selector invisible.
     * This does nothing for the Simple track selector, since it is always visible.
     */
    hide: function() {
    },

    /**
     * Toggle visibility of this track selector.
     * This does nothing for the Simple track selector, since it is always visible.
     */
    toggle: function() {
    }

});
});