define([
           'dojo/_base/declare',

           'dijit/_WidgetBase',
           'dijit/layout/BorderContainer'

       ],
       function(
           declare,

           _WidgetBase,
           BorderContainer
       ) {

return declare( [ BorderContainer ], {

baseClass: 'trackPane',
gutters: false,
style: { height: '100%' },

buildRendering: function() {
    this.inherited(arguments);

    this.addChild( new _WidgetBase({ region: 'center' } ) );
}

});
});