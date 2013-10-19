define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/Deferred',

           '../Projection',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           Deferred,

           Projection,
           Util
       ) {

var Continuous = declare( 'JBrowse.Projection.ContinuousLinear', Projection,  {

  constructor: function( args ) {
      this.aStart = Number.NEGATIVE_INFINITY;
      this.aEnd   = Number.POSITIVE_INFINITY;

      if( args.aRange && args.bRange ) {
          var scale = args.aRange.length / args.bRange.length;
          this._set( lang.mixin( {}, args, { scale: scale, bOffset: args.bRange.start - args.aRange.start/scale } ) );
      }
      else {
          this._set( args );
      }

      // delete the cached reverse of ourselves when we change
      var thisB = this;
      this.watch( function() { delete thisB._cachedReverse; } );
  },

  matchRanges: function( aRange, bRange, animationMilliseconds ) {
      var aCenter = aRange.start + aRange.length/2;
      var bCenter = bRange.start + bRange.length/2;
      var scale = this._normalize({scale: bRange.length / aRange.length}).scale;
      this._goTo({ scale: scale, bOffset: bCenter-scale*aCenter }, animationMilliseconds );
  },

  offset: function( aDelta, animationMilliseconds ) {
      if( ! aDelta )
          return;
      this._goTo({ bOffset: this.bOffset + aDelta * this.scale }, animationMilliseconds );
  },

  zoom: function( factor, aStatic, animationMilliseconds ) {
      var newScale = this._normalize({ scale: this.scale * factor }).scale;

      var newOffset;
      if( aStatic !== undefined )
          newOffset = aStatic * ( this.scale - newScale ) + this.bOffset;

      this._goTo({ scale: newScale, bOffset: newOffset}, animationMilliseconds );
  },

  _normalize: function( args ) {
      return lang.mixin({},args);
  },

  // normalize and set the given values, return array list of what values changed
  _set: function( args, isAnimating ) {
      args = this._normalize( args, isAnimating );
      var changed = [];
      for( var k in args ) {
          if( args.hasOwnProperty(k) && args[k] !== undefined && args[k] != this[k] ) {
              this[k] = args[k];
              changed.push(k);
          }
      }

      return changed;
  },

  projectPoint: function( a ) {
      if( a > this.aEnd )
          return null;
      if( a < this.aStart )
          return null;
      return a * this.scale + this.bOffset;
  },

  projectRange: function( a1, a2 ) {
      if( a2 < this.aStart || a1 > this.aEnd )
          return null;

      var b1 = this.projectPoint( a1 );
      var b2 = this.projectPoint( a2 );
      return b1 <= b2 ? [b1,b2] : [b2,b1];
  },

  getBlocksForRange: function( a1, a2 ) {
      if( a2 < this.aStart || a1 > this.aEnd )
          return null;
      return [ this ];
  },

  reverse: function() {
      // cache the reverse of our projection
      return this._cachedReverse || ( this._cachedReverse = function() {
          return new Continuous(
              {
                  aName:  this.bName,
                  bName:  this.aName,
                  bOffset: -this.bOffset/this.scale,
                  scale:  1/this.scale,
                  aStart:  this.projectPoint( this.aStart ),
                  aEnd:    this.projectPoint( this.aEnd )
              });
      }.call(this));
  },

  toString: function() {
      return this.scale+'+'+this.bOffset;
  },

  // mutate to the given settings.  if animationMilliseconds is
  // passed, animate the transition over the given number of
  // milliseconds
  _goTo: function( args, animationMilliseconds ) {
      if( ! animationMilliseconds ) {
          this._notifyChanged( this._set( args ) );
      } else {
          this._animateTo( args, animationMilliseconds );
      }
  },

  // return a Deferred that has progress events each time the
  // projection is updated to an intermediate configuration, and
  // resolves when the projection finishes animating
  _animateTo: function( endValues, milliseconds ) {
      if( this._currentAnimation )
          this._currentAnimation.cancel('new animation requested');

      endValues = this._normalize( endValues );

      var thisB = this;
      var startTime   = new Date().getTime();

      var startValues = lang.mixin( {}, this );

      var canceled = false;
      var a = this._currentAnimation = new Deferred( function() { canceled = true; });
      a.promise.always( function() {
                            if( thisB._currentAnimation === a )
                                delete thisB._currentAnimation;
                        });

      Util.requestAnimationFrame(
          function animate() {
              if( canceled ) return;

              var proportionDone = thisB._animationEase( (new Date().getTime() - startTime),  milliseconds );

              if( proportionDone >= 1 ) {
                  thisB._notifyChanged( thisB._set( endValues ) );
                  a.resolve();
              } else {
                  thisB._animationStep( startValues, endValues, proportionDone );
                  a.progress( proportionDone );
                  Util.requestAnimationFrame( animate );
              }
          });

      return this._currentAnimation;
  },

  _animationStep: function( startValues, endValues, proportionDone ) {
      var settings = {};
      for( var k in endValues ) {
          settings[k] = startValues[k] + ( endValues[k] - startValues[k] ) * proportionDone;
      }
      var changed = this._set( settings, true );
      this._notifyChanged( changed, true );
  },

  _animationEase: function( elapsedTime, totalTime ) {
      // linear
      //return elapsedTime/totalTime;

      // sinusoidal
      return Math.sin( elapsedTime / totalTime * 3.14159/2 ) + 0.04;
  }
});
return Continuous;
});