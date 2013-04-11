define( [
          'dojo/_base/declare',
          'dojo/_base/window',
          'dojo/_base/fx',
          'dojo/dom-construct'
        ],
        function(
                   declare,
                   win,
                   FX,
                   dom
                ) {
return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser,
        this.config = args.config
    },

    show: function( args ) {
        var overlay = dom.create( 'div', { className: 'clusteringOverlay' } );
        var close = dom.create('div', { className: 'exitButton',
                                        onclick: dojo.hitch( this, function() {
                                                 FX.fadeOut({node: overlay}).play();
                                                 setTimeout( function() { overlay.remove(); }, 500 );
                                                 })
        })
        // add an exit button to the overlay
        overlay.appendChild(close);
        overlay.addButton( 'test', function(){console.log('you clicked the button')});

        win.body().appendChild(overlay);
    },

});
});