define([
           'dojo/_base/declare',
           'dojo/dom-construct',

           './Block'
       ],
       function(
           declare,
           domConstruct,

           BlockBase
       ) {
return declare( BlockBase, {

  constructor: function( args ) {
      if( ! this.domNode )
          this.domNode = domConstruct.create( 'div', {
              className: this._domClass(),
              style: 'left:'+(this.left-1)+'px; width:'+this.width()+'px'
          }, this.parentNode );
  },

  _notifyChanged: function( changeInfo ) {
      // update our DOM node when things change
      if( this.domNode ) {
          if( changeInfo.deltaLeft )
              this.domNode.style.left = this.left-1+'px';
          if( ( changeInfo.deltaLeft || changeInfo.deltaRight )
              && changeInfo.deltaLeft != changeInfo.deltaRight )
              this.domNode.style.width = this.width()+'px';

          if( changeInfo.edges )
              this.domNode.className = this._domClass();
      }

      this.inherited( arguments );
  },

  _domClass: function() {
      return 'renderingBlock'
          +( this.onProjectionBlockLeftEdge ? ' projectionLeftBorder' : '' )
          +( this.onProjectionBlockRightEdge ? ' projectionRightBorder' : '' );
  },

  destroy: function() {
      if( this.domNode ) {
          domConstruct.destroy( this.domNode );
          delete this.domNode;
      }

      this.inherited(arguments);
  }

});
});