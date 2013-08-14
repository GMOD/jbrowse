define(['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/event',
        'dojo/keys',
        'dojo/on',
        'dojo/dom-construct',
        'dojo/dom-class',
        'dijit/layout/ContentPane',
        'dojo/dnd/Source',
        'dojo/fx/easing',
        'dijit/form/TextBox'
       ],
       function(
           declare,
           array,
           event,
           keys,
           on,
           dom,
           domClass,
           ContentPane,
           dndSource,
           animationEasing,
           dijitTextBox
       ) {

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
        this.browser.subscribe( '/jbrowse/v1/c/tracks/hide',
                                dojo.hitch( this, 'setTracksInactive' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/new',
                                dojo.hitch( this, 'addTracks' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/replace',
                                dojo.hitch( this, 'replaceTracks' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/delete',
                                dojo.hitch( this, 'deleteTracks' ));
    },

    addTracks: function( trackConfigs ) {
        // note that new tracks are, by default, hidden, so we just put them in the list
        this.trackListWidget.insertNodes(
            false,
            trackConfigs
        );

        this._blinkTracks( trackConfigs );
    },

    replaceTracks: function( trackConfigs ) {
        // for each one
        array.forEach( trackConfigs, function( conf ) {
            // figure out its position in the genome view and delete it
            var oldNode = this.inactiveTrackNodes[ conf.label ];
            if( ! oldNode )
                return;
            delete this.inactiveTrackNodes[ conf.label ];

            this.trackListWidget.delItem( oldNode.id );
            if( oldNode.parentNode )
                oldNode.parentNode.removeChild( oldNode );

           // insert the new track config into the trackListWidget after the 'before'
           this.trackListWidget.insertNodes( false, [conf], false, oldNode.previousSibling );
       },this);
    },

    /** @private */
    createTrackList: function( renderTo ) {
        var leftPane = dojo.create(
            'div',
            { id: 'trackPane',
              style: { width: '12em' }
            },
            renderTo
        );

        //splitter on left side
        var leftWidget = new ContentPane({region: "left", splitter: true}, leftPane);

        var trackListDiv = this.div = dojo.create(
            'div',
            { id: 'tracksAvail',
              className: 'container handles',
              style: { width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' },
              innerHTML: '<h2>Available Tracks</h2>'
            },
            leftPane
        );

       this.textFilterDiv = dom.create( 'div', {
                                            className: 'textfilter',
                                            style: {
                                                width: '100%',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }
                                        }, trackListDiv );
       this.textFilterInput = dom.create(
            'input',
            { type: 'text',
              style: {
                  paddingLeft: '18px',
                  height: '16px',
                  width: '80%'
              },
              placeholder: 'filter by text',
              onkeypress: dojo.hitch( this, function( evt ) {
                  if( evt.keyCode == keys.ESCAPE ) {
                      this.textFilterInput.value = '';
                  }

                  if( this.textFilterTimeout )
                      window.clearTimeout( this.textFilterTimeout );
                  this.textFilterTimeout = window.setTimeout(
                      dojo.hitch( this, function() {
                                      this._updateTextFilterControl();
                                      this._textFilter( this.textFilterInput.value );
                                  }),
                      500
                  );
                  this._updateTextFilterControl();

                  evt.stopPropagation();
              })
            },
            dom.create('div',{ style: 'overflow: show;' }, this.textFilterDiv )
        );

        // make a "clear" button for the text filtering input
        this.textFilterClearButton = dom.create('div', {
            className: 'jbrowseIconCancel',
            onclick: dojo.hitch( this, function() {
                this._clearTextFilterControl();
                this._textFilter( this.textFilterInput.value );
            }),
            style: {
                position: 'absolute',
                left: '4px',
                top: '6px'
            }
        }, this.textFilterDiv );

        this._updateTextFilterControl();

        this.trackListWidget = new dndSource(
            trackListDiv,
            {
                accept: ["track"], // accepts only tracks into left div
                withHandles: false,
                copyOnly: true,
                creator: dojo.hitch( this, function( trackConfig, hint ) {
                    var key = trackConfig.key || trackConfig.name || trackConfig.label;
                    var node = dojo.create(
                        'div',
                        { className: 'tracklist-label',
                          title: key+' (drag or double-click to activate)',
                          innerHTML: key
                        }
                    );

                    //in the list, wrap the list item in a container for
                    //border drag-insertion-point monkeying
                    if ("avatar" != hint) {
                        on(node, "dblclick", dojo.hitch(this, function() {
                            this.browser.publish( '/jbrowse/v1/v/tracks/show', [trackConfig] );
                        }));

                        var container = dojo.create( 'div', { className: 'tracklist-container' });
                        container.appendChild(node);
                        node = container;
                        node.id = dojo.dnd.getUniqueId();
                        this.inactiveTrackNodes[trackConfig.label] = node;
                    }
                    return {node: node, data: trackConfig, type: ["track"]};
                })
            }
        );

        // The dojo onMouseDown and onMouseUp methods don't support the functionality we're looking for,
        // so we'll substitute our own
        this.trackListWidget.onMouseDown = dojo.hitch(this, "onMouseDown");
        this.trackListWidget.onMouseUp = dojo.hitch(this, "onMouseUp");

        // We want the escape key to deselect all tracks
        on(document, "keydown", dojo.hitch(this, "onKeyDown"));

        return trackListDiv;
    },

    onKeyDown: function(e) {
        switch(e.keyCode) {
          case keys.ESCAPE:
            this.trackListWidget.selectNone();
            break;
        }
    },

    onMouseDown: function(e) {
      var thisW = this.trackListWidget;
      if(!thisW.mouseDown && thisW._legalMouseDown(e)){
          thisW.mouseDown = true;
          thisW._lastX = e.pageX;
          thisW._lastY = e.pageY;
          this._onMouseDown(thisW.current, e);
      }
    },

    _onMouseDown: function(current, e) {
      if(!current) return;
      var thisW = this.trackListWidget;
      if(!e.ctrlKey && !e.shiftKey) {
          thisW.simpleSelection = true;
          if(!this._isSelected(current)) {
              thisW.selectNone();
              thisW.simpleSelection = false;
          }
      }
      if(e.shiftKey && this.anchor) {
          var i = 0;
          var nodes = thisW.getAllNodes();
          this._select(current);
          if(current != this.anchor) {
            for(; i < nodes.length; i++) {
                if(nodes[i] == this.anchor || nodes[i] == current) break;
            }
            i++;
            for(; i < nodes.length; i++) {
                if(nodes[i] == this.anchor || nodes[i] == current) break;
                this._select(nodes[i]);
            }
          }
      } else {
          e.ctrlKey ? this._toggle(current) : this._select(current);
          this.anchor = current;
      }
      event.stop(e);
    },

    onMouseUp: function(e) {
      var thisW = this.trackListWidget;
        if(thisW.mouseDown){
            thisW.mouseDown = false;
            this._onMouseUp(e);
        }
    },

    _onMouseUp: function(e) {
      var thisW = this.trackListWidget;
      if(thisW.simpleSelection && thisW.current) {
          thisW.selectNone();
          this._select(thisW.current);
      }
    },

    _isSelected: function(node) {
        return this.trackListWidget.selection[node.id];
    },

    _select: function(node) {
        this.trackListWidget.selection[node.id] = 1;
        this.trackListWidget._addItemClass(node, "Selected");
    },

    _deselect: function(node) {
        delete this.trackListWidget.selection[node.id];
        this.trackListWidget._removeItemClass(node, "Selected");
    },

    _toggle: function(node) {
        if(this.trackListWidget.selection[node.id]) {
          this._deselect(node);
        } else {
          this._select(node);
        }
    },

    _textFilter: function( text ) {
        if( text && /\S/.test(text) ) {

            text = text.toLowerCase();

            dojo.query( '.tracklist-label', this.div )
                .forEach( function( labelNode, i ) {
                    if( labelNode.innerHTML.toLowerCase().indexOf( text ) != -1 ) {
                        dojo.removeClass( labelNode, 'collapsed');
                    } else {
                        dojo.addClass( labelNode, 'collapsed');
                    }
                 });
        } else {
            dojo.query( '.tracklist-label', this.div )
                .removeClass('collapsed');
        }
    },

   /**
    * Clear the text filter control input.
    * @private
    */
    _clearTextFilterControl: function() {
        this.textFilterInput.value = '';
        this._updateTextFilterControl();
    },
    /**
     * Update the display of the text filter control based on whether
     * it has any text in it.
     * @private
     */
    _updateTextFilterControl: function() {
        if( this.textFilterInput.value.length )
            dojo.removeClass( this.textFilterDiv, 'dijitDisabled' );
        else
            dojo.addClass( this.textFilterDiv, 'dijitDisabled' );
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.  For this list, that just means
     * deleting them from our widget.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
        this.deleteTracks( trackConfigs );
    },

    deleteTracks: function( /**Array[Object]*/ trackConfigs ) {
        // remove any tracks in our track list that are being set as visible
        array.forEach( trackConfigs || [], function( conf ) {
            var oldNode = this.inactiveTrackNodes[ conf.label ];
            if( ! oldNode )
                return;
            delete this.inactiveTrackNodes[ conf.label ];

            if( oldNode.parentNode )
                oldNode.parentNode.removeChild( oldNode );

            this.trackListWidget.delItem( oldNode.id );
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

            // blink the track(s) that we just turned off to make it
            // easier for users to tell where they went.
            // note that insertNodes will have put its html element in
            // inactivetracknodes
            this._blinkTracks( trackConfigs );
        }
    },

    _blinkTracks: function( trackConfigs ) {
            // scroll the tracklist all the way to the bottom so we can see the blinking nodes
            this.trackListWidget.node.scrollTop = this.trackListWidget.node.scrollHeight;

            array.forEach( trackConfigs, function(c) {
                var label = this.inactiveTrackNodes[c.label].firstChild;
                if( label ) {
                    dojo.animateProperty({
                                             node: label,
                                             duration: 400,
                                             properties: {
                                                 backgroundColor: { start: '#DEDEDE', end:  '#FFDE2B' }
                                             },
                                             easing: animationEasing.sine,
                                             repeat: 2,
                                             onEnd: function() {
                                                 label.style.backgroundColor = null;
                                             }
                                         }).play();
                }
            },this);
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