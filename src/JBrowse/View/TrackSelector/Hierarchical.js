define(['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'dojo/query',
        'dojo/on',
        'dojo/json',
        'dojo/when',

        'dijit/layout/BorderContainer',
        'dijit/TitlePane',
        'dijit/layout/ContentPane',

        'JBrowse/Util',
        './_TextFilterMixin'
       ],
       function(
           declare,
           array,
           lang,
           dom,
           query,
           on,
           JSON,
           when,

           BorderContainer,
           TitlePane,
           ContentPane,

           Util,
           _TextFilterMixin
       ) {

return declare(
    'JBrowse/View/TrackSelector/Hierarchical',
    [ BorderContainer, _TextFilterMixin ],
    {

    region: 'left',
    splitter: true,
    gutters: false,
    style: 'width: 25%',

    baseClass: 'hierarchicalTrackSelector',

    categoryFacet: 'category',

    constructor: function( args ) {
        this.categories = {};
        this.parentComponent = args.parent;

        this._loadState();
    },

    buildRendering: function() {
        this.inherited(arguments);

        var topPane = new ContentPane({ region: 'top', className: 'header' });
        this.addChild( topPane );
        dom.create(
            'h2',
            { className: 'title',
              innerHTML: 'Available Tracks'
            },
            topPane.containerNode );

        this._makeTextFilterNodes(
            dom.create('div',
                       { className: 'textfilterContainer' },
                       topPane.containerNode )
        );
        this._updateTextFilterControl();
    },

    startup: function() {
        this.inherited( arguments );

        var tracks = [];
        var thisB = this;
        var categoryFacet = this.get('categoryFacet');
        this.get('dataHub').getMetadataStore()
            .then( function( store ) {
                   return when(
                       store.query(
                           { type: 'track' },
                           {
                               count: 500,
                               sort: [ { attribute: thisB.get('categoryFacet').toLowerCase()},
                                       { attribute: 'name' }
                                     ]
                           }
                       ))
                           .then( function( items ) {
                                      array.forEach( items, function(i) {
                                                         if( i.conf )
                                                             tracks.push( i );
                                                     });

                                      // make a pane at the top to hold uncategorized tracks
                                      var uncPane = new ContentPane({ region: 'top', className: 'uncategorized' });
                                      thisB.categories.Uncategorized =
                                          { pane: uncPane,
                                            tracks: {},
                                            categories: {}
                                          };
                                      thisB.addChild( uncPane );

                                      thisB.addTracks( tracks, true );

                                      // hide the uncategorized pane if it is empty
                                      if( ! thisB.categories.Uncategorized.pane.containerNode.children.length ) {
                                          //thisB.removeChild( thisB.categories.Uncategorized.pane );
                                          thisB.categories.Uncategorized.pane.domNode.style.display = 'none';
                                      }
                                  });
                   }, Util.logError );
    },

    addTracks: function( tracks, inStartup ) {
        this.pane = this;
        var thisB = this;

        array.forEach( tracks, function( track ) {
            var trackConf = track.conf || track;

            var categoryFacet = this.get('categoryFacet');
            var categoryNames = (
                trackConf.metadata && trackConf.metadata[ categoryFacet ]
                    || trackConf[ categoryFacet ]
                    || 'Uncategorized'
            ).split(/\s*\/\s*/);

            var category = _findCategory( this, categoryNames, [] );

            function _findCategory( obj, names, path ) {
                var categoryName = names.shift();
                path = path.concat(categoryName);
                var categoryPath = path.join('/');

                var cat = obj.categories[categoryName] || ( obj.categories[categoryName] = function() {
                    var isCollapsed = lang.getObject( 'collapsed.'+categoryPath, false, thisB.state );
                    var c = new TitlePane(
                        { title: '<span class="categoryName">'+categoryName+'</span>'
                          + ' <span class="trackCount">0</span>',
                          region: 'top',
                          open: ! isCollapsed
                        });
                    // save our open/collapsed state in local storage
                    c.watch( 'open', function( attr, oldval, newval ) {
                                 lang.setObject( 'collapsed.'+categoryPath, !newval, thisB.state );
                                 thisB._saveState();
                             });
                    obj.pane.addChild(c, inStartup ? undefined : 1 );
                    return { parent: obj, pane: c, categories: {}, tracks: {} };
                }.call(thisB));

                return names.length ? _findCategory( cat, names, path ) : cat;
            };

            category.pane.domNode.style.display = 'block';
            var labelNode = dom.create(
                'label', {
                    className: 'tracklist-label shown',
                    title: Util.escapeHTML( track.shortDescription || track.description || track.Description || track.metadata && ( track.metadata.shortDescription || track.metadata.description || track.metadata.Description ) || track.name || trackConf.name )
                }, category.pane.containerNode );

            var checkbox = dom.create('input', { type: 'checkbox', className: 'check' }, labelNode );
            var trackLabel = trackConf.name;
            var checkListener;
            this.own( checkListener = on( checkbox, 'click', function() {
                console.log( (this.checked ? 'show' : 'hide'), [trackConf] );
            }));
            dom.create('span', { className: 'key', innerHTML: trackConf.name }, labelNode );

            category.tracks[ trackLabel ] = { checkbox: checkbox, checkListener: checkListener, labelNode: labelNode };

            this._updateTitles( category );
        }, this );
    },

    _loadState: function() {
        this.state = {};
        try {
            this.state = JSON.parse( localStorage.getItem( 'JBrowse-Hierarchical-Track-Selector' ) || '{}' );
        } catch(e) {}
        return this.state;
    },
    _saveState: function( state ) {
        try {
            localStorage.setItem( 'JBrowse-Hierarchical-Track-Selector', JSON.stringify( this.state ) );
        } catch(e) {}
    },

    // depth-first traverse and update the titles of all the categories
    _updateAllTitles: function(r) {
        var root = r || this;
        for( var c in root.categories ) {
            this._updateTitle( root.categories[c] );
            this._updateAllTitles( root.categories[c] );
        }
    },

    _updateTitle: function( category ) {
        category.pane.set( 'title', category.pane.get('title')
                           .replace( />\s*\d+\s*\</, '>'+query('label.shown', category.pane.containerNode ).length+'<' )
                         );
    },

    // update the titles of the given category and its parents
    _updateTitles: function( category ) {
        this._updateTitle( category );
        if( category.parent )
            this._updateTitles( category.parent );
    },

    _findTrack: function _findTrack( trackLabel, callback, r ) {
        var root = r || this;
        for( var c in root.categories ) {
            var category = root.categories[c];
            if( category.tracks[ trackLabel ] ) {
                callback( category.tracks[ trackLabel ], category );
                return true;
            }
            else {
                if( this._findTrack( trackLabel, callback, category ) )
                    return true;
            }
        }
        return false;
    },

    replaceTracks: function( trackConfigs ) {
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned on.
     */
    setTracksActive: function( /**Array[Object]*/ trackConfigs ) {
        array.forEach( trackConfigs, function(conf) {
            this._findTrack( conf.label, function( trackRecord, category ) {
                trackRecord.checkbox.checked = true;
            });
        },this);
    },

    deleteTracks: function( /**Array[Object]*/ trackConfigs ) {
        array.forEach( trackConfigs, function(conf) {
            this._findTrack( conf.label, function( trackRecord, category ) {
                trackRecord.labelNode.parentNode.removeChild( trackRecord.labelNode );
                trackRecord.checkListener.remove();
                delete category.tracks[conf.label];
            });
        },this);
    },

    /**
     * Given an array of track configs, update the track list to show
     * that they are turned off.
     */
    setTracksInactive: function( /**Array[Object]*/ trackConfigs ) {
          array.forEach( trackConfigs, function(conf) {
            this._findTrack( conf.label, function( trackRecord, category ) {
                trackRecord.checkbox.checked = false;
            });
        },this);
    },


    _textFilter: function() {
        this.inherited(arguments);
        this._updateAllTitles();
    },

    /**
     * Make the track selector visible.
     */
    show: function() {
        this.parentComponent.addChild( this );
    },

    /**
     * Make the track selector invisible.
     */
    hide: function() {
    },

    /**
     * Toggle visibility of this track selector.
     */
    toggle: function() {
        if( this.parentComponent )
            this.hide();
        else
            this.show();
    }

});
});