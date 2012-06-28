var _gaq = _gaq || []; // global task queue for Google Analytics

define( [
            'dojo/_base/lang',
            'dojox/lang/functional',
            'dijit/layout/ContentPane',
            'dijit/layout/BorderContainer',
            'dijit/Dialog',
            'dijit/form/ComboBox',
            'dijit/form/Button',
            'JBrowse/Util',
            'JBrowse/Store/LazyTrie',
            'JBrowse/Store/Autocomplete',
            'JBrowse/GenomeView'
        ],
        function(
            lang,
            dojof,
            dijitContentPane,
            dijitBorderContainer,
            dijitDialog,
            dijitComboBox,
            dijitButton,
            Util,
            LazyTrie,
            AutocompleteStore,
            GenomeView
        ) {

/**
 * Construct a new Browser object.
 * @class This class is the main interface between JBrowse and embedders
 * @constructor
 * @param params an object with the following properties:<br>
 * <ul>
 * <li><code>config</code> - list of objects with "url" property that points to a config JSON file</li>
 * <li><code>containerID</code> - ID of the HTML element that contains the browser</li>
 * <li><code>refSeqs</code> - object with "url" property that is the URL to list of reference sequence information items</li>
 * <li><code>browserRoot</code> - (optional) URL prefix for the browser code</li>
 * <li><code>tracks</code> - (optional) comma-delimited string containing initial list of tracks to view</li>
 * <li><code>location</code> - (optional) string describing the initial location</li>
 * <li><code>defaultTracks</code> - (optional) comma-delimited string containing initial list of tracks to view if there are no cookies and no "tracks" parameter</li>
 * <li><code>defaultLocation</code> - (optional) string describing the initial location if there are no cookies and no "location" parameter</li>
 * <li><code>show_nav</code> - (optional) string describing the on/off state of navigation box</li>
 * <li><code>show_tracklist</code> - (optional) string describing the on/off state of track bar</li>
 * <li><code>show_overview</code> - (optional) string describing the on/off state of overview</li>
 * </ul>
 */

var Browser = function(params) {
    this.deferredFunctions = [];
    this.globalKeyboardShortcuts = {};
    this.isInitialized = false;

    this.config = params;

    this.startTime = Date.now();

    // load our touch device support
    // TODO: refactor this
    this.deferredFunctions.push(function() { loadTouch(); });

    // schedule the config load, the first step in the initialization
    // process, to happen when the page is done loading
    var browser = this;
    dojo.addOnLoad( function() { browser.loadConfig(); } );

    dojo.connect( this, 'onConfigLoaded',  Util.debugHandler( this, 'loadRefSeqs' ));
    dojo.connect( this, 'onConfigLoaded',  Util.debugHandler( this, 'loadNames'   ));
    dojo.connect( this, 'onRefSeqsLoaded', Util.debugHandler( this, 'initView'    ));
    dojo.connect( this, 'onRefSeqsLoaded', Util.debugHandler( this, 'reportUsageStats' ));
};

/**
 * Displays links to configuration help in the main window.  Called
 * when the main browser cannot run at all, due to configuration
 * errors or whatever.
 */
Browser.prototype.fatalError = function( error ) {
    if( error ) {
        error = error+'';
        if( ! /\.$/.exec(error) )
            error = error + '.';
    }
    if( ! this.hasFatalErrors ) {
        var container =
            dojo.byId(this.config.containerID || 'GenomeBrowser')
            || document.body;
        container.innerHTML = ''
            + '<div class="fatal_error">'
            + '  <h1>Congratulations, JBrowse is on the web!</h1>'
            + "  <p>However, JBrowse could not start, either because it has not yet been configured or because of an error.</p>"
            + "  <p style=\"font-size: 110%; font-weight: bold\"><a title=\"View the tutorial\" href=\"docs/tutorial/\">If this is your first time running JBrowse, click here to follow the Quick-start Tutorial to get up and running.</a></p>"
            + "  <p>Otherwise, please refer to the following resources for help in getting JBrowse up and running.</p>"
            + '  <ul><li><a target="_blank" href="docs/tutorial/">Quick-start tutorial</a></li>'
            + '      <li><a target="_blank" href="http://gmod.org/wiki/JBrowse">JBrowse wiki</a></li>'
            + '      <li><a target="_blank" href="docs/config.html">Configuration reference</a></li>'
            + '      <li><a target="_blank" href="docs/featureglyphs.html">Feature glyph reference</a></li>'
            + '  </ul>'

            + '  <div id="fatal_error_list" class="errors"> <h2>Error message(s):</h2>'
            + ( error ? '<div class="error"> '+error+'</div>' : '' )
            + '  </div>'
            + '</div>'
            ;
        this.hasFatalErrors = true;
    } else {
        var errors_div = dojo.byId('fatal_error_list') || document.body;
        dojo.create('div', { className: 'error', innerHTML: error+'' }, errors_div );
    }
};

Browser.prototype.loadRefSeqs = function() {
    // load our ref seqs
    if( typeof this.config.refSeqs == 'string' )
        this.config.refSeqs = { url: this.config.refSeqs };
    dojo.xhrGet(
        {
            url: this.config.refSeqs.url,
            handleAs: 'json',
            load: dojo.hitch( this, function(o) {
                this.addRefseqs(o);
                this.onRefSeqsLoaded();
            })
        });
};

/**
 * Event that fires when the reference sequences have been loaded.
 */
Browser.prototype.onRefSeqsLoaded = function() {};

/**
 * Load our name index.
 */
Browser.prototype.loadNames = function() {
    // load our name index
    if (this.config.nameUrl)
        this.names = new LazyTrie(this.config.nameUrl, "lazy-{Chunk}.json");
};

Browser.prototype.initView = function() {
    //set up top nav/overview pane and main GenomeView pane
    dojo.addClass(document.body, "tundra");
    this.container = dojo.byId(this.config.containerID);
    this.container.onselectstart = function() { return false; };
    this.container.genomeBrowser = this;
    var topPane = dojo.create( 'div',{ style: {overflow: 'hidden'}}, this.container );

    var overview = dojo.create( 'div', { className: 'overview', id: 'overview' }, topPane );
    // overview=0 hides the overview, but we still need it to exist
    if( this.config.show_overview == 0 )
        overview.style.cssText = "display: none";

    if( this.config.show_nav != 0 )
        this.navbox = this.createNavBox( topPane, 25 );

    // make our little top-links box with links to help, etc.
    var linkContainer = dojo.create('div', { className: 'topLink' });
    dojo.create('a', {
        className: 'powered_by',
        innerHTML: 'JBrowse',
        href: 'http://jbrowse.org',
        title: 'powered by JBrowse'
     }, linkContainer );
    linkContainer.appendChild( this.makeBookmarkLink() );
    if( this.config.show_nav != 0 )
        linkContainer.appendChild( this.makeHelpDialog()   );
    ( this.config.show_nav == 0 ? this.container : this.navbox ).appendChild( linkContainer );


    this.viewElem = document.createElement("div");
    this.viewElem.className = "dragWindow";
    this.container.appendChild( this.viewElem);

    this.containerWidget = new dijitBorderContainer({
        liveSplitters: false,
        design: "sidebar",
        gutters: false
    }, this.container);
    var contentWidget =
        new dijitContentPane({region: "top"}, topPane);
    this.browserWidget =
        new dijitContentPane({region: "center"}, this.viewElem);

    //create location trapezoid
    if( this.config.show_nav != 0 ) {
        this.locationTrap = dojo.create('div', {className: 'locationTrap'}, topPane );
        this.locationTrap.className = "locationTrap";
    }

    // hook up GenomeView
    this.view = this.viewElem.view =
        new GenomeView(this, this.viewElem, 250, this.refSeq, 1/200,
                       this.config.browserRoot);
    dojo.connect( this.view, "onFineMove",   this, "onFineMove"   );
    dojo.connect( this.view, "onCoarseMove", this, "onCoarseMove" );

    //set up track list
    var trackListDiv = this.createTrackList();
    this.containerWidget.startup();
    dojo.connect( this.browserWidget, "resize", this,      'onResize' );
    dojo.connect( this.browserWidget, "resize", this.view, 'onResize' );
    this.onResize();
    this.view.onResize();

    //set initial location
    var oldLocMap = dojo.fromJson( this.cookie('location') ) || {};
    if (this.config.location) {
        this.navigateTo(this.config.location);
    } else if (oldLocMap[this.refSeq.name]) {
        this.navigateTo( oldLocMap[this.refSeq.name].l || oldLocMap[this.refSeq.name] );
    } else if (this.config.defaultLocation){
        this.navigateTo(this.config.defaultLocation);
    } else {
        this.navigateTo( Util.assembleLocString({
                             ref:   this.refSeq.name,
                             start: 0.4 * ( this.refSeq.start + this.refSeq.end ),
                             end:   0.6 * ( this.refSeq.start + this.refSeq.end )
                         })
                       );
    }

    // make our global keyboard shortcut handler
    dojo.connect( document.body, 'onkeypress', this, 'globalKeyHandler' );

    // configure our event routing
    this._initEventRouting();

    this.isInitialized = true;

    //if someone calls methods on this browser object
    //before it's fully initialized, then we defer
    //those functions until now
    dojo.forEach( this.deferredFunctions, function(f) {
        f.call(this);
    },this );

    this.deferredFunctions = [];
};

/**
 * Initialize our event routing, which is mostly echoing logical
 * commands from the user interacting with the views.
 * @private
 */
Browser.prototype._initEventRouting = function() {
    this.subscribe('/jbrowse/v1/v/tracks/hide', this, function() {
        this.publish( '/jbrowse/v1/c/tracks/hide', arguments );
    });
    this.subscribe('/jbrowse/v1/v/tracks/show', this, function( trackConfigs ) {
        this.addRecentlyUsedTracks( dojo.map(trackConfigs, function(c){ return c.label;}) );
        this.publish( '/jbrowse/v1/c/tracks/show', arguments );
    });
};

/**
 * Reports some anonymous usage statistics about this browsing
 * instance.  Currently reports the number of tracks in the instance
 * and their type (feature, wiggle, etc), and the number of reference
 * sequences and their average length.
 */
Browser.prototype.reportUsageStats = function() {
    if( this.config.suppressUsageStatistics )
        return;

    var stats = this._calculateClientStats();
    this._reportGoogleUsageStats( stats );
    this._reportCustomUsageStats( stats );
};

// phones home to google analytics
Browser.prototype._reportGoogleUsageStats = function( stats ) {
    _gaq.push.apply( _gaq, [
        ['_setAccount', 'UA-7115575-2'],
        ['_setDomainName', 'none'],
        ['_setAllowLinker', true],
        ['_setCustomVar', 1, 'tracks-count', stats['tracks-count'], 3 ],
        ['_setCustomVar', 2, 'refSeqs-count', stats['refSeqs-count'], 3 ],
        ['_setCustomVar', 3, 'refSeqs-avgLen', stats['refSeqs-avgLen'], 3 ],
        ['_setCustomVar', 4, 'jbrowse-version', stats['ver'], 3 ],
        ['_setCustomVar', 5, 'loadTime', stats['loadTime'], 3 ],
        ['_trackPageview']
    ]);

    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www')
             + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
};

// phones home to custom analytics at jbrowse.org
Browser.prototype._reportCustomUsageStats = function(stats) {
    // phone home with a GET request made by a script tag
    dojo.create(
        'img',
        { style: {
              display: 'none'
          },
          src: 'http://jbrowse.org/analytics/clientReport?'
               + dojo.objectToQuery( stats )
        },
        document.body
    );
};

Browser.prototype._calculateClientStats = function() {

    var scn = screen || window.screen;

    // make a flat (i.e. non-nested) object for the stats, so that it
    // encodes compactly in the query string
    var date = new Date();
    var stats = {
        ver: this.version || 'dev',
        'refSeqs-count': this.refSeqOrder.length,
        'refSeqs-avgLen':
          ! this.refSeqOrder.length
            ? null
            : dojof.reduce(
                dojo.map( this.refSeqOrder,
                          function(name) {
                              var ref = this.allRefs[name];
                              if( !ref )
                                  return 0;
                              return ref.end - ref.start;
                          },
                          this
                        ),
                '+'
            ),
        'tracks-count': this.config.tracks.length,

        // screen geometry
        'scn-h': scn ? scn.height : null,
        'scn-w': scn ? scn.width  : null,
        // window geometry
        'win-h':document.body.offsetHeight,
        'win-w': document.body.offsetWidth,
        // container geometry
        'el-h': this.container.offsetHeight,
        'el-w': this.container.offsetWidth,

        // time param to prevent caching
        t: date.getTime()/1000,

        // also get local time zone offset
        tzoffset: date.getTimezoneOffset(),

        loadTime: (date.getTime() - this.startTime)/1000
    };

    // count the number and types of tracks
    dojo.forEach( this.config.tracks, function(trackConfig) {
        var typeKey = 'track-types-'+ trackConfig.type || 'null';
        stats[ typeKey ] =
          ( stats[ typeKey ] || 0 ) + 1;
    });

    return stats;
};



Browser.prototype.publish = function() {
    return dojo.publish.apply( dojo, arguments );
};
Browser.prototype.subscribe = function() {
    return dojo.subscribe.apply( dojo, arguments );
};

Browser.prototype.onResize = function() {
    if( this.navbox )
        this.view.locationTrapHeight = dojo.marginBox( this.navbox ).h;
};

/**
 * Get the list of the most recently used tracks, stored for this user
 * in a cookie.
 * @returns {Array[Object]} as <code>[{ time: (integer), label: (track label)}]</code>
 */
Browser.prototype.getRecentlyUsedTracks = function() {
    return dojo.fromJson( this.cookie( 'recentTracks' ) || '[]' );
};

/**
 * Add the given list of tracks as being recently used.
 * @param trackLabels {Array[String]} array of track labels to add
 */
Browser.prototype.addRecentlyUsedTracks = function( trackLabels ) {
    var seen = {};
    var newRecent =
        Util.uniq(
            dojo.map( trackLabels, function(label) {
                          return {
                              label: label,
                              time: Math.round( new Date() / 1000 ) // secs since epoch
                          };
                      },this)
                .concat( dojo.fromJson( this.cookie('recentTracks'))  || [] ),
            function(entry) {
                return entry.label;
            }
        )
        // limit by default to 20 recent tracks
        .slice( 0, this.config.maxRecentTracks || 10 );

    // set the recentTracks cookie, good for one year
    this.cookie( 'recentTracks', newRecent, { expires: 365 } );

    return newRecent;
};

/**
 *  Load our configuration file(s) based on the parameters thex
 *  constructor was passed.  Does not return until all files are
 *  loaded and merged in.
 *  @returns nothing meaningful
 */
Browser.prototype.loadConfig = function () {
    var that = this;

    // coerce include to an array
    if( typeof this.config.include != 'object' || !this.config.include.length )
        this.config.include = [ this.config.include ];

    // coerce bare strings in the configs to URLs
    for (var i = 0; i < this.config.include.length; i++) {
        if( typeof this.config.include[i] == 'string' )
            this.config.include[i] = { url: this.config.include[i] };
    }

    // fetch and parse all the configuration data
    var configs_remaining = this.config.include.length;
    dojo.forEach( this.config.include, function(config) {
        // include array might have undefined elements in it if
        // somebody left a trailing comma in and we are running under
        // IE
        if( !config )
            return;

        // set defaults for format and version
        if( ! ('format' in config) ) {
            config.format = 'JB_json';
        }
        if( config.format == 'JB_json' && ! ('version' in config) ) {
            config.version = 1;
        }

        // instantiate the adaptor and load the config
        this.getConfigAdaptor( config, dojo.hitch(this, function(adaptor) {
            if( !adaptor ) {
                this.fatalError( "Could not load config "+config.url+", no configuration adaptor found for config format "+config.format+' version '+config.version );
                return;
            }

            adaptor.load({
                config: config,
                context: this,
                onSuccess: function( config_data, request_info ) {
                    config.data = config_data;
                    config.loaded = true;
                    if( ! --configs_remaining )
                        this.onConfigLoaded();
                        //if you need a backtrace: window.setTimeout( function() { that.onConfigLoaded(); }, 1 );
                },
                onFailure: function( error ) {
                    config.loaded = false;
                    this.fatalError( error );
                    if( ! --configs_remaining )
                        this.onConfigLoaded();
                        //if you need a backtrace: window.setTimeout( function() { that.onConfigLoaded(); }, 1 );
                }
            });
        }));
    }, this);
};

Browser.prototype.onConfigLoaded = function() {

    var initial_config = this.config;
    this.config = {};

    // load all the configuration data in order
    dojo.forEach( initial_config.include, function( config ) {
                      if( config.loaded && config.data )
                          this.addConfigData( config.data );
                  }, this );

    // load the initial config (i.e. constructor params) last so that
    // it overrides the other config
    this.addConfigData( initial_config );

    this.validateConfig();

    // index the track configurations by name
    this.trackConfigsByName = {};
    dojo.forEach( this.config.tracks || [], function(conf){
        this.trackConfigsByName[conf.label] = conf;
    },this);

};

/**
 * Examine the loaded and merged configuration for errors.  Throws
 * exceptions if it finds anything amiss.
 * @returns nothing meaningful
 */
Browser.prototype.validateConfig = function() {
    var c = this.config;
    if( ! c.tracks ) {
        this.fatalError( 'No tracks defined in configuration' );
    }
    if( ! c.baseUrl ) {
        this.fatalError( 'Must provide a <code>baseUrl</code> in configuration' );
    }
    if( this.hasFatalErrors )
        throw "Errors in configuration, aborting.";
};

/**
 * Instantiate the right config adaptor for a given configuration source.
 * @param {Object} config the configuraiton
 * @param {Function} callback called with the new config object
 * @returns {Object} the right configuration adaptor to use, or
 * undefined if one could not be found
 */

Browser.prototype.getConfigAdaptor = function( config_def, callback ) {
    var adaptor_name = "JBrowse/ConfigAdaptor/" + config_def.format;
    if( 'version' in config_def )
        adaptor_name += '_v'+config_def.version;
    adaptor_name.replace( /\W/g,'' );
    return require([adaptor_name], function(adaptor_class) {
        callback( new adaptor_class( config_def ) );
    });
};

/**
 * Add a function to be executed once JBrowse is initialized
 * @param f function to be executed
 */
Browser.prototype.addDeferred = function(f) {
    if (this.isInitialized)
        f();
    else
        this.deferredFunctions.push(f);
};

/**
 * Merge in some additional configuration data.  Properties in the
 * passed configuration will override those properties in the existing
 * configuration.
 */
Browser.prototype.addConfigData = function( /**Object*/ config_data ) {
    Util.deepUpdate( this.config, config_data );
};

/**
 * @param refSeqs {Array} array of refseq records to add to the browser
 */
Browser.prototype.addRefseqs = function( refSeqs ) {
    this.allRefs = this.allRefs || {};
    this.refSeqOrder = this.refSeqOrder || [];
    var refCookie = this.cookie('refseq');
    dojo.forEach( refSeqs, function(r) {
        if( ! this.allRefs[r.name] )
            this.refSeqOrder.push(r.name);
        this.allRefs[r.name] = r;
        if( refCookie && r.name.toLowerCase() == refCookie.toLowerCase() ) {
            this.refSeq = r;
        }
    },this);
    this.refSeqOrder = this.refSeqOrder.sort();
    this.refSeq  = this.refSeq || refSeqs[0];
};

/**
 * @private
 */


Browser.prototype.onFineMove = function(startbp, endbp) {

    if( this.locationTrap ) {
        var length = this.view.ref.end - this.view.ref.start;
        var trapLeft = Math.round((((startbp - this.view.ref.start) / length)
                                   * this.view.overviewBox.w) + this.view.overviewBox.l);
        var trapRight = Math.round((((endbp - this.view.ref.start) / length)
                                    * this.view.overviewBox.w) + this.view.overviewBox.l);

        var locationTrapStyle = dojo.isIE
            ? "top: " + this.view.overviewBox.t + "px;"
              + "height: " + this.view.overviewBox.h + "px;"
              + "left: " + trapLeft + "px;"
              + "width: " + (trapRight - trapLeft) + "px;"
              + "border-width: 0px"
            : "top: " + this.view.overviewBox.t + "px;"
              + "height: " + this.view.overviewBox.h + "px;"
              + "left: " + this.view.overviewBox.l + "px;"
              + "width: " + (trapRight - trapLeft) + "px;"
              + "border-width: " + "0px "
              + (this.view.overviewBox.w - trapRight) + "px "
              + this.view.locationTrapHeight + "px " + trapLeft + "px;";

        this.locationTrap.style.cssText = locationTrapStyle;
    }
};

/**
 * @private
 */

Browser.prototype.createTrackList = function() {

    if( ! this.config.tracks )
        this.config.tracks = [];

    // set a default baseUrl in each of the track confs if needed
    if( this.config.sourceUrl ) {
        dojo.forEach( this.config.tracks, function(t) {
            if( ! t.baseUrl )
                t.baseUrl = this.config.baseUrl;
        },this);
    }

    // find the tracklist class to use
    var resolved_tl_class = function() {
        var tl_class = this.config.show_tracklist == 0      ? 'Null'                         :
                       (this.config.trackSelector||{}).type ? this.config.trackSelector.type :
                                                              'Simple';
        return JBrowse.View.TrackList[tl_class] || eval( tl_class.replace(/[^\.\w\d]/g, '') ); // sanitize tracklist class for a little security
    }.call(this);
    if( !resolved_tl_class ) {
        console.error("configured trackSelector.type "+tl_class+" not found, falling back to JBrowse.View.TrackList.Simple");
        resolved_tl_class = JBrowse.View.TrackList.Simple;
    }

    var trackMeta =  new JBrowse.Model.TrackMetaData(
        dojo.mixin( this.config.trackMetadata || {}, {
                        trackConfigs: this.config.tracks,
                        browser: this,
                        metadataStores: dojo.map(
                            (this.config.trackMetadata||{}).sources || [],
                            function( sourceDef ) {
                                var url  = sourceDef.url || 'trackMeta.csv';
                                var type = sourceDef.type || (
                                        /\.csv$/i.test(url)     ? 'csv'  :
                                        /\.js(on)?$/i.test(url) ? 'json' :
                                        'csv'
                                );
                                var storeClass = sourceDef['class']
                                    || { csv: 'dojox.data.CsvStore', json: 'dojox.data.JsonRestStore' }[type];
                                if( !storeClass ) {
                                    console.error( "No store class found for type '"
                                                   +type+"', cannot load track metadata from URL "+url);
                                    return null;
                                }
                                var store;
                                require([storeClass],function(storeClass) {
                                    store = new storeclass({url: url});
                                });
                                return store;
                            },this)
                    })
    );


    // instantiate the tracklist and the track metadata object
    this.trackListView = new resolved_tl_class(
        dojo.mixin(
            dojo.clone( this.config.trackSelector ) || {},
            {
                trackConfigs: this.config.tracks,
                browser: this,
                trackMetaData: trackMeta
            }
        )
    );

    // bind the 't' key as a global keyboard shortcut
    this.setGlobalKeyboardShortcut( 't', this.trackListView, 'toggle' );

    // listen for track-visibility-changing messages from views
    this.subscribe( '/jbrowse/v1/v/tracks/hide', this, 'onVisibleTracksChanged' );
    this.subscribe( '/jbrowse/v1/v/tracks/show', this, 'onVisibleTracksChanged' );

    // figure out what initial track list we will use:
    //    from a param passed to our instance, or from a cookie, or
    //    the passed defaults, or the last-resort default of "DNA"?
    var origTracklist =
           this.config.forceTracks
        || this.cookie( "tracks" )
        || this.config.defaultTracks
        || "DNA";

    this.showTracks( origTracklist );
};



/**
 * @private
 */


Browser.prototype.onVisibleTracksChanged = function() {
    this.view.updateTrackList();
    this.cookie( "tracks",
                 this.visibleTracks().join(','),
                 {expires: 60});
};

/**
 * navigate to a given location
 * @example
 * gb=dojo.byId("GenomeBrowser").genomeBrowser
 * gb.navigateTo("ctgA:100..200")
 * gb.navigateTo("f14")
 * @param loc can be either:<br>
 * &lt;chromosome&gt;:&lt;start&gt; .. &lt;end&gt;<br>
 * &lt;start&gt; .. &lt;end&gt;<br>
 * &lt;center base&gt;<br>
 * &lt;feature name/ID&gt;
 */

Browser.prototype.navigateTo = function(loc) {
    if (!this.isInitialized) {
        this.deferredFunctions.push(function() { this.navigateTo(loc); });
        return;
    }

    // if it's a foo:123..456 location, go there
    var location = Util.parseLocString( loc );
    if( location ) {
        this.navigateToLocation( location );
    }
    // otherwise, if it's just a word, try to figure out what it is
    else {

        // is it just the name of one of our ref seqs?
        var ref = Util.matchRefSeqName( loc, this.allRefs );
        if( ref ) {
            // see if we have a stored location for this ref seq in a
            // cookie, and go there if we do
            var oldLoc;
            try {
                oldLoc = Util.parseLocString(
                    dojo.fromJson(
                        this.cookie("location")
                    )[ref.name].l
                );
                oldLoc.ref = ref.name; // force the refseq name; older cookies don't have it
            } catch (x) {}
            if( oldLoc ) {
                this.navigateToLocation( oldLoc );
            } else {
                // if we don't just go to the middle 80% of that refseq
                this.navigateToLocation({ref: ref.name, start: ref.end*0.1, end: ref.end*0.9 });
            }
        }

        // lastly, try to search our feature names for it
        this.searchNames( loc );
    }
};

// given an object like { ref: 'foo', start: 2, end: 100 }, set the
// browser's view to that location.  any of ref, start, or end may be
// missing, in which case the function will try set the view to
// something that seems intelligent
Browser.prototype.navigateToLocation = function( location ) {

    // validate the ref seq we were passed
    var ref = location.ref ? Util.matchRefSeqName( location.ref, this.allRefs )
                           : this.refSeq;
    if( !ref )
        return;
    location.ref = ref.name;

    // clamp the start and end to the size of the ref seq
    location.start = Math.max( 0, location.start || 0 );
    location.end   = Math.max( location.start,
                               Math.min( ref.end, location.end || ref.end )
                             );

    // if it's the same sequence, just go there
    if( location.ref == this.refSeq.name) {
        this.view.setLocation( this.refSeq,
                               location.start,
                               location.end
                             );
    }
    // if different, we need to poke some other things before going there
    else {
        // record names of open tracks and re-open on new refseq
        var curTracks = this.visibleTracks();

        this.refSeq = this.allRefs[location.ref];

        this.view.setLocation( this.refSeq,
                               location.start,
                               location.end );
        this.showTracks( curTracks );
    }

    return;
};

/**
 * Given a string name, search for matching feature names and set the
 * view location to any that match.
 */
Browser.prototype.searchNames = function( /**String*/ loc ) {
    var brwsr = this;
    this.names.exactMatch( loc, function(nameMatches) {
            var goingTo,
                i;

            var post1_4 = typeof nameMatches[0][0] == 'string';

            //first check for exact case match
            for (i = 0; i < nameMatches.length; i++) {
                if (nameMatches[i][ post1_4 ? 0 : 1 ] == loc)
                    goingTo = nameMatches[i];
            }
            //if no exact case match, try a case-insentitive match
            if (!goingTo) {
                for (i = 0; i < nameMatches.length; i++) {
                    if (nameMatches[i][ post1_4 ? 0 : 1].toLowerCase() == loc.toLowerCase())
                        goingTo = nameMatches[i];
                }
            }
            //else just pick a match
            if (!goingTo) goingTo = nameMatches[0];
            var startbp = parseInt( goingTo[ post1_4 ? 4 : 3 ]);
            var endbp   = parseInt( goingTo[ post1_4 ? 5 : 4 ]);
            var flank = Math.round((endbp - startbp) * .2);
            //go to location, with some flanking region
            brwsr.navigateTo( goingTo[ post1_4 ? 3 : 2]
                             + ":" + (startbp - flank)
                             + ".." + (endbp + flank));
            brwsr.showTracks(brwsr.names.extra[nameMatches[0][ post1_4 ? 1 : 0 ]]);
        });
};


/**
 * load and display the given tracks
 * @example
 * gb=dojo.byId("GenomeBrowser").genomeBrowser
 * gb.showTracks(["DNA","gene","mRNA","noncodingRNA"])
 * @param trackNameList {Array|String} array or comma-separated string
 * of track names, each of which should correspond to the "label"
 * element of the track information
 */

Browser.prototype.showTracks = function( trackNames ) {
    if( !this.isInitialized ) {
        this.deferredFunctions.push( function() { this.showTracks(trackNames); } );
        return;
    }

    if( typeof trackNames == 'string' )
        trackNames = trackNames.split(',');

    if( ! trackNames )
        return;

    var trackConfs = dojo.filter(
        dojo.map( trackNames, function(n) {
                      return this.trackConfigsByName[n];
                  }, this),
        function(c) {return c;} // filter out confs that are missing
    );

    // publish some events with the tracks to instruct the views to show them.
    dojo.publish( '/jbrowse/v1/c/tracks/show', [trackConfs] );
    dojo.publish( '/jbrowse/v1/n/tracks/visibleChanged' );
};

/**
 * @returns {String} locstring representation of the current location<br>
 * (suitable for passing to navigateTo)
 */

Browser.prototype.visibleRegion = function() {
    return Util.assembleLocString({
               ref:   this.view.ref.name,
               start: this.view.minVisible(),
               end:   this.view.maxVisible()
           });
};

/**
 * @returns {Array[String]} of the <b>names</b> of currently-viewed
 * tracks (suitable for passing to showTracks)
 */

Browser.prototype.visibleTracks = function() {
    return dojo.map( this.view.visibleTracks(), function(t){ return t.name; } );
};

Browser.prototype.makeHelpDialog = function () {

    // make a div containing our help text
    var browserRoot = this.config.browserRoot || "";
    var helpdiv = document.createElement('div');
    helpdiv.style.display = 'none';
    helpdiv.className = "helpDialog";
    helpdiv.innerHTML = ''
        + '<div class="main" style="float: left; width: 49%;">'

        + '<dl>'
        + '<dt>Moving</dt>'
        + '<dd><ul>'
        + '    <li>Move the view by clicking and dragging in the track area, or by clicking <img height="20px" src="'+browserRoot+'img/slide-left.png"> or <img height="20px"  src="'+browserRoot+'img/slide-right.png"> in the navigation bar.</li>'
        + '    <li>Center the view at a point by clicking on either the track scale bar or overview bar, or by shift-clicking in the track area.</li>'
        + '</ul></dd>'
        + '<dt>Zooming</dt>'
        + '<dd><ul>'
        + '    <li>Zoom in and out by clicking <img height="20px" src="'+browserRoot+'img/zoom-in-1.png"> or <img height="20px"  src="'+browserRoot+'img/zoom-out-1.png"> in the navigation bar.</li>'
        + '    <li>Select a region and zoom to it ("rubber-band" zoom) by clicking and dragging in the overview or track scale bar, or shift-clicking and dragging in the track area.</li>'
        + '    </ul>'
        + '</dd>'
        + '<dt>Selecting Tracks</dt>'
        + '<dd><ul><li>Turn a track off by dragging its track label from the "Available Tracks" area into the track area.</li>'
        + '        <li>Turn a track on by dragging its track label from the track area back into the "Available Tracks" area.</li>'
        + '    </ul>'
        + '</dd>'
        + '</dl>'
        + '</div>'

        + '<div class="main" style="float: right; width: 49%;">'
        + '<dl>'
        + '<dt>Searching</dt>'
        + '<dd><ul>'
        + '    <li>Jump to a feature or reference sequence by typing its name in the search box and pressing Enter.</li>'
        + '    <li>Jump to a specific region by typing the region into the search box as: <span class="example">ref:start..end</span>.</li>'
        + '    </ul>'
        + '</dd>'
        + '<dt>Example Searches</dt>'
        + '<dd>'
        + '    <dl class="searchexample">'
        + '        <dt>uc0031k.2</dt><dd>jumps to the feature named <span class="example">uc0031k.2</span>.</dd>'
        + '        <dt>chr4</dt><dd>jumps to chromosome 4</dd>'
        + '        <dt>chr4:79,500,000..80,000,000</dt><dd>jumps the region on chromosome 4 between 79.5Mb and 80Mb.</dd>'
        + '    </dl>'
        + '</dd>'
        + '<dt>JBrowse Configuration</dt>'
        + '<dd><ul><li><a target="_blank" href="docs/tutorial/">Quick-start tutorial</a></li>'
        + '        <li><a target="_blank" href="http://gmod.org/wiki/JBrowse">JBrowse wiki</a></li>'
        + '        <li><a target="_blank" href="docs/config.html">Configuration reference</a></li>'
        + '        <li><a target="_blank" href="docs/featureglyphs.html">Feature glyph reference</a></li>'
        + '    </ul>'
        + '</dd>'
        + '</dl>'
        + '</div>'
        ;
    this.container.appendChild( helpdiv );

    var dialog = new dijitDialog({
        "class": 'help_dialog',
        refocus: false,
        draggable: false,
        title: "JBrowse Help"
    }, helpdiv );

    // make a Help link that will show the dialog and set a handler on it
    var helplink = document.createElement('a');
    helplink.className = 'topLink';
    helplink.title = 'Help';
    helplink.style.cursor = 'help';
    helplink.appendChild( document.createTextNode('Help'));
    dojo.connect(helplink, 'onclick', function() { dialog.show(); });

    this.setGlobalKeyboardShortcut( '?', dialog, 'show' );
    dojo.connect( document.body, 'onkeydown', function(evt) {
        if( evt.keyCode != dojo.keys.SHIFT && evt.keyCode != dojo.keys.CTRL && evt.keyCode != dojo.keys.ALT )
            dialog.hide();
    });

    return helplink;
};

/**
 * Create a global keyboard shortcut.
 * @param keychar the character of the key that is typed
 * @param [...] additional arguments passed to dojo.hitch for making the handler
 */
Browser.prototype.setGlobalKeyboardShortcut = function( keychar ) {
    // warn if redefining
    if( this.globalKeyboardShortcuts[ keychar ] )
        console.warn("WARNING: JBrowse global keyboard shortcut '"+keychar+"' redefined");

    // make the wrapped handler func
    var func = dojo.hitch.apply( dojo, Array.prototype.slice.call( arguments, 1 ) );

    // remember it
    this.globalKeyboardShortcuts[ keychar ] = func;
};

/**
 * Key event handler that implements all global keyboard shortcuts.
 */
Browser.prototype.globalKeyHandler = function( evt ) {
    var shortcut = this.globalKeyboardShortcuts[ evt.keyChar ];
    if( shortcut ) {
        shortcut.call( this );
        evt.stopPropagation();
    }
};

Browser.prototype.makeBookmarkLink = function (area) {
    // don't make the link if we were explicitly passed a 'bookmark'
    // param of 'false'
    if( typeof this.config.bookmark != 'undefined' && !this.config.bookmark )
        return null;

    // if a function was not passed, make a default bookmarking function
    if( typeof this.config.bookmark != 'function' )
        this.config.bookmark = function( browser_obj ) {
               return "".concat(
                   window.location.protocol,
                   "//",
                   window.location.host,
                   window.location.pathname,
                   "?",
                   dojo.objectToQuery({
                       loc:    browser_obj.visibleRegion(),
                       tracks: browser_obj.visibleTracks().join(','),
                       data:   browser_obj.config.queryParams.data
                   })
               );
        };

    // make the bookmark link
    var fullview = this.config.show_nav == 0 || this.config.show_tracklist == 0 || this.config.show_overview == 0;
    this.link = document.createElement("a");
    this.link.className = "topLink";
    this.link.href  = window.location.href;
    if( fullview )
        this.link.target = "_blank";
    this.link.title = fullview ? "View in full browser" : "Bookmarkable link to this view";
    this.link.appendChild( document.createTextNode( fullview ? "Full view" : "Bookmark" ) );

    // connect moving events to update it
    var update_bookmark = function() {
        this.link.href = this.config.bookmark.call( this, this );
    };
    dojo.connect( this, "onCoarseMove",           update_bookmark );
    dojo.connect( this, 'onVisibleTracksChanged', update_bookmark );

    return this.link;
};

/**
 * @private
 */

Browser.prototype.onCoarseMove = function(startbp, endbp) {
    var length = this.view.ref.end - this.view.ref.start;
    var trapLeft = Math.round((((startbp - this.view.ref.start) / length)
                               * this.view.overviewBox.w) + this.view.overviewBox.l);
    var trapRight = Math.round((((endbp - this.view.ref.start) / length)
                                * this.view.overviewBox.w) + this.view.overviewBox.l);

    this.view.locationThumb.style.cssText =
    "height: " + (this.view.overviewBox.h - 4) + "px; "
    + "left: " + trapLeft + "px; "
    + "width: " + (trapRight - trapLeft) + "px;"
    + "z-index: 20";

    //since this method gets triggered by the initial GenomeView.sizeInit,
    //we don't want to save whatever location we happen to start at
    if (! this.isInitialized) return;
    var locString = Util.assembleLocString({ start: startbp, end: endbp, ref: this.refSeq.name });
    if( this.locationBox ) {
        this.locationBox.set('value',locString,false);
        this.goButton.set('disabled',true);
    }

    // update the location and refseq cookies
    var oldLocMap = dojo.fromJson( this.cookie('location') ) || { "_version": 1 };
    if( ! oldLocMap["_version"] )
        oldLocMap = this._migrateLocMap( oldLocMap );
    oldLocMap[this.refSeq.name] = { l: locString, t: Math.round( (new Date()).getTime() / 1000 ) - 1340211510 };
    oldLocMap = this._limitLocMap( oldLocMap, this.config.maxSavedLocations || 10 );
    this.cookie( 'location', dojo.toJson(oldLocMap), {expires: 60});
    this.cookie( 'refseq', this.refSeq.name );

    document.title = locString;
};
/**
 * Migrate an old location map cookie to the new format that includes timestamps.
 * @private
 */
Browser.prototype._migrateLocMap = function( locMap ) {
    var newLoc = { "_version": 1 };
    for( var loc in locMap ) {
        newLoc[loc] = { l: locMap[loc], t: 0 };
    }
    return newLoc;
};

/**
 * Limit the size of the saved location map, removing the least recently used.
 * @private
 */
Browser.prototype._limitLocMap = function( locMap, maxEntries ) {
    // don't do anything if the loc map has fewer than the max
    var locRefs = dojof.keys( locMap );
    if( locRefs.length <= maxEntries )
        return locMap;

    // otherwise, calculate the least recently used that we need to
    // get rid of to be under the size limit
    locMap = dojo.clone( locMap );
    var deleteLocs =
        locRefs
        .sort( function(a,b){
                   return locMap[b].t - locMap[a].t;
               })
        .slice( maxEntries-1 );

    // and delete them from the locmap
    dojo.forEach( deleteLocs, function(locRef) {
        delete locMap[locRef];
    });

    return locMap;
};

/**
 * Wrapper for dojo.cookie that namespaces our cookie names by
 * prefixing them with this.config.containerID.
 *
 * Has one additional bit of smarts: if an object or array is passed
 * instead of a string to set as the cookie contents, will serialize
 * it with dojo.toJson before storing.
 *
 * @param [...] same as dojo.cookie
 * @returns the new value of the cookie, same as dojo.cookie
 */
Browser.prototype.cookie = function() {
    arguments[0] = this.config.containerID + '-' + arguments[0];
    if( typeof arguments[1] == 'object' )
        arguments[1] = dojo.toJson( arguments[1] );

    var sizeLimit= this.config.cookieSizeLimit || 1200;
    if( arguments[1] && arguments[1].length > sizeLimit ) {
        console.warn("not setting cookie '"+arguments[0]+"', value too big ("+arguments[1].length+" > "+sizeLimit+")");
        return dojo.cookie( arguments[0] );
    }

    return dojo.cookie.apply( dojo.cookie, arguments );
};

/**
 * @private
 */

Browser.prototype.createNavBox = function( parent, locLength ) {
    var navbox = document.createElement("div");
    var browserRoot = this.config.browserRoot ? this.config.browserRoot : "";
    navbox.id = "navbox";
    parent.appendChild(navbox);
    navbox.style.cssText = "text-align: center; z-index: 10;";

    var four_nbsp = String.fromCharCode(160); four_nbsp = four_nbsp + four_nbsp + four_nbsp + four_nbsp;
    navbox.appendChild(document.createTextNode( four_nbsp ));

    var moveLeft = document.createElement("input");
    moveLeft.type = "image";
    moveLeft.src = browserRoot + "img/slide-left.png";
    moveLeft.id = "moveLeft";
    moveLeft.className = "icon nav";
    moveLeft.style.height = "40px";
    navbox.appendChild(moveLeft);
    dojo.connect( moveLeft, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.slide(0.9);
                  });

    var moveRight = document.createElement("input");
    moveRight.type = "image";
    moveRight.src = browserRoot + "img/slide-right.png";
    moveRight.id="moveRight";
    moveRight.className = "icon nav";
    moveRight.style.height = "40px";
    navbox.appendChild(moveRight);
    dojo.connect( moveRight, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.slide(-0.9);
                  });

    navbox.appendChild(document.createTextNode( four_nbsp ));

    var bigZoomOut = document.createElement("input");
    bigZoomOut.type = "image";
    bigZoomOut.src = browserRoot + "img/zoom-out-2.png";
    bigZoomOut.id = "bigZoomOut";
    bigZoomOut.className = "icon nav";
    bigZoomOut.style.height = "40px";
    navbox.appendChild(bigZoomOut);
    dojo.connect( bigZoomOut, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomOut(undefined, undefined, 2);
                  });


    var zoomOut = document.createElement("input");
    zoomOut.type = "image";
    zoomOut.src = browserRoot + "img/zoom-out-1.png";
    zoomOut.id = "zoomOut";
    zoomOut.className = "icon nav";
    zoomOut.style.height = "40px";
    navbox.appendChild(zoomOut);
    dojo.connect( zoomOut, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                     this.view.zoomOut();
                  });

    var zoomIn = document.createElement("input");
    zoomIn.type = "image";
    zoomIn.src = browserRoot + "img/zoom-in-1.png";
    zoomIn.id = "zoomIn";
    zoomIn.className = "icon nav";
    zoomIn.style.height = "40px";
    navbox.appendChild(zoomIn);
    dojo.connect( zoomIn, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomIn();
                  });

    var bigZoomIn = document.createElement("input");
    bigZoomIn.type = "image";
    bigZoomIn.src = browserRoot + "img/zoom-in-2.png";
    bigZoomIn.id = "bigZoomIn";
    bigZoomIn.className = "icon nav";
    bigZoomIn.style.height = "40px";
    navbox.appendChild(bigZoomIn);
    dojo.connect( bigZoomIn, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomIn(undefined, undefined, 2);
                  });

    navbox.appendChild(document.createTextNode( four_nbsp ));

    // make the location box
    this.locationBox = new dijitComboBox(
        {
            id: "location",
            name: "location",
            store: this._makeLocationAutocompleteStore(),
            searchAttr: "name"
        },
        dojo.create('input',{ size: locLength },navbox) );
    dojo.connect( this.locationBox.focusNode, "keydown", this, function(event) {
                      if (event.keyCode == dojo.keys.ENTER) {
                          this.locationBox.closeDropDown(false);
                          this.navigateTo( this.locationBox.get('value') );
                          this.goButton.set('disabled',true);
                          dojo.stopEvent(event);
                      } else {
                          this.goButton.set('disabled', false);
                      }
                  });
    dojo.connect( navbox, 'onselectstart', function(evt) { evt.stopPropagation(); return true; });
    // monkey-patch the combobox code to make a few modifications
    (function(){

         // add a moreMatches class to our hacked-in "more options" option
         var dropDownProto = eval(this.locationBox.dropDownClass).prototype;
         var oldCreateOption = dropDownProto._createOption;
         dropDownProto._createOption = function( item ) {
             var option = oldCreateOption.apply( this, arguments );
             if( item.hitLimit )
                 dojo.addClass( option, 'moreMatches');
             return option;
         };

         // prevent the "more matches" option from being clicked
         var oldSetValue = dropDownProto._setValueAttr;
         dropDownProto._setValueAttr = function( value ) {
             console.log( value.target.item );
             if( value.target && value.target.item && value.target.item.hitLimit )
                 return null;
             return oldSetValue.apply( this, arguments );
         };
    }).call(this);

    // make the 'Go' button'
    this.goButton = new dijitButton(
        {
            label: 'Go',
            onClick: dojo.hitch( this, function(event) {
                this.navigateTo(this.locationBox.get('value'));
                this.goButton.set('disabled',true);
                dojo.stopEvent(event);
            })
        }, dojo.create('button',{},navbox));

    return navbox;
};

Browser.prototype._makeLocationAutocompleteStore = function() {
    var conf = this.config.autocomplete||{};
    return new AutocompleteStore({
        namesTrie: this.names,
        stopPrefixes: conf.stopPrefixes,
        resultLimit:  conf.resultLimit || 15
    });
};

return Browser;

});


/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
