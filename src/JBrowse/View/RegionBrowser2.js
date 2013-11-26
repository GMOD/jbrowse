define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/_base/event',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/promise/all',

           'dijit/layout/BorderContainer',

           'JBrowse/Util',
           'JBrowse/Util/ListenerSet',
           'JBrowse/has',
           'JBrowse/Component',
           'JBrowse/FeatureFiltererMixin',
           'JBrowse/Projection/CanonicalContinuousLinear',
           'JBrowse/Projection/Circular',
           'JBrowse/Projection/Discontinuous/FromStore',

           'JBrowse/View/Track/BlockList',
           'JBrowse/View/Track/BlockList/Block',
           './RegionBrowser/Toolbar',
           './RegionBrowser/LocationScale',
           './RegionBrowser/Gridlines',
           './RegionBrowser/TrackPane'
       ],
       function(
           declare,
           array,
           lang,
           dojoEvent,
           domConstruct,
           domClass,
           all,

           BorderContainer,

           Util,
           ListenerSet,
           has,
           Component,
           FeatureFiltererMixin,
           CanonicalLinearProjection,
           CircularProjection,
           RegionsProjection,

           RenderingBlockList,
           RenderingBlock,
           RegionBrowserToolbar,
           ScaleBar,
           Gridlines,
           TrackPane
       ) {

var serialNumber = 0;

return declare( [BorderContainer,Component,FeatureFiltererMixin], {

splitter: true,
gutters: false,
baseClass: 'regionBrowserPane',

// activate manual constructor chaining
"-chains-": { constructor: 'manual' },

constructor: function( args ) {
    this.browser = args.browser;
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
    this.watchConf( 'referenceSetPath', function( path, oldref, newref ) {
        thisB._updateProjection({ referenceSetPath: newref });
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

// makes a new projection block for the our projection blocklist
_makeRenderingBlock: function( args, projectionChange ) {
    var block = new RenderingBlock( args );
    this._blockListeners.notify( { operation: 'new', projectionChange: projectionChange  }, block );
    return block;
},
// register a callback to be notified of changes to rendering blocks
watchRenderingBlocks: function( callback ) {
    return this._blockListeners.add( callback );
},


// get the displayed track widget in this region view for
// a certain track hub and track, if present
_getTrackWidgetByName: function( hubName, trackName ) {
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

        { name: 'referenceSetPath', type: 'string',
          defaultValue: function(regionbrowser) {
              return regionbrowser.browser.getConf('defaultDataHubName')+'/default';
          },
          description: 'data hub path to reference sequence set to display: hubname/setname'
        },

        { name: 'visibleTracks', type: 'multi-array',
          defaultValue: [
              ['default','Reference sequence'],
              ['default','Reference sequence']
          ]
          //defaultValue: []
        },

        { name: 'location', type: 'object' },

        { name: 'slideAnimationDuration', type: 'integer', defaultValue: 1100,
          description: 'duration in milliseconds of "slide" animations, where the view scrolls a set amount left or right'
        },
        { name: 'zoomAnimationDuration', type: 'integer', defaultValue: 500,
          description: 'duration in milliseconds of "zoom" animations, where the view zooms in or out'
        }
    ]
},

// from dijit
buildRendering: function() {
    this.inherited( arguments );

    domClass.add( this.domNode, this.getConf('className') );

    this.containerNode = this.domNode;

    this.addChild( this.toolbar  = new RegionBrowserToolbar({ region: 'top', browser: this.browser, genomeView: this }) );
    this.addChild( this.scalebar = new ScaleBar({ region: 'top', browser: this.browser, genomeView: this }) );

    this.gridlines = new Gridlines({ browser: this.browser, genomeView: this });
    this.domNode.appendChild( this.gridlines.domNode );

    var thisB = this;
    all( array.map( this.getConf('visibleTracks'), function( tRec ) {
                       return thisB.browser.getTrack( tRec[0], tRec[1] );
                   })
       ).then( function( trackObjects ) {
           return thisB.showTracks( array.filter( trackObjects, function(o){return o;}) );
       })
      .then( undefined, function(e) { console.error( e.stack || ''+e ); });

    //this.addChild( this.pinPane   = new PinPane({ region: 'top', browser: this.browser, genomeView: this }) );
    this.addChild( this.trackPane = new TrackPane({ region: 'center', browser: this.browser, genomeView: this }) );
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

// destroy any displayed widgets for the given track object.  returns
// nothing.
hideTracks: function( trackObjects ) {
    array.forEach( trackObjects, function( trackObject ) {
        var widget = this._getTrackWidgetForTrack( trackObject );
        if( widget ) {
           thisB.removeChild( widget );
           widget.destroyRecursive();
        }
    },this);
},

// startup: function() {
//     //console.log('pre startup '+this.getConf('name') );
//     this.inherited(arguments);
//     //console.log('post startup '+this.getConf('name') );
// },

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
 *   referenceSetPath: new path to the reference sequence set to use
 */
_updateProjection: function( args ) {
    var thisB = this;

    args = lang.mixin(
        {
            location: this.getConf('location'),
            referenceSetPath: this.getConf('referenceSetPath'),
            animate: true
        },
        args || {}
    );

    var location = args.location;
    if( ! location ) return;

    if( ! this._contentBox ) {
        console.warn('_updateProjection called before _contentBox is available');
        return;
    }

    var existingProjection = this.get('projection');

    var locationCenter = this._locationCenter( location );

    var aRange = { start: this._contentBox.l,    end: this._contentBox.l + this._contentBox.w };
    var bRange = { start: location.get('start'), end: location.get('end') };
    if( location.get('strand') == -1 )
        (function() {
            var tmp = bRange.start;
            bRange.start = bRange.end;
            bRange.end = tmp;
        })();

    // if we are already on the same ref seq as the location, animate to it
    if( existingProjection && ! this.browser.compareReferenceNames( location.get('seq_id'), existingProjection.bName ) ) {
        existingProjection.matchRanges( aRange, bRange, args.animate ? 800 : undefined );
    }
    else {
        this.getReferenceSet()
            .then( function( refset ) {
                       if( refset )
                           thisB.set( 'projection', new RegionsProjection(
                                          //this.set( 'projection', new CircularProjection(
                                          //this.set( 'projection', new CanonicalLinearProjection(
                                          { aRange: aRange, bRange: bRange, bLength: 10000,
                                            aName: 'screen', bName: refset.getName(),
                                            store: refset,
                                            stranded: false
                                          }
                                      ));
                   },
                   function(e) {
                       console.error( e.stack || ''+e );
                   }
                 );
    }
},

getReferenceSet: function( pathStr ) {
    var path = ( pathStr || this.getConf('referenceSetPath') );
    if( ! path )
        return Util.resolved();

    path = path.split('/',2);
    return this.browser.getReferenceSet( path[0], path[1] );
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