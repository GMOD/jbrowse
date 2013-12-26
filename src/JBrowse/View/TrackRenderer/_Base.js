define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Stateful',

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

           Util,
           RemoteDOMNode,
           _FeatureFiltererMixin,
           _ConfigurationMixin
       ) {
return declare( [ Stateful, _ConfigurationMixin, _FeatureFiltererMixin], {

    constructor: function( args ) {
        Util.validate( args, { store: 'object' } );
    },

    // two dijit widget functions, called by widget for our convenience
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
    getBlockStash: function() {
        var w = this.get('widget');
        return w.getBlockStash.apply( w, arguments );
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
                       if( blockdata.node ) {
                           blockdata.node.replayOnto( blockNode );
                           delete blockdata.node;
                       }
                       lang.mixin( thisB.get('widget').blockStash[ block.id() ], blockdata );
                       array.some( blockNode.childNodes, function(n) {
                                       if( n.tagName == 'CANVAS' ) {
                                           thisB.get('widget').heightUpdate( n.height, block );
                                           return true;
                                       }
                                       return false;
                                   });
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