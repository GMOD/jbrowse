/**
 * Simple drag-and-drop track selector.
 * @class JBrowse.View.TrackList.Simple
 */

dojo.declare( 'JBrowse.View.TrackList.Simple', null, {

    /**
     * @constructor
     */
    constructor: function( args ) {

        // make the track list DOM nodes and widgets
        this.createTrackList( args.renderTo );

        // populate our track list (in the right order)
        this.trackListWidget.insertNodes(
            false,
            args.trackConfigs
        );

        // subscribe to drop events for tracks being DND'ed
        dojo.subscribe( "/dnd/drop",
                        function(){
                            //TODO: check if this is actually a track-drag that
                            //generated this drop event
                            dojo.publish( '/jbrowse/v1/v/tracks/hide' );
                        }
                      );

        // subscribe to commands coming from the the controller
        dojo.subscribe( '/jbrowse/v1/c/tracks/show',
                        dojo.hitch( this, 'setTracksActive' ));
    },

    createTrackList: function( renderTo ) {
        var leftPane = dojo.create(
            'div',
            { id: 'trackPane',
              style: { width: '10em' }
            },
            renderTo
        );

        //splitter on left side
        var leftWidget = new dijit.layout.ContentPane({region: "left", splitter: true}, leftPane);

        var trackListDiv = dojo.create(
            'div',
            { id: 'tracksAvail',
              className: 'container handles',
              style: { width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' },
              innerHTML: '<h2>Available Tracks</h2>'
            },
            leftPane
        );

        this.trackListWidget = new dojo.dnd.Source(
            trackListDiv,
            {
                accept: ["track"], // accepts only tracks into left div
                withHandles: false,
                creator: function( trackConfig, hint ) {
                    var node = dojo.create(
                        'div',
                        { className: 'tracklist-label',
                          title: 'to turn on, drag into track area',
                          innerHTML: trackConfig.key
                        }
                    );
                    //in the list, wrap the list item in a container for
                    //border drag-insertion-point monkeying
                    if ("avatar" != hint) {
                        var container = dojo.create( 'div', { className: 'tracklist-container' });
                        container.appendChild(node);
                        node = container;
                    }
                    node.id = dojo.dnd.getUniqueId();
                    return {node: node, data: trackConfig, type: ["track"]};
                }
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
                }
            },this);
        },this);
    }
});

