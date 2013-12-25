define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/Stateful',

           'JBrowse/Util',
            'JBrowse/DOMNode/Remote',
           'JBrowse/_ConfigurationMixin'
       ],
       function(
           declare,
           lang,
           array,
           Stateful,

           Util,
           RemoteDOMNode,
           _ConfigurationMixin
       ) {
return declare( [ Stateful, _ConfigurationMixin], {

    constructor: function( args ) {
        Util.validate( args, { store: 'object' } );
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

    fillBlock: function( block, blockNode, changeInfo ) {
        var thisB = this;
        return this._getRenderJob()
            .then( function( renderJob ) {
                       return renderJob.remoteApply( 'workerFillBlock', [ block, new RemoteDOMNode(), changeInfo ]);
                  })
            .then( function( remoteDOMNode) {
                       remoteDOMNode.replayOnto( blockNode );
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
    }

});
});