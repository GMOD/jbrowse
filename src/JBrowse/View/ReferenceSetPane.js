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
           'dijit/form/ComboBox',

           'JBrowse/Component',
           'JBrowse/View/RegionBrowser'
       ],

       function(
           declare,
           array,
           domConstruct,

           BorderContainer,
           ContentPane,
           ComboBox,

           Component,
           RegionBrowser
       ) {

var ReferenceSetPaneHeader = declare( ContentPane, {
  className: 'header',
  buildRendering: function() {
      this.inherited(arguments);

      var thisB = this;

      this.domNode.innerHTML = '<span class="title">Reference set:</span> ';
      this.referenceSetSelector = new ComboBox({
          searchAttr: 'name',
          query: { type: 'refset' },
          onChange: function( newval ) {
              thisB.get('pane').setConf( 'referenceSetName', newval );
          }
      }, domConstruct.create( 'div',{}, this.domNode ) );

      this.get('pane').get('app').getDisplayedDataHub()
          .then( function(hub) {
                     return hub && hub.getMetadataStore();
                 })
          .then( function( store ) {
                     if( store ) {
                         thisB.referenceSetSelector.set( 'store', store );
                         thisB.referenceSetSelector.set(
                             'value', thisB.get('pane').getConf('referenceSetName'), false );
                     }
                 });
      this.get('pane').watchConf( 'referenceSetName', function( varname, oldVal, newVal ) {
          thisB.referenceSetSelector.set( 'value', newVal, false );
      });
  }
});

return declare( [BorderContainer,Component], {

  baseClass: 'referenceSetPane',
  region: 'center',
  gutters: false,

  configSchema: {
      slots: [
          { name: 'referenceSetName', type: 'string', defaultValue: '',
            description: 'name of the reference set we are displaying'
          },

          { name: 'views', type: 'multi-object',
            description: 'views that are currently open',
            defaultValue: [
                { type: 'JBrowse/View/RegionBrowser' },
                { type: 'JBrowse/View/RegionBrowser' }
            ]
          }
      ]
  },

  constructor: function(args) {
      if( args.referenceSet )
          this.setConf( 'referenceSetName', args.referenceSet.getName(), false );
  },

  getReferenceSet: function() {
      var thisB = this;
      return this.browser.getDisplayedDataHub()
          .then( function( hub ) {
                     return hub && hub.getReferenceSet( thisB.getConf('referenceSetName') );
                 });
  },

  startup: function() {
      this.inherited(arguments);

      var thisB = this;
      this.addChild( this.header = new ReferenceSetPaneHeader({ pane: this, region: 'top', className: 'header' }) );

      function createViews() {
          thisB.getReferenceSet()
              .then( function( set ) {
                         array.forEach( thisB.views || [], function( v ) {
                                            thisB.removeChild( v );
                                            v.destroyRecursive();
                                        });
                         thisB.views = [];

                         if( ! set )
                             return;

                         thisB.views.push( new RegionBrowser(
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
                         if( thisB.views.length ) {
                             array.forEach( thisB.views, function(v) { v.set('region','top', false ); } );
                             thisB.views[ thisB.views.length - 1 ].set( 'region', 'center', false );
                         }
                         array.forEach( thisB.views, function(v) {
                                            thisB.addChild( v );
                                        });
                     });
      }

      createViews();
      thisB.watchConf('referenceSetName', createViews );
  },

  removeChild: function( child ) {
      this.views = array.filter( this.views || [], function( v ) {
                                     return v !== child;
                                 });
      return this.inherited(arguments);
  }

});
});