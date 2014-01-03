/**
 * Base class for track renderer objects.  These hold the main logic
 * for drawing a certain track, and two of these exist for each track
 * view widget: one in the main process, and another in a web worker
 * (which interacts only with the one in the main process.
 *
 * Methods named "worker*" only execute in the worker process.  All
 * others might execute in either process.
 */

define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Stateful',

           'dijit/Destroyable',

           'JBrowse/has',
           'JBrowse/Util',
            'JBrowse/DOMNode/Remote',
           'JBrowse/_FeatureFiltererMixin',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,
           array,
           Stateful,

           Destroyable,

           has,
           Util,
           RemoteDOMNode,
           _FeatureFiltererMixin,
           _ConfigurationMixin
       ) {
return declare( [ Stateful, Destroyable, _ConfigurationMixin, _FeatureFiltererMixin], {

    constructor: function( args ) {
        Util.validate( args, { store: 'object' } );

        this.blockStash = {};
    },

    blockChange: function( blockNode, changeInfo, block ) {
        if( changeInfo.operation == 'new' )
            this.blockStash[ block.id() ] = { block: block, node: blockNode };
        else if( changeInfo.operation == 'destroy' )
            delete this.blockStash[ block.id() ];
        else
            this.blockStash[ block.id() ].block = block;

        // propagate the block change to the rendering worker
        if( has('jbrowse-main-process') ) {
            return this._getRenderJob()
                .then( function( renderJob ) {
                           return renderJob.remoteApply(
                               'blockChange',
                               [ new RemoteDOMNode(), changeInfo, block ]
                           );
                       });
        }

        return undefined;
    },

    // dijit widget functions, called by widget for our convenience
    // when it starts up
    startup: function() {},
    buildRendering: function() {},
    postCreate: function() {},

    // a few methods that delegate to the widget that is displaying us
    heightUpdate: function() {
        var w = this.get('widget');
        return w.heightUpdate.apply( w, arguments );
    },
    removeTrackMessage: function() {
        var w = this.get('widget');
        return w.removeTrackMessage.apply( w, arguments );
    },
    showTrackMessage: function() {
        var w = this.get('widget');
        return w.showTrackMessage.apply( w, arguments );
    },
    getBlockStash: function( block ) {
        return block ? this.blockStash[ block.id() ] : this.blockStash;
    },

    configSchema: {
         slots: [
             { name: 'type', type: 'string', required: true },
             { name: 'widgetType', type: 'string', defaultValue: 'JBrowse/View/Track/BlockBased' }
         ]
    },

    animatableFill: function() {
        return true;
    },

    getWidgetType: function() {
        return this.getConf('widgetType');
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * from feature to feature. Provides a uniform function signature
     * for user-defined callbacks.
     */
    getConfForFeature: function( path, feature ) {
        return this.getConf( path, [feature, path, null, this ] );
    },

    fillBlock: function( block, blockNode, changeInfo ) {
        var thisB = this;
        return this._getRenderJob()
            .then( function( renderJob ) {
                       return renderJob.remoteApply( 'workerFillBlock', [ block, new RemoteDOMNode(), changeInfo ]);
                  })
            .then( function( blockdata ) {
                       return thisB.updateBlockFromWorkerResult( blockdata, block, blockNode, changeInfo );
                   });
    },

    // get deferred array of stashed block records for the given
    // screen pixel range.
    getBlockStashForRange: function( px1, px2 ) {
        if( px1 > px2 ) {
            var tmp = px2;
            px2 = px1;
            px1 = tmp;
        }

        var thisB = this;
        try {
            return this.get('widget').getProjection()
                .getBlocksForRange( px1, px2 )
                .then( function( projectionBlocks ) {
                           var stash = thisB.blockStash;
                           var stashEntries = [];
                           array.forEach( projectionBlocks, function( pblock ) {
                               for( var id in stash ) {
                                   if( stash[id].block.getProjectionBlock() === pblock ) {
                                       var dims = stash[id].block.getDimensions();
                                       if( ! ( px1 > dims.r || px2 < dims.l ) )
                                           stashEntries.push( stash[id] );
                                   }
                               }
                            });
                           return stashEntries;
                       });
        } catch( e ) {
            return Util.resolved( [] );
        }
    },

    updateBlockFromWorkerResult: function( blockdata, block, blockNode, changeInfo ) {
        var thisB = this;
        if( blockdata.node ) {
            blockdata.node.replayOnto( blockNode );
            delete blockdata.node;
        }
        var stash = this.getBlockStash( block );
        lang.mixin( stash, blockdata );
        array.some( blockNode.childNodes, function(n) {
                        if( n.tagName == 'CANVAS' ) {
                            thisB.get('widget').heightUpdate( n.height, block );
                            stash.canvas = n;
                            return true;
                        }
                        return false;
                    });
    },

    workerFillBlock: function( block, blockNode ) {
        return blockNode;
    },

    _getRenderJob: function() {
        return this._worker || (this._worker = function() {
            var thisB = this;
            return Util.uncancelable(
                this.get('app')
                       .getWorker('render-'+this.get('track').getConf('name') )
                       .then( function( worker ) {
                                  return worker.newJob(
                                      thisB,
                                      thisB.getConf('type'),
                                      {
                                          store: thisB.get('store'),
                                          config: thisB.exportMergedConfig()
                                      }
                                  );
                        })
            );
        }.call(this));
    }

});
});