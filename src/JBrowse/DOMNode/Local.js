define([
           'dojo/_base/declare',
           'dojo/dom-construct'
       ],
       function(
           declare,
           dom
       ) {
var Local = declare( null, {

  constructor: function( node ) {
      this.root = node;
  },

  createChild: function( tagName, attrs ) {
      return dom.create( tagName, attrs, this.root );
  },

  appendChild: function( child ) {
      if( typeof child.replayOnto != 'function' )
          throw new Error( "appendChild only supported with Remote nodes right now" );
      // it's a remote node, need to create a child and replay onto it

      var node = this.createChild( child.tagName, child.attrs );
      child.replayOnto( node );
      return node;
  },

  empty: function() {
      dom.empty( this.root );
  },

  setStyle: function( name, val ) {
      return this.root.style[name] = val;
  },
  getStyle: function( name ) {
      return this.root.style[name];
  },

  setAttribute: function( attr, val ) {
     return this.root[attr] = val;
  },

  getAttribute: function( attr ) {
      return this.root[attr];
  }
});

return Local;
});