define(['dojo/_base/declare',
        'dojo/_base/array',
        'dojo/_base/lang',
        'dojo/dom-construct',
        'dojo/query',
        'dojo/on',

        'dijit/TitlePane',
        'dijit/layout/ContentPane'
       ],
       function(
           declare,
           array,
           lang,
           dom,
           query,
           on,

           TitlePane,
           ContentPane
       ) {

return declare(
    'JBrowse.View.TrackList.Hierarchical',
    ContentPane,
    {

    region: 'left',
    splitter: true,
    style: 'width: 25%',

    categoryFacet: 'category',

    constructor: function( args ) {
        this.categories = {};
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

    startup: function() {
        this.inherited( arguments );

        var tracks = [];
        var thisB = this;
        var categoryFacet = this.get('categoryFacet');
        this.get('trackMetaData').fetch(
            { onItem: function(i) {
                  if( i.conf )
                      tracks.push( i.conf );
              },
              onComplete: lang.hitch( this, 'addTracks', tracks, true ),
              sort: [ { attribute: this.get('categoryFacet').toLowerCase()},
                      { attribute: 'key' },
                      { attribute: 'label' }
                    ]
            });
    },

    addTracks: function( trackConfigs, inStartup ) {
        this.pane = this;
        var thisB = this;

        array.forEach( trackConfigs, function( trackConf ) {

            var categoryFacet = this.get('categoryFacet');
            var categoryNames = (
                trackConf.metadata && trackConf.metadata[ categoryFacet ]
                    || trackConf[ categoryFacet ]
                    || 'Uncategorized'
            ).split(/\s*\/\s*/);

            var category = _findCategory( this, categoryNames );

            function _findCategory( obj, names ) {
                var categoryName = names.shift();
                var cat = obj.categories[categoryName] || ( obj.categories[categoryName] = function() {
                    var c = new TitlePane({ title: categoryName + ' <span class="trackCount">0</span>' });
                    obj.pane.addChild(c, inStartup ? undefined : 0 );
                    return { parent: obj, pane: c, categories: {}, tracks: {} };
                }.call(this));

                return names.length ? _findCategory( cat, names ) : cat;
            };

            var labelNode = dom.create( 'label', { style: 'display: block'}, category.pane.containerNode );
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

    // update the titles of the given category and its parents
    _updateTitles: function _updateTitles( category ) {
        category.pane.set( 'title', category.pane.get('title')
                           .replace( />\s*\d+\s*\</, '>'+query('label', category.pane.containerNode ).length+'<' )
                         );
        if( category.parent )
            _updateTitles( category.parent );
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
                delete this.categories[c].tracks[conf.label];
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