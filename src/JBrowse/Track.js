/**
 * Configuration/controller class for a single track.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-geometry',
           'dojo/Stateful',
           'dojo/promise/all',
           'dojo/aspect',

           'JBrowse/DataHub/Resource',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           domGeom,
           Stateful,
           all,
           aspect,

           Resource,
           Util
       ) {

return declare( [Resource,Stateful], {

    configSchema: {
        slots: [
            { name: 'pinned', type: 'boolean', defaultValue:  false },

            { name: 'metadata', type: 'object', defaultValue: {} },

            { name: 'trackDetailsViewClass', type: 'string',
              defaultValue: 'JBrowse/View/TrackDetails/KeyValueDialog',
              description: "JS class to use for displayin this track's metadata"
            },

            { name: 'query', type: 'object', defaultValue: {},
              description: "track-specific query variables to pass to the store"
            },

            { name: 'widgetClass', type: 'string',
              defaultValue: 'JBrowse/Track/Widget',
              description: "the JavaScript class of this track's top-level widget"
            },

            { name: 'defaultViewType', type: 'string',
              defaultValue: 'JBrowse/View/TrackRenderer/Glyphs'
            },

            { name: 'defaultSubtrackType', type: 'string',
              defaultValue: 'JBrowse/Track/Widget'
            },

            { name: 'subtracks', type: 'multi-object',
              description: 'configurations for subtracks of this track'
            },

            { name: 'views', type: 'object',
              description: 'named view configurations for this track'
            },

            { name: 'viewNameDefault', type: 'string', defaultValue: 'default',
              description: 'name of the default view to use'
            },

            { name: 'viewName', type: 'string',
              description: 'String name of the view to use.  Usually a function.',
              defaultValue: function( track ) {
              }
            },

            { name: 'zoomViews', type: 'multi-array',
              description: 'array of arrays like: [ [12345,"viewname"] ] to choose'
                         + ' views based on zoom level, for GBrowse-style semantic zooming'
            }
        ]
    },

    constructor: function( args ) {
        Util.validate( args, { dataHub: 'object', app: 'object' });
    },

    newWidget: function( args ) {
        return Util.instantiate(
            this.getConf('widgetClass'),
            lang.mixin( {}, args || {}, { track: this, browser: this.browser } )
        );
    },

    // gets this track's unique-ish CSS class, which is based on its name
    getCssClass: function() {
        return this.getConf('name').toLowerCase().replace(/\s+/g,'-');
    },

    // returns a deferred key-value object of metadata about this track
    getMetadata: function() {
        return Util.resolved( this.getConf('metadata') );
    },

    // get the correct main view name to be using for the current
    // state of the genome view
    getViewName: function( widget ) {
        var projection = widget.get('genomeView').get('projection');
        if( projection ) {
            var zoomViews = this.getConf('zoomViews').sort( function(a,b) { return b[0]-a[0]; } );
            var viewportDims = domGeom.position( widget.domNode );
            var scale = projection.getScale();

            for( var i = 0; i<zoomViews.length; i++ )
                if( zoomViews[i][0] < scale )
                    return zoomViews[i][1];

            return this.getConf('viewNameDefault');
        } else {
            return undefined;
        }
    },

    makeView: function( viewName, args ) {
        var viewconf = this.getConf('views')[ viewName ];
        if( ! viewconf )
            throw new Error( 'no configuration found for view named "'
                             +viewName+'" in track "'+this.getConf('name')+'"' );
        var thisB = this;
        var type = viewconf.type || this.getConf('defaultViewType');
        return all( [ Util.loadJSClass( type ),
                      thisB.get('dataHub').openStore( viewconf.store || this.getConf('store') || 'default' )
                    ])
            .then( function( stuff ) {
                       var TrackRendererClass = stuff[0], store = stuff[1];
                       var renderer = new TrackRendererClass(
                           { track: thisB,
                             app: thisB.app,
                             config: lang.mixin({ type: type },viewconf),
                             store: store
                           });
                       return Util.loadJSClass( renderer.getWidgetType() )
                           .then( function( WidgetClass ) {
                                      var widget = new WidgetClass(
                                                       lang.mixin(
                                                           { region: 'top',
                                                             track: thisB,
                                                             app: thisB.app,
                                                             name: viewName,
                                                             renderer: renderer
                                                           },
                                                           args || {}
                                                       ));
                                      renderer.set('widget', widget );
                                      aspect.after( widget, 'startup', function() {
                                                        renderer.postStartup();
                                                    });

                                      return widget;
                                  });
                   });
    },

    /**
     * Shows a detailed description of this track, such as who made
     * it, how it was made, and so forth.  The default details view
     * class is a dialog box, but other classes could be defined that
     * do something different.
     */
    showTrackDetails: function() {
        return Util.instantiate(
            this.getConf('trackDetailsViewClass'),
            {
                browser: this.get('browser'),
                track: this
            })
        .then( function( detailView ) {
                   return detailView.show();
               });
    },

    makeSubtracks: function( args ) {
        return all(
            array.map(
                this.getConf('subtracks'),
                function( subtrackConf ) {
                    return Util.loadJSClass( subtrackConf.type || this.getConf('defaultSubtrackType') )
                    .then( function( TrackClass ) {
                               return new TrackClass(
                                   lang.mixin(
                                       { region: 'top',
                                         config: subtrackConf,
                                         browser: thisB.browser
                                       },
                                       args || {}
                                   ));
                           });
                },this)
        );
    }
});
});