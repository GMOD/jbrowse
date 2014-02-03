/**
 * dijit widget for a pane that contains one or more
 * RegionBrowsers that all share the same reference set
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-construct',

           'dijit/layout/BorderContainer',
           'dijit/layout/ContentPane',

           'JBrowse/Component',
           'JBrowse/View/RegionBrowser2'
       ],

       function(
           declare,
           array,
           domConstruct,

           BorderContainer,
           ContentPane,

           Component,
           RegionBrowser2
       ) {

var ReferenceSetPaneHeader = declare( ContentPane, {
  className: 'header',
  buildRendering: function() {
      this.inherited(arguments);
      this.domNode.innerHTML = '<span class="title">Reference:</span> ';
      this.referenceSetNameNode = domConstruct.create( 'span', { className: 'referenceSetName' }, this.domNode );
  }
});

return declare( [BorderContainer,Component], {

  baseClass: 'referenceSetPane',
  region: 'center',
  gutters: false,

  configSchema: {
      slots: [
          { name: 'referenceSetName', type: 'string', required: true,
            description: 'name of the reference set we are displaying'
          },

          { name: 'views', type: 'multi-object',
            description: 'views that are currently open',
            defaultValue: [
                { type: 'JBrowse/View/RegionBrowser2' },
                { type: 'JBrowse/View/RegionBrowser2' }
            ]
          }
      ]
  },

  getReferenceSet: function() {
      var thisB = this;
      return this.browser.getDisplayedDataHub()
          .then( function( hub ) {
                     return hub.getReferenceSet( thisB.getConf('referenceSetName') );
                 });
  },

  startup: function() {
      this.inherited(arguments);

      var thisB = this;
      this.addChild( this.header = new ReferenceSetPaneHeader({ region: 'top', className: 'header' }) );
      this.views = [];

      thisB.getReferenceSet()
          .then( function( set ) {
                     thisB.header.referenceSetNameNode.innerText = set.getName();

                     thisB.views.push( new RegionBrowser2(
                                           { browser: thisB.browser,
                                             referenceSet: set,
                                             referenceSetPane: thisB,
                                             config: {
                                                 name: 'View 1',
                                                 region: 'top',
                                                 style: 'height: 40%'
                                             }
                                           } )
                                     );
                     if( thisB.views.length )
                         thisB.views[ thisB.views.length - 1 ].set( 'region', 'center' );
                     array.forEach( thisB.views, function(v) {
                                        thisB.addChild( v );
                                    });
                 });
  }

});
});