define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/when',
           'dojo/promise/all',

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
           all,

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
            madeView = this._makeView( mainViewName )
                .then( function( view ) {
                           thisB.addChild( thisB.mainView = view );
                       },
                       logError
                     );
        }

        // instantiate the subtracks if we have any
        this.subtracks = this._makeSubtracks();
        this.subtracks
            .then( function( subtracks ) {
                       return when(madeView).then( function() {
                           array.forEach( subtracks, lang.hitch( thisB, 'addChild' ) );
                       });
                   },
                   logError
                 );

        this.inherited(arguments);
    },

    _makeView: function( viewName, args ) {
        var viewconf = this.get('track').getConf('views')[ viewName ];
        if( ! viewconf )
            throw new Error( 'no configuration found for view named "'
                             +viewName+'" in track "'+this.get('track').getConf('name')+'"' );
        var thisB = this;
        return Util.loadJSClass( viewconf.type || this.get('track').getConf('defaultViewType') )
            .then( function( TrackViewClass ) {
                       return thisB.get('track')
                           .get('dataHub')
                           .openStore( viewconf.store )
                           .then( function( store ) {
                                      return new TrackViewClass(
                                          { region: 'top',
                                            track: thisB.get('track'),
                                            genomeView: thisB.get('genomeView'),
                                            config: viewconf,
                                            browser: thisB.get('browser'),
                                            store: store
                                          });
                                  });
             });

        this.inherited(arguments);
    },

    _makeSubtracks: function() {
        return all(
            array.map(
                this.get('track').getConf('subtracks'),
                function( subtrackConf ) {
                    return Util.loadJSClass( subtrackConf.type || this.get('track').getConf('defaultSubtrackType') )
                    .then( function( TrackClass ) {
                               return new TrackClass(
                                   { region: 'top',
                                     genomeView: this.get('genomeView'),
                                     config: subtrackConf,
                                     browser: thisB.browser
                                   });
                           });
                },this)
        );
    },

});
});