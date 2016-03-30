define(['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'dojo/query',
        'dojo/on',
        'dojo/json',

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

           TitlePane,
           ContentPane,

           Util,
           _TextFilterMixin
       ) {

return declare(
    'JBrowse.View.TrackList.Hierarchical',
    [ ContentPane, _TextFilterMixin ],
    {

    region: 'left',
    splitter: true,
    style: 'width: 25%',

    id: 'hierarchicalTrackPane',
    baseClass: 'jbrowseHierarchicalTrackSelector',

    categoryFacet: 'category',

    constructor: function( args ) {
        this.categories = {};
        this.config=
            lang.mixin({
                "sortHierarchical": true
            },
            args);

        this._loadState();
    },
    postCreate: function() {
        this.placeAt( this.browser.container );

        // subscribe to commands coming from the the controller
        this.browser.subscribe( '/jbrowse/v1/c/tracks/show',
                                lang.hitch( this, 'setTracksActive' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/hide',
                                lang.hitch( this, 'setTracksInactive' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/new',
                                lang.hitch( this, 'addTracks' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/replace',
                                lang.hitch( this, 'replaceTracks' ));
        this.browser.subscribe( '/jbrowse/v1/c/tracks/delete',
                                lang.hitch( this, 'deleteTracks' ));
    },

    buildRendering: function() {
        this.inherited(arguments);

        var topPane = new ContentPane({ className: 'header' });
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
        var sorter;
        if(this.config.sortHierarchical) {
            sorter=[ { attribute: categoryFacet.toLowerCase()},
                     { attribute: 'key' },
                     { attribute: 'label' }
                   ];
        }

        // add initally collapsed categories to the local storage
        var arr=(this.get('collapsedCategories')||"").split(",");
        for(var i=0; i<arr.length;i++) {
            lang.setObject('collapsed.'+arr[i],true,this.state);
        }
        this._saveState();

        this.get('trackMetaData').fetch(
            { onItem: function(i) {
                  if( i.conf )
                      tracks.push( i );
              },
              onComplete: function() {
                  // make a pane at the top to hold uncategorized tracks
                  thisB.categories.Uncategorized =
                      { pane: new ContentPane({ className: 'uncategorized' }).placeAt( thisB.containerNode ),
                        tracks: {},
                        categories: {}
                      };

                  thisB.addTracks( tracks, true );

                  // hide the uncategorized pane if it is empty
                  if( ! thisB.categories.Uncategorized.pane.containerNode.children.length ) {
                      //thisB.removeChild( thisB.categories.Uncategorized.pane );
                      thisB.categories.Uncategorized.pane.domNode.style.display = 'none';
                  }
              },
              sort: sorter
            });
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
                    || track[ categoryFacet ]
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

            // note: sometimes trackConf.description is defined as numeric, so in this case, ignore it
            var labelNode = dom.create(
                'label', {
                    className: 'tracklist-label shown',
                    title: Util.escapeHTML( trackConf.shortDescription || track.shortDescription ||  (trackConf.description===1?undefined:trackConf.description) || track.description || trackConf.Description || track.Description || trackConf.metadata && ( trackConf.metadata.shortDescription || trackConf.metadata.description || trackConf.metadata.Description ) || track.key || trackConf.key || trackConf.label )
                }, category.pane.containerNode );

            var checkbox = dom.create('input', { type: 'checkbox', className: 'check' }, labelNode );
            var trackLabel = trackConf.label;
            var checkListener;
            this.own( checkListener = on( checkbox, 'click', function() {
                thisB.browser.publish( '/jbrowse/v1/v/tracks/'+(this.checked ? 'show' : 'hide'), [trackConf] );
            }));
            dom.create('span', { className: 'key', innerHTML: trackConf.key || trackConf.label }, labelNode );

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
                           .replace( />\s*\d+\s*</, '>'+query('label.shown', category.pane.containerNode ).length+'<' )
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
        var isChecked = {}
        array.forEach( trackConfigs, function(conf) {
            this._findTrack( conf.label, function( trackRecord, category ) {
                isChecked[conf.label] = trackRecord.checkbox.checked;
            });
        },this);

        this.deleteTracks (trackConfigs);
        this.addTracks (trackConfigs);

        array.forEach( trackConfigs, function(conf) {
            this._findTrack( conf.label, function( trackRecord, category ) {
                trackRecord.checkbox.checked = isChecked[conf.label];
            });
        },this);
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
     * This does nothing for this track selector, since it is always visible.
     */
    show: function() {
    },

    /**
     * Make the track selector invisible.
     * This does nothing for this track selector, since it is always visible.
     */
    hide: function() {
    },

    /**
     * Toggle visibility of this track selector.
     * This does nothing for this track selector, since it is always visible.
     */
    toggle: function() {
    }

});
});
