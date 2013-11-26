define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',

           './Remote/CanvasContext'
       ],
       function(
           declare,
           array,
           dom
       ) {

var RemoteNode = declare( null, {
  constructor: function( args ) {
      args = args || {};
      this.tagName = args.tagName;
      this.attrs = args.attrs;
      this.childNodes = args.childNodes || [];
      this.operations = args.operations || [];
  },

  createChild: function( args ) {
      var c;
      this._record( 'addChild', [ c = new RemoteNode(args) ] );
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

      return this.context2d || ( this.context2d = new RemoteCanvasContext( this ) );
  },

  replayOnto: function( node ) {
      var local = new Local(node);
      array.forEach( this.operations, function( op ) {
          local[op[0]].apply( local, op[1] );
      });

      if( this.context2d )
          this.context2d.replayOnto( node.getContext('2d') );
  }

});

return RemoteNode;
});