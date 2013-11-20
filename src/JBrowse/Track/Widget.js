define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/when',
           'dojo/promise/all',

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

           BorderContainer,

           Component,
           Util
       ) {

return declare( [ BorderContainer ], {

    baseClass: 'track',
    region: 'top',

    constructor: function( args ) {
    },

    getTrack: function() {
        return this.get('track');
    },

    startup: function() {
        this.inherited( arguments );

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
                       when(madeView).then( function() {
                           array.forEach( subtracks, lang.hitch( thisB, 'addChild' ) );
                       });
                   },
                   logError
                 );
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