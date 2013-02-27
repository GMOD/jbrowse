define( [
			'dojo/_base/declare',
			'dijit/Dialog',
			'dijit/form/MultiSelect',
			'dijit/form/Button',
			'dijit/focus',
			'dojo/on',
			'dojo/dom-construct',
			'dojo/_base/window',
			'dojo/aspect'
		],
		function( declare, Dialog, MultiSelect, Button, dijitFocus, on, dom, window, aspect ) {

return declare( null, {

	constructor: function( args ){
		this.d = args.deferred;
		this.tracks = args.tracks;
		this.browser = args.browser;
		this.browserSupports = {
            dnd: 'draggable' in document.createElement('span')
        };
	},

	show: function( args ){
		var typeDialog = this.typeDialog = new Dialog(
            { title: 'Choose track type', className: 'TrackTypeDialog' }
            );

		var selector = new MultiSelect();
    	for (var ID in this.tracks ) {
    	if ( this.tracks.hasOwnProperty( ID ) ) {
    		var op = window.doc.createElement('option');
    		op.innerHTML = this.tracks[ID];
    		op.value = this.tracks[ID];
    		selector.containerNode.appendChild(op);
    	}}
    	selector.containerNode.multiple = false;

		var bh = dom.create( 'div', { className: 'button holder'});
    	var OK = new Button({ label: 'Create track',
                    		  onClick: dojo.hitch( this, function() {
                    		  	this.d.resolve(selector.get('value')[0], true);
                    		  	this.typeDialog.hide();
	    				})
                    });
    	OK.placeAt(bh);

		var content = [
						dom.create( 'div', { className: 'instructions',
											 innerHTML: 'The data you have chosen to display originates from different track types. Please select one. Warning: attempting to display data using an incompatible track type can cause errors.' } ),
						selector.containerNode,
						bh
					  ];
		typeDialog.set( 'content', content );
		typeDialog.show()

		// destroy the dialogue after it has been hidden
		aspect.after( typeDialog, 'hide', dojo.hitch( this, function() {
                              dijitFocus.curNode && dijitFocus.curNode.blur();
                              typeDialog.destroyRecursive();
                      }));
	}
})
})