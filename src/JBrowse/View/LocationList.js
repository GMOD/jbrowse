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

        if( args.showCallback || args.goCallback ) {
            columns.push({
                             label: '',
                             className: 'goButtonColumn',
                             renderCell: function( object, value, node, options ) {
                                  var container = dom.create('div');
                                  if( args.showCallback ) {
                                      new dijitButton(
                                          {
                                              className: 'show',
                                              title: 'Show '+object,
                                              innerHTML: 'Show',
                                              onClick: function() { args.showCallback( object, value, node, options ); }
                                          }).placeAt( container );
                                  }
                                  if( args.goCallback ) {
                                      new dijitButton(
                                          {
                                              className: 'go',
                                              title: 'Go to '+object,
                                              innerHTML: 'Go',
                                              onClick: function() { args.goCallback( object, value, node, options ); }
                                          }).placeAt( container );
                                  }
                                 return container;
                             }
                         });
        }

        this.grid = new Grid({ columns: columns }, parent );
        this.grid.renderArray( args.locations );
    }
});
});