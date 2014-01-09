define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/event',
           'dojo/on',
           'dojo/keys',
           'dojo/dom-class',

           'dijit/focus',

           'JBrowse/Util',
           'JBrowse/BehaviorManager'
       ],
       function(
           declare,
           lang,
           dojoEvent,
           on,
           keys,
           domClass,

           dijitFocus,

           Util,
           BehaviorManager
       ) {
return declare( null, {

startup: function() {
    this.inherited(arguments);

    // keep everything having to do with UI events and behavior in
    // this.behavior
    this.behavior = {
        // initialize the behavior manager used for setting what this view
        // does (i.e. the behavior it has) for mouse and keyboard events
        manager: new BehaviorManager({ context: this, behaviors: this._behaviors() })
    };

    this.behavior.manager.initialize();
},

/**
 * Behaviors (event handler bundles) for various states that the
 * GenomeView might be in.
 * @private
 * @returns {Object} description of behaviors
 */
_behaviors: function() {
    var thisB = this;
    return {
        // behaviors that don't change
        always: {
            apply_on_init: true,
            apply: function() {
                var handles = [];

                // var wheelevent = "wheel" in document.createElement("div") ? "wheel"      :
                //                         document.onmousewheel !== undefined ? "mousewheel" :
                //                                                               "DOMMouseScroll";

                handles.push(
                    //on( this.domNode,     wheelevent, lang.hitch( this, 'wheelScroll' )),

                    // on( this.scaleTrackDiv,       "mousedown",
                    //               lang.hitch( this, 'startRubberZoom',
                    //                           lang.hitch( this,'absXtoBp'),
                    //                           this.zoomContainer,
                    //                           this.scaleTrackDiv
                    //                         )
                    //             ),

                    // on( this.zoomContainer, "dblclick",  lang.hitch( this, 'doubleClickZoom' )),



                    // on( this.scaleTrackDiv,       "click",        lang.hitch( this,  'scaleClicked'   )),
                    // on( this.scaleTrackDiv,       "mouseover",      lang.hitch( this,  'scaleMouseOver' )),
                    // on( this.scaleTrackDiv,       "mouseout",       lang.hitch( this,  'scaleMouseOut'  )),
                    // on( this.scaleTrackDiv,       "mousemove",      lang.hitch( this,  'scaleMouseMove' )),

                    // on( document.body, 'keyup', function(evt) {
                    //     if( evt.keyCode == keys.SHIFT ) // shift
                    //         thisB.behavior.manager.swapBehaviors( 'shiftMouse', 'normalMouse' );
                    // }),
                    // on( document.body, 'keydown', function(evt) {
                    //     // if some digit widget is focused, don't move the
                    //     // genome view with arrow keys
                    //     if( dijitFocus.curNode )
                    //         return;

                    //     if( evt.keyCode == keys.SHIFT ) { // shift
                    //         thisB.behavior.manager.swapBehaviors( 'normalMouse', 'shiftMouse' );
                    //         return;
                    //     }

                    //     // scroll the view around in response to keyboard arrow keys
                    //     if( evt.keyCode == keys.LEFT_ARROW || evt.keyCode == keys.RIGHT_ARROW ) {
                    //         var offset = evt.keyCode == keys.LEFT_ARROW ? -40 : 40;
                    //         if( evt.shiftKey )
                    //             offset *= 5;
                    //         thisB.keySlideX( offset );
                    //     }
                    //     else if( evt.keyCode == keys.DOWN_ARROW || evt.keyCode == keys.UP_ARROW ) {
                    //         // shift-up/down zooms in and out
                    //         if( evt.shiftKey ) {
                    //             thisB[ evt.keyCode == keys.UP_ARROW ? 'zoomIn' : 'zoomOut' ]( evt, 0.5, evt.altKey ? 2 : 1 );
                    //         }
                    //         // without shift, scrolls up and down
                    //         else {
                    //             var offset = evt.keyCode == keys.UP_ARROW ? -40 : 40;
                    //             thisB.setY( thisB.getY() + offset );
                    //         }
                    //     }
                    // }),

                    // when the track pane is clicked, unfocus any dijit
                    // widgets that would otherwise not give up the focus
                    on( this.domNode, 'click', function(evt) {
                        dijitFocus.curNode && dijitFocus.curNode.blur();
                    })
                );
                return handles;
            }
        },

        // mouse events connected for "normal" behavior
        normalMouse: {
            apply_on_init: true,
            apply: function() {
                return [
                    on( this.trackPane.domNode,  "mousedown", lang.hitch( this, 'mouseDragScrollStart' ))
                    // ,on( this.verticalScrollBar.container, "mousedown", lang.hitch( this, 'startVerticalMouseDragScroll'))
                ];
            }
        },

        // // mouse events connected when we are in 'highlighting' mode,
        // // where dragging the mouse sets the global highlight
        // highlightingMouse: {
        //     apply: function() {
        //         domClass.remove(this.trackPane.domNode,'draggable');
        //         domClass.add(this.trackPane.domNode,'highlightingAvailable');
        //         return [
        //             on( this.zoomContainer, "mousedown",
        //                           lang.hitch( this, 'startMouseHighlight',
        //                                       lang.hitch(this,'absXtoBp'),
        //                                       this.zoomContainer,
        //                                       this.scaleTrackDiv
        //                                     )
        //                         ),
        //             on( this.zoomContainer, "mouseover", lang.hitch( this, 'maybeDrawVerticalPositionLine' )),
        //             on( this.zoomContainer, "mousemove", lang.hitch( this, 'maybeDrawVerticalPositionLine' ))
        //         ];
        //     },
        //     remove: function( mgr, handles ) {
        //         array.forEach( handles, function(h) { h.remove(); } );
        //         domClass.remove(this.trackPane.domNode,'highlightingAvailable');
        //         domClass.add(this.trackPane.domNode,'draggable');
        //     }
        // },

        // // mouse events connected when the shift button is being held down
        // shiftMouse: {
        //     apply: function() {
        //         domClass.remove( this.trackPane.domNode, 'draggable' );
        //         domClass.add( this.trackPane.domNode, 'rubberBandAvailable' );
        //         return [
        //             on( this.zoomContainer, "mousedown",
        //                           lang.hitch( this, 'startRubberZoom',
        //                                       lang.hitch(this,'absXtoBp'),
        //                                       this.zoomContainer,
        //                                       this.scaleTrackDiv
        //                                     )
        //                         ),
        //             on( this.zoomContainer, "click",   lang.hitch( this, 'scaleClicked'                  )),
        //             on( this.zoomContainer, "mouseover", lang.hitch( this, 'maybeDrawVerticalPositionLine' )),
        //             on( this.zoomContainer, "mousemove", lang.hitch( this, 'maybeDrawVerticalPositionLine' ))
        //         ];
        //     },
        //     remove: function( mgr, handles ) {
        //         this.clearBasePairLabels();
        //         this.clearVerticalPositionLine();
        //         array.forEach( handles, function(h) { h.remove(); } );
        //         domClass.remove(this.trackPane.domNode,'rubberBandAvailable');
        //         domClass.add(this.trackPane.domNode,'draggable');
        //     }
        // },

        // mouse events that are connected when we are in the middle of a
        // drag-scrolling operation
        mouseDragScrolling: {
            apply: function() {
                return [
                    on(document.body, "mouseup",   lang.hitch( this, 'mouseDragScrollEnd'      )),
                    on(document.body, "mousemove", lang.hitch( this, 'mouseDragScrollMove'     )),
                    on(document.body, "mouseout",  lang.hitch( this, 'mouseDragScrollCancelIfOut' ))
                ];
            }
        },

        // mouse events that are connected when we are in the middle of a
        // vertical-drag-scrolling operation
        // verticalMouseDragScrolling: {
        //     apply: function() {
        //         return [
        //             on(document.body, "mouseup",   lang.hitch( this, 'dragEnd'         )),
        //             on(document.body, "mousemove", lang.hitch( this, 'verticalDragMove')),
        //             on(document.body, "mouseout",  lang.hitch( this, 'checkDragOut' ))
        //         ];
        //     }
        // },

        // // mouse events that are connected when we are in the middle of a
        // // rubber-band zooming operation
        // mouseRubberBanding: {
        //     apply: function() {
        //         return [
        //             on(document.body, "mouseup",    lang.hitch( this, 'rubberExecute' )),
        //             on(document.body, "mousemove",  lang.hitch( this, 'rubberMove'    )),
        //             on(document.body, "mouseout",   lang.hitch( this, 'rubberCancel'  )),
        //             on(window,        "keydown",  function(e){
        //                              if( e.keyCode !== keys.SHIFT )
        //                                  thisB.rubberCancel(e);
        //                          })
        //         ];
        //     }
        // }
    };
},


/**
 * Event fired when a user's mouse button goes down inside the main
 * element of the region browser.
 */
mouseDragScrollStart: function(event) {
    var projection = this.get('projection');
    if( ! projection )
        return;

    this.behavior.manager.applyBehaviors('mouseDragScrolling');

    if( this.behavior.mouseDragScrollState && this.behavior.mouseDragScrollState.animation )
        this.behavior.mouseDragScrollState.animation.cancel();

    this.behavior.mouseDragScrollState = {
        mouseStart: { x: event.clientX,
                      y: event.clientY
                    },
        mouseHistory: [
            { x: event.clientX, y: event.clientY, t: new Date().getTime() }
        ],
        velocity: 0,
        projectionStart: { offset: projection.getAOffset() }
    };

},
mouseDragScrollEnd: function(event) {
    var state = this.behavior.mouseDragScrollState;

    var t = new Date().getTime();

    // calculate the x velocity by smoothing over the recorded mouse history 
    var vx;
    if( state.mouseHistory.length ) {
       state.mouseHistory.push(
           { x: event.clientX, y: event.clientY, t: t });
       vx = 0;
       for( var i = 1; i<state.mouseHistory.length; i++ ) {
           vx += ( state.mouseHistory[i].x - state.mouseHistory[i-1].x )/ ( state.mouseHistory[i].t - state.mouseHistory[i-1].t );
       }
       vx /= state.mouseHistory.length - 1;
    } else {
        vx = ( event.clientX - state.mouseHistory[0].x ) / t-state.mouseHistory[0].t;
    }

    // min velocity of 0.3 px/ms, max of 2 px/ms
    if( Math.abs(vx) > 0.3) {
        if( vx > 2 ) vx = 2;
        else if( vx < -2 ) vx = -2;

        // if there is some velocity to the release, ease it out
        var thisB = this;
        var duration = 1200;
        var startX = event.clientX;
        var endX = startX + 2/3*vx*duration; // 2/3 is integral of the quad-out easing
        state.animation = Util.animate( duration, 'quadOut' )
            .then(
                function() {
                    thisB.mouseDragScrollMove(null, true, endX, event.clientY );
                    delete thisB.behavior.mouseDragScrollState;
                },
                null,
                function(p) {
                    thisB.mouseDragScrollMove(null, false, startX + ( endX-startX )*p, event.clientY );
                });
    } else {
        this.mouseDragScrollMove( event, true );
        delete this.behavior.mouseDragScrollState;

    }
    this.behavior.manager.removeBehaviors('mouseDragScrolling');//, 'verticalMouseDragScrolling');
},
mouseDragScrollCancelIfOut: function( event ) {
    if( !(event.relatedTarget || event.toElement)
        || (document.body === (event.relatedTarget || event.toElement))
        || (document.body.parentNode === (event.relatedTarget || event.toElement))
      ) {
           this.mouseDragScrollEnd(event);
    }
},
mouseDragScrollMove: function( event, finalEvent, x, y ) {
    if( event ) {
        dojoEvent.stop(event);
        x = event.clientX;
        y = event.clientY;
    }

    var projection = this.get('projection');
    if( ! projection )
        return;

    var state = this.behavior.mouseDragScrollState;
    projection.setAOffset(
        state.projectionStart.offset
            - ( x - state.mouseStart.x ),
        !finalEvent
    );

    var t = new Date().getTime();
    state.mouseHistory.push(
        { x: x, y: y, t: t });

    // keep mouse history over 200 milliseconds
    while( state.mouseHistory[0].t > t + 200 )
        state.mouseHistory.shift();
}

});
});