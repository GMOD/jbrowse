/**
 * Generic component that displays a list of genomic locations, along
 * with buttons to execute actions on them.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dijit/form/Button',
           'JBrowse/Util',
           'dgrid/Grid',
           'dgrid/extensions/DijitRegistry'
       ],
       function(
           declare,
           array,
           dom,
           dijitButton,
           Util,
           DGrid,
           DGridDijitRegistry
       ) {

var Grid = declare([DGrid,DGridDijitRegistry]);

return declare(null,{
    constructor: function( args, parent ) {
        var thisB = this;
        this.browser = args.browser;
        var columns = [];

        if( array.some( args.locations || [], function(l) { return l.label; }) )
            columns.unshift( { label: 'Name', field: 'label' } );

        if( array.some( args.locations || [], function(l) { return l.description; }) )
            columns.unshift( { label: 'Description', field: 'description' } );

        if( array.some( args.locations || [], function(l) { return l.score; }) )
            columns.unshift( { label: 'Score', field: 'score' } );

        columns.push( { label: 'Location',
                        get: function( location ) {
                            return Util.assembleLocString( location );
                        }
                      });

        if( args.locations && args.locations.length && args.locations[0].tracks )
            columns.push({
                             label: 'Track',
                             get: function(location) {
                                 var tracks = location.tracks;
                                 return array.map( array.filter( tracks, function(t) { return t; }), // remove nulls
                                                   function(t) {
                                                       return t.key || t.name || t.label || t;
                                                   })
                                             .join(', ');
                             }
                         });

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