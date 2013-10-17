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
           'JBrowse/Projection/Continuous',

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
           ContinuousProjection,

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

_initialLayout: function() {
    if( this.getConf('location') ) {
        this.setLocation( this.getConf('location') );
    }
    if( this.getConf('visibleTracks' ).length ) {
        this.showTracks( this.getConf('visibleTracks') );
    }
},

// from dijit
layout: function() {
    this.inherited(arguments);

    if( ! this._ranInitialLayout ) {
        this._ranInitialLayout = true;
        this._initialLayout();
    }
},

setLocation: function( location ) {
    if( typeof location == 'string' )
        location = Util.parseLocString( location );

    var thisB     = this;

    // calculate the new scale and offset for our projection from screen coordinates to genome coordinates
    var locationCenter    = (location.get('end') + location.get('start'))/2;
    var newScale  = this._canonicalizeScale( (location.get('end') - location.get('start')) / this._contentBox.w );
    var newOffset = Math.round( locationCenter - ( this._contentBox.l + this._contentBox.w/2 ) * newScale );

    // if we are already on the same ref seq as the location, animate to it
    if( this.get('projection') && ! this.browser.compareReferenceNames( location.get('seq_id'), this._referenceName ) ) {
        this.get('projection').animateTo( newScale, newOffset, 400 )
            .then( function() {
                       thisB.setConf( 'location', location );
                   });
    }
    else {
        // make a new projection and hand it to all the tracks
        this._referenceName = location.get('seq_id');
        this.set( 'projection', new ContinuousProjection(
            { scale: newScale, offset: newOffset }
        ));
        this.setConf( 'location', location );
    }
},

// array of canonical scale numbers that work out well for display
// (nice gridlines, etc).  they are 5, 2, and 1, multiplied by various
// powers of 10.
_canonicalScales: (function x( pxPerBp ) {
                       var s = [ 20, 10 ];
                       for( var pow = 1; pow > 10e-10; pow /=10 ) {
                           s.push.apply( s, [ 5*pow, 2*pow, pow ] );
                       }
                       return s;
                   })(),
/**
 * Given an input scale (px/bp), find the canonical scale that is nearest to it.
 */
_canonicalizeScale: function( scale ) {
    return this._canonicalScales[ Util.findNearest(this._canonicalScales,scale) ];
}

});
});