define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/when',
           'dojo/dom-construct',
           'dojo/on',

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
           dom,
           on,

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

    buildRendering: function() {
        this.inherited(arguments);

        var thisB = this;

        this.handleNode =
            dom.create( 'div', {
                            className: 'trackHandle'
                        }, this.domNode );
        this.closeButton = dom.create(
            'div', {
                className: 'closeButton'
            }, this.handleNode );

        this.own( on( this.closeButton, 'click', function() {
            var parent;
            try {
                parent = thisB.getParent().getParent();
            } catch(e) {}

            if( parent )
                parent.hideTracks( [ thisB.get('track') ] );
        }));
        dom.create('div', { className: 'jbrowseIconClose' }, this.closeButton );

        this.nameNode =
            dom.create( 'span', {
                            className: 'name',
                            innerHTML: this.get('track').getConf('name')
                        }, this.handleNode );
    },

    startup: function() {
        // make a dummy widget that sits in the 'center' position to
        // take up that space
        this.addChild( this._centerPlaceHolder = new _WidgetBase({ region: 'center'} ) );

        var thisB = this;

        this.get('genomeView').watch('projection', function( attr, old, newProjection ) {
            thisB._updateProjection( newProjection );
            thisB._updateViews();
        });

        this._updateProjection( this.get('genomeView').get('projection') );
        when( this._updateViews() ).then( null, Util.logErrorAndThrow );


        this.inherited(arguments);
    },

    _updateProjection: function( newprojection ) {
        if( newprojection ) {
            var thisB = this;
            this.own( newprojection.watch( function( change ) {
                if( ! change.animating )
                    when( thisB._updateViews() ).then( null, Util.logErrorAndThrow );
            }));
        }
    },

    _updateViews: function() {
        var thisB = this;
        var mainViewName = this.get('track').getViewName( this );
        console.log( 'use main view '+mainViewName );
        var mainView;

        if( this.mainViewName != mainViewName ) {
            if( mainViewName ) {
                this.mainViewName = mainViewName;
                mainView = this.get('track').makeView( mainViewName, { genomeView: this.get('genomeView') } )
                    .then( function( view ) {
                               if( thisB.get('mainView') ) {
                                   thisB.removeChild( thisB.get('mainView') );
                                   thisB.get('mainView').destroyRecursive();
                               }
                               thisB.set( 'mainView', view );
                               thisB.addChild( view );
                               return view;
                           },
                           Util.logErrorAndThrow
                         );
            }
            else {
                if( thisB.get('mainView') ) {
                    thisB.removeChild( thisB.get('mainView') );
                    thisB.get('mainView').destroyRecursive();
                    thisB.set( 'mainView', undefined );
                }
            }
        }

        // instantiate the subtracks if we have any
        this.subtracks = this.get('track').makeSubtracks({ genomeView: this.get('genomeView') });
        return when( mainView )
               .then( function( subtracks ) {
                          return thisB.subtracks
                              .then( function(subtracks) {
                                         array.forEach( subtracks, lang.hitch( thisB, 'addChild' ) );
                                     });
                      });
    }

});
});