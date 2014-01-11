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
      this.operations = [];
      this.replayCode = args.replayCode;
      this.context2d = args.context2d;
  },

  // Serialization support
  deflate: function() {
      return {
          $class: 'JBrowse/DOMNode/Remote',
          tagName: this.tagName,
          attrs: this.attrs,
          replayCode: this._buildReplayCode(),
          context2d: this.context2d && this.context2d.deflate()
      };
  },

  _buildReplayCode: function() {
      var ops = this.operations;
      for( var i = 0; i<ops.length; i++ ) {
          if( typeof ops[i] != 'string' ) {
              ops[i] = 'n.'+ops[i][0]+'(new RemoteNode('+JSON.stringify(ops[i][1].deflate())+'))';
          }
      }
      return ops.join(";\n");
  },

  createChild: function( tagName, attrs ) {
      var c = new RemoteNode({ tagName: tagName, attrs: attrs });
      this.operations.push( [ 'appendChild', c ] );
      this.childNodes.push( c );
      return c;
  },

  empty: function() {
      this._record( 'empty', arguments );

      this.childNodes = [];
  },

  setAttribute: function( attr, val ) {
     this._record( 'setAttribute', arguments );

     return this.attrs[attr] = val;
  },

  getAttribute: function( attr ) {
      return this.attrs[attr];
  },

  setStyle: function( name, val ) {
     this._record( 'setStyle', arguments );

      if( ! this.attrs.style )
          this.attrs.style = {};
      return this.attrs.style[name] = val;
  },

  getStyle: function( name ) {
      return ( this.attrs.style || {} )[name];
  },

  _record: function( op, args ) {
      var argStr = typeof args == 'string' ? args : JSON.stringify(Array.prototype.slice.call(args)).replace(/^\[|\]$/g,'');
      this.operations.push( 'n.'+op+'('+argStr+')' );
  },

  getContext: function( type ) {
      if( this.tagName != 'canvas' )
          throw new Error( 'getContext not supported by '+this.tagName+' nodes' );
      if( type != '2d' )
          throw new Error( 'only 2d contexts are supported' );

      return this.context2d || ( this.context2d = new RemoteCanvasContext() );
  },

  replayOnto: function( node ) {
      var n = new Local(node);

      if( this.replayCode )
          eval( this.replayCode );

      if( this.context2d ) {
          if( ! this.context2d.replayOnto )
              this.context2d = new RemoteCanvasContext( this.context2d );
          this.context2d.replayOnto( node.getContext('2d') );
      }
  }

});

return RemoteNode;
});