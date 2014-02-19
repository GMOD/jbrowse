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
           'JBrowse/View/DetailsMixin',
           'JBrowse/View/Dialog/Info',
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
           DetailsMixin,
           InfoDialog,
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
            ,dropDown: this.get('trackWidget').makeDropDownMenu()
          }).placeAt( this.handleNode );
  }
});

return declare( [ BorderContainer, DetailsMixin ], {

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

    /**
     * @returns {Object} DOM element containing a rendering of the
     *                   detailed metadata about this track
     */
    _trackDetailsContent: function( additional ) {
        var details = dom.create('div', { className: 'detail' });
        var fmt = lang.hitch(this, 'renderDetailField', details );
        var track = this.get('track');
        fmt( 'Name', track.getConf('name') );
        track.getMetadata().then( function( m ) {
            var metadata = lang.mixin( {}, m, additional );
            delete metadata.key;
            delete metadata.label;
            if( typeof metadata.conf == 'object' )
                delete metadata.conf;

            var md_keys = [];
            for( var k in metadata )
                md_keys.push(k);
            // TODO: maybe do some intelligent sorting of the keys here?
            array.forEach( md_keys, function(key) {
                              fmt( Util.ucFirst(key), metadata[key] );
                          });
        });

        return details;
    },

    makeDropDownMenu: function() {
        var thisB = this;
        var m = new dijitDropDownMenu({ leftClickToOpen: true });
        m.addChild( new dijitMenuItem(
                        { label: 'About this track',
                          //iconClass: '',
                          onClick: function( evt ) {
                              // some kind of dijit bug causes a
                              // 'mouseup' event to call this also, so
                              // check the event type
                              if( evt.type != 'click' )
                                  return;

                              new InfoDialog({
                                    browser: thisB.get('browser'),
                                    content: thisB._trackDetailsContent(),
                                    title: 'About this track: '+thisB.get('track').getConf('name')
                                  }).show();
                          }
                        })
                  );
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