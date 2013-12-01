/**
 * Track view that displays the underlying reference sequence bases.
 */
define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/promise/all',
            'dojo/when',
            'dojo/dom-construct',

            'JBrowse/MediaTypes',
            '../Track',
            './_BlockBasedMixin',
            'JBrowse/Util',
            'JBrowse/DOMNode/Remote'
        ],
        function(
            declare,
            lang,
            array,
            all,
            when,
            domConstruct,

            MediaTypes,
            TrackView,
            _BlockBasedMixin,
            Util,
            RemoteDOMNode
        ) {

return declare( [ TrackView, _BlockBasedMixin ],
{
    trackCSSClass: 'sequenceBases',

    constructor: function( args ) {
    },

    configSchema: {
        slots: [
            { name: 'renderer', type: 'object', defaultValue: {
                  type: 'JBrowse/View/Track/SequenceBases/Worker'
              }
            }
        ]
    },

    getRenderer: function() {
        return this._renderer || (
            this._renderer = Util.instantiate( this.getConf('renderer').type, this.getConf('renderer') )
        );
    },

    animateBlock: function( block, blockNode, changeInfo ) {
        if( changeInfo.operation == 'mergeRight' || changeInfo.operation == 'splitLeft' ) {
            if( blockNode.firstChild ) {
                var w = block.getDimensions().w;
                blockNode.firstChild.style.width = 100*(w-changeInfo.deltaRight)/w+'%';
            }
        }
    },

    fillBlock:function( block, blockNode, changeInfo ) {
        var thisB = this;
        var loadingTimeout = setTimeout( function() {
            blockNode.innerHTML = '<div style="height: 40px" class="loading"><span class="text">Loading</span></div>';
            thisB.heightUpdate( 40 );
        }, 300 );

        return when( this._fillBlock( block, blockNode, changeInfo ) )
            .then( function(v) {
                       clearTimeout( loadingTimeout );
                       return v;
                   },
                   function(error) {
                       clearTimeout( loadingTimeout );
                       console.error( error.stack || ''+error );
                       blockNode.innerHTML = '<div class="error">'+(error.stack || ''+error)+'</div>';
                   }
                 );
    },

    _getRenderJob: function() {
        return this._worker || ( this._worker = function() {
            var thisB = this;
            return this.get('track').get('app')
                       .getWorker('render-'+this.get('track').getConf('name') )
                       .then( function( worker ) {
                                  return worker.newJob(
                                      thisB,
                                      thisB.getConf('renderer').type,
                                      lang.mixin(
                                          {
                                              store: thisB.get('store'),
                                              config: thisB.exportMergedConfig()
                                          },
                                          thisB.getConf('renderer')
                                      )
                                  );
                        });
        }.call(this));
    },

    _fillBlockWithWorker: function( block, blockNode, changeInfo ) {
        var thisB = this;
        return this._getRenderJob()
            .then( function( renderJob ) {
                       return renderJob.remoteApply( 'fillBlock', [ block, new RemoteDOMNode(), changeInfo ]);
                  })
            .then( function( remoteDOMNode) {
                       remoteDOMNode.replayOnto( blockNode );
                       array.some( blockNode.childNodes, function(n) {
                                       if( n.tagName == 'CANVAS' ) {
                                           thisB.heightUpdate( n.height );
                                           return true;
                                       }
                                       return false;
                                   });
                   });
    },

    _fillBlock: function( block, blockNode, changeInfo ) {
        var scale = block.getProjectionBlock().getScale();

        // if we are zoomed in far enough to draw bases, then draw them
        if( scale < 1/1.3 ) {
            return this._fillBlockWithWorker( block, blockNode, changeInfo );
        }
        // otherwise, just draw something that suggests there are
        // bases there if you zoom in far enough
        else {
            blockNode.innerHTML = '<div class="sequence_blur"><span class="zoom">Zoom in to see sequence</span></div>';
            return blockNode;
        }
    }

});
});
