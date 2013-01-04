/**
 * Generic component that displays a list of genomic locations, along
 * with buttons to execute actions on them.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dijit/form/Button',
           'dgrid/Grid',
           'dgrid/extensions/DijitRegistry'
       ],
       function(
           declare,
           array,
           dom,
           dijitButton,
           DGrid,
           DGridDijitRegistry
       ) {

var Grid = declare([DGrid,DGridDijitRegistry]);

return declare(null,{
    constructor: function( args, parent ) {
        var thisB = this;
        this.browser = args.browser;
        var columns = [
                    { label: 'Reference', field: 'ref' },
                    { label: 'Start', field: 'start' },
                    { label: 'End', field: 'end' }
        ];

        if( array.some( args.locations || [], function(l) { return l.label; }) ) {
            columns.unshift( { label: 'Name', field: 'label' } );
        }

        if( args.buttons ) {
            columns.push({
                             label: '',
                             className: 'goButtonColumn',
                             renderCell: function( object, value, node, options ) {
                                 var container = dom.create('div');
                                 array.forEach( args.buttons, function( button ) {
                                     var buttonArgs = dojo.mixin( {}, button );
                                     buttonArgs.onClick = function() { button.onClick( object, value, node, options ); };
                                     new dijitButton( buttonArgs ).placeAt( container );
                                 });
                                 return container;
                             }
                         });
        }

        this.grid = new Grid({ columns: columns }, parent );
        this.grid.renderArray( args.locations );
    }
});
});