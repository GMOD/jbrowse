define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',

           'JBrowse/Util/Serialization',
           './Remote/CanvasContext',
           './Local'
       ],
       function(
           declare,
           array,
           dom,

           Serialization,
           RemoteCanvasContext,
           Local
       ) {

var RemoteNode = declare( null, {
  constructor: function( args ) {
      args = args || {};
      this.tagName = args.tagName;
      this.attrs = args.attrs || {};
      this.childNodes = args.childNodes || [];
      this.operations = args.operations || [];
      this.context2d = args.context2d;
  },

  // Serialization support
  deflate: function() {
      return {
          $class: 'JBrowse/DOMNode/Remote',
          tagName: this.tagName,
          attrs: this.attrs,
          operations: Serialization.deflate( this.operations ),
          context2d: this.context2d && this.context2d.deflate()
      };
  },

  createChild: function( tagName, attrs ) {
      var c;
      this._record( 'appendChild', [ c = new RemoteNode({ tagName: tagName, attrs: attrs }) ] );
      this.childNodes.push( c );
      return c;
  },

  empty: function() {
      this._record( 'empty', arguments );

      this.childNodes = [];
  },

  setAttribute: function( attr, val ) {
     this._record( 'setAttribute', arguments );

     return this.root[attr] = val;
  },

  getAttribute: function( attr ) {
      return this.root[attr];
  },

  _record: function( op, args ) {
    this.operations.push( [ op, Array.prototype.slice.apply(args) ] );
  },

  getContext: function( type ) {
      if( this.tagName != 'canvas' )
          throw new Error( 'getContext not supported by '+this.tagName+' nodes' );
      if( type != '2d' )
          throw new Error( 'only 2d contexts are supported' );

      return this.context2d || ( this.context2d = new RemoteCanvasContext() );
  },

  replayOnto: function( node ) {
      var local = new Local(node);
      var operations = this.operations;
      for( var i = 0; i<operations.length; i++ )
          local[operations[i][0]].apply( local, operations[i][1] );

      if( this.context2d )
          this.context2d.replayOnto( node.getContext('2d') );
  }

});

return RemoteNode;
});