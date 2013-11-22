define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/when',

           'dijit/_WidgetBase',
           'dijit/layout/BorderContainer',

           'JBrowse/Component',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           when,

           _WidgetBase,
           BorderContainer,

           Component,
           Util
       ) {

return declare( [ BorderContainer ], {

    baseClass: 'track',
    region: 'top',
    gutters: false,
    splitter: true,
    style: { height: '200px' },

    _initiallySized: false,

    getTrack: function() {
        return this.get('track');
    },

    heightUpdate: function( child, height ) {
        // set the height of the child
        this._layoutChildren( child.id, height );

        var totalHeight = 0;
        array.forEach( this.getChildren(), function( child ) {
                           if( child !== this._centerPlaceHolder ) {
                               totalHeight += child.h;
                           }
                       },this );

        this.getParent()._layoutChildren( this.id, totalHeight );
    },

    startup: function() {
        // make a dummy widget that sits in the 'center' position to
        // take up that space
        this.addChild( this._centerPlaceHolder = new _WidgetBase({ region: 'center'} ) );

        var thisB = this;

        // instantiate the main track view if we have one
        var mainViewName = this.get('track').getViewName( this );
        var madeView;
        function logError(e) {
            console.error(e.stack || ''+e);
        }
        if( mainViewName ) {
            madeView = this.get('track').makeView( mainViewName, { genomeView: this.get('genomeView') } )
                .then( function( view ) {
                           thisB.addChild( thisB.mainView = view );
                       },
                       logError
                     );
        }

        // instantiate the subtracks if we have any
        this.subtracks = this.get('track').makeSubtracks({ genomeView: this.get('genomeView') });
        this.subtracks
            .then( function( subtracks ) {
                       return when(madeView).then( function() {
                           array.forEach( subtracks, lang.hitch( thisB, 'addChild' ) );
                       });
                   },
                   logError
                 );

        this.inherited(arguments);
    }


});
});