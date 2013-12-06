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
            'JBrowse/Errors',
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

    animateBlock: function( block, blockNode, changeInfo ) {
        if( changeInfo.operation == 'mergeRight' || changeInfo.operation == 'splitLeft' ) {
            if( blockNode.firstChild ) {
                var w = block.getDimensions().w;
                blockNode.firstChild.style.width = 100*(w-changeInfo.deltaRight)/w+'%';
            }
        }
    },

    blockChange: function( blockNode, changeInfo, block ) {
        this.inherited(arguments);

        // keep a this.blockStash object that remembers the dom nodes and
        // blocklist blocks by their ID, and cleans them all up
        // properly.  subclasses can stash whatever they want in here.
        if( changeInfo.operation == 'new' ) {
            this.blockStash[ block.id() ] = { node: blockNode, block: block, projectionBlock: block.getProjectionBlock() };
        }
        else if( changeInfo.operation == 'destroy' ) {
            delete this.blockStash[ block.id() ];
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

    fillBlock:function( block, blockNode, changeInfo ) {
        var thisB = this;
        if( ! this.domNode )
            debugger;
        var loadingTimeout;
        this.own( loadingTimeout = Util.timeout( 300, function() {
            blockNode.innerHTML = '<div style="height: 40px" class="loading"><span class="text">Loading</span></div>';
            thisB.heightUpdate( 40 );
        }));

        return this.ownPromise( when(this._fillBlock( block, blockNode, changeInfo )) )
                .then( function(v) {
                           loadingTimeout.remove();
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
