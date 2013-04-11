define( [
          'dojo/_base/declare',
          'dojo/_base/window',
          'dojo/_base/fx',
          'dojo/dom-construct',
        ],
        function(
                   declare,
                   win,
                   FX,
                   dom
                ) {
return declare( null, {

/* a fullscreen overlay to be filled with content
 * Methods include:
 *    show
 *        args: none
 *        description: builds an instance of the overlay and shows it in the browser
 *    addTitle
 *        args: title (string)
 *        description: sets the innerHTML of the title div to the string provided.
 *        returns the dialog, so that commands may be concatenated.
 *    addToDisplay
 *        args: HTML element
 *        description: appends a child to the content section of the overlay
 *        returns the dialog, so that commands may be concatenated.
 *    addButton
 *        args: name (string), onClick (function)
 *        description: creates a button and adds it to the bottom bar of the overlay
 *                     "name" sets the innerHTML of the button, and "onClick" dictates its on-click behaviour.
 *        returns the dialog, so that commands may be concatenated.
 *    exit
 *        args: none
 *        description: closes the overlay
 */


    constructor: function( args ) {
        this.overlay = dom.create( 'div', { className: 'overlay' } ),
        this.title = '',
        this.buttons = dom.create( 'div', { className: 'buttons' } ),
        this.content = dom.create( 'div', { className: 'content' } )
    },

    show: function( args ) {
        if (args && args.title)
            this.addTitle(args.title);
        var title = dom.create( 'div', { className: 'title', innerHTML: this.title } );
        this.overlay.appendChild(title);
        var close = dom.create('div', { className: 'exitButton jbrowseIconCancel',
                                        onclick: dojo.hitch( this, this.exit ) } );
        this.overlay.appendChild(close);
        this.overlay.appendChild(this.content);

        win.body().appendChild(this.overlay);
        // post creation editing
        if (this.buttons.children.length > 0) {
            this.overlay.appendChild(this.buttons);
            // change the height of the content (note, the use of padding and margins might be relevant if changes are made.)
            this.content.style.height = this.content.clientHeight - this.buttons.clientHeight + 'px';
        }
    },

    addTitle: function( str ) {
        this.title = str;
        return this;
    },

    addButton: function( name, onclick ) {
        this.buttons.appendChild(
            dom.create( 'div', { className: 'overlay-button',
                                 onclick: onclick,
                                 innerHTML: name,
                                 onmousedown: function() {
                                    this.style.border = '1px dotted black';
                                 },
                                 onmouseup: function() {
                                    this.style.border = '1px solid black';
                                 },
                                 onmouseleave: function() {
                                    this.style.border = '1px solid black';
                                 }
                               }
                       )
        );
        return this;
    },

    addToDisplay: function( domNode ) {
        this.content.appendChild( domNode );
        return this;
    },

    exit: function() {
        FX.fadeOut({node: this.overlay}).play();
        var thisB = this;
        setTimeout( function() { thisB.overlay.parentNode.removeChild(thisB.overlay); }, 500 );
    },

});
});