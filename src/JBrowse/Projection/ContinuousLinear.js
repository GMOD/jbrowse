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
          var scale = (args.aRange.end - args.aRange.start) / ( args.bRange.end - args.bRange.start );
          this._set( lang.mixin( {}, args, this._fromRanges( args.aRange, args.bRange ) ) );
      }
      else {
          this._set( args );
      }
  },

  getScale: function() {
      return this.scale;
  },

  getValidRangeA: function() {
      return { l: this.aStart, r: this.aEnd };
  },

  _fromRanges: function( aRange, bRange ) {
      var scale = this._normalize({ scale: ( bRange.end - bRange.start )/( aRange.end - aRange.start ) }).scale;
      var bCenter = ( bRange.end + bRange.start )/2;
      var aCenter = ( aRange.end + aRange.start )/2;
      return { scale: scale, bOffset: bCenter - aCenter*scale };
  },

  matchRanges: function( aRange, bRange, animationMilliseconds ) {
      this._goTo( this._fromRanges( aRange, bRange ), animationMilliseconds );
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
      args = lang.mixin({},args);

      //enforce aStart <= aEnd
      if( args.aStart > args.aEnd ) {
          var tmp = args.aStart;
          args.aStart = args.aEnd;
          args.aEnd = tmp;
      }

      return args;
  },

  // normalize and set the given values, return array list of what values changed
  _set: function( args, isAnimating ) {
      args = this._normalize( args, isAnimating );
      var changed = { animating: isAnimating || false };
      for( var k in args ) {
          if( args.hasOwnProperty(k) && args[k] !== undefined && args[k] != this[k] ) {
              changed[k] = [ this[k], args[k] ];
              this[k] = args[k];
          }
      }
      return changed;
  },

  _update: function( args, isAnimating ) {
      var changed = this._set( args, isAnimating );

      // make aUpdate and bUpdate projections that will convert old A
      // coordinates to new A coordinates, and old B coordinates to new B coordinates
      if( changed.bOffset || changed.scale ) {
          var oldScale   = changed.scale   ? changed.scale[0]   : this.scale;
          var oldBOffset = changed.bOffset ? changed.bOffset[0] : this.bOffset;
          changed.aUpdate = new Continuous({ scale: oldScale/this.scale, bOffset: (oldBOffset-this.bOffset)/this.scale,
                                             aName: 'old '+this.aName, bName: this.aName
                                           });
          changed.bUpdate = new Continuous({ scale: this.scale/oldScale, bOffset: this.bOffset - this.scale/oldScale*oldBOffset,
                                             aName: 'old '+this.bName, bName: this.bName
                                           });
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

  reverseProjectPoint: function( b ) {
      var a = (b-this.bOffset)/this.scale;
      if( a > this.aEnd )
          return null;
      if( a < this.aStart )
          return null;
      return a;
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
          return [];
      return [ this ];
  },

  toString: function() {
      return this.scale+'+'+this.bOffset;
  },

  // mutate to the given settings.  if animationMilliseconds is
  // passed, animate the transition over the given number of
  // milliseconds
  _goTo: function( args, animationMilliseconds ) {
      if( ! animationMilliseconds ) {
          this._notifyChanged( this._update( args ) );
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
      a.then( null, function(e) {
                  if( e != 'new animation requested' )
                      console.error( e.stack || ''+e );
              } );
      a.promise.always( function() {
                            if( thisB._currentAnimation === a )
                                delete thisB._currentAnimation;
                        });

      Util.requestAnimationFrame(
          function animate() {
              if( canceled ) return;

              var elapsedTime = (new Date().getTime() - startTime);
              var proportionDone = thisB._animationEase( elapsedTime ,  milliseconds );

              if( elapsedTime >= milliseconds || proportionDone >= 1 ) {
                  thisB._notifyChanged( thisB._update( endValues ) );
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
      this._notifyChanged( this._update( settings, true ) );
  },

  _animationEase: function( elapsedTime, totalTime ) {
      // linear
      //return elapsedTime/totalTime;

      // sinusoidal
      return Math.sin( elapsedTime / totalTime * 3.14159/2 )+0.04;
  }

});
return Continuous;
});