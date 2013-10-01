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

    resize: function( marginbox ) {
        this.domNode.style.opacity = 0;
        this.inherited( arguments );
        domGeometry.setMarginBox( this.domNode, marginbox );
        fx.fadeIn({ node: this.domNode, duration: this.fadeInDuration }).play();
    }

});
});