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

// from dijit
layout: function() {
    this.inherited(arguments);
},

setLocation: function( locstring ) {
    this.setConf( 'location', Util.parseLocString( locstring ) );
},

resize: function() {
    this.inherited(arguments);
    this._updateProjection({ fixedScale: true, animate: false });
},

/**
 *
 * location: feature object containing the requested location to display
 *
 * fixedScale: if true, keep the zoom scale fixed when updating the
 * projection.  equivalent to recentering the display at the center of
 * the given location.  default false.
 *
 * animate: if true, animate the projection update.  default true.
 */
_updateProjection: function( args ) {
    args = lang.mixin(
        {
            location: this.getConf('location'),
            animate: true,
            fixedScale: false
        },
        args || {}
    );

    var location = args.location;
    if( ! location ) return;

    var existingProjection = this.get('projection');

    // calculate the new scale and offset for our projection from screen coordinates to genome coordinates
    var locationCenter = this._locationCenter( location );

    // scale units in this case are bp/px
    var newScale = args.fixedScale && existingProjection
        ? undefined
        : ( location.get('end') - location.get('start') ) / this._contentBox.w;
    var newOffset = Math.round( locationCenter - ( this._contentBox.l + this._contentBox.w/2 ) * newScale );

    // if we are already on the same ref seq as the location, animate to it
    if( existingProjection && ! this.browser.compareReferenceNames( location.get('seq_id'), existingProjection.bName ) ) {
        existingProjection[ args.animate ? 'animateTo' : 'setTo' ]( {scale: newScale, bOffset: newOffset}, 400 );
    }
    else {
        // make a new projection (tracks will be watching this)
        //this.set( 'projection', new CircularProjection(
        this.set( 'projection', new CanonicalLinearProjection(
            { scale: newScale, bOffset: newOffset, bLength: 10000,
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
    var projection = this.get('projection');
    if( projection && this._contentBox )
        projection.offset( this._contentBox.w * -factor, 700 );
},

zoom: function( factor ) {
    var projection = this.get('projection');
    if( projection && this._contentBox )
        projection.zoom( factor, this._contentBox.l+this._contentBox.w/2, 700 );
}


});
});