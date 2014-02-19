define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/when',
           'dojo/dom-construct',
           'dojo/on',

           'dijit/_WidgetBase',
           'dijit/_TemplatedMixin',
           'dijit/_Container',
           'dijit/layout/BorderContainer',
           'dijit/DropDownMenu',
           'dijit/form/DropDownButton',
           'dijit/MenuItem',

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
           _TemplatedMixin,
           _Container,
           BorderContainer,
           dijitDropDownMenu,
           dijitDropDownButton,
           dijitMenuItem,

           Component,
           Util
       ) {

var TrackHandle = declare([ _WidgetBase ], {
  style: { height: '0px', width: '0px' },
  region: 'top',
  baseClass: 'trackHandleWidget',
  buildRendering: function() {
      this.inherited(arguments);

      var thisB = this;

      this.handleNode = dom.create( 'div', { className: 'trackHandle' }, this.domNode );

      this.closeButton = dom.create(
          'div', {
              className: 'closeButton',
              title: 'hide this track'
          }, this.handleNode );

      this.own( on( this.closeButton, 'click', function() {
                        var parent;
                        try {
                            parent = thisB.getParent().getParent().getParent();
                        } catch(e) {}

                        if( parent )
                            parent.hideTracks( [ thisB.get('trackWidget').get('track') ] );
                    }));
      dom.create('div', { className: 'jbrowseIconClose', title: 'hoad this track' }, this.closeButton );

      this.nameNode =
          dom.create( 'span', {
                          className: 'name',
                          innerHTML: this.get('trackWidget').get('track').getConf('name')
                      }, this.handleNode );
      this.descriptionNode = dom.create(
          'span', {
              className: 'description',
              style: 'display: none'
          }, this.handleNode );

      this.menuButton = new dijitDropDownButton(
          { className: 'menuButton'
            ,layoutAlign: 'client'
            ,iconClass: 'jbrowseIconDropDown'
            ,dropDown: this.get('trackWidget').makeTrackMenu()
          }).placeAt( this.handleNode );
  }
});

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
        if( this.trackHandle && this.trackHandle.handleNode )
            totalHeight = Math.max( this.trackHandle.handleNode.offsetHeight, totalHeight );

        this.getParent()._layoutChildren( this.id, totalHeight );
    },

    buildRendering: function() {
        this.inherited(arguments);
        this.addChild( this.trackHandle = new TrackHandle({ trackWidget: this }) );
    },

    makeTrackMenu: function() {
        var thisB = this;
        var m = this.trackMenu || ( this.trackMenu = new dijitDropDownMenu({ leftClickToOpen: true }) );
        array.forEach( m.getChildren(), m.removeChild, m );

        var items = [
            new dijitMenuItem(
                        { label: 'About this track',
                          //iconClass: '',
                          onClick: function( evt ) {
                              thisB.get('track').showTrackDetails();
                          }
                        })
        ];

        if( this.get('mainView') ) {
            items = this.get('mainView').get('renderer').getTrackMenuItems( items );
        }

        array.forEach( items, function( item ) {
                           var oldClick = item.onClick;
                           if( oldClick ) {
                               item.onClick = function( evt ) {
                                   // some kind of dijit bug causes a
                                   // 'mouseup' event to call this also, so
                                   // check the event type
                                   if( evt.type == 'click' )
                                       return oldClick( evt );
                                   return false;
                               };
                           }

                           m.addChild( item );
                       });

        m.startup();

        return m;
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
        //console.log( 'use main view '+mainViewName );
        var mainView;

        if( this.mainViewName != mainViewName ) {
            if( mainViewName ) {
                this.mainViewName = mainViewName;
                mainView = this.get('track')
                    .makeView( mainViewName, { genomeView: this.get('genomeView') } )
                    .then( function( view ) {
                               if( thisB.get('mainView') ) {
                                   thisB.removeChild( thisB.get('mainView') );
                                   thisB.get('mainView').destroyRecursive();
                                   thisB.descriptionNode.innerHTML = '';
                                   thisB.descriptionNode.style.display = 'none';
                               }
                               if( view.getConf('description') ) {
                                   thisB.descriptionNode.innerHTML = view.getConf('description');
                                   thisB.descriptionNode.style.display = 'inline';
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
                    thisB.descriptionNode.innerHTML = '';
                    thisB.descriptionNode.style.display = 'none';
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