var _gaq = _gaq || []; // global task queue for Google Analytics
define( [
            'dojo/_base/lang',
            'dojo/on',
            'dojo/_base/Deferred',
            'dojo/DeferredList',
            'dojo/topic',
            'dojo/aspect',
            'dojo/_base/array',
            'dijit/layout/ContentPane',
            'dijit/layout/BorderContainer',
            'dijit/Dialog',
            'dijit/form/ComboBox',
            'dijit/form/Button',
            'dijit/form/Select',
            'dijit/form/DropDownButton',
            'dijit/DropDownMenu',
            'dijit/MenuItem',
            'dijit/CheckedMenuItem',
            'JBrowse/Util',
            'JBrowse/Store/LazyTrie',
            'JBrowse/Store/Names/LazyTrieDojoData',
            'dojo/store/DataStore',
            'JBrowse/Store/Names/Hash',
            'JBrowse/GenomeView',
            'JBrowse/TouchScreenSupport',
            'JBrowse/ConfigManager',
            'JBrowse/View/InfoDialog',
            'JBrowse/View/FileDialog',
            'JBrowse/View/RegionClusteringDialog',
            'JBrowse/Model/Location',
            'JBrowse/View/LocationChoiceDialog',
            'JBrowse/View/Dialog/SetHighlight',
            'dijit/focus',
            'lazyload', // for dynamic CSS loading
            'dojo/domReady!'
        ],
        function(
            lang,
            on,
            Deferred,
            DeferredList,
            topic,
            aspect,
            array,
            dijitContentPane,
            dijitBorderContainer,
            dijitDialog,
            dijitComboBox,
            dijitButton,
            dijitSelectBox,
            dijitDropDownButton,
            dijitDropDownMenu,
            dijitMenuItem,
            dijitCheckedMenuItem,
            Util,
            LazyTrie,
            NamesLazyTrieDojoDataStore,
            DojoDataStore,
            NamesHashStore,
            GenomeView,
            Touch,
            ConfigManager,
            InfoDialog,
            FileDialog,
            RegionClusteringDialog,
            Location,
            LocationChoiceDialog,
            SetHighlightDialog,
            dijitFocus,
            LazyLoad
        ) {

var dojof = Util.dojof;

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
    this.globalKeyboardShortcuts = {};

    this.config = params;

    if( ! this.config.baseUrl )
        this.config.baseUrl = Util.resolveUrl( window.location.href, '.' ) + '/data/';

    this.startTime = Date.now();

    this.container = dojo.byId(this.config.containerID);
    this.container.onselectstart = function() { return false; };
    this.container.genomeBrowser = this;

    // start the initialization process
    var thisB = this;
    dojo.addOnLoad( function() {
        thisB.loadConfig().then( function() {

            // initialize our highlight if one was set in the config
            if( thisB.config.initialHighlight )
                thisB.setHighlight( new Location( thisB.config.initialHighlight ) );

            thisB.loadNames();
            thisB.loadUserCSS().then( function() {
                thisB.initPlugins().then( function() {
                    thisB.initTrackMetadata();
                    thisB.loadRefSeqs().then( function() {
                       thisB.initView().then( function() {
                           Touch.loadTouch(); // init touch device support
                           thisB.navigateTo( thisB._initialLocation() );
                           thisB.passMilestone( 'completely initialized', { success: true } );
                       });
                       thisB.reportUsageStats();
                    });
                });
            });
        });
    });
};

Browser.prototype._initialLocation = function() {
    var oldLocMap = dojo.fromJson( this.cookie('location') ) || {};
    if( this.config.location ) {
        return this.config.location;
    } else if( oldLocMap[this.refSeq.name] ) {
        return oldLocMap[this.refSeq.name].l || oldLocMap[this.refSeq.name];
    } else if( this.config.defaultLocation ){
        return this.config.defaultLocation;
    } else {
        return Util.assembleLocString({
                                          ref:   this.refSeq.name,
                                          start: 0.4 * ( this.refSeq.start + this.refSeq.end ),
                                          end:   0.6 * ( this.refSeq.start + this.refSeq.end )
                                      });
    }
};

Browser.prototype.version = function() {
    // when a build is put together, the build system assigns a string
    // to the variable below.
    var BUILD_SYSTEM_JBROWSE_VERSION;
    return BUILD_SYSTEM_JBROWSE_VERSION || 'development';
}.call();


/**
 * Get a plugin, if it is present.  Note that, if plugin
 * initialization is not yet complete, it may be a while before the
 * callback is called.
 *
 * Callback is called with one parameter, the desired plugin object,
 * or undefined if it does not exist.
 */
Browser.prototype.getPlugin = function( name, callback ) {
    this.afterMilestone( 'initPlugins', dojo.hitch( this, function() {
        callback( this.plugins[name] );
    }));
};

/**
 * Load and instantiate any plugins defined in the configuration.
 */
Browser.prototype.initPlugins = function() {
    return this._milestoneFunction( 'initPlugins', function( deferred ) {
        this.plugins = {};
        var plugins = this.config.plugins || [];

        if( ! plugins ) {
            deferred.resolve({success: true});
            return;
        }

        // coerce plugins to array of objects
        plugins = array.map( dojo.isArray(plugins) ? plugins : [plugins], function( p ) {
            return typeof p == 'object' ? p : { 'name': p };
        });

        var pluginNames = array.map( plugins, function( p ) {
            return p.name;
        });

        var pluginDeferreds = array.map( plugins, function(p) {
            return new Deferred();
        });

        // fire the "all plugins done" deferred when all of the plugins are done loading
        (new DeferredList( pluginDeferreds ))
            .then( function() { deferred.resolve({success: true}); });

        require( {
                     packages: array.map( pluginNames, function(c) { return { name: c, location: "../plugins/"+c+"/js" }; })
                 },
                 pluginNames,
                 dojo.hitch( this, function() {
                     array.forEach( arguments, function( pluginClass, i ) {
                             var pluginName = pluginNames[i];
                             var thisPluginDone = pluginDeferreds[i];
                             if( typeof pluginClass == 'string' ) {
                                 console.error("could not load plugin "+pluginName+": "+pluginClass);
                             } else {
                                 // make the plugin's arguments out of
                                 // its little obj in 'plugins', and
                                 // also anything in the top-level
                                 // conf under its plugin name
                                 var args = dojo.mixin(
                                     dojo.clone( plugins[i] ),
                                     this.config[pluginName]||{});
                                 args.browser = this;
                                 args = dojo.mixin( args, { browser: this } );

                                 // load its css
                                 this._loadCSS(
                                     {url: 'plugins/'+pluginName+'/css/main.css'},
                                     function() {
                                         thisPluginDone.resolve({success:true});
                                     },
                                     function() {
                                         // succeed loading even if the css load failed.  not all plugins necessarily have css
                                         thisPluginDone.resolve({success:true});
                                     }
                                 );

                                 // instantiate the plugin
                                 var plugin = new pluginClass( args );
                                 this.plugins[ pluginName ] = plugin;
                             }
                         }, this );
                  }));
    });

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
            + "  <p>However, JBrowse could not start, either because it has not yet been configured"
            + "     and loaded with data, or because of an error.</p>"
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
    return this._milestoneFunction( 'loadRefSeqs', function( deferred ) {
        // load our ref seqs
        if( typeof this.config.refSeqs == 'string' )
            this.config.refSeqs = { url: this.config.refSeqs };
        dojo.xhrGet(
            {
                url: this.config.refSeqs.url,
                handleAs: 'json',
                load: dojo.hitch( this, function(o) {
                    this.addRefseqs( o );
                    deferred.resolve({success:true});
                }),
                error: dojo.hitch( this, function(e) {
                    this.fatalError('Failed to load reference sequence info: '+e);
                    deferred.resolve({ success: false, error: e });
                })
            });
    });
};

/**
 * Event that fires when the reference sequences have been loaded.
 */
Browser.prototype.onRefSeqsLoaded = function() {};

Browser.prototype.loadUserCSS = function() {
    return this._milestoneFunction( 'loadUserCSS', function( deferred ) {
        if( this.config.css && ! dojo.isArray( this.config.css ) )
            this.config.css = [ this.config.css ];

        var css = this.config.css || [];
        if( ! css.length ) {
            deferred.resolve({success:true});
            return;
        }

        var that = this;
        var cssDeferreds = array.map( css, function( css ) {
            var d = new Deferred();
            that._loadCSS(
                css,
                function() { d.resolve({success:true}); },
                function() { d.resolve({success:false}); }
            );
            return d;
        });

        new DeferredList(cssDeferreds)
            .then( function() { deferred.resolve({success:true}); } );
   });
};

Browser.prototype._loadCSS = function( css, successCallback, errorCallback ) {
        if( typeof css == 'string' ) {
            // if it has '{' in it, it probably is not a URL, but is a string of CSS statements
            if( css.indexOf('{') > -1 ) {
                    dojo.create('style', { "data-from": 'JBrowse Config', type: 'text/css', innerHTML: css }, document.head );
                    successCallback && successCallback();
            }
            // otherwise, it must be a URL
            else {
                css = { url: css };
            }
        }
        if( typeof css == 'object' ) {
            LazyLoad.css( css.url, successCallback );
        }
};

/**
 * Load our name index.
 */
Browser.prototype.loadNames = function() {
    return this._milestoneFunction( 'loadNames', function( deferred ) {
        var conf = dojo.mixin( dojo.clone( this.config.names || {} ),
                               this.config.autocomplete || {} );
        if( ! conf.url )
            conf.url = this.config.nameUrl || 'data/names/';

        if( conf.baseUrl )
            conf.url = Util.resolveUrl( conf.baseUrl, conf.url );

        if( conf.type == 'Hash' )
            this.nameStore = new NamesHashStore( dojo.mixin({ browser: this }, conf) );
        else
            // wrap the older LazyTrieDojoDataStore with
            // dojo.store.DataStore to conform with the dojo/store API
            this.nameStore = new DojoDataStore({
                store: new NamesLazyTrieDojoDataStore({
                    browser: this,
                    namesTrie: new LazyTrie( conf.url, "lazy-{Chunk}.json"),
                    stopPrefixes: conf.stopPrefixes,
                    resultLimit:  conf.resultLimit || 15,
                    tooManyMatchesMessage: conf.tooManyMatchesMessage
                })
            });

        deferred.resolve({success: true});
    });
};

Browser.prototype.initView = function() {
    var thisObj = this;
    return this._milestoneFunction('initView', function( deferred ) {

        //set up top nav/overview pane and main GenomeView pane
        dojo.addClass( this.container, "jbrowse"); // browser container has an overall .jbrowse class
        dojo.addClass( document.body, this.config.theme || "tundra"); //< tundra dijit theme

        var topPane = dojo.create( 'div',{ style: {overflow: 'hidden'}}, this.container );

        // make our top menu bar
        var menuBar = dojo.create(
            'div',
            {
                className: this.config.show_nav ? 'menuBar' : 'topLink'
            }
            );
        thisObj.menuBar = menuBar;
        ( this.config.show_nav ? topPane : this.container ).appendChild( menuBar );

        var overview = dojo.create( 'div', { className: 'overview', id: 'overview' }, topPane );
        this.overviewDiv = overview;
        // overview=0 hides the overview, but we still need it to exist
        if( ! this.config.show_overview )
            overview.style.cssText = "display: none";

        if( this.config.show_nav )
            this.navbox = this.createNavBox( topPane );

        // make our little top-links box with links to help, etc.
        var about = this.browserMeta();
        this.poweredByLink = dojo.create('a', {
            className: 'powered_by',
            innerHTML: about.title,
            onclick: function() {
                new InfoDialog(
                    {
                        title: 'About '+about.title,
                        content: about.description,
                        className: 'about-dialog'
                    }).show();
            },
            title: 'about this browser'
         }, menuBar );

        if( this.config.show_nav ) {

            this.addGlobalMenuItem( 'file',
                                    new dijitMenuItem(
                                        {
                                            label: 'Open',
                                            iconClass: 'dijitIconFolderOpen',
                                            onClick: dojo.hitch( this, 'openFileDialog' )
                                        })
                                  );
            var fileMenu = this.makeGlobalMenu('file');
            if( fileMenu ) {
                var fileButton = new dijitDropDownButton(
                    { className: 'file',
                      innerHTML: 'File',
                      dropDown: fileMenu
                    });
                dojo.addClass( fileButton.domNode, 'menu' );
                menuBar.appendChild( fileButton.domNode );
            }

            this.addGlobalMenuItem( 'tools',
                                    new dijitMenuItem(
                                        {
                                            label: 'Region clustering',
                                            onClick: dojo.hitch( this, 'regionClusteringDialog' )
                                        })
                                   );
            this.renderGlobalMenu( 'tools', { text: 'Tools'}, menuBar );

            this.addGlobalMenuItem( 'view', new dijitMenuItem({
                label: 'Set highlight',
                onClick: function() {
                    new SetHighlightDialog({
                            browser: thisObj,
                            setCallback: dojo.hitch( thisObj, 'setHighlightAndRedraw' )
                        }).show();
                }
            }));
            // make the menu item for clearing the current highlight
            this._highlightClearButton = new dijitMenuItem(
                {
                    label: 'Clear highlight',
                    onClick: dojo.hitch( this, function() {
                                             var h = this.getHighlight();
                                             if( h ) {
                                                 this.clearHighlight();
                                                 this.view.redrawRegion( h );
                                             }
                                         })
                });
            this._updateHighlightClearButton();  //< sets the label and disabled status
            // update it every time the highlight changes
            this.subscribe( '/jbrowse/v1/n/globalHighlightChanged', dojo.hitch( this, '_updateHighlightClearButton' ) );

            this.addGlobalMenuItem( 'view', this._highlightClearButton );

            var viewMenu = this.makeGlobalMenu('view');
            if( viewMenu ) {
                var viewButton = new dijitDropDownButton(
                    { className: 'view',
                      innerHTML: 'View',
                      dropDown: viewMenu
                    });
                dojo.addClass( viewButton.domNode, 'menu' );
                menuBar.appendChild( viewButton.domNode );
            }

            var configMenu = this.makeGlobalMenu('options');
            if( configMenu ) {
                var configLink = new dijitDropDownButton(
                    { className: 'config',
                      innerHTML: '<span class="icon"></span> Options',
                      title: 'configure JBrowse',
                      dropDown: configMenu
                    });
                menuBar.appendChild( configLink.domNode );
           }
        }

        if( this.config.show_nav && this.config.show_tracklist && this.config.show_overview )
            menuBar.appendChild( this.makeShareLink() );
        else
            menuBar.appendChild( this.makeFullViewLink() );

        if( this.config.show_nav )
            menuBar.appendChild( this.makeHelpDialog()   );

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

        // hook up GenomeView
        this.view = this.viewElem.view =
            new GenomeView(this, this.viewElem, 250, this.refSeq, 1/200 );

        dojo.connect( this.view, "onFineMove",   this, "onFineMove"   );
        dojo.connect( this.view, "onCoarseMove", this, "onCoarseMove" );

        this.browserWidget =
            new dijitContentPane({region: "center"}, this.viewElem);
        dojo.connect( this.browserWidget, "resize", this,      'onResize' );
        dojo.connect( this.browserWidget, "resize", this.view, 'onResize' );

        //set initial location
        this.afterMilestone( 'loadRefSeqs', dojo.hitch( this, function() {
            this.afterMilestone( 'initTrackMetadata', dojo.hitch( this, function() {
                this.createTrackList().then( dojo.hitch( this, function() {

                    this.containerWidget.startup();
                    this.onResize();
                    this.view.onResize();

                    // make our global keyboard shortcut handler
                    on( document.body, 'keypress', dojo.hitch( this, 'globalKeyHandler' ));

                    // configure our event routing
                    this._initEventRouting();

                    // done with initView
                    deferred.resolve({ success: true });
               }));
            }));
        }));
    });
};


/**
 * Get object like { title: "title", description: "description", ... }
 * that contains metadata describing this browser.
 */
Browser.prototype.browserMeta = function() {
    var about = this.config.aboutThisBrowser || {};
    about.title = about.title || 'JBrowse';

    var verstring = this.version && this.version.match(/^\d/)
        ? this.version : '(development version)';

    if( about.description ) {
        about.description += '<div class="powered_by">'
            + 'Powered by <a target="_blank" href="http://jbrowse.org">JBrowse '+verstring+'</a>.'
            + '</div>';
    }
    else {
        about.description = '<div class="default_about">'
            + '  <img class="logo" src="img/JBrowseLogo_small.png">'
            + '  <h1>JBrowse '+verstring+'</h1>'
            + '  <div class="tagline">A modern JavaScript genome browser.</div>'
            + '  <a class="mainsite" target="_blank" href="http://jbrowse.org">JBrowse website</a>'
            + '  <div class="gmod">JBrowse is a <a target="_blank" href="http://gmod.org">GMOD</a> project.</div>'
            + '  <div class="copyright">&copy; 2013 The Evolutionary Software Foundation</div>'
            + '</div>';
    }
    return about;
};

/**
 * Track type registry, used by GUI elements that need to offer
 * options regarding selecting track types.  Can register a track
 * type, and get the data structure describing what track types are
 * known.
 */
Browser.prototype.registerTrackType = function( args ) {

    var types = this.getTrackTypes();
    var typeName   = args.type;
    var defaultFor = args.defaultForStoreTypes || [];
    var humanLabel = args.label;

    // add it to known track types
    types.knownTrackTypes.push( typeName );

    // add its label
    if( args.label )
        types.trackTypeLabels[typeName] = args.label;

    // uniqify knownTrackTypes
    var seen = {};
    types.knownTrackTypes = array.filter( types.knownTrackTypes, function( type ) {
        var s = seen[type];
        seen[type] = true;
        return !s;
    });

    // set it as default for the indicated types, if any
    array.forEach( defaultFor, function( storeName ) {
        types.trackTypeDefaults[storeName] = typeName;
    });

    // store the whole structure in this object
    this._knownTrackTypes = types;
};
Browser.prototype.getTrackTypes = function() {
    // create the default types if necessary
    if( ! this._knownTrackTypes )
        this._knownTrackTypes = {
            // map of store type -> default track type to use for the store
            trackTypeDefaults: {
                'JBrowse/Store/SeqFeature/BAM'        : 'JBrowse/View/Track/Alignments2',
                'JBrowse/Store/SeqFeature/NCList'     : 'JBrowse/View/Track/HTMLFeatures',
                'JBrowse/Store/SeqFeature/BigWig'     : 'JBrowse/View/Track/Wiggle/XYPlot',
                'JBrowse/Store/Sequence/StaticChunked': 'JBrowse/View/Track/Sequence',
                'JBrowse/Store/SeqFeature/VCFTabix'   : 'JBrowse/View/Track/HTMLFeatures'
            },

            knownTrackTypes: [
                'JBrowse/View/Track/Alignments',
                'JBrowse/View/Track/Alignments2',
                'JBrowse/View/Track/FeatureCoverage',
                'JBrowse/View/Track/SNPCoverage',
                'JBrowse/View/Track/HTMLFeatures',
                'JBrowse/View/Track/Wiggle/XYPlot',
                'JBrowse/View/Track/Wiggle/Density',
                'JBrowse/View/Track/Sequence'
            ],

            trackTypeLabels: {
            }
        };

    return this._knownTrackTypes;
};



Browser.prototype.openFileDialog = function() {
    new FileDialog({ browser: this })
        .show({
            openCallback: dojo.hitch( this, function( results ) {
                var confs = results.trackConfs || [];
                if( confs.length ) {

                    // tuck away each of the store configurations in
                    // our store configuration, and replace them with
                    // their names.
                    array.forEach( confs, function( conf ) {
                        var storeConf = conf.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.store;
                            var name = this._addStoreConfig( storeConf.name, storeConf );
                            conf.store = name;
                        }
                    },this);

                    // send out a message about how the user wants to create the new tracks
                    this.publish( '/jbrowse/v1/v/tracks/new', confs );

                    // if requested, send out another message that the user wants to show them
                    if( results.trackDisposition == 'openImmediately' )
                        this.publish( '/jbrowse/v1/v/tracks/show', confs );
                }
            })
        });
};

Browser.prototype.regionClusteringDialog = function() {
    new RegionClusteringDialog({ browser: this }).show();
};

Browser.prototype.addTracks = function( confs ) {
    // just register the track configurations right now
    this._addTrackConfigs( confs );
};
Browser.prototype.replaceTracks = function( confs ) {
    // just add-or-replace the track configurations
    this._replaceTrackConfigs( confs );
};
Browser.prototype.deleteTracks = function( confs ) {
    // de-register the track configurations
    this._deleteTrackConfigs( confs );
};


Browser.prototype.makeGlobalMenu = function( menuName ) {
    var items = ( this._globalMenuItems || {} )[menuName] || [];
    if( ! items.length )
        return null;

    var menu = new dijitDropDownMenu({ leftClickToOpen: true });
    dojo.forEach( items, function( item ) {
        menu.addChild( item );
    });
    dojo.addClass( menu.domNode, 'globalMenu' );
    menu.startup();
    return menu;
};

Browser.prototype.addGlobalMenuItem = function( menuName, item ) {
    if( ! this._globalMenuItems )
        this._globalMenuItems = {};
    if( ! this._globalMenuItems[ menuName ] )
        this._globalMenuItems[ menuName ] = [];
    this._globalMenuItems[ menuName ].push( item );
};

/**
 * Initialize our message routing, subscribing to messages, forwarding
 * them around, and so forth.
 *
 * "v" (view)
 *   Requests from the user.  These go only to the browser, which is
 *   the central point forx deciding what to do about them.  This is
 *   usually just forwarding the command as one or more "c" messages.
 *
 * "c" (command)
 *   Commands from authority, like the Browser object.  These cause
 *   things to actually happen in the UI: things to be shown or
 *   hidden, actions taken, and so forth.
 *
 * "n" (notification)
 *   Notification that something just happened.
 *
 * @private
 */
Browser.prototype._initEventRouting = function() {
    var that = this;

    that.subscribe('/jbrowse/v1/v/tracks/hide', function( trackConfigs ) {
        that.publish( '/jbrowse/v1/c/tracks/hide', trackConfigs );
    });
    that.subscribe('/jbrowse/v1/v/tracks/show', function( trackConfigs ) {
        that.addRecentlyUsedTracks( dojo.map(trackConfigs, function(c){ return c.label;}) );
        that.publish( '/jbrowse/v1/c/tracks/show', trackConfigs );
    });

    that.subscribe('/jbrowse/v1/v/tracks/new', function( trackConfigs ) {
        that.addTracks( trackConfigs );
        that.publish( '/jbrowse/v1/c/tracks/new', trackConfigs );
    });
    that.subscribe('/jbrowse/v1/v/tracks/replace', function( trackConfigs ) {
        that.replaceTracks( trackConfigs );
        that.publish( '/jbrowse/v1/c/tracks/replace', trackConfigs );
    });
    that.subscribe('/jbrowse/v1/v/tracks/delete', function( trackConfigs ) {
        that.deleteTracks( trackConfigs );
        that.publish( '/jbrowse/v1/c/tracks/delete', trackConfigs );
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


/**
 * Get a store object from the store registry, loading its code and
 * instantiating it if necessary.
 */
Browser.prototype.getStore = function( storeName, callback ) {
    if( !callback ) throw 'invalid arguments';

    var storeCache = this._storeCache || {};
    this._storeCache = storeCache;

    var storeRecord = storeCache[ storeName ];
    if( storeRecord ) {
        storeRecord.refCount++;
        callback( storeRecord.store );
        return;
    }

    var conf = this.config.stores[storeName];
    if( ! conf ) {
        console.error( "store "+storeName+" not defined" );
        callback( null );
        return;
    }

    var storeClassName = conf.type;
    if( ! storeClassName ) {
        console.warn( "store "+storeName+" has no type defined" );
        callback( null );
        return;
    }

    require( [ storeClassName ], dojo.hitch( this, function( storeClass ) {
                 var storeArgs = {};
                 dojo.mixin( storeArgs, conf );
                 dojo.mixin( storeArgs,
                             {
                                 config: conf,
                                 browser: this,
                                 refSeq: this.refSeq
                             });

                 var store = new storeClass( storeArgs );
                 this._storeCache[ storeName ] = { refCount: 1, store: store };
                 callback( store );
             }));
};

/**
 * Add a store configuration to the browser.  If name is falsy, will
 * autogenerate one.
 * @private
 */
var uniqCounter = 0;
Browser.prototype._addStoreConfig = function( /**String*/ name, /**Object*/ storeConfig ) {
    name = name || 'addStore'+uniqCounter++;

    if( ! this.config.stores )
        this.config.stores = {};
    if( ! this._storeCache )
        this._storeCache = {};

    if( this.config.stores[name] || this._storeCache[name] ) {
        throw "store "+name+" already exists!";
    }

    this.config.stores[name] = storeConfig;
    return name;
};

Browser.prototype.clearStores = function() {
    this._storeCache = {};
};

/**
 * Notifies the browser that the given named store is no longer being
 * used by the calling component.  Decrements the store's reference
 * count, and if the store's reference count reaches zero, the store
 * object will be discarded, to be recreated again later if needed.
 */
// not actually being used yet
Browser.prototype.releaseStore = function( storeName ) {
    var storeRecord = this._storeCache[storeName];
    if( storeRecord && ! --storeRecord.refCount )
        delete this._storeCache[storeName];
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
        'plugins': dojof.keys( this.plugins ).sort().join(','),

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
    return topic.publish.apply( topic, arguments );
};
Browser.prototype.subscribe = function() {
    return topic.subscribe.apply( topic, arguments );
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
 * Run a function that will eventually resolve the named Deferred
 * (milestone).
 * @param {String} name the name of the Deferred
 */
Browser.prototype._milestoneFunction = function( /**String*/ name, func ) {

    var thisB = this;
    var args = Array.prototype.slice.call( arguments, 2 );

    var d = thisB._getDeferred( name );
    args.unshift( d );
    try {
        func.apply( thisB, args ) ;
    } catch(e) {
        console.error(''+e, e.stack);
        d.resolve({ success:false, error: e });
    }

    return d;
};

/**
 * Fetch or create a named Deferred, which is how milestones are implemented.
 */
Browser.prototype._getDeferred = function( name ) {
    if( ! this._deferred )
        this._deferred = {};
    return this._deferred[name] = this._deferred[name] || new Deferred();
};
/**
 * Attach a callback to a milestone.
 */
Browser.prototype.afterMilestone = function( name, func ) {
    return this._getDeferred(name)
        .then( function() {
                   try {
                       func();
                   } catch( e ) {
                       console.error( ''+e, e.stack, e );
                   }
               });
};
/**
 * Indicate that we've reached a milestone in the initalization
 * process.  Will run all the callbacks associated with that
 * milestone.
 */
Browser.prototype.passMilestone = function( name, result ) {
    return this._getDeferred(name).resolve( result );
};
/**
 * Return true if we have reached the named milestone, false otherwise.
 */
Browser.prototype.reachedMilestone = function( name ) {
    return this._getDeferred(name).fired >= 0;
};


/**
 *  Load our configuration file(s) based on the parameters thex
 *  constructor was passed.  Does not return until all files are
 *  loaded and merged in.
 *  @returns nothing meaningful
 */
Browser.prototype.loadConfig = function () {
    return this._milestoneFunction( 'loadConfig', function( deferred ) {
        var c = new ConfigManager({ config: this.config, defaults: this._configDefaults(), browser: this });
        c.getFinalConfig( dojo.hitch(this, function( finishedConfig ) {
                this.config = finishedConfig;

                // pass the tracks configurations through
                // addTrackConfigs so that it will be indexed and such
                var tracks = finishedConfig.tracks || [];
                delete finishedConfig.tracks;
                this._addTrackConfigs( tracks );

                // coerce some config keys to boolean
                dojo.forEach( ['show_tracklist','show_nav','show_overview'], function(v) {
                                  this.config[v] = this._coerceBoolean( this.config[v] );
                              },this);

               // set empty tracks array if we have none
               if( ! this.config.tracks )
                   this.config.tracks = [];

                deferred.resolve({success:true});
        }));
    });
};

/**
 * Add new track configurations.
 * @private
 */
Browser.prototype._addTrackConfigs = function( /**Array*/ configs ) {

    if( ! this.config.tracks )
        this.config.tracks = [];
    if( ! this.trackConfigsByName )
        this.trackConfigsByName = {};

    array.forEach( configs, function(conf){

        // if( this.trackConfigsByName[ conf.label ] ) {
        //     console.warn("track with label "+conf.label+" already exists, skipping");
        //     return;
        // }

        this.trackConfigsByName[conf.label] = conf;
        this.config.tracks.push( conf );

    },this);

    return configs;
};
/**
 * Replace existing track configurations.
 * @private
 */
Browser.prototype._replaceTrackConfigs = function( /**Array*/ newConfigs ) {
    if( ! this.trackConfigsByName )
        this.trackConfigsByName = {};

    array.forEach( newConfigs, function( conf ) {
        if( ! this.trackConfigsByName[ conf.label ] ) {
            console.warn("track with label "+conf.label+" does not exist yet.  creating a new one.");
        }

        this.trackConfigsByName[conf.label] =
                           dojo.mixin( this.trackConfigsByName[ conf.label ] || {}, conf );
   },this);
};
/**
 * Delete existing track configs.
 * @private
 */
Browser.prototype._deleteTrackConfigs = function( configsToDelete ) {
    // remove from this.config.tracks
    this.config.tracks = array.filter( this.config.tracks || [], function( conf ) {
        return ! array.some( configsToDelete, function( toDelete ) {
            return toDelete.label == conf.label;
        });
    });

    // remove from trackConfigsByName
    array.forEach( configsToDelete, function( toDelete ) {
        if( ! this.trackConfigsByName[ toDelete.label ] ) {
            console.warn( "track "+toDelete.label+" does not exist, cannot delete" );
            return;
        }

        delete this.trackConfigsByName[ toDelete.label ];
    },this);
};

Browser.prototype._configDefaults = function() {
    return {
        tracks: [],
        show_tracklist: true,
        show_nav: true,
        show_overview: true
    };
};

/**
 * Coerce a value of unknown type to a boolean, treating string 'true'
 * and 'false' as the values they indicate, and string numbers as
 * numbers.
 * @private
 */
Browser.prototype._coerceBoolean = function(val) {
    if( typeof val == 'string' ) {
        val = val.toLowerCase();
        if( val == 'true' ) {
            return true;
        }
        else if( val == 'false' )
            return false;
        else
            return parseInt(val);
    }
    else if( typeof val == 'boolean' ) {
        return val;
    }
    else if( typeof val == 'number' ) {
        return !!val;
    }
    else {
        return true;
    }
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


Browser.prototype.getCurrentRefSeq = function( name, callback ) {
    return this.refSeq || {};
};

Browser.prototype.getRefSeq = function( name, callback ) {
    if( typeof name != 'string' )
        name = this.refSeqOrder[0];

    callback( this.allRefs[ name ] );
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
        dojo.style( this.locationTrap, {
                        width: (trapRight - trapLeft) + "px",
                        borderBottomWidth: this.view.locationTrapHeight + "px",
                        borderLeftWidth: trapLeft + "px",
                        borderRightWidth: (this.view.overviewBox.w - trapRight) + "px"
        });
    }
};

/**
 * Asynchronously initialize our track metadata.
 */
Browser.prototype.initTrackMetadata = function( callback ) {
    return this._milestoneFunction( 'initTrackMetadata', function( deferred ) {
        var metaDataSourceClasses = dojo.map(
                                    (this.config.trackMetadata||{}).sources || [],
                                    function( sourceDef ) {
                                        var url  = sourceDef.url || 'trackMeta.csv';
                                        var type = sourceDef.type || (
                                                /\.csv$/i.test(url)     ? 'csv'  :
                                                /\.js(on)?$/i.test(url) ? 'json' :
                                                'csv'
                                        );
                                        var storeClass = sourceDef['class']
                                            || { csv: 'dojox/data/CsvStore', json: 'dojox/data/JsonRestStore' }[type];
                                        if( !storeClass ) {
                                            console.error( "No store class found for type '"
                                                           +type+"', cannot load track metadata from URL "+url);
                                            return null;
                                        }
                                        return { class_: storeClass, url: url };
                                    });


        require( Array.prototype.concat.apply( ['JBrowse/Store/TrackMetaData'],
                                               dojo.map( metaDataSourceClasses, function(c) { return c.class_; } ) ),
                 dojo.hitch(this,function( MetaDataStore ) {
                     var mdStores = [];
                     for( var i = 1; i<arguments.length; i++ ) {
                         mdStores.push( new (arguments[i])({url: metaDataSourceClasses[i-1].url}) );
                     }

                     this.trackMetaDataStore =  new MetaDataStore(
                         dojo.mixin( dojo.clone(this.config.trackMetadata || {}), {
                                         trackConfigs: this.config.tracks,
                                         browser: this,
                                         metadataStores: mdStores
                                     })
                     );

                     deferred.resolve({success:true});
        }));
    });
};

/**
 * Asynchronously create the track list.
 * @private
 */
Browser.prototype.createTrackList = function() {
    return this._milestoneFunction('createTrack', function( deferred ) {
        // find the tracklist class to use
        var tl_class = !this.config.show_tracklist           ? 'Null'                         :
                       (this.config.trackSelector||{}).type  ? this.config.trackSelector.type :
                                                               'Simple';
        // load all the classes we need
        require( ['JBrowse/View/TrackList/'+tl_class],
                 dojo.hitch( this, function( trackListClass ) {
                     // instantiate the tracklist and the track metadata object
                     this.trackListView = new trackListClass(
                         dojo.mixin(
                             dojo.clone( this.config.trackSelector ) || {},
                             {
                                 trackConfigs: this.config.tracks,
                                 browser: this,
                                 trackMetaData: this.trackMetaDataStore
                             }
                         )
                     );

                     // bind the 't' key as a global keyboard shortcut
                     this.setGlobalKeyboardShortcut( 't', this.trackListView, 'toggle' );

                     // listen for track-visibility-changing messages from
                     // views and update our tracks cookie
                     this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged', dojo.hitch( this, function() {
                         this.cookie( "tracks",
                                      this.view.visibleTrackNames().join(','),
                                      {expires: 60});
                     }));

                     // figure out what initial track list we will use:
                     //    from a param passed to our instance, or from a cookie, or
                     //    the passed defaults, or the last-resort default of "DNA"?
                     var origTracklist =
                            this.config.forceTracks
                         || this.cookie( "tracks" )
                         || this.config.defaultTracks
                         || "DNA";

                     this.showTracks( origTracklist );

                     deferred.resolve({ success: true });
        }));
    });
};

/**
 * @private
 */

Browser.prototype.onVisibleTracksChanged = function() {
};


/**
 * Like <code>navigateToLocation()</code>, except it attempts to display the given
 * location with a little bit of flanking sequence to each side, if
 * possible.
 */
Browser.prototype.showRegion = function( location ) {
    var flank   = Math.round( ( location.end - location.start ) * 0.2 );
    //go to location, with some flanking region
    this.navigateToLocation({ ref: location.ref,
                               start: location.start - flank,
                               end: location.end + flank
                             });

    // if the location has a track associated with it, show it
    if( location.tracks ) {
        this.showTracks( array.map( location.tracks, function( t ) { return t && (t.label || t.name) || t; } ));
    }
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
    this.afterMilestone( 'completely initialized', dojo.hitch( this, function() {
        // if it's a foo:123..456 location, go there
        var location = typeof loc == 'string' ? Util.parseLocString( loc ) :  loc;
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
                    return;
                } else {
                    // if we don't just go to the middle 80% of that refseq,
                    // based on range that can be viewed (start to end)
                    // rather than total length, in case start != 0 || end != length
                    // this.navigateToLocation({ref: ref.name, start: ref.end*0.1, end: ref.end*0.9 });
                    var visibleLength = ref.end - ref.start;
                    this.navigateToLocation({ref:   ref.name,
                                             start: ref.start + (visibleLength * 0.1),
                                             end:   ref.start + (visibleLength * 0.9) } );
                    return;
                }
            }

            // lastly, try to search our feature names for it
            this.searchNames( loc );
        }
    }));
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
        this._updateLocationCookies( location );

    }
    // if different, we need to poke some other things before going there
    else {
        // record names of open tracks and re-open on new refseq
        var curTracks = this.view.visibleTrackNames();

        this.refSeq = this.allRefs[location.ref];
        this.clearStores();

        this.view.setLocation( this.refSeq,
                               location.start,
                               location.end );
        this._updateLocationCookies( location );

        this.showTracks( curTracks );
    }

    return;
};

/**
 * Given a string name, search for matching feature names and set the
 * view location to any that match.
 */
Browser.prototype.searchNames = function( /**String*/ loc ) {
    var thisB = this;
    this.nameStore.query({ name: loc })
        .then( function( nameMatches ) {

            // if we have no matches, pop up a dialog saying so, and
            // do nothing more
            if( ! nameMatches.length ) {
                new InfoDialog(
                    {
                        title: 'Not found',
                        content: 'Not found: <span class="locString">'+loc+'</span>',
                        className: 'notfound-dialog'
                    }).show();
                return;
            }

            var goingTo;

            //first check for exact case match
            for (var i = 0; i < nameMatches.length; i++) {
                if( nameMatches[i].name  == loc )
                    goingTo = nameMatches[i];
            }
            //if no exact case match, try a case-insentitive match
            if( !goingTo ) {
                for( i = 0; i < nameMatches.length; i++ ) {
                    if( nameMatches[i].name.toLowerCase() == loc.toLowerCase() )
                        goingTo = nameMatches[i];
                }
            }
            //else just pick a match
            if( !goingTo ) goingTo = nameMatches[0];

            // if it has one location, go to it
            if( goingTo.location ) {

                //go to location, with some flanking region
                thisB.showRegionWithHighlight( goingTo.location );
            }
            // otherwise, pop up a dialog with a list of the locations to choose from
            else if( goingTo.multipleLocations ) {
                new LocationChoiceDialog(
                    {
                        browser: thisB,
                        locationChoices: goingTo.multipleLocations,
                        title: 'Choose '+goingTo.name+' location',
                        prompt: '"'+goingTo.name+'" is found in multiple locations.  Please choose a location to view.'
                    })
                    .show();
            }
        }
   );
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
    this.afterMilestone('completely initialized', dojo.hitch( this, function() {
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
        this.publish( '/jbrowse/v1/c/tracks/show', trackConfs );
        this.publish( '/jbrowse/v1/n/tracks/visibleChanged' );
    }));
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
        + '<dd><ul><li>Turn a track on by dragging its track label from the "Available Tracks" area into the genome area.</li>'
        + '        <li>Turn a track off by dragging its track label from the genome area back into the "Available Tracks" area.</li>'
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

    var dialog = new InfoDialog({
        "class": 'help_dialog',
        refocus: false,
        draggable: false,
        title: "JBrowse Help"
    }, helpdiv );

    // make a Help link that will show the dialog and set a handler on it
    var helpButton = new dijitButton(
        {
            className: 'help',
            title: 'Help',
            innerHTML: '<span class="icon"></span> Help',
            onClick: function() { dialog.show(); }
        });

    this.setGlobalKeyboardShortcut( '?', dialog, 'show' );
    dojo.connect( document.body, 'onkeydown', function(evt) {
        if( evt.keyCode != dojo.keys.SHIFT && evt.keyCode != dojo.keys.CTRL && evt.keyCode != dojo.keys.ALT )
            dialog.hide();
    });

    return helpButton.domNode;
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
    // if some digit widget is focused, don't process any global keyboard shortcuts
    if( dijitFocus.curNode )
        return;

    var shortcut = this.globalKeyboardShortcuts[ evt.keyChar || String.fromCharCode( evt.charCode || evt.keyCode ) ];
    if( shortcut ) {
        shortcut.call( this );
        evt.stopPropagation();
    }
};

Browser.prototype.makeShareLink = function () {
    // don't make the link if we were explicitly configured not to
    if( ( 'share_link' in this.config ) && !this.config.share_link )
        return null;

    var browser = this;
    var shareURL = '#';

    // make the share link
    var button = new dijitButton({
            className: 'share',
            innerHTML: '<span class="icon"></span> Share',
            title: 'share this view',
            onClick: function() {
                URLinput.value = shareURL;
                previewLink.href = shareURL;

                sharePane.show();

                var lp = dojo.position( button.domNode );
                dojo.style( sharePane.domNode, {
                               top: (lp.y+lp.h) + 'px',
                               right: 0,
                               left: ''
                            });
                URLinput.focus();
                URLinput.select();
                copyReminder.style.display = 'block';

                return false;
            }
        }
    );

    // make the 'share' popup
    var container = dojo.create(
        'div', {
            innerHTML: 'Paste this link in <b>email</b> or <b>IM</b>'
        });
    var copyReminder = dojo.create('div', {
                                       className: 'copyReminder',
                                       innerHTML: 'Press CTRL-C to copy'
                                   });
    var URLinput = dojo.create(
        'input', {
            type: 'text',
            value: shareURL,
            size: 50,
            readonly: 'readonly',
            onclick: function() { this.select();  copyReminder.style.display = 'block'; },
            onblur: function() { copyReminder.style.display = 'none'; }
        });
    var previewLink = dojo.create('a', {
        innerHTML: 'Preview',
        target: '_blank',
        href: shareURL,
        style: { display: 'block', "float": 'right' }
    }, container );
    var sharePane = new dijitDialog(
        {
            className: 'sharePane',
            title: 'Share this view',
            draggable: false,
            content: [
                container,
                URLinput,
                copyReminder
            ],
            autofocus: false
        });

    // connect moving and track-changing events to update it
    var updateShareURL = function() {
        shareURL = browser.makeCurrentViewURL();
        if( browser.config.updateBrowserURL && window.history && window.history.replaceState )
            window.history.replaceState( {},"", shareURL );
    };
    dojo.connect( this, "onCoarseMove",                     updateShareURL );
    this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged',  updateShareURL );
    this.subscribe( '/jbrowse/v1/n/globalHighlightChanged', updateShareURL );

    return button.domNode;
};

/**
 * Return a string URL that encodes the complete viewing state of the
 * browser.  Currently just data dir, visible tracks, and visible
 * region.
 */
Browser.prototype.makeCurrentViewURL = function() {
    var t = typeof this.config.shareURL;

    if( t == 'function' ) {
        return this.config.shareURL.call( this, this );
    }
    else if( t == 'string' ) {
        return this.config.shareURL;
    }

    return "".concat(
        window.location.protocol,
        "//",
        window.location.host,
        window.location.pathname,
        "?",
        dojo.objectToQuery(
            {
                loc:    this.view.visibleRegionLocString(),
                tracks: this.view.visibleTrackNames().join(','),
                data:   (this.config.queryParams||{}).data,
                highlight: (this.getHighlight()||'').toString()
            })
    );
}

Browser.prototype.makeFullViewLink = function () {
    var thisB = this;
    // make the link
    var link = dojo.create('a', {
        className: 'topLink',
        href: window.location.href,
        target: '_blank',
        title: 'View in full browser',
        innerHTML: 'Full view'
    });

    // update it when the view is moved or tracks are changed
    var update_link = function() {
        link.href = thisB.makeCurrentViewURL();
    };
    dojo.connect( this, "onCoarseMove",                     update_link );
    this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged',  update_link );
    this.subscribe( '/jbrowse/v1/n/globalHighlightChanged', update_link );

    return link;
};

/**
 * @private
 */

Browser.prototype.onCoarseMove = function(startbp, endbp) {

    this._updateLocationThumb();

    var currRegion = { start: startbp, end: endbp, ref: this.refSeq.name };

    // update the location box with our current location
    if( this.locationBox ) {
        this.locationBox.set(
            'value',
            Util.assembleLocStringWithLength( currRegion ),
            false //< don't fire any onchange handlers
        );
        this.goButton.set( 'disabled', true ) ;
    }
    // also update the refseq selection dropdown if present
    if( this.refSeqSelectBox )
        this.refSeqSelectBox.set( 'value', this.refSeq.name, false );

    if( this.reachedMilestone('completely initialized') ) {
        this._updateLocationCookies( currRegion );
        document.title = Util.assembleLocString( currRegion );
    }

    // send out a message notifying of the move
    this.publish( '/jbrowse/v1/n/navigate', currRegion );
};

Browser.prototype._updateLocationThumb = function() {
    var startbp = this.view.minVisible();
    var endbp = this.view.maxVisible();

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
};

/**
 * update the location and refseq cookies
 */
Browser.prototype._updateLocationCookies = function( location ) {
    var locString = typeof location == 'string' ? location : Util.assembleLocString( location );
    var oldLocMap = dojo.fromJson( this.cookie('location') ) || { "_version": 1 };
    if( ! oldLocMap["_version"] )
        oldLocMap = this._migrateLocMap( oldLocMap );
    oldLocMap[this.refSeq.name] = { l: locString, t: Math.round( (new Date()).getTime() / 1000 ) - 1340211510 };
    oldLocMap = this._limitLocMap( oldLocMap, this.config.maxSavedLocations || 10 );
    this.cookie( 'location', dojo.toJson(oldLocMap), {expires: 60});
    this.cookie( 'refseq', this.refSeq.name );
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

Browser.prototype.createNavBox = function( parent ) {
    var browserRoot = this.config.browserRoot ? this.config.browserRoot : "";

    var navbox = dojo.create( 'div', { id: 'navbox', style: { 'text-align': 'center' } }, parent );

    this.locationTrap = dojo.create('div', {className: 'locationTrap'}, navbox );

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

    // if we have fewer than 30 ref seqs, or `refSeqDropdown: true` is
    // set in the config, then put in a dropdown box for selecting
    // reference sequences
    var refSeqSelectBoxPlaceHolder = dojo.create('span', {}, navbox );

    // make the location box
    this.locationBox = new dijitComboBox(
        {
            id: "location",
            name: "location",
            style: { width: '25ex' },
            maxLength: 400,
            searchAttr: "name"
        },
        dojo.create('input', {}, navbox) );
    this.afterMilestone( 'loadNames', dojo.hitch(this, function() {
        if( this.nameStore )
            this.locationBox.set( 'store', this.nameStore );
    }));

    this.locationBox.focusNode.spellcheck = false;
    dojo.query('div.dijitArrowButton', this.locationBox.domNode ).orphan();
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
         var oldOnClick = dropDownProto.onClick;
         dropDownProto.onClick = function( node ) {
             if( dojo.hasClass(node, 'moreMatches' ) )
                 return null;
             return oldOnClick.apply( this, arguments );
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


    this.afterMilestone('loadRefSeqs', dojo.hitch( this, function() {
        if( this.refSeqOrder.length && this.refSeqOrder.length < 30 || this.config.refSeqDropdown ) {
            this.refSeqSelectBox = new dijitSelectBox({
                name: 'refseq',
                value: this.refSeq ? this.refSeq.name : null,
                options: array.map( this.refSeqOrder || [],
                                    function( refseqName ) {
                    return { label: refseqName, value: refseqName };
                }),
                onChange: dojo.hitch(this, function( newRefName ) {
                    if (newRefName !== this.refSeq.name) {  //  only trigger navigation if actually switching sequences
                        this.navigateTo(newRefName);
                    }
                })
            }).placeAt( refSeqSelectBoxPlaceHolder );
        }

        // calculate how big to make the location box:  make it big enough to hold the
        var locLength = this.config.locationBoxLength || function() {

            // if we have no refseqs, just use 20 chars
            if( ! this.refSeqOrder.length )
                return 20;

            // if there are not tons of refseqs, pick the longest-named
            // one.  otherwise just pick the last one
            var ref = this.refSeqOrder.length < 1000
                && function() {
                       var longestNamedRef;
                       array.forEach( this.refSeqOrder, function(name) {
                                          var ref = this.allRefs[name];
                                          if( ! ref.length )
                                              ref.length = ref.end - ref.start + 1;
                                          if( ! longestNamedRef || longestNamedRef.length < ref.length )
                                              longestNamedRef = ref;
                                      }, this );
                       return longestNamedRef;
                   }.call(this)
                || this.refSeqOrder.length && this.allRefs[ this.refSeqOrder[ this.refSeqOrder.length - 1 ] ]
                || 20;

            var locstring = Util.assembleLocStringWithLength({ ref: ref.name, start: ref.end-1, end: ref.end, length: ref.length });
            //console.log( locstring, locstring.length );
            return locstring.length;
        }.call(this) || 20;


        this.locationBox.domNode.style.width = locLength+'ex';
    }));

    return navbox;
};

/**
 * Return the current highlight region, or null if none.
 */
Browser.prototype.getHighlight = function() {
    return this._highlight || null;
};

/**
 * Set a new highlight.  Returns the new highlight.
 */
Browser.prototype.setHighlight = function( newHighlight ) {

    if( newHighlight && ( newHighlight instanceof Location ) )
        this._highlight = newHighlight;
    else if( newHighlight )
        this._highlight = new Location( newHighlight );

    this.publish( '/jbrowse/v1/n/globalHighlightChanged', [this._highlight] );

    return this.getHighlight();
};


Browser.prototype._updateHighlightClearButton = function() {
    if( this._highlightClearButton ) {
        this._highlightClearButton.set( 'disabled', !!! this._highlight );
        //this._highlightClearButton.set( 'label', 'Clear highlight' + ( this._highlight ? ' - ' + this._highlight : '' ));
    }
};


Browser.prototype.clearHighlight = function() {
    if( this._highlight ) {
        delete this._highlight;
        this.publish( '/jbrowse/v1/n/globalHighlightChanged', [] );
    }
};

Browser.prototype.setHighlightAndRedraw = function( location ) {
    var oldHighlight = this.getHighlight();
    if( oldHighlight )
        this.view.hideRegion( oldHighlight );
    this.view.hideRegion( location );
    this.setHighlight( location );
    this.view.showVisibleBlocks( false );
};

/**
 * Clears the old highlight if necessary, sets the given new
 * highlight, and updates the display to show the highlighted location.
 */
Browser.prototype.showRegionWithHighlight = function( location ) {
    var oldHighlight = this.getHighlight();
    if( oldHighlight )
        this.view.hideRegion( oldHighlight );
    this.view.hideRegion( location );
    this.setHighlight( location );
    this.showRegion( location );
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
