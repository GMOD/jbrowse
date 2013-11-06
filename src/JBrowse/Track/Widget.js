define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/dom-geometry',

           'dijit/layout/BorderContainer',

           'JBrowse/Component',
           'JBrowse/Util'
       ],
       function(
           declare,
           array,
           domGeom,

           BorderContainer,

           Component,
           Util
       ) {

return declare( [ BorderContainer, Component], {

    baseClass: 'track',

    constructor: function( args ) {
        this._track = args.track;
    },

    getTrack: function() {
        return this._track;
    },

    buildRendering: function() {
        this.inherited( arguments );

        var thisB = this;

        // instantiate the main track view if we have one
        var madeView = this._makeView( this._track.getConf('viewName') )
            .then( function( view ) {
                thisB.addChild( thisB.view = thisB._makeView( thisB._track.getConf('viewName') ) );
            });

        // instantiate the subtracks if we have any
        this.subtracks = this._makeSubtracks();
        this.subtracks
            .then( function( subtracks ) {
                       madeView.then( function() {
                               array.forEach( subtracks, lang.hitch( thisB, 'addChild' ) );
                       });
                   });
    },

    _makeView: function( viewName, args ) {
        var viewconf = this._track.getConf('views')[ viewName ];
        if( ! viewconf )
            throw new Error( 'no configuration found for view named "'
                             +viewName+'" in track "'+this._track.getConf('name')+'"' );
        var thisB = this;
        return Util.loadJSClass( viewconf.type || this._track.getConf('defaultViewType') )
            .then( function( TrackViewClass ) {
                       return new TrackViewClass({ region: 'top', config: viewconf, browser: thisB.browser });
             });
    },

    _makeSubtracks: function() {
        return all(
            array.map(
                this._track.getConf('subtracks'),
                function( subtrackConf ) {
                    return Util.loadJSClass( subtrackConf.type || this._track.getConf('defaultSubtrackType') )
                    .then( function( TrackClass ) {
                               return new TrackClass({ region: 'top', config: subtrackConf, browser: thisB.browser })
                           });
                },this)
        );
    },

});
});