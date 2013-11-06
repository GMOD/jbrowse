/**
 * Configuration/controller class for a single track.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',

           'JBrowse/Component',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,

           Component,
           Util
       ) {

return declare( Component, {

    configSchema: {
        slots: [
            { name: 'pinned', type: 'boolean', defaultValue:  false },

            { name: 'metadata', type: 'object', defaultValue: {} },

            { name: 'name', type: 'string', required: true },

            { name: 'query', type: 'object', defaultValue: {},
              description: "track-specific query variables to pass to the store"
            },

            { name: 'widgetType', type: 'string', defaultValue: 'JBrowse/Track/Widget',
              description: "the JavaScript type of this track's top-level widget"
            },

            { name: 'defaultViewType', type: 'string',
              //TODO defaultValue: 'JBrowse/View/Track/CanvasFeatures'
              defaultValue: 'JBrowse/View/Track'
            },

            { name: 'defaultSubtrackType', type: 'string',
              defaultValue: 'JBrowse/Track/Widget'
            },

            { name: 'subtracks', type: 'multi-object',
              description: 'configurations for subtracks of this track'
            },

            { name: 'views', type: 'object' },
            { name: 'viewNameDefault', type: 'string', defaultValue: 'default',
              description: 'name of the default view to use'
            },
            { name: 'viewName', type: 'string',
              description: 'String name of the view to use.  Usually a function.',
              defaultValue: function( track ) {
                  var zoomViews = track.getConf('zoomViews').sort( function(a,b) { return b[0]-a[0]; } );
                  var projection = track.get('projection');
                  var viewportDims = domGeom.position( track.domNode );
                  var viewportBp = projection.getScale() * viewportDims.w;
                  for( var i = 0; i<zoomViews.length; i++ )
                      if( zoomViews[i][0] < viewportBp )
                          return zoomViews[i][1];
                  return track.getConf('viewNameDefault');
              }
            },

            { name: 'zoomViews', type: 'multi-object',
              description: 'array of arrays like: [ [12345,"viewname"] ] to choose'
                         + ' views based on zoom level, for GBrowse-style semantic zooming'
            }
        ]
    },

    constructor: function( args ) {
        this._dataHub = args.dataHub;
        if( ! this._dataHub ) throw new Error('dataHub arg required');
    },

    newWidget: function( args ) {
        return Util.instantiate( this.getConf('widgetClass'), lang.mixin( {}, args || {}, { track: this } ) );
    }

});
});