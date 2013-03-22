define( [
          'dojo/_base/declare',
          'dojo/aspect',
          'dijit/focus',
          'dijit/form/Button',
          'dijit/form/MultiSelect',
          'dijit/Dialog',
          'dojo/dom-construct',
          'dojo/_base/window',
          'dojo/on'
        ],
        function( declare,
                  aspect,
                  dijitFocus,
                  Button,
                  MultiSelect,
                  Dialog,
                  dom,
                  window,
                  on ) {
   
return declare(null, {

    /* a dialog that lets us select more than one track at once. A nice alternative to the filtering selector */

    constructor: function(args) {
        this.multiselect = args.multiselect;
        this.tracks = args.tracks;
    },

    show: function(args) {
        var thisB = this;
        var dialog = this.dialog = new Dialog(
            { className: 'addManyTracksDialog' }
        );
        var store = args.store;

        var multi = new MultiSelect ({ name: 'multi' });
        multi.containerNode.className = 'trackSelector';
        // populate the multiselect
        for ( var key in store.data ) {
            if ( store.data.hasOwnProperty(key) ) {
                var op = window.doc.createElement('option');
                op.innerHTML = store.data[key].name;
                op.type = this.tracks[store.data[key].name].type;
                op.value = this.tracks[store.data[key].name].value;
                multi.domNode.appendChild(op);
            }
        }

        on( multi.domNode, 'change', dojo.hitch(this, function ( e ) {
            // prevent users from selecting multiple track types for display.
            if (!args.filtering)
                return // prevent filtering if it is not a filtering selector.
            var options = multi.domNode.children;
            var selectedType = null;
            for ( var key in options ) {
                if ( options.hasOwnProperty(key) && options[key].selected ) {
                    selectedType = options[key].type;
                    break;
                }
            }
            // If nothing is selected, enable all available options
            if ( !selectedType ) {
                for ( var key in options ) {
                    if ( options.hasOwnProperty(key) ) {
                        options[key].disabled = false;
                    }
                }
                return;
            }
            // else, disable and deselect relevant options
            for ( var key in options ) {
                if ( options.hasOwnProperty(key) && options[key].type != selectedType ) {
                    options[key].disabled = 'disabled';
                    options[key].selected = false;
                }
            }
        }));

        var actionBar = dom.create( 'div', { className: 'dijitDialogPaneActionBar' });

        new Button({ iconClass: 'dijitIconDelete', label: 'Cancel',
                     onClick: function() { thisB.dialog.hide(); }
                   })
            .placeAt( actionBar );
        new Button({ label: 'Add tracks',
                     onClick: function(){
                                var type = null;
                                dojo.query('option', multi.domNode).forEach(
                                function(node, index, array) {
                                    if (node.selected) {
                                        node.selected = false;
                                        type = node.type;
                                        thisB.multiselect.domNode.appendChild(node);
                                    }
                                });
                                if (type && args.filtering)
                                    store.updateStore(type);
                                on.emit(thisB.multiselect.domNode, "change", {
                                            bubbles: true,
                                            cancelable: true
                                          });
                                thisB.dialog.hide();
                              }
                    })
            .placeAt( actionBar );

        var instructions = dom.create( 'div', { className: 'instructions',
                                             innerHTML: 'Multiple tracks can be selected using ctrl+click and shift+click.' });
        if (args.filtering)
            instructions.innerHTML += ' Note: Multiple track types are not allowed. Some tracks may be missing from this list.';

        var content = [
                        instructions,
                        multi.domNode,
                        actionBar
                      ];
        dialog.set( 'content', content );
        dialog.show();

        // destroy the dialogue after it has been hidden
        aspect.after( dialog, 'hide', dojo.hitch( this, function() {
                              dijitFocus.curNode && dijitFocus.curNode.blur();
                              setTimeout( function() { dialog.destroyRecursive(); }, 500 );
                      }));
    }

}); 
});