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
	   'dojo/promise/all',

           'dijit/Destroyable',

           'JBrowse/has',
           'JBrowse/Util',
            'JBrowse/DOMNode/Remote',
           './_ErrorsMixin',
           'JBrowse/_FeatureFiltererMixin',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,
           array,
           Stateful,
	   all,

           Destroyable,

           has,
           Util,
           RemoteDOMNode,
           _TrackErrorsMixin,
           _FeatureFiltererMixin,
           _ConfigurationMixin
       ) {
return declare( [ Stateful, Destroyable, _ConfigurationMixin, _FeatureFiltererMixin, _TrackErrorsMixin ], {

    configSchema: {
         slots: [
             { name: 'type', type: 'string', required: true },
             { name: 'widgetType', type: 'string', defaultValue: 'JBrowse/View/Track/BlockBased' },
             { name: 'query',
               type: 'object',
               defaultValue: {},
               description: 'object of additional query variables that this view will always pass to the store(s) in its queries'
             },
             { name: 'maxFeatureSizeForUnderlyingRefSeq', type: 'integer', defaultValue: 1000000,
               description: 'maximum size of a feature for which the underlying reference sequence'
                            + ' will be shown in the default feature detail popup'
             }
        ]
    },

    constructor: function( args ) {
        Util.validate( args, { store: 'object' } );

        this.blockStash = {};
    },

    redraw: function() {
        var stash = this.getBlockStash();
	var fills = [];
	for( var id in stash ) {
	    // delete everything but 'block' and 'node'
	    stash[id] = { block: stash[id].block, node: stash[id].node };

	    fills.push( this.fillBlock( stash[id].block, stash[id].node, { operation: 'redraw' } ) );
	}
	return all( fills );
    },

    blockChange: function( blockNode, changeInfo, block ) {
        if( changeInfo.operation == 'new' )
            this.blockStash[ block.id() ] = { block: block, node: blockNode };
        else if( changeInfo.operation == 'destroy' )
            delete this.blockStash[ block.id() ];
        else
            this.blockStash[ block.id() ].block = block;

        // propagate the block change to the rendering worker
        if( has('jbrowse-main-process')
            //&& ( changeInfo.operation == 'new' || changeInfo.operation == 'destroy' )
            && ( changeInfo.operation != 'move' )
          ) {
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
    resize: function() {},

    postStartup: function() {}, //< called after startup.  not actually in dijit.

    // expansion is the number of pixels on either side of the block to query for
    makeStoreQueryForBlock: function( block, blockNode, changeInfo, expansion ) {
        var baseSpan = block.getBaseSpan();
        var projectionBlock = block.getProjectionBlock();
        var scale = projectionBlock.getScale();

        var bpExpansion = Math.round( (expansion||0) * scale );

        return lang.mixin(
            { ref: projectionBlock.getBName(),
              basesPerSpan: scale,
              scale: 1/scale,
              start: Math.floor( baseSpan.l - bpExpansion ),
              end: Math.ceil( baseSpan.r + bpExpansion )
            },
            this.getConf('query')
        );
    },

    // a few methods that delegate to the widget that is displaying us
    heightUpdate: function() {
        var w = this.get('widget');
        return w.heightUpdate.apply( w, arguments );
    },

    getBlockStash: function( block ) {
        return block ? this.blockStash[ block.id() ] : this.blockStash;
    },

    animatableFill: function() {
        return false;
    },

    getWidgetType: function() {
        return this.getConf('widgetType');
    },


    // the canvas width in pixels for a block
    _canvasWidth: function( block ) {
        return Math.ceil( block.getDimensions().w );
    },

    // the canvas height in pixels for a block
    _canvasHeight: function() {
        return this.getConf('height');
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * from feature to feature. Provides a uniform function signature
     * for user-defined callbacks.
     */
    getConfForFeature: function( path, feature ) {
        return this.getConf( path, [feature, path, null, this ] );
    },

    animateBlock: function( block, blockNode, changeInfo ) {
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
        if( stash ) {
            lang.mixin( stash, blockdata );
            array.some( blockNode.childNodes, function(n) {
                            if( n.tagName == 'CANVAS' ) {
                                thisB.get('widget').heightUpdate( n.height, block );
                                stash.canvas = n;
                                return true;
                            }
                            return false;
                        });
        }
        else {
            console.log( 'wasted block render for '+block.id() );
        }
    },

    workerFillBlock: function( block, blockNode ) {
        return blockNode;
    },

    projectionChange: function( changeDescription ) {
        // does nothing by default
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