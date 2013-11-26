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

  createChild: function( args ) {
      var tagname = args.tagName;
      delete args.tagName;
      return dom.create( tagName, args, this.root );
  },
  addChild: function( child ) {
      if( typeof child.replayOnto != 'function' )
          throw new Error( "addChild only supported with Remote nodes right now" );
      // it's a remote node, need to create a child and replay onto it

      var node = this.createChild( child.tagName, child.attrs );
      child.replayOnto( node );
      return node;
  },

  empty: function() {
      dom.empty( this.root );
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