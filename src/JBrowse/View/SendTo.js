define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/promise/all',

           'dijit/_WidgetBase',
           'dijit/_Container',
           'dijit/form/Select',

           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           lang,
           all,

           _WidgetBase,
           _Container,
           dijitSelect,

           Util
       ) {
return declare( [_WidgetBase, _Container], {

   templateString: "<div data-dojo-attach-point='containerNode,focusNode'>"
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
                                  return { label: transport.getConf('name'),
                                           control: new class_({ transport: transport, exportDialog: thisB })
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
       this.destinationChoices
           .then( function(choices) {
                      thisB.destSelector = new dijitSelect(
                          {
                              options: array.map( choices, function( dest ) {
                                                      return { value: dest, label: dest.label };
                                                  }),
                              onChange: lang.hitch( thisB, '_updateControls' )
                          }).placeAt( thisB.containerNode );
                      thisB._updateControls();
                  });
   },

   _updateControls: function() {
       if( this.currentControl )
           this.currenControl.destroyRecursive();

       this.currentControl = this.destSelector.get('value').control;
       this.currentControl.placeAt( this.containerNode );
   },

   _getValueAttr: function() {
   }
});
});