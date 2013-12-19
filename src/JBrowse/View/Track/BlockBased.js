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
        return true;
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
        else if( changeInfo.operation == 'mergeRight' ) {
            var dims = block.getDimensions();
            var w = dims.w;
            var factor = (w-changeInfo.deltaRight)/w;
            array.forEach( blockNode.children, function( node ) {
                node.style.width = factor*parseFloat(node.style.width)+'%';
                node.style.left  = factor*parseFloat(node.style.left||'0')+'%';
            });
            try {
                var rightBlock = changeInfo.mergeWith.block;
                var rightDims = rightBlock.getDimensions();
                var rightNode = this.blockStash[rightBlock.id()].node;
                var mergeTemp = dom.create('div', { className: 'renderingBlock mergeTemporary' }, blockNode );
                array.forEach( Array.prototype.slice.call( rightNode.children), function(node) {
                                   rightNode.removeChild( node );
                                   mergeTemp.appendChild( node );
                               });
                mergeTemp.style.left = 100*(rightDims.l-dims.l)/dims.w + '%';
                mergeTemp.style.width = 100*rightDims.w/dims.w+'%';
            } catch(e) {
                console.error(e.stack);
            }
        }
        else if( changeInfo.operation == 'splitLeft' ) {
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
            var inprogress;
            if(( inprogress = this.blockStash[ block.id() ].fillInProgress ) && ! inprogress.isCanceled() )
                inprogress.cancel( new Errors.Cancel('block destroyed') );

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

    heightUpdate: function( h, block ) {
        if( block ) {
            //console.log('block %d height %d', block.id(), h );
            if(! this.blockStash[block.id()] )
                debugger;

            this.blockStash[block.id()].requestedHeight = h;

            var maxHeight = 0;
            for( var id in this.blockStash ) {
                var blockHeight = this.blockStash[id].requestedHeight;
                if( blockHeight > maxHeight )
                    maxHeight = blockHeight;
            }
            this.inherited( arguments, [ maxHeight ] );
        }
        else {
            this.inherited( arguments );
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
        // node.innerHTML = this.loadingMessage;
        // return node.firstChild;
    },

    fillBlockWithLoadingMessage: function( block, blockNode, changeInfo ) {
        var indicator = this.renderLoadingMessage( blockNode );
        return indicator;
    },

    fillBlock:function( block, blockNode, changeInfo ) {
        var thisB = this;
        if( ! this.domNode )
            debugger;
        var loadingIndicator;
        var loadingTimeout = this.ownPromise (
            Util.wait({ duration: 300, cancelOK: true })
                // .then( function() {
                //            loadingIndicator = thisB.fillBlockWithLoadingMessage( block, blockNode, changeInfo );
                //        }, Util.cancelOK )
        );

        var inprogress = this.blockStash[block.id()].fillInProgress;
        if( inprogress && ! inprogress.isFulfilled() )
            inprogress.cancel( new Errors.Cancel('block changed') );

        return this.ownPromise( this.blockStash[block.id()].fillInProgress = when(this._fillBlock( block, blockNode, changeInfo )) )
                .then( function(v) {
                           loadingTimeout.cancel();
                           if( loadingIndicator )
                               dom.destroy( loadingIndicator );
                           return v;
                       },
                       function(error) {
                           loadingTimeout.cancel();
                           if( !( error instanceof Errors.Cancel )) {
                               console.error( error.stack || ''+error );
                               blockNode.innerHTML = '<div class="error">'+(error.stack || ''+error)+'</div>';
                           }
                       }
                     );
    },

    _getRenderJob: function() {
        return this._worker || (this._worker = function() {
            var thisB = this;
            return Util.uncancellable(
                this.get('track').get('app')
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
                        })
            );
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
                                           thisB.heightUpdate( n.height, block );
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
