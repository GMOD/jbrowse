define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/_base/event',
           'dojo/dom-construct',
           'dojo/dom-class',

           'dijit/layout/BorderContainer',

           'JBrowse/Util',
           'JBrowse/has',
           'JBrowse/Component',
           'JBrowse/FeatureFiltererMixin',
           'JBrowse/Projection/CanonicalContinuousLinear',
           'JBrowse/Projection/Circular',

           './RegionBrowser/Toolbar',
           './RegionBrowser/LocationScale'
       ],
       function(
           declare,
           array,
           lang,
           dojoEvent,
           domConstruct,
           domClass,

           dijitBase,

           Util,
           has,
           Component,
           FeatureFiltererMixin,
           CanonicalLinearProjection,
           CircularProjection,

           RegionBrowserToolbar,
           ScaleBar
       ) {

var serialNumber = 0;

return declare( [dijitBase,Component,FeatureFiltererMixin], {

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

    this.visibleTracks = [];

    var thisB = this;
    this.watchConf( 'location', function( path, oldloc, newloc ) {
        thisB._updateProjection({ location: newloc });
    });
},

configSchema: {
    slots: [
        { name: 'name', type: 'string',
          defaultValue: function(view) {
              return 'View '+view.serialNumber;
          }
        },
        { name: 'parentViewName', type: 'string', defaultValue: '' },
        { name: 'className', type: 'string', defaultValue: 'colorScheme1' },
        { name: 'region', type: 'string', defaultValue: 'center' },
        { name: 'style', type: 'string|object' },
        { name: 'maxPxPerBp', type: 'integer', defaultValue: 20 },
        { name: 'gridlines', type: 'boolean', defaultValue: true },

        { name: 'visibleTracks', type: 'multi-string' },
        { name: 'location', type: 'object' }
    ]
},

// from dijit
buildRendering: function() {
    this.inherited( arguments );

    domClass.add( this.domNode, this.getConf('className') );

    this.containerNode = this.domNode;

    this.addChild( this.toolbar  = new RegionBrowserToolbar({ region: 'top', browser: this.browser, genomeView: this }) );
    this.addChild( this.scalebar = new ScaleBar({ region: 'top', browser: this.browser, genomeView: this }) );
    //this.addChild( this.pinPane   = new PinPane({ region: 'top', browser: this.browser, genomeView: this }) );
    //this.addChild( this.trackPane = new TrackPane({ region: 'top', browser: this.browser, genomeView: this }) );
},

startup: function() {
    //console.log('pre startup '+this.getConf('name') );
    this.inherited(arguments);
    //console.log('post startup '+this.getConf('name') );
},

// from dijit
layout: function() {
    this.inherited(arguments);
},

setLocation: function( locstring ) {
    this.setConf( 'location', Util.parseLocString( locstring ) );
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
 *
 * location: feature object containing the requested location to display
 *
 * animate: if true, animate the projection update.  default true.
 */
_updateProjection: function( args ) {
    args = lang.mixin(
        {
            location: this.getConf('location'),
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

    // calculate the new scale and offset for our projection from screen coordinates to genome coordinates
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
        this.set( 'projection', new CircularProjection(
        //this.set( 'projection', new CanonicalLinearProjection(
            { aRange: aRange, bRange: bRange, bLength: 10000,
              aName: 'screen', bName: location.get('seq_id')
            }
        ));
    }
},

// get the center coordinate, in basepairs, of the currently displayed view
_locationCenter: function( location ) {
    if( ! location ) location = this.getConf('location');
    if( ! location ) return undefined;
    return ( location.get('end') + location.get('start') )/2;
},

slide: function( factor ) {
    if( this._contentBox && this.get('projection') )
        this.get('projection').offset( this._contentBox.w * -factor, 1100 );
},

zoom: function( factor ) {
    if( this._contentBox && this.get('projection') )
        this.get('projection').zoom( factor, this._contentBox.l+this._contentBox.w/2, 500 );
}


});
});