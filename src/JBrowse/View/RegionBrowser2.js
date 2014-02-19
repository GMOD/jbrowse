define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/_base/event',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/promise/all',
           'dojo/when',
           'dojo/aspect',

           'dijit/registry',
           'dijit/layout/BorderContainer',
           'dijit/Menu',
           'dijit/MenuItem',

           'JBrowse/Util',
           'JBrowse/Util/ListenerSet',
           'JBrowse/has',
           'JBrowse/Component',
           'JBrowse/_FeatureFiltererMixin',
           'JBrowse/Projection/CanonicalContinuousLinear',
           'JBrowse/Projection/Circular',
           'JBrowse/Projection/Discontinuous/FromStore',

           'JBrowse/View/Track',
           'JBrowse/View/Track/BlockList',
           'JBrowse/View/Track/BlockList/Block',
           './RegionBrowser/LocationScale',
           './RegionBrowser/Gridlines',
           './RegionBrowser/TrackPane',
           './RegionBrowser/BehaviorMixin',
           'JBrowse/Model/ViewLocation'
       ],
       function(
           declare,
           array,
           lang,
           dojoEvent,
           domConstruct,
           domClass,
           all,
           when,
           aspect,

           dijitRegistry,
           dijitBorderContainer,
           dijitDropDownMenu,
           dijitMenuItem,

           Util,
           ListenerSet,
           has,
           Component,
           FeatureFiltererMixin,
           CanonicalLinearProjection,
           CircularProjection,
           RegionsProjection,

           TrackWidget,
           RenderingBlockList,
           RenderingBlock,
           ScaleBar,
           Gridlines,
           TrackPane,
           BehaviorMixin,
           ViewLocation
       ) {

var serialNumber = 0;

return declare( [dijitBorderContainer,Component,BehaviorMixin,FeatureFiltererMixin], {

splitter: true,
gutters: false,
baseClass: 'regionBrowserPane',
design: 'sidebar',

// activate manual constructor chaining
"-chains-": { constructor: 'manual' },

constructor: function( args ) {
    this.app = this.browser = args.browser;
    this._finalizeConfig( args.baseConfig || args.config, args.localConfig );
    this.serialNumber = ++serialNumber;

    this.region = this.getConf('region');
    this.style  = this.getConf('style');

    if( this.getConf('parentViewName') )
        this.parentView = this.browser.getView( this.getConf('parentViewName') );

    this.inherited( arguments );
    FeatureFiltererMixin.prototype.constructor.call( this, args );

    this._blockListeners = new ListenerSet();

    var thisB = this;
    // when our "location" conf var is set, go to that location
    this.watchConf( 'location', function( path, oldloc, newloc ) {
        thisB._updateProjection({ location: newloc });
    });

    // when our reference sequence set changes, update the projection
    this.watch( 'referenceSet', function( path, oldref, newref ) {
        thisB._updateProjection({ referenceSet: newref });
    });

    // when we get a new projection, make a new blocklist for it
    this.watch( 'projection',
        function( name, oldProjection, newProjection ) {
            thisB._makeRenderingBlockList( newProjection );
        });
},

// layout: function() {
//     this.inherited(arguments);
//     this._updateProjection();
// },

_makeRenderingBlockList: function( projection ) {
    if( this.get('blockList') )
        this.get('blockList').destroy();
    this.set( 'blockList', new RenderingBlockList(
        {
            projection: projection,
            viewportNode: this.domNode,
            newBlock: lang.hitch( this, '_makeRenderingBlock' )
        }));
},

// makes a new projection block for the projection blocklist
_makeRenderingBlock: function( args, projectionChange ) {
    var block = new RenderingBlock( args );
    this._blockListeners.notify(
        { operation: 'new',
          projectionChange: projectionChange,
          animating: projectionChange && projectionChange.animating
        },
        block
    );
    return block;
},

// get the displayed track widget in this region view for
// a certain track hub and track, if present
_getTrackWidgetByName: function( hubName, trackName ) {
    if( ! this.trackPane )
        return undefined;

    var widget;
    array.some( this.trackPane.getChildren(), function( childWidget ) {
                    try {
                        var track = childWidget.getTrack();
                        if( track.getDataHub().getConf('name') == hubName
                            && track.getConf('name') == trackName
                          )
                            return widget = childWidget;
                    } catch(e) {}
                    return false;
                });
    return widget;
},

// get the displayed track widget in this region view for
// a certain track hub and track, if present
_getTrackWidgetForTrack: function( trackObject ) {
    if( ! this.trackPane )
        return undefined;

    var widget;
    array.some( this.trackPane.getChildren(), function(child) {
                    try {
                        if( child.getTrack() === trackObject )
                            return widget = child;
                    } catch(e) {}
                    return false;
                });
    return widget;
},

// register a callback to be notified of changes to rendering blocks
watchRenderingBlocks: function( callback ) {
    return this._blockListeners.add( callback );
},

configSchema: {
    slots: [
        { name: 'name', type: 'string',
          defaultValue: function(view) {
              return 'View '+view.serialNumber;
          }
        },

        { name: 'refSeqSelectorMaxSize', type: 'integer', defaultValue: 30 },
        { name: 'parentViewName', type: 'string', defaultValue: '' },
        { name: 'className', type: 'string', defaultValue: 'colorScheme1' },
        { name: 'region', type: 'string', defaultValue: 'center' },
        { name: 'style', type: 'string|object' },
        { name: 'maxPxPerBp', type: 'integer', defaultValue: 20 },

        { name: 'gridlines', type: 'boolean', defaultValue: true,
          description: 'if true, draw grid lines'
        },

        { name: 'visibleTracks', type: 'multi-string',
          defaultValue: [
              'Transcripts'
          ]
          //defaultValue: []
        },

        { name: 'location', type: 'object' },

        { name: 'slideAnimationDuration', type: 'integer', defaultValue: 1100,
          description: 'duration in milliseconds of "slide" animations,'
                       + ' where the view scrolls a set amount left or right'
        },
        { name: 'zoomAnimationDuration', type: 'integer', defaultValue: 500,
          description: 'duration in milliseconds of "zoom" animations, where'
                       + ' the view zooms in or out'
        }
    ]
},

// from dijit
buildRendering: function() {
    this.inherited( arguments );

    domClass.add( this.domNode, this.getConf('className') );

    this.containerNode = this.domNode;

    this.menu = this.makeViewMenu();
    this.addChild( this.scalebar = new ScaleBar(
                       { region: 'top', browser: this.browser,
                         genomeView: this, viewMenu: this.menu
                       }) );

    // create our track pane and pinned-track pane
    //this.addChild( this.pinPane   = new PinPane({ region: 'top', browser: this.browser, genomeView: this }) );
    this.addChild( this.trackPane = new TrackPane({ region: 'center', browser: this.browser, genomeView: this }) );

    this.gridlines = new Gridlines({ browser: this.browser, genomeView: this });
    this.trackPane.domNode.appendChild( this.gridlines.domNode );

    // show all the configured tracks
    var thisB = this;
    all( array.map( this.getConf('visibleTracks'), function( tRec ) {
                       return thisB.browser.getTrack( undefined, tRec );
                   })
       ).then( function( trackObjects ) {
           return thisB.showTracks(
               array.filter( trackObjects, function(o){
                                 return o;
                             })
           );
       })
      .then( undefined, Util.logError );
},

makeViewMenu: function() {
    var thisB = this;
    var m = new dijitDropDownMenu({ leftClickToOpen: true });
    m.addChild( new dijitMenuItem(
                    { label: 'Add tracks',
                      iconClass: 'dijitIconAdd',
                      onClick: function() {
                          thisB.showTrackSelector()
                              .then( undefined, Util.logError );
                      }
                    })
              );
    // m.addChild( new dijitMenuItem(
    //                 { label: 'New child view',
    //                   iconClass: 'dijitIconAdd',
    //                   onClick: function() {
    //                       thisB.addChildView();
    //                   }
    //                 })
    //           );
    m.addChild( new dijitMenuItem(
                    { label: 'Close',
                      iconClass: 'jbrowseIconClose',
                      onClick: function() {
                          thisB.getParent().removeChild( thisB );
                          thisB.destroyRecursive();
                      }
                    })
              );
    m.startup();
    return m;
},

// show the configured track selector for this data hub.  the track
// selector will take care of hiding itself in response to user input
showTrackSelector: function() {

    return (
        this._trackSelector || ( this._trackSelector = function() {

            var thisB = this;
            // get the current data hub
            return this.get('app').getDisplayedDataHub()
                 // get the data hub to make a new track selector widget
                .then( function( hub ) {
                           return hub.makeTrackSelector(
                               {
                                   regionBrowser: thisB,
                                   onTrackShow: function( trackNames ) {
                                       var gets = array.map( trackNames, hub.getTrack, hub );
                                       all( gets ).then( function( trackObjects ) {
                                                  thisB.showTracks( trackObjects );
                                       }, Util.logError );
                                   },
                                   onTrackHide: function( trackNames ) {
                                       var gets = array.map( trackNames, hub.getTrack, hub );
                                       all( gets ).then( function( trackObjects ) {
                                                  thisB.hideTracks( trackObjects );
                                       }, Util.logError );
                                   }
                               });
                       })
                .then( function( selector ) {
                           // once we have a track selector, wire our
                           // track-toggling methods to it so that it
                           // is updated when the displayed tracks in
                           // this region browser change (like from
                           // users clicking the close button on a
                           // track)
                           aspect.after( thisB, 'showTracks',
                                         function( ret, args ) {
                                             selector.setTracksActive(
                                                 array.map( args[0], function(t) {
                                                     return t.getConf ? t.getConf('name') : t.name; }));
                                             return ret;
                                         });
                           aspect.after( thisB, 'hideTracks',
                                         function( ret, args ) {
                                             selector.setTracksInactive(
                                                 array.map( args[0], function(t) {
                                                     return t.getConf ? t.getConf('name') : t.name; }));
                                             return ret;
                                         });

                           // be sure to clean up the selector if it
                           // is not cleaned up by the regular
                           // destruction cycle
                           aspect.after( thisB, 'destroy',
                                         function() {
                                             if( ! selector._destroyed )
                                                 selector.destroyRecursive();
                                         });
                           return selector;
                       });
            }.call(this) )
    ).then( function( selector ) {
                selector.show();
                return selector;
            });
},

// scroll the display if necessary to show the given track
// widget, then do some kind of animation on it to draw the user's
// attention to it.
_drawAttentionToTrackWidget: function( trackWidget ) {
    // TODO
},

// display the given track objects in this region view.  for each
// track object, if a widget already exists in this view for a track,
// returns it.  otherwise, makes and returns a new widget.  returns a
// Deferred array of the track widgets
showTracks: function( trackObjects ) {
    var thisB = this;
    return all( array.map( trackObjects, function( trackObject ) {
        if( ! trackObject )
            return undefined;

        var existingWidget;
        if(( existingWidget = thisB._getTrackWidgetForTrack( trackObject ) )) {
            thisB._drawAttentionToTrackWidget( existingWidget );
            return Util.resolved( existingWidget );
        }

        return trackObject.newWidget({ genomeView: thisB })
            .then( function( trackWidget ) {
                       thisB.trackPane.addChild( trackWidget );
                       return trackWidget;
                   });
    }));
},

// given a Y offset from the top of the regionbrowser,
getTrackWidgetForCoordinate: function( x, y ) {
    var el = document.elementFromPoint( x, y );
    function allParents( node, p ) {
        if( node.parentNode ) {
            p.push( node.parentNode );
            allParents( node.parentNode, p );
        }
        return p;
    }

    // if the cursor is in this regionbrowser
    var parents;
    var trackWidget;
    if( el && ( parents = allParents( el, [el] ) ).indexOf( this.domNode ) != -1 ) {
        // iterate through the nodes and find the first one that is a track widget
        array.some( parents, function( node ) {
                        var widget;
                        try {
                            widget = dijitRegistry.byNode( node );
                            if( widget instanceof TrackWidget )
                                return trackWidget = widget;
                        } catch(e) {}
                        return false;
                    });
    }

    return trackWidget;
},

// destroy any displayed widgets for the given track object.  returns
// nothing.
hideTracks: function( trackObjects ) {
    array.forEach( trackObjects, function( trackObject ) {
        var widget = this._getTrackWidgetForTrack( trackObject );
        if( widget ) {
           this.trackPane.removeChild( widget );
           widget.destroyRecursive();
        }
    },this);
},

startup: function() {
    //console.log('pre startup '+this.getConf('name') );
    this.inherited(arguments);

    //console.log('post startup '+this.getConf('name') );
},

// // from dijit
// layout: function() {
//     this.inherited(arguments);
// },

showLocation: function( locstring ) {
    this.setConf( 'location', Util.parseLocString( locstring ) );
},

getContentBox: function() {
    return lang.mixin( {}, this._contentBox );
},

resize: function() {
    var oldContentBox = lang.mixin( {}, this._contentBox );
    this.inherited(arguments);

    var projection = this.get('projection');
    if( projection ) {
        var deltaW = this._contentBox.w - oldContentBox.w;
        projection.offset( -deltaW/2 );
    } else {
        this._updateProjection();
    }
},

/**
 * Args:
 *   location: feature object containing the requested location to display
 *   animate: if true, animate the projection update if possible.  default true.
 *   referenceSet: ReferenceSet object containing the new set of reference regions to display
 */
_updateProjection: function( args ) {
    var thisB = this;

    //console.log('update projection');

    args = lang.mixin(
        {
            location: this.getConf('location'),
            animate: true
        },
        args || {}
    );

    if( ! thisB._contentBox ) {
        console.warn('_updateProjection called before _contentBox is available');
        return undefined;
    }

    var refSet = this.get('referenceSet');
    var bLocation = args.location || ( args.referenceSet || this.get('referenceSet') ).getDefaultViewLocation();
    var aLocation = new ViewLocation( { name: 'screen', center: thisB._contentBox.l + thisB._contentBox.w/2, span: thisB._contentBox.w } );

    // do we need to make a new projection?
    if( args.referenceSet && args.referenceSet !== refSet || ! this.get('projection') ) {
        refSet = args.referenceSet || this.get('referenceSet');

        return when( bLocation ).then( function( bLocation ) {
            return thisB.set( 'projection', new RegionsProjection(
                           //this.set( 'projection', new CircularProjection(
                           //this.set( 'projection', new CanonicalLinearProjection(
                           { aLocation: aLocation, bLocation: bLocation, bLength: 10000,
                             aName: 'screen', bName: refSet.getName(),
                             store: refSet,
                             stranded: false
                           }
                       )
                     );
        });
    }
    // otherwise, if we already have a projection, move to the new location
    else if( this.get('projection') ) {
        return when( bLocation ).then( function( bLocation ) {
            return thisB.get('projection').matchLocations( aLocation, bLocation, args.animate ? 800 : undefined );
        });
    }


    throw new Error('this should not be reached');
},

// get the center coordinate, in basepairs, of the currently displayed view
_locationCenter: function( location ) {
    if( ! location ) location = this.getConf('location');
    if( ! location ) return undefined;
    return ( location.get('end') + location.get('start') )/2;
},

slide: function( factor ) {
    if( this._contentBox && this.get('projection') )
        this.get('projection').offset( this._contentBox.w * -factor, this.getConf('slideAnimationDuration') );
},

zoom: function( factor ) {
    if( this._contentBox && this.get('projection') )
        this.get('projection').zoom( factor, this._contentBox.l+this._contentBox.w/2, this.getConf('zoomAnimationDuration') );
}


});
});