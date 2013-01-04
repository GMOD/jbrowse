define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dijit/form/Button',
           'dgrid/Grid'
       ],
       function(
           declare,
           array,
           dijitButton,
           Grid
       ) {
return declare(null,{
    constructor: function( args, parent ) {
        var thisB = this;
        this.browser = args.browser;
        var columns = [
                    { label: 'Reference', field: 'ref' },
                    { label: 'Start', field: 'start' },
                    { label: 'End', field: 'end' }
        ];

        if( args.showCallback ) {
            columns.push({
                             label: '',
                             renderCell: function( object, value, node, options ) {
                                 return new dijitButton(
                                     {
                                         className: 'show',
                                         title: 'Show '+object,
                                         innerHTML: 'Show',
                                         onClick: function() { args.showCallback( object, value, node, options ); }
                                     }).domNode;
                             }
                         });
        }

        if( args.goCallback ) {
            columns.push({
                             label: '',
                             renderCell: function( object, value, node, options ) {
                                 return new dijitButton(
                                     {
                                         className: 'go',
                                         title: 'Go to '+object,
                                         innerHTML: 'Go',
                                         onClick: function() { args.goCallback( object, value, node, options ); }
                                     }).domNode;
                             }
                         });
        }

        this.grid = new Grid({ columns: columns }, parent );
        this.grid.renderArray( args.locations );
    }
});
});