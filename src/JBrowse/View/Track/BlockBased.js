/**
 * Track view that displays the underlying reference sequence bases.
 */
define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/dom-construct',
            'dojo/promise/all',
            'dojo/when',
            'dojo/dom-construct',

            'JBrowse/MediaTypes',
            '../Track',
            './_BlockBasedMixin',
            'JBrowse/Util',
            'JBrowse/Errors',
            'JBrowse/DOMNode/Remote'
        ],
        function(
            declare,
            lang,
            array,
            dom,
            all,
            when,
            domConstruct,

            MediaTypes,
            TrackView,
            _BlockBasedMixin,
            Util,
            Errors,
            RemoteDOMNode
        ) {

return declare( [ TrackView, _BlockBasedMixin ],
{
    trackCSSClass: 'sequenceBases',

    constructor: function() {
        this.blockStash = {};
    },

    configSchema: {
        slots: [
            { name: 'renderer', type: 'object', required: true }
        ]
    },

    getRenderer: function() {
        return this._renderer || (
            this._renderer = Util.instantiate( this.getConf('renderer').type, this.getConf('renderer') )
        );
    },

    animatableFill: function() {
        return false;
    },

    animateBlock: function( block, blockNode, changeInfo ) {
        if( changeInfo.operation == 'new' ) {
            if( this.animatableFill() ) {
                this.fillBlock( block, blockNode, changeInfo );
            }
            else {
                // if we get a new block made, but we're animating,
                // schedule it to be filled later, at the next
                // non-animating change
                this.blockStash[ block.id() ].fillLater = changeInfo;
                this.fillBlockWithLoadingMessage( block, blockNode, changeInfo );
            }
        }
        else if( changeInfo.operation == 'mergeRight' || changeInfo.operation == 'splitLeft' ) {
            if( blockNode.firstChild ) {
                var w = block.getDimensions().w;
                blockNode.firstChild.style.width = 100*(w-changeInfo.deltaRight)/w+'%';
            }
        }
    },

    blockChange: function( blockNode, changeInfo, block ) {
        // keep a this.blockStash object that remembers the dom nodes and
        // blocklist blocks by their ID, and cleans them all up
        // properly.  subclasses can stash whatever they want in here.
        if( changeInfo.operation == 'new' ) {
            this.blockStash[ block.id() ] = {
                node: blockNode,
                block: block,
                projectionBlock: block.getProjectionBlock()
            };
        }
        else if( changeInfo.operation == 'destroy' ) {
            delete this.blockStash[ block.id() ];
        }

        this.inherited(arguments);

        // if not animating, also fill any blocks that are marked in
        // the stash as needing to be filled later
        if( ! changeInfo.animating ) {
            if( changeInfo.operation != 'destroy' && changeInfo.operation != 'move' ) {
                // in this case, the block will have already been filled, so don't fill later
                delete this.blockStash[ block.id() ].fillLater;
            }

            for( var id in this.blockStash ) {
                var b = this.blockStash[id];
                if( b.fillLater && block.id() != id ) {
                    this.fillBlock( b.block, b.node, b.fillLater );
                    delete b.fillLater;
                }
            }
        }
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
            return this.getProjection()
                .getBlocksForRange( px1, px2 )
                .then( function( projectionBlocks ) {
                           var stash = thisB.blockStash;
                           var stashEntries = [];
                           array.forEach( projectionBlocks, function( pblock ) {
                               for( var id in stash ) {
                                   if( stash[id].projectionBlock === pblock ) {
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

    renderLoadingMessage: function( node ) {
        var loadingIndicator;
        dom.create(
            'span', {className: 'text', innerHTML: 'Loading' },
            loadingIndicator = dom.create( 'div', { className: 'loading' }, node )
        );
        return loadingIndicator;
    },

    fillBlockWithLoadingMessage: function( block, blockNode, changeInfo ) {
        var indicator = this.renderLoadingMessage( blockNode );
        this.heightUpdate( 40 );
        return indicator;
    },

    fillBlock:function( block, blockNode, changeInfo ) {
        var thisB = this;
        if( ! this.domNode )
            debugger;
        var loadingTimeout;
        var loadingIndicator;
        this.own( loadingTimeout = Util.timeout( 300, function() {
            loadingIndicator = thisB.fillBlockWithLoadingMessage( block, blockNode, changeInfo );
        }));

        return this.ownPromise( when(this._fillBlock( block, blockNode, changeInfo )) )
                .then( function(v) {
                           loadingTimeout.remove();
                           if( loadingIndicator )
                               dom.destroy( loadingIndicator );
                           return v;
                       },
                       function(error) {
                           loadingTimeout.remove();
                           if( !( error instanceof Errors.Cancel )) {
                               console.error( error.stack || ''+error );
                               blockNode.innerHTML = '<div class="error">'+(error.stack || ''+error)+'</div>';
                           }
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
        return this._fillBlockWithWorker( block, blockNode, changeInfo );
    }
});
});
