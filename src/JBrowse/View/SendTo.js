define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/dom-construct',
           'dojo/promise/all',

           'dijit/_WidgetBase',
           'dijit/_TemplatedMixin',
           'dijit/_Container',
           'dijit/form/Select',

           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           lang,
           domConstruct,
           all,

           _WidgetBase,
           _TemplatedMixin,
           _Container,
           dijitSelect,

           Util
       ) {
return declare( [_WidgetBase, _TemplatedMixin, _Container], {

   templateString: "<div class='send-to' data-dojo-attach-point='containerNode,focusNode'>"
                   + "<div class='select' data-dojo-attach-point='selectNode'></div>"
                   + "<div class='controls' data-dojo-attach-point='controlsNode'></div>"
                 + "</div>",

   constructor: function( args ) {
       var thisB = this;
       this.destinationChoices = all(
           array.map(
               // array of transports that can send a file
               array.filter( args.browser.getTransportDrivers(), function( transport ) {
                                 return typeof transport.sendFile == 'function';
                             }),
               function( transport ) {
                   return Util.loadJSClass( transport.getConf('sendFileControlClass') )
                       .then( function( class_ ) {
                                  return {
                                      label: transport.getConf('name'),
                                      control: new class_(
                                          { transport: transport,
                                            exportDialog: thisB
                                          })
                                  };
                              });
               },
               this
           )
       );
   },

   value: null,

   getResource: function() {
       return this.currentControl.getResource();
   },

   postCreate: function() {
       this.inherited(arguments);

       var thisB = this;
       this.destinationChoices = this.destinationChoices
           .then( function(choices) {
                      thisB.destSelector = new dijitSelect(
                          {
                              width: '100%',
                              options: array.map( choices, function( dest ) {
                                                      return { value: dest, label: dest.label };
                                                  }),
                              onChange: lang.hitch( thisB, '_changeControls' )
                          }).placeAt( thisB.selectNode );
                      thisB._changeControls();
                      return choices;
                  });
   },

   updateControls: function( data ) {
       var thisB = this;
       this.destinationChoices
           .then( function(choices) {
                      if( thisB.currentControl )
                          thisB.currentControl.update( data );
                  });
   },

   _changeControls: function() {
       if( this.currentControl ) {
           this.currentControl.destroyRecursive();
           domConstruct.empty( this.controlsNode );
       }

       this.currentControl = this.destSelector.get('value').control;
       this.currentControl.placeAt( this.controlsNode );
   },

   _getValueAttr: function() {
   }
});
});