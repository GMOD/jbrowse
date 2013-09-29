/**
 * Mix this into dijit popups to make them fade in and out on show/hide
 */

define([
           'dojo/_base/declare',
           'dojo/dom-geometry',
           'dojo/_base/fx'
       ],
       function(
           declare,
           domGeometry,
           fx
       ) {
return declare( null, {

    fadeInDuration: 200,
    fadeOutDuration: 200,

    onClose: function() {
        var thisB = this;

        // sequester this.domNode in the onEnd while the
        // animation is playing, to keep the other dijit code from
        // interfering with it
        var sequesteredDomNode = this.domNode;
        fx.fadeOut({
                       node: this.domNode, duration: this.fadeOutDuration,
                       onEnd: function() { thisB.domNode = sequesteredDomNode; }
                   }).play();
        delete this.domNode;
    },
    resize: function( marginbox ) {
        this.inherited( arguments );
        this.domNode.style.opacity = 0;
        domGeometry.setMarginBox( this.domNode, marginbox );
        fx.fadeIn({ node: this.domNode, duration: this.fadeInDuration }).play();
    }

});
});