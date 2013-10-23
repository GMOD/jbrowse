define([
           'dojo/_base/declare'
       ],
       function(
           declare
       ){
return declare( null, {
  constructor: function( elements ) {
      if( elements )
          this.push.apply( this, elements );
  },

  push: function() {
      var elements = this._linkElements(arguments);

      if( elements.length ) {
          if( this._llLast ) {
              ( this._llLast._llNext = elements[0] )
                ._llPrev = this._llLast;
          }
          this._llLast = elements[ elements.length-1 ];
          if( ! this._llFirst )
              this._llFirst = elements[0];
      }

      return this._llLast;
  },

  //given an array of elements, link them to eachother, in order
  _linkElements: function( elements ) {
      for( var i = 1; i<elements.length; i++ )
          ( elements[i]._llPrev = elements[i-1] )
             ._llNext = elements[i];
      return elements;
  },

  _remove: function() {
      for( var i = 0; i<arguments.length; i++ ) {
          var el = arguments[i];

          if( el._llPrev )
              el._llPrev.next = el._llNext;
          if( el._llNext )
              el._llNext.prev = el._llPrev;

          if( this._llLast === el )
              this._llLast = el._llPrev;

          if( this._llFirst === el )
              this._llFirst = el._llNext;

          el._llPrev = el._llNext = undefined;
      }
  },

  pop: function() {
      var last = this._llLast;
      if( last ) {
          this._llLast = last._llPrev;
          last._llPrev = last._llNext = undefined;
      }
      return last;
  },

  shift: function() {
      var first = this._llFirst;
      if( first ) {
          this._llFirst = first._llNext;
          first._llPrev = first._llNext = undefined;
      }
      return first;
  },

  unshift: function() {
      var elements = this._linkElements(arguments);
      if( elements.length ) {
          if( this._llFirst )
              (this._llFirst._llPrev = elements[ elements.length-1 ])
              ._llNext = this._llFirst;
          this._llFirst = elements[0];
          if( ! this._llLast )
              this._llLast = elements[ elements.length-1 ];
      }
      return this._llFirst;
  },

  first: function() {
      return this._llFirst;
  },

  last: function() {
      return this._llLast;
  },

  forEach: function( func, context ) {
      if( ! context ) context = this;
      var i = 0;
      for( var el = this._llFirst; el; el = el._llNext ) {
          func.call( context, el, i++ );
      }
  },

  some: function( func, context ) {
      if( ! context ) context = this;
      var i = 0;
      for( var el = this._llFirst; el; el = el._llNext ) {
          if( func.call( context, el, i++ ) )
              return true;
      }
      return false;
  },

  someRev: function( func, context ) {
      if( ! context ) context = this;
      for( var el = this._llLast; el; el = el._llPrev ) {
          if( func.call( context, el ) )
              return true;
      }
      return false;
  },

  destroy: function() {
      this._llLast = this._llFirst = undefined;
  }

});
});