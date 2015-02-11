var _gaq = _gaq || []; // global task queue for Google Analytics

define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/on',
            'dojo/keys',
            'dojo/Deferred',
            'dojo/DeferredList',
            'dojo/topic',
            'dojo/aspect',
            'dojo/request',
            'JBrowse/has',
            'dojo/_base/array',
            'dijit/layout/ContentPane',
            'dijit/layout/BorderContainer',
            'dijit/Dialog',
            'dijit/form/ComboBox',
            'dijit/form/Button',
            'dijit/form/Select',
            'dijit/form/ToggleButton',
            'dijit/form/DropDownButton',
            'dijit/DropDownMenu',
            'dijit/MenuItem',
            'dojox/form/TriStateCheckBox',
            'JBrowse/Util',
            'JBrowse/Store/LazyTrie',
            'JBrowse/Store/Names/LazyTrieDojoData',
            'dojo/store/DataStore',
            'JBrowse/FeatureFiltererMixin',
            'JBrowse/GenomeView',
            'JBrowse/TouchScreenSupport',
            'JBrowse/ConfigManager',
            'JBrowse/View/InfoDialog',
            'JBrowse/View/FileDialog',
            'JBrowse/Model/Location',
            'JBrowse/View/LocationChoiceDialog',
            'JBrowse/View/Dialog/SetHighlight',
            'JBrowse/View/Dialog/SetTrackHeight',
            'JBrowse/View/Dialog/QuickHelp',
            'JBrowse/View/StandaloneDatasetList',
            'dijit/focus',
            'lazyload', // for dynamic CSS loading
            'dojo/domReady!'
        ],
        function(
            declare,
            lang,
            on,
            keys,
            Deferred,
            DeferredList,
            topic,
            aspect,
            request,
            has,
            array,
            dijitContentPane,
            dijitBorderContainer,
            dijitDialog,
            dijitComboBox,
            dijitButton,
            dijitSelectBox,
            dijitToggleButton,
            dijitDropDownButton,
            dijitDropDownMenu,
            dijitMenuItem,
            dojoxTriStateCheckBox,
            Util,
            LazyTrie,
            NamesLazyTrieDojoDataStore,
            DojoDataStore,
            FeatureFiltererMixin,
            GenomeView,
            Touch,
            ConfigManager,
            InfoDialog,
            FileDialog,
            Location,
            LocationChoiceDialog,
            SetHighlightDialog,
            SetTrackHeightDialog,
            HelpDialog,
            StandaloneDatasetList,
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

return declare( FeatureFiltererMixin, {

constructor: function(params) {
    this.globalKeyboardShortcuts = {};

    this.config = params || {};

    // if we're in the unit tests, stop here and don't do any more initialization
    if( this.config.unitTestMode )
        return;

    this.startTime = new Date();

    // start the initialization process
    var thisB = this;
    dojo.addOnLoad( function() {
        thisB.loadConfig().then( function() {

            thisB.container = dojo.byId( thisB.config.containerID );
            thisB.container.onselectstart = function() { return false; };

            // initialize our highlight if one was set in the config
            if( thisB.config.initialHighlight && thisB.config.initialHighlight != "/" )
                thisB.setHighlight( new Location( thisB.config.initialHighlight ) );

            thisB.loadNames();
            thisB.initPlugins().then( function() {
                thisB.loadUserCSS().then( function() {

                    thisB.initTrackMetadata();
                    thisB.loadRefSeqs().then( function() {

                       // figure out our initial location
                       var initialLocString = thisB._initialLocation();
                       var initialLoc = Util.parseLocString( initialLocString );
                       if (initialLoc && initialLoc.ref && thisB.allRefs[initialLoc.ref]) {
                           thisB.refSeq = thisB.allRefs[initialLoc.ref];
                       }

                       thisB.initView().then( function() {
                           Touch.loadTouch(); // init touch device support
                           if( initialLocString )
                               thisB.navigateTo( initialLocString );

                           // figure out what initial track list we will use:
                           var tracksToShow = [];
                           // always add alwaysOnTracks, regardless of any other track params                   
                           if (thisB.config.alwaysOnTracks) { tracksToShow = tracksToShow.concat(thisB.config.alwaysOnTracks.split(",")); }
                           // add tracks specified in URL track param, 
                           //    if no URL track param then add last viewed tracks via tracks cookie
                           //    if no URL param and no tracks cookie, then use defaultTracks 
                           if (thisB.config.forceTracks)   { tracksToShow = tracksToShow.concat(thisB.config.forceTracks.split(",")); } 
                           else if (thisB.cookie("tracks")) { tracksToShow = tracksToShow.concat(thisB.cookie("tracks").split(",")); }
                           else if (thisB.config.defaultTracks) { tracksToShow = tracksToShow.concat(thisB.config.defaultTracks.split(",")); }
                           // currently, force "DNA" _only_ if no other guides as to what to show?
                           //    or should this be changed to always force DNA to show?
                           if (tracksToShow.length == 0) { tracksToShow.push("DNA"); }
                           // eliminate track duplicates (may have specified in both alwaysOnTracks and defaultTracks)
                           tracksToShow = Util.uniq(tracksToShow);
                           thisB.showTracks( tracksToShow );

                           thisB.passMilestone( 'completely initialized', { success: true } );
                       });
                       thisB.reportUsageStats();
                    });
                });
            });
        });
    });
},

_initialLocation: function() {
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
},

version: function() {
    // when a build is put together, the build system assigns a string
    // to the variable below.
    var BUILD_SYSTEM_JBROWSE_VERSION;
    return BUILD_SYSTEM_JBROWSE_VERSION || 'development';
}.call(),


/**
 * Get a plugin, if it is present.  Note that, if plugin
 * initialization is not yet complete, it may be a while before the
 * callback is called.
 *
 * Callback is called with one parameter, the desired plugin object,
 * or undefined if it does not exist.
 */
getPlugin: function( name, callback ) {
    this.afterMilestone( 'initPlugins', dojo.hitch( this, function() {
        callback( this.plugins[name] );
    }));
},

_corePlugins: function() {
    return [ 'RegexSequenceSearch' ];
},

/**
 * Load and instantiate any plugins defined in the configuration.
 */
initPlugins: function() {
    return this._milestoneFunction( 'initPlugins', function( deferred ) {
        this.plugins = {};

        var plugins = this.config.plugins || this.config.Plugins || {};

        // coerce plugins to array of objects
        if( ! lang.isArray(plugins) && ! plugins.name ) {
            // plugins like  { Foo: {...}, Bar: {...} }
            plugins = function() {
                var newplugins = [];
                for( var pname in plugins ) {
                    if( !( 'name' in plugins[pname] ) ) {
                        plugins[pname].name = pname;
                    }
                    newplugins.push( plugins[pname] );
                }
                return newplugins;
            }.call(this);
        }
        if( ! lang.isArray( plugins ) )
            plugins = [ plugins ];

        plugins.unshift.apply( plugins, this._corePlugins() );

        // coerce string plugin names to {name: 'Name'}
        plugins = array.map( plugins, function( p ) {
            return typeof p == 'object' ? p : { 'name': p };
        });

        if( ! plugins ) {
            deferred.resolve({success: true});
            return;
        }

        // set default locations for each plugin
        array.forEach( plugins, function(p) {
            if( !( 'location' in p ))
                p.location = 'plugins/'+p.name;

            var resolved = this.resolveUrl( p.location );

            // figure out js path
            if( !( 'js' in p ))
                p.js = p.location+"/js"; //URL resolution for this is taken care of by the JS loader
            if( p.js.charAt(0) != '/' && ! /^https?:/i.test( p.js ) )
                p.js = '../'+p.js;

            // figure out css path
            if( !( 'css' in p ))
                p.css = resolved+"/css";
        },this);

        var pluginDeferreds = array.map( plugins, function(p) {
            return new Deferred();
        });

        // fire the "all plugins done" deferred when all of the plugins are done loading
        (new DeferredList( pluginDeferreds ))
            .then( function() { deferred.resolve({success: true}); });

        require( {
                     packages: array.map( plugins, function(p) {
                                              return {
                                                  name: p.name,
                                                  location: p.js
                                              };
                                          }, this )
                 },
                 array.map( plugins, function(p) { return p.name; } ),
                 dojo.hitch( this, function() {
                     array.forEach( arguments, function( pluginClass, i ) {
                             var plugin = plugins[i];
                             var thisPluginDone = pluginDeferreds[i];
                             if( typeof pluginClass == 'string' ) {
                                 console.error("could not load plugin "+plugin.name+": "+pluginClass);
                             } else {
                                 // make the plugin's arguments out of
                                 // its little obj in 'plugins', and
                                 // also anything in the top-level
                                 // conf under its plugin name
                                 var args = dojo.mixin(
                                     dojo.clone( plugins[i] ),
                                     { config: this.config[ plugin.name ]||{} });
                                 args.browser = this;
                                 args = dojo.mixin( args, { browser: this } );

                                 // load its css
                                 var cssLoaded = this._loadCSS(
                                     { url: plugin.css+'/main.css' }
                                 );
                                 cssLoaded.then( function() {
                                     thisPluginDone.resolve({success:true});
                                 });

                                 // give the plugin access to the CSS
                                 // promise so it can know when its
                                 // CSS is ready
                                 args.cssLoaded = cssLoaded;

                                 // instantiate the plugin
                                 this.plugins[ plugin.name ] = new pluginClass( args );
                             }
                         }, this );
                  }));
    });
},

/**
 * Resolve a URL relative to the browserRoot.
 */
resolveUrl: function( url ) {
    var browserRoot = this.config.browserRoot || "";
    if( browserRoot && browserRoot.charAt( browserRoot.length - 1 ) != '/' )
        browserRoot += '/';

    return Util.resolveUrl( browserRoot, url );
},

/**
 * Main error handler.  Displays links to configuration help or a
 * dataset selector in the main window.  Called when the main browser
 * cannot run at all, because of configuration errors or whatever.
 */
fatalError: function( error ) {

    function formatError(error) {
        if( error ) {
            console.error( error.stack || ''+error );
            error = error+'';
            if( ! /\.$/.exec(error) )
                error = error + '.';
        }
        return error;
    }

    if( ! this.renderedFatalErrors ) {
        // if the error is just that there are no ref seqs defined,
        // and there are datasets defined in the conf file, then just
        // show a little HTML list of available datasets
        if( /^Could not load reference sequence/.test( error )
            && this.config.datasets
            && ! this.config.datasets._DEFAULT_EXAMPLES
          ) {
            new StandaloneDatasetList({ datasets: this.config.datasets })
                  .placeAt( this.container );
        } else {
            var container = this.container || document.body;
            container.innerHTML = ''
                + '<div class="fatal_error">'
                + '  <h1>Congratulations, JBrowse is on the web!</h1>'
                + "  <p>However, JBrowse could not start, either because it has not yet been configured"
                + "     and loaded with data, or because of an error.</p>"
                + "  <p style=\"font-size: 110%; font-weight: bold\">If this is your first time running JBrowse, <a title=\"View the tutorial\" href=\"docs/tutorial/\" target=\"_blank\">click here to follow the Quick-start Tutorial to show your data in JBrowse.</a></p>"
                + '  <p id="volvox_data_placeholder"></p>'
                + "  <p>Otherwise, please refer to the following resources for help in setting up JBrowse to show your data.</p>"
                + '  <ul><li><a target="_blank" href="docs/tutorial/">Quick-start tutorial</a> - get your data visible quickly with minimum fuss</li>'
                + '      <li><a target="_blank" href="http://gmod.org/wiki/JBrowse_Configuration_Guide">JBrowse Configuration Guide</a> - a comprehensive reference</li>'
                + '      <li><a target="_blank" href="http://gmod.org/wiki/JBrowse">JBrowse wiki main page</a></li>'
                + '      <li><a target="_blank" href="docs/config.html"><code>biodb-to-json.pl</code> configuration reference</a></li>'
                + '      <li><a target="_blank" href="docs/featureglyphs.html">HTMLFeatures CSS class reference</a> - prepackaged styles (CSS classes) for HTMLFeatures tracks</li>'
                + '  </ul>'
                + '  <div id="fatal_error_list" class="errors"> <h2>Error message(s):</h2>'
                + ( error ? '<div class="error"> '+formatError(error)+'</div>' : '' )
                + '  </div>'
                + '</div>'
                ;
            request( 'sample_data/json/volvox/successfully_run' )
            .then( function() {
                       try {
                           document.getElementById('volvox_data_placeholder')
                               .innerHTML = 'However, it appears you have successfully run <code>./setup.sh</code>, so you can see the <a href="?data=sample_data/json/volvox" target="_blank">Volvox test data here</a>.';
                       } catch(e) {}
                   });

            this.renderedFatalErrors = true;
        }
    } else {
        var errors_div = dojo.byId('fatal_error_list') || document.body;
        dojo.create('div', { className: 'error', innerHTML: formatError(error)+'' }, errors_div );
    }
},

loadRefSeqs: function() {
    return this._milestoneFunction( 'loadRefSeqs', function( deferred ) {
        // load our ref seqs
        if( typeof this.config.refSeqs == 'string' )
            this.config.refSeqs = { url: this.config.refSeqs };
        var thisB = this;
        request(this.config.refSeqs.url, { handleAs: 'text' } )
            .then( function(o) {
                       thisB.addRefseqs( dojo.fromJson(o) );
                       deferred.resolve({success:true});
                   },
                   function( e ) {
                       deferred.reject( 'Could not load reference sequence definitions. '+e );
                   }
                 );
    });
},

loadUserCSS: function() {
    return this._milestoneFunction( 'loadUserCSS', function( deferred ) {
        if( this.config.css && ! lang.isArray( this.config.css ) )
            this.config.css = [ this.config.css ];

        var css = this.config.css || [];
        if( ! css.length ) {
            deferred.resolve({success:true});
            return;
        }

        var that = this;
        var cssDeferreds = array.map( css, function( css ) {
            return that._loadCSS( css );
        });

        new DeferredList(cssDeferreds)
            .then( function() { deferred.resolve({success:true}); } );
   });
},

_loadCSS: function( css ) {
    var deferred = new Deferred();
    if( typeof css == 'string' ) {
        // if it has '{' in it, it probably is not a URL, but is a string of CSS statements
        if( css.indexOf('{') > -1 ) {
            dojo.create('style', { "data-from": 'JBrowse Config', type: 'text/css', innerHTML: css }, document.head );
            deferred.resolve(true);
        }
        // otherwise, it must be a URL
        else {
            css = { url: css };
        }
    }
    if( typeof css == 'object' ) {
        LazyLoad.css( css.url, function() { deferred.resolve(true); } );
    }
    return deferred;
},

/**
 * Load our name index.
 */
loadNames: function() {
    return this._milestoneFunction( 'loadNames', function( deferred ) {
        var conf = dojo.mixin( dojo.clone( this.config.names || {} ),
                               this.config.autocomplete || {} );
        if( ! conf.url )
            conf.url = this.config.nameUrl || 'data/names/';

        if( conf.baseUrl )
            conf.url = Util.resolveUrl( conf.baseUrl, conf.url );

        var type;
        if(( type = conf.type )) {
            var thisB = this;
            if( type.indexOf('/') == -1 )
                type = 'JBrowse/Store/Names/'+type;
            require ([type], function (CLASS){
                thisB.nameStore = new CLASS( dojo.mixin({ browser: thisB }, conf) );
                deferred.resolve({success: true});
            });
        }
        // no name type setting, must be the legacy store
        else {
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
        }
    });
},

/**
 * Compare two reference sequence names, returning -1, 0, or 1
 * depending on the result.  Case insensitive, insensitive to the
 * presence or absence of prefixes like 'chr', 'chrom', 'ctg',
 * 'contig', 'scaffold', etc
 */
compareReferenceNames: function( a, b ) {
    return this.regularizeReferenceName(a).localeCompare( this.regularizeReferenceName( b ) );
},

/**
 * Regularize the reference sequence name in a location.
 */
regularizeLocation: function( location ) {
    var ref = this.findReferenceSequence( location.ref || location.objectName );
    if( ref )
        location.ref = ref.name;
    return location;
},

regularizeReferenceName: function( refname ) {

    if( this.config.exactReferenceSequenceNames )
        return refname;

    refname = refname.toLowerCase()
                     .replace(/^chro?m?(osome)?/,'chr')
                     .replace(/^co?n?ti?g/,'ctg')
                     .replace(/^scaff?o?l?d?/,'scaffold')
                     .replace(/^([a-z]*)0+/,'$1')
                     .replace(/^(\d+)$/, 'chr$1' );

    return refname;
},

initView: function() {
    var thisObj = this;
    return this._milestoneFunction('initView', function( deferred ) {

        //set up top nav/overview pane and main GenomeView pane
        dojo.addClass( this.container, "jbrowse"); // browser container has an overall .jbrowse class
        dojo.addClass( document.body, this.config.theme || "tundra"); //< tundra dijit theme

        var topPane = dojo.create( 'div',{ style: {overflow: 'hidden'}}, this.container );

        var about = this.browserMeta();
        var aboutDialog = new InfoDialog(
            {
                title: 'About '+about.title,
                content: about.description,
                className: 'about-dialog'
            });


        // make our top menu bar
        var menuBar = dojo.create(
            'div',
            {
                className: this.config.show_nav ? 'menuBar' : 'topLink'
            }
            );
        thisObj.menuBar = menuBar;
        if( this.config.show_menu ) {
            ( this.config.show_nav ? topPane : this.container ).appendChild( menuBar );
        }

        var overview = dojo.create( 'div', { className: 'overview', id: 'overview' }, topPane );
        this.overviewDiv = overview;
        // overview=0 hides the overview, but we still need it to exist
        if( ! this.config.show_overview )
            overview.style.cssText = "display: none";

        if( this.config.show_nav ) {
            this.navbox = this.createNavBox( topPane );

            if( this.config.datasets && ! this.config.dataset_id ) {
                console.warn("In JBrowse configuration, datasets specified, but dataset_id not set.  Dataset selector will not be shown.");
            }
            if( this.config.datasets && this.config.dataset_id ) {
                this.renderDatasetSelect( menuBar );
            } else {

                this.poweredByLink = dojo.create('a', {
                                className: 'powered_by',
                                innerHTML: this.browserMeta().title,
                                title: 'powered by JBrowse'
                            }, menuBar );
                thisObj.poweredBy_clickHandle = dojo.connect(this.poweredByLink, "onclick", dojo.hitch( aboutDialog, 'show') );
            }

            // make the file menu
            this.addGlobalMenuItem( 'file',
                                    new dijitMenuItem(
                                        {
                                            id: 'menubar_fileopen', 
                                            label: 'Open',
                                            iconClass: 'dijitIconFolderOpen',
                                            onClick: dojo.hitch( this, 'openFileDialog' )
                                        })
                                  );

            this.fileDialog = new FileDialog({ browser: this });

            this.addGlobalMenuItem( 'file', new dijitMenuItem(
                {
                    id: 'menubar_combotrack', 
                    label: 'Add combination track',
                    iconClass: 'dijitIconSample',
                    onClick: dojo.hitch(this, 'createCombinationTrack')
                }));

            this.renderGlobalMenu( 'file', {text: 'File'}, menuBar );

            // make the view menu
            this.addGlobalMenuItem( 'view', new dijitMenuItem({
                id: 'menubar_sethighlight', 
                label: 'Set highlight',
                iconClass: 'dijitIconFilter',
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
                    id: 'menubar_clearhighlight',
                    label: 'Clear highlight',
                    iconClass: 'dijitIconFilter',
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
            this.subscribe( '/jbrowse/v1/n/globalHighlightChanged',
                            dojo.hitch( this, '_updateHighlightClearButton' ) );

            this.addGlobalMenuItem( 'view', this._highlightClearButton );

            // add a global menu item for resizing all visible quantitative tracks
            this.addGlobalMenuItem( 'view', new dijitMenuItem({
                label: 'Resize quant. tracks',
                id: 'menubar_settrackheight',
                title: 'Set all visible quantitative tracks to a new height',
                iconClass: 'jbrowseIconVerticalResize',
                onClick: function() {
                    new SetTrackHeightDialog({
                        setCallback: function( height ) {
                            var tracks = thisObj.view.visibleTracks();
                            array.forEach( tracks, function( track ) {
                                // operate only on XYPlot or Density tracks
                                if( ! /\b(XYPlot|Density)/.test( track.config.type ) )
                                    return;

                                track.trackHeightChanged=true;
                                track.updateUserStyles({ height: height });
                            });
                        }
                    }).show();
                }
            }));

            this.renderGlobalMenu( 'view', {text: 'View'}, menuBar );

            // make the options menu
            this.renderGlobalMenu( 'options', { text: 'Options', title: 'configure JBrowse' }, menuBar );
        }

        if( this.config.show_nav ) {
            // make the help menu
            this.addGlobalMenuItem( 'help',
                                    new dijitMenuItem(
                                        {
                                            id: 'menubar_about', 
                                            label: 'About',
                                            //iconClass: 'dijitIconFolderOpen',
                                            onClick: dojo.hitch( aboutDialog, 'show' )
                                        })
                                  );

            function showHelp() {
                new HelpDialog( lang.mixin(thisObj.config.quickHelp || {}, { browser: thisObj } )).show();
            }
            this.setGlobalKeyboardShortcut( '?', showHelp );
            this.addGlobalMenuItem( 'help',
                                    new dijitMenuItem(
                                        {
                                            id: 'menubar_generalhelp', 
                                            label: 'General',
                                            iconClass: 'jbrowseIconHelp',
                                            onClick: showHelp
                                        })
                                  );

            this.renderGlobalMenu( 'help', {}, menuBar );
        }

        if( this.config.show_nav && this.config.show_tracklist && this.config.show_overview ) {
            var shareLink = this.makeShareLink();
            if (shareLink) { menuBar.appendChild( shareLink ); }
        }
        else
            menuBar.appendChild( this.makeFullViewLink() );


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
            new GenomeView(
                { browser: this,
                  elem: this.viewElem,
                  config: this.config.view,
                  stripeWidth: 250,
                  refSeq: this.refSeq,
                  zoomLevel: 1/200
                });

        dojo.connect( this.view, "onFineMove",   this, "onFineMove"   );
        dojo.connect( this.view, "onCoarseMove", this, "onCoarseMove" );

        this.browserWidget =
            new dijitContentPane({region: "center"}, this.viewElem);
        dojo.connect( this.browserWidget, "resize", this,      'onResize' );
        dojo.connect( this.browserWidget, "resize", this.view, 'onResize' );

        //connect events to update the URL in the location bar
        function updateLocationBar() {
            var shareURL = thisObj.makeCurrentViewURL();
            if( thisObj.config.updateBrowserURL && window.history && window.history.replaceState )
                window.history.replaceState( {},"", shareURL );
            document.title = thisObj.browserMeta().title + ' ' + thisObj.view.visibleRegionLocString();
        };
        dojo.connect( this, "onCoarseMove",                     updateLocationBar );
        this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged',  updateLocationBar );
        this.subscribe( '/jbrowse/v1/n/globalHighlightChanged', updateLocationBar );

        //set initial location
        this.afterMilestone( 'loadRefSeqs', dojo.hitch( this, function() {
            this.afterMilestone( 'initTrackMetadata', dojo.hitch( this, function() {
                this.createTrackList().then( dojo.hitch( this, function() {

                    this.containerWidget.startup();
                    this.onResize();

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
},

createCombinationTrack: function() {
    if(this._combinationTrackCount === undefined) this._combinationTrackCount = 0;
    var d = new Deferred();
    var storeConf = {
        browser: this,
        refSeq: this.refSeq,
        type: 'JBrowse/Store/SeqFeature/Combination'
    };
    var storeName = this.addStoreConfig(undefined, storeConf);
    storeConf.name = storeName;
    this.getStore(storeName, function(store) {
        d.resolve(true);
    });
    var thisB = this;
    d.promise.then(function(){
        var combTrackConfig = {
            type: 'JBrowse/View/Track/Combination',
            label: "combination_track" + (thisB._combinationTrackCount++),
            key: "Combination Track " + (thisB._combinationTrackCount),
            metadata: {Description: "Drag-and-drop interface that creates a track out of combinations of other tracks."},
            store: storeName
        };
        // send out a message about how the user wants to create the new tracks
        thisB.publish( '/jbrowse/v1/v/tracks/new', [combTrackConfig] );

        // Open the track immediately
        thisB.publish( '/jbrowse/v1/v/tracks/show', [combTrackConfig] );
    });
},

renderDatasetSelect: function( parent ) {
    var dsconfig = this.config.datasets || {};
    var datasetChoices = [];
    for( var id in dsconfig ) {
        if( ! /^_/.test(id) )
            datasetChoices.push( dojo.mixin({ id: id }, dsconfig[id] ) );
    }

    new dijitSelectBox(
        {
            name: 'dataset',
            className: 'dataset_select',
            value: this.config.dataset_id,
            options: array.map(
                datasetChoices,
                function( dataset ) {
                    return { label: dataset.name, value: dataset.id };
                }),
            onChange: dojo.hitch(this, function( dsID ) {
                                     var ds = (this.config.datasets||{})[dsID];
                                     if( ds )
                                         window.location = ds.url;
                                     return false;
                                 })
        }).placeAt( parent );
},

/**
 * Get object like { title: "title", description: "description", ... }
 * that contains metadata describing this browser.
 */
browserMeta: function() {
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
            + '  <img class="logo" src="'+this.resolveUrl('img/JBrowseLogo_small.png')+'">'
            + '  <h1>JBrowse '+verstring+'</h1>'
            + '  <div class="tagline">A next-generation genome browser<br> built with JavaScript and HTML5.</div>'
            + '  <a class="mainsite" target="_blank" href="http://jbrowse.org">JBrowse website</a>'
            + '  <div class="gmod">JBrowse is a <a target="_blank" href="http://gmod.org">GMOD</a> project.</div>'
            + '  <div class="copyright">&copy; 2013 The Evolutionary Software Foundation</div>'
            + '</div>';
    }
    return about;
},

/**
 * Track type registry, used by GUI elements that need to offer
 * options regarding selecting track types.  Can register a track
 * type, and get the data structure describing what track types are
 * known.
 */
registerTrackType: function( args ) {

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
},
getTrackTypes: function() {
    // create the default types if necessary
    if( ! this._knownTrackTypes )
        this._knownTrackTypes = {
            // map of store type -> default track type to use for the store
            trackTypeDefaults: {
                'JBrowse/Store/SeqFeature/BAM'        : 'JBrowse/View/Track/Alignments2',
                'JBrowse/Store/SeqFeature/NCList'     : 'JBrowse/View/Track/CanvasFeatures',
                'JBrowse/Store/SeqFeature/BigWig'     : 'JBrowse/View/Track/Wiggle/XYPlot',
                'JBrowse/Store/Sequence/StaticChunked': 'JBrowse/View/Track/Sequence',
                'JBrowse/Store/SeqFeature/VCFTabix'   : 'JBrowse/View/Track/CanvasVariants',
                'JBrowse/Store/SeqFeature/GFF3'       : 'JBrowse/View/Track/CanvasFeatures',
                'JBrowse/Store/SeqFeature/GTF'       : 'JBrowse/View/Track/CanvasFeatures'
            },

            knownTrackTypes: [
                'JBrowse/View/Track/Alignments',
                'JBrowse/View/Track/Alignments2',
                'JBrowse/View/Track/FeatureCoverage',
                'JBrowse/View/Track/SNPCoverage',
                'JBrowse/View/Track/HTMLFeatures',
                'JBrowse/View/Track/CanvasFeatures',
                'JBrowse/View/Track/HTMLVariants',
                'JBrowse/View/Track/CanvasVariants',
                'JBrowse/View/Track/Wiggle/XYPlot',
                'JBrowse/View/Track/Wiggle/Density',
                'JBrowse/View/Track/Sequence'
            ],

            trackTypeLabels: {
            }
        };

    return this._knownTrackTypes;
},



openFileDialog: function() {
    this.fileDialog
        .show({
            openCallback: dojo.hitch( this, function( results ) {
                var confs = results.trackConfs || [];
                if( confs.length ) {

                    // tuck away each of the store configurations in
                    // our store configuration, and replace them with
                    // their names.
                    array.forEach( confs, function( conf ) {
                        // do it for conf.store
                        var storeConf = conf.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.store;
                            var name = this.addStoreConfig( storeConf.name, storeConf );
                            conf.store = name;
                        }

                        // do it for conf.histograms.store, if it exists
                        storeConf = conf.histograms && conf.histograms.store;
                        if( storeConf && typeof storeConf == 'object' ) {
                            delete conf.histograms.store;
                            var name = this.addStoreConfig( storeConf.name, storeConf );
                            conf.histograms.store = name;
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
},

addTracks: function( confs ) {
    // just register the track configurations right now
    this._addTrackConfigs( confs );
},
replaceTracks: function( confs ) {
    // just add-or-replace the track configurations
    this._replaceTrackConfigs( confs );
},
deleteTracks: function( confs ) {
    // de-register the track configurations
    this._deleteTrackConfigs( confs );
},

renderGlobalMenu: function( menuName, args, parent ) {
    this.afterMilestone( 'initView', function() {
        var menu = this.makeGlobalMenu( menuName );
        if( menu ) {
            args = dojo.mixin(
                {
                    className: menuName,
                    innerHTML: '<span class="icon"></span> '+ ( args.text || Util.ucFirst(menuName)),
                    dropDown: menu,
                    id: 'dropdownbutton_'+menuName
                },
                args || {}
            );

            var menuButton = new dijitDropDownButton( args );
            dojo.addClass( menuButton.domNode, 'menu' );
            parent.appendChild( menuButton.domNode );
        }
    },this);
},

makeGlobalMenu: function( menuName ) {
    var items = ( this._globalMenuItems || {} )[menuName] || [];
    if( ! items.length )
        return null;

    var menu = new dijitDropDownMenu({ id: 'dropdownmenu_'+menuName , leftClickToOpen: true });
    dojo.forEach( items, function( item ) {
        menu.addChild( item );
    });
    dojo.addClass( menu.domNode, 'globalMenu' );
    dojo.addClass( menu.domNode, menuName );
    menu.startup();
    return menu;
},

addGlobalMenuItem: function( menuName, item ) {
    if( ! this._globalMenuItems )
        this._globalMenuItems = {};
    if( ! this._globalMenuItems[ menuName ] )
        this._globalMenuItems[ menuName ] = [];
    this._globalMenuItems[ menuName ].push( item );
},

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
_initEventRouting: function() {
    var that = this;

    that.subscribe('/jbrowse/v1/v/store/new', function( storeConfigs ) {
        array.forEach( storeConfigs, function( storeConfig ) {
                           storeConfig = lang.mixin( {}, storeConfig );
                           var name = storeConfig.name;
                           delete storeConfig.name;
                           that.addStoreConfig( name, storeConfig );
                       });
    });



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
        that.publish( '/jbrowse/v1/n/tracks/new', trackConfigs );
    });
    that.subscribe('/jbrowse/v1/v/tracks/replace', function( trackConfigs ) {
        that.replaceTracks( trackConfigs );
        that.publish( '/jbrowse/v1/c/tracks/replace', trackConfigs );
        that.publish( '/jbrowse/v1/n/tracks/replace', trackConfigs );
    });
    that.subscribe('/jbrowse/v1/v/tracks/delete', function( trackConfigs ) {
        that.deleteTracks( trackConfigs );
        that.publish( '/jbrowse/v1/c/tracks/delete', trackConfigs );
        that.publish( '/jbrowse/v1/n/tracks/delete', trackConfigs );
    });

    that.subscribe('/jbrowse/v1/v/tracks/pin', function( trackNames ) {
        that.publish( '/jbrowse/v1/c/tracks/pin', trackNames );
        that.publish( '/jbrowse/v1/n/tracks/pin', trackNames );
    });

    that.subscribe('/jbrowse/v1/v/tracks/unpin', function( trackNames ) {
        that.publish( '/jbrowse/v1/c/tracks/unpin', trackNames );
        that.publish( '/jbrowse/v1/n/tracks/unpin', trackNames );
    });
},

/**
 * Reports some anonymous usage statistics about this browsing
 * instance.  Currently reports the number of tracks in the instance
 * and their type (feature, wiggle, etc), and the number of reference
 * sequences and their average length.
 */
reportUsageStats: function() {
    if( this.config.suppressUsageStatistics )
        return;

    var stats = this._calculateClientStats();
    this._reportGoogleUsageStats( stats );
    this._reportCustomUsageStats( stats );
},

// phones home to google analytics
_reportGoogleUsageStats: function( stats ) {
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
},

// phones home to custom analytics at jbrowse.org
_reportCustomUsageStats: function(stats) {
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
},


/**
 * Get a store object from the store registry, loading its code and
 * instantiating it if necessary.
 */
getStore: function( storeName, callback ) {
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
        console.warn( "store '"+storeName+"' not found" );
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
                 // release the callback because apparently require
                 // doesn't release this function
                 callback = undefined;
             }));
},

/**
 * Add a store configuration to the browser.  If name is falsy, will
 * autogenerate one.
 * @private
 */
uniqCounter: 0,
addStoreConfig: function( /**String*/ name, /**Object*/ storeConfig ) {
    name = name || 'addStore'+this.uniqCounter++;

    if( ! this.config.stores )
        this.config.stores = {};
    if( ! this._storeCache )
        this._storeCache = {};

    if( this.config.stores[name] || this._storeCache[name] ) {
        throw "store "+name+" already exists!";
    }

    this.config.stores[name] = storeConfig;
    return name;
},

clearStores: function() {
    this._storeCache = {};
},

/**
 * Notifies the browser that the given named store is no longer being
 * used by the calling component.  Decrements the store's reference
 * count, and if the store's reference count reaches zero, the store
 * object will be discarded, to be recreated again later if needed.
 */
// not actually being used yet
releaseStore: function( storeName ) {
    var storeRecord = this._storeCache[storeName];
    if( storeRecord && ! --storeRecord.refCount )
        delete this._storeCache[storeName];
},

_calculateClientStats: function() {

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
},

publish: function() {
    if( this.config.logMessages )
        console.log( arguments );

    return topic.publish.apply( topic, arguments );
},
subscribe: function() {
    return topic.subscribe.apply( topic, arguments );
},

onResize: function() {
    if( this.navbox )
        this.view.locationTrapHeight = dojo.marginBox( this.navbox ).h;
},

/**
 * Get the list of the most recently used tracks, stored for this user
 * in a cookie.
 * @returns {Array[Object]} as <code>[{ time: (integer), label: (track label)}]</code>
 */
getRecentlyUsedTracks: function() {
    return dojo.fromJson( this.cookie( 'recentTracks' ) || '[]' );
},

/**
 * Add the given list of tracks as being recently used.
 * @param trackLabels {Array[String]} array of track labels to add
 */
addRecentlyUsedTracks: function( trackLabels ) {
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
},

/**
 * Run a function that will eventually resolve the named Deferred
 * (milestone).
 * @param {String} name the name of the Deferred
 */
_milestoneFunction: function( /**String*/ name, func ) {

    var thisB = this;
    var args = Array.prototype.slice.call( arguments, 2 );

    var d = thisB._getDeferred( name );
    args.unshift( d );
    try {
        func.apply( thisB, args ) ;
    } catch(e) {
        console.error( e, e.stack );
        d.reject(e);
    }

    return d;
},

/**
 * Fetch or create a named Deferred, which is how milestones are implemented.
 */
_getDeferred: function( name ) {
    if( ! this._deferred )
        this._deferred = {};
    return this._deferred[name] || ( this._deferred[name] = function() {
        var d = new Deferred();
        d.then( null, lang.hitch( this, 'fatalError' ));
        return d;
    }.call(this));
},
/**
 * Attach a callback to a milestone.
 */
afterMilestone: function( name, func, ctx ) {
    return this._getDeferred(name)
        .then( function() {
                   try {
                       func.call( ctx || this );
                   } catch( e ) {
                       console.error( ''+e, e.stack, e );
                   }
               });
},
/**
 * Indicate that we've reached a milestone in the initalization
 * process.  Will run all the callbacks associated with that
 * milestone.
 */
passMilestone: function( name, result ) {
    return this._getDeferred(name).resolve( result );
},
/**
 * Return true if we have reached the named milestone, false otherwise.
 */
reachedMilestone: function( name ) {
    return this._getDeferred(name).isResolved();
},


/**
 *  Load our configuration file(s) based on the parameters thex
 *  constructor was passed.  Does not return until all files are
 *  loaded and merged in.
 *  @returns nothing meaningful
 */
loadConfig: function () {
    return this._milestoneFunction( 'loadConfig', function( deferred ) {
        var c = new ConfigManager({ bootConfig: this.config, defaults: this._configDefaults(), browser: this });
        c.getFinalConfig()
         .then( dojo.hitch(this, function( finishedConfig ) {
                               this.config = finishedConfig;

                               //apply document.domain from a loaded conf file
                               if( this.config.documentDomain )
                                   document.domain=this.config.documentDomain;

                               // pass the tracks configurations through
                               // addTrackConfigs so that it will be indexed and such
                               var tracks = finishedConfig.tracks || [];
                               delete finishedConfig.tracks;
                               this._addTrackConfigs( tracks );

                               // coerce some config keys to boolean
                               dojo.forEach( ['show_tracklist','show_nav','show_overview','show_menu'], function(v) {
                                                 this.config[v] = this._coerceBoolean( this.config[v] );
                                             },this);

                               // set empty tracks array if we have none
                               if( ! this.config.tracks )
                                   this.config.tracks = [];

                               deferred.resolve({success:true});
                           }),
                deferred.reject
              );
    });
},

/**
 * Add new track configurations.
 * @private
 */
_addTrackConfigs: function( /**Array*/ configs ) {

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
},
/**
 * Replace existing track configurations.
 * @private
 */
_replaceTrackConfigs: function( /**Array*/ newConfigs ) {
    if( ! this.trackConfigsByName )
        this.trackConfigsByName = {};

    array.forEach( newConfigs, function( conf ) {
        if( ! this.trackConfigsByName[ conf.label ] ) {
            console.warn("track with label "+conf.label+" does not exist yet.  creating a new one.");
        }

        this.trackConfigsByName[conf.label] =
                           dojo.mixin( this.trackConfigsByName[ conf.label ] || {}, conf );
   },this);
},
/**
 * Delete existing track configs.
 * @private
 */
_deleteTrackConfigs: function( configsToDelete ) {
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
},

_configDefaults: function() {
    return {
        tracks: [],

        containerID: 'GenomeBrowser',
        dataRoot: 'data',
        show_tracklist: true,
        show_nav: true,
        show_menu: true,
        show_overview: true,

        refSeqs: "{dataRoot}/seq/refSeqs.json",
        include: [
            'jbrowse.conf',
            'jbrowse_conf.json'
        ],
        nameUrl: "{dataRoot}/names/root.json",

        datasets: {
            _DEFAULT_EXAMPLES: true,
            volvox:    { url: '?data=sample_data/json/volvox',    name: 'Volvox Example'    },
            modencode: { url: '?data=sample_data/json/modencode', name: 'MODEncode Example' },
            yeast:     { url: '?data=sample_data/json/yeast',     name: 'Yeast Example'     }
        },

        highlightSearchedRegions: false,
        highResolutionMode: 'disabled'
    };
},

/**
 * Coerce a value of unknown type to a boolean, treating string 'true'
 * and 'false' as the values they indicate, and string numbers as
 * numbers.
 * @private
 */
_coerceBoolean: function(val) {
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
},

/**
 * @param refSeqs {Array} array of refseq records to add to the browser
 */
addRefseqs: function( refSeqs ) {
    var allrefs = this.allRefs = this.allRefs || {};
    dojo.forEach( refSeqs, function(r) {
        this.allRefs[r.name] = r;
    },this);

    // generate refSeqOrder
    this.refSeqOrder =
        function() {
            var order;
            if( ! this.config.refSeqOrder ) {
                order = refSeqs;
            }
            else {
                order = refSeqs.slice(0);
                order.sort(
                    this.config.refSeqOrder == 'length' || this.config.refSeqOrder == 'length ascending'
                                                                   ? function( a, b ) { return a.length - b.length;  }  :
                    this.config.refSeqOrder == 'length descending' ? function( a, b ) { return b.length - a.length;  }  :
                    this.config.refSeqOrder == 'name descending'   ? function( a, b ) { return b.name.localeCompare( a.name ); } :
                                                                     function( a, b ) { return a.name.localeCompare( b.name ); }
                );
            }
            return array.map( order, function( r ) {
                                  return r.name;
                              });
        }.call(this);

    var refCookie = this.cookie('refseq');
    this.refSeq = this.refSeq || this.allRefs[refCookie] || this.allRefs[ this.refSeqOrder[0] ];
},


/**
 * Get the refseq object { name, start, end, .. } with the given name,
 * or the currently shown ref seq if no name is given.
 */
getRefSeq: function( name ) {
    if( typeof name != 'string' )
        return this.refSeq || undefined;

    return this.allRefs[ name ];
},

/**
 * @private
 */
onFineMove: function(startbp, endbp) {

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
},

/**
 * Asynchronously initialize our track metadata.
 */
initTrackMetadata: function( callback ) {
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
},

/**
 * Asynchronously create the track list.
 * @private
 */
createTrackList: function() {
    return this._milestoneFunction('createTrack', function( deferred ) {
        // find the tracklist class to use
        var tl_class = !this.config.show_tracklist           ? 'Null'                         :
                       (this.config.trackSelector||{}).type  ? this.config.trackSelector.type :
                                                               'Hierarchical';
        if( ! /\//.test( tl_class ) )
            tl_class = 'JBrowse/View/TrackList/'+tl_class;

        // load all the classes we need
        require( [ tl_class ],
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

                     deferred.resolve({ success: true });
        }));
    });
},

/**
 * @private
 */

onVisibleTracksChanged: function() {
},


/**
 * Like <code>navigateToLocation()</code>, except it attempts to display the given
 * location with a little bit of flanking sequence to each side, if
 * possible.
 */
showRegion: function( location ) {
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
},

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

navigateTo: function(loc) {
    var thisB = this;
    this.afterMilestone( 'initView', function() {
        // lastly, try to search our feature names for it
        thisB.searchNames( loc )
            .then( function( found ) {
                if( found )
                    return;

                // if it's a foo:123..456 location, go there
                if(!thisB.callLocation(loc)){return;}

                new InfoDialog(
                {
                    title: 'Not found',
                    content: 'Not found: <span class="locString">'+loc+'</span>',
                    className: 'notfound-dialog'
                }).show();
            },
            thisB.callLocation(loc));
    });
},

callLocation: function(loc){
    var thisB=this;
    var location = typeof loc == 'string' ? Util.parseLocString( loc ) :  loc;
    // only call navigateToLocation() directly if location has start and end, otherwise try and fill in start/end from 'location' cookie
    if( location && ("start" in location) && ("end" in location)) {
        thisB.navigateToLocation( location );
        return false;
    }
    // otherwise, if it's just a word (or a location with only a ref property), try to figure out what it is
    else {
        if( typeof loc != 'string')
            loc = loc.ref;
        // is it just the name of one of our ref seqs?
        var ref = thisB.findReferenceSequence( loc );
        if( ref ) {
            thisB.navigateToLocation( { ref: ref.name } );
            return false;
        }
    }
},

findReferenceSequence: function( name ) {
    for( var n in this.allRefs ) {
        if( ! this.compareReferenceNames( n, name ) )
            return this.allRefs[n];
    }
    return null;
},

// given an object like { ref: 'foo', start: 2, end: 100 }, set the
// browser's view to that location.  any of ref, start, or end may be
// missing, in which case the function will try set the view to
// something that seems intelligent
navigateToLocation: function( location ) {
    this.afterMilestone( 'initView', dojo.hitch( this, function() {

        // regularize the ref seq name we were passed
        var ref = location.ref ? this.findReferenceSequence( location.ref.name || location.ref )
                               : this.refSeq;
        if( !ref ) return;
        location.ref = ref.name;

        if( 'ref' in location && !( 'start' in location && 'end' in location ) ) {
            // see if we have a stored location for this ref seq in a
            // cookie, and go there if we do
            var oldLoc;
            try {
                oldLoc = Util.parseLocString(
                    dojo.fromJson(
                        this.cookie("location")
                    )[location.ref].l
                );
                oldLoc.ref = location.ref; // force the refseq name; older cookies don't have it
            } catch (x) {}
            if( oldLoc ) {
                location = oldLoc;
            } else {
                // if we don't have a previous location, just go to
                // the middle 80% of that refseq,
                // based on range that can be viewed (start to end)
                // rather than total length, in case start != 0 || end != length
                // this.navigateToLocation({ref: ref.name, start: ref.end*0.1, end: ref.end*0.9 });
                var visibleLength = ref.end - ref.start;
                location.start = ref.start + (visibleLength * 0.1);
                location.end   = ref.start + (visibleLength * 0.9);
            }
        }

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
    }));
},

/**
 * Given a string name, search for matching feature names and set the
 * view location to any that match.
 */
searchNames: function( /**String*/ loc ) {
    var thisB = this;
    return this.nameStore.query({ name: loc })
        .then(
            function( nameMatches ) {
                // if we have no matches, pop up a dialog saying so, and
                // do nothing more
                if( ! nameMatches.length ) {
                    return false;
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
                    thisB.showRegionAfterSearch( goingTo.location );
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
                return true;
            },
            function(e) {
                console.error( e );
                new InfoDialog(
                    {
                        title: 'Error',
                        content: 'Error reading from name store.'
                    }).show();
                return false;
            }
   );
},


/**
 * load and display the given tracks
 * @example
 * gb=dojo.byId("GenomeBrowser").genomeBrowser
 * gb.showTracks(["DNA","gene","mRNA","noncodingRNA"])
 * @param trackNameList {Array|String} array or comma-separated string
 * of track names, each of which should correspond to the "label"
 * element of the track information
 */

showTracks: function( trackNames ) {
    this.afterMilestone('initView', dojo.hitch( this, function() {
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
},

/**
 * Create a global keyboard shortcut.
 * @param keychar the character of the key that is typed
 * @param [...] additional arguments passed to dojo.hitch for making the handler
 */
setGlobalKeyboardShortcut: function( keychar ) {
    // warn if redefining
    if( this.globalKeyboardShortcuts[ keychar ] )
        console.warn("WARNING: JBrowse global keyboard shortcut '"+keychar+"' redefined");

    // make the wrapped handler func
    var func = dojo.hitch.apply( dojo, Array.prototype.slice.call( arguments, 1 ) );

    // remember it
    this.globalKeyboardShortcuts[ keychar ] = func;
},

/**
 * Key event handler that implements all global keyboard shortcuts.
 */
globalKeyHandler: function( evt ) {
    // if some digit widget is focused, don't process any global keyboard shortcuts
    if( dijitFocus.curNode )
        return;

    var shortcut = this.globalKeyboardShortcuts[ evt.keyChar || String.fromCharCode( evt.charCode || evt.keyCode ) ];
    if( shortcut ) {
        shortcut.call( this );
        evt.stopPropagation();
    }
},

makeShareLink: function () {
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
    };
    dojo.connect( this, "onCoarseMove",                     updateShareURL );
    this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged',  updateShareURL );
    this.subscribe( '/jbrowse/v1/n/globalHighlightChanged', updateShareURL );

    return button.domNode;
},

/**
 * Return a string URL that encodes the complete viewing state of the
 * browser.  Currently just data dir, visible tracks, and visible
 * region.
 * @param {Object} overrides optional key-value object containing
 *                           components of the query string to override
 */
makeCurrentViewURL: function( overrides ) {
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
            dojo.mixin(
                dojo.mixin( {}, (this.config.queryParams||{}) ),
                dojo.mixin(
                    {
                        loc:    this.view.visibleRegionLocString(),
                        tracks: this.view.visibleTrackNames().join(','),
                        highlight: (this.getHighlight()||'').toString()
                    },
                    overrides || {}
                )
            )
        )
    );
},

makeFullViewLink: function () {
    var thisB = this;
    // make the link
    var link = dojo.create('a', {
        className: 'topLink',
        href: window.location.href,
        target: '_blank',
        title: 'View in full-screen browser',
        innerHTML: 'Full-screen view'
    });

    var makeURL = this.config.makeFullViewURL || this.makeCurrentViewURL;

    // update it when the view is moved or tracks are changed
    var update_link = function() {
        link.href = makeURL.call( thisB, thisB );
    };
    dojo.connect( this, "onCoarseMove",                     update_link );
    this.subscribe( '/jbrowse/v1/n/tracks/visibleChanged',  update_link );
    this.subscribe( '/jbrowse/v1/n/globalHighlightChanged', update_link );

    return link;
},

/**
 * @private
 */

onCoarseMove: function(startbp, endbp) {

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
    this._updateRefSeqSelectBox();

    if( this.reachedMilestone('completely initialized') ) {
        this._updateLocationCookies( currRegion );
    }

    // send out a message notifying of the move
    this.publish( '/jbrowse/v1/n/navigate', currRegion );
},

_updateRefSeqSelectBox: function() {
    if( this.refSeqSelectBox ) {

        // if none of the options in the select box match this
        // reference sequence, add another one to the end for it
        if( ! array.some( this.refSeqSelectBox.getOptions(), function( option ) {
                              return option.value == this.refSeq.name;
                        }, this)
          ) {
              this.refSeqSelectBox.set( 'options',
                                     this.refSeqSelectBox.getOptions()
                                     .concat({ label: this.refSeq.name, value: this.refSeq.name })
                                   );
        }

        // set its value to the current ref seq
        this.refSeqSelectBox.set( 'value', this.refSeq.name, false );
    }
},

/**
 * update the location and refseq cookies
 */
_updateLocationCookies: function( location ) {
    var locString = typeof location == 'string' ? location : Util.assembleLocString( location );
    var oldLocMap = dojo.fromJson( this.cookie('location') ) || { "_version": 1 };
    if( ! oldLocMap["_version"] )
        oldLocMap = this._migrateLocMap( oldLocMap );
    oldLocMap[this.refSeq.name] = { l: locString, t: Math.round( (new Date()).getTime() / 1000 ) - 1340211510 };
    oldLocMap = this._limitLocMap( oldLocMap, this.config.maxSavedLocations || 10 );
    this.cookie( 'location', dojo.toJson(oldLocMap), {expires: 60});
    this.cookie('refseq', this.refSeq.name );
},

/**
 * Migrate an old location map cookie to the new format that includes timestamps.
 * @private
 */
_migrateLocMap: function( locMap ) {
    var newLoc = { "_version": 1 };
    for( var loc in locMap ) {
        newLoc[loc] = { l: locMap[loc], t: 0 };
    }
    return newLoc;
},

/**
 * Limit the size of the saved location map, removing the least recently used.
 * @private
 */
_limitLocMap: function( locMap, maxEntries ) {
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
},

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
cookie: function(keyWithoutId,value) {
    keyWithoutId = this.config.containerID + '-' + keyWithoutId;
    var keyWithId = keyWithoutId +  '-' + (this.config.dataset_id || '');
    if( typeof value == 'object' )
        value = dojo.toJson( value );

    var sizeLimit = this.config.cookieSizeLimit || 1200;
    if( value && value.length > sizeLimit ) {
        console.warn("not setting cookie '"+keyWithId+"', value too big ("+value.length+" > "+sizeLimit+")");
        return localStorage.getItem( keyWithId );
    }
    else if( value ) {
        try {
        return localStorage.setItem(keyWithId, value);
        }
        catch(e) {
        }
    }

    return (localStorage.getItem( keyWithId ) || dojo.cookie(keyWithoutId));
},
/**
 * @private
 */

createNavBox: function( parent ) {
    var thisB = this;
    var navbox = dojo.create( 'div', { id: 'navbox', style: { 'text-align': 'center' } }, parent );

    // container adds a white backdrop to the locationTrap.
    var locationTrapContainer = dojo.create('div', {className: 'locationTrapContainer'}, navbox );

    this.locationTrap = dojo.create('div', {className: 'locationTrap'}, locationTrapContainer );

    var four_nbsp = String.fromCharCode(160); four_nbsp = four_nbsp + four_nbsp + four_nbsp + four_nbsp;
    navbox.appendChild(document.createTextNode( four_nbsp ));

    var moveLeft = document.createElement("img");
    //moveLeft.type = "image";
    moveLeft.src = this.resolveUrl( "img/Empty.png" );
    moveLeft.id = "moveLeft";
    moveLeft.className = "icon nav";
    navbox.appendChild(moveLeft);
    dojo.connect( moveLeft, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.slide(0.9);
                  });

    var moveRight = document.createElement("img");
    //moveRight.type = "image";
    moveRight.src = this.resolveUrl( "img/Empty.png" );
    moveRight.id="moveRight";
    moveRight.className = "icon nav";
    navbox.appendChild(moveRight);
    dojo.connect( moveRight, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.slide(-0.9);
                  });

    navbox.appendChild(document.createTextNode( four_nbsp ));

    var bigZoomOut = document.createElement("img");
    //bigZoomOut.type = "image";
    bigZoomOut.src = this.resolveUrl( "img/Empty.png" );
    bigZoomOut.id = "bigZoomOut";
    bigZoomOut.className = "icon nav";
    navbox.appendChild(bigZoomOut);
    dojo.connect( bigZoomOut, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomOut(undefined, undefined, 2);
                  });


    var zoomOut = document.createElement("img");
    //zoomOut.type = "image";
    zoomOut.src = this.resolveUrl("img/Empty.png");
    zoomOut.id = "zoomOut";
    zoomOut.className = "icon nav";
    navbox.appendChild(zoomOut);
    dojo.connect( zoomOut, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                     this.view.zoomOut();
                  });

    var zoomIn = document.createElement("img");
    //zoomIn.type = "image";
    zoomIn.src = this.resolveUrl( "img/Empty.png" );
    zoomIn.id = "zoomIn";
    zoomIn.className = "icon nav";
    navbox.appendChild(zoomIn);
    dojo.connect( zoomIn, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomIn();
                  });

    var bigZoomIn = document.createElement("img");
    //bigZoomIn.type = "image";
    bigZoomIn.src = this.resolveUrl( "img/Empty.png" );
    bigZoomIn.id = "bigZoomIn";
    bigZoomIn.className = "icon nav";
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
                      if( event.keyCode == keys.ESCAPE ) {
                          this.locationBox.set('value','');
                      }
                      else if (event.keyCode == keys.ENTER) {
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
    this.highlightButtonPreviousState = false;
    this.highlightButton = new dojoxTriStateCheckBox({
        //label: 'Highlight',
        title: 'highlight a region',
        states:[false, true, "mixed"],
        onChange: function() {
            if( this.get('checked')==true ) {
                thisB.view._rubberStop();
                thisB.view.behaviorManager.swapBehaviors('normalMouse','highlightingMouse');
            } else if( this.get('checked')==false) {
                var h = thisB.getHighlight();
                if( h ) {
                    thisB.clearHighlight();
                    thisB.view.redrawRegion( h ); 
                }
            }
            else { // mixed
                // Uncheck since user is cycling three-state instead
                // of programmatically landing in mixed state
                if( thisB.highlightButtonPreviousState != true ) {
                    thisB.highlightButton.set('checked', false);
                }
                else {
                    thisB.highlightButtonPreviousState = false;
                }
                thisB.view._rubberStop();
                thisB.view.behaviorManager.swapBehaviors('highlightingMouse','normalMouse');
            }
        }
    }, dojo.create('button',{},navbox));

    this.subscribe('/jbrowse/v1/n/globalHighlightChanged',
                   function() { thisB.highlightButton.set('checked',false); });


    this.afterMilestone('loadRefSeqs', dojo.hitch( this, function() {

        // make the refseq selection dropdown
        if( this.refSeqOrder && this.refSeqOrder.length ) {
            var max = this.config.refSeqSelectorMaxSize || 30;
            var numrefs = Math.min( max, this.refSeqOrder.length);
            var options = [];
            for ( var i = 0; i < numrefs; i++ ) {
                options.push( { label: this.refSeqOrder[i], value: this.refSeqOrder[i] } );
            }
            var tooManyMessage = '(first '+numrefs+' ref seqs)';
            if( this.refSeqOrder.length > max ) {
                options.push( { label: tooManyMessage , value: tooManyMessage, disabled: true } );
            }
            this.refSeqSelectBox = new dijitSelectBox({
                name: 'refseq',
                value: this.refSeq ? this.refSeq.name : null,
                options: options,
                onChange: dojo.hitch(this, function( newRefName ) {
                    // don't trigger nav if it's the too-many message
                    if( newRefName == tooManyMessage ) {
                        this.refSeqSelectBox.set('value', this.refSeq.name );
                        return;
                    }

                    // only trigger navigation if actually switching sequences
                    if( newRefName != this.refSeq.name ) {
                        this.navigateToLocation({ ref: newRefName });
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
},

/**
 * Return the current highlight region, or null if none.
 */
getHighlight: function() {
    return this._highlight || null;
},

/**
 * Set a new highlight.  Returns the new highlight.
 */
setHighlight: function( newHighlight ) {

    if( newHighlight && ( newHighlight instanceof Location ) )
        this._highlight = newHighlight;
    else if( newHighlight )
        this._highlight = new Location( newHighlight );

    this.publish( '/jbrowse/v1/n/globalHighlightChanged', [this._highlight] );

    return this.getHighlight();
},


_updateHighlightClearButton: function() {
    var isHighlightSet=!! this._highlight;
    if( this._highlightClearButton ) {
        this._highlightClearButton.set( 'disabled', !isHighlightSet );
        //this._highlightClearButton.set( 'label', 'Clear highlight' + ( this._highlight ? ' - ' + this._highlight : '' ));
    }
    if( this.highlightButton ) {
        this.highlightButton.set('checked',isHighlightSet?'mixed':false );
        this.highlightButtonPreviousState=isHighlightSet;
    }
},


clearHighlight: function() {
    if( this._highlight ) {
        delete this._highlight;
        this.publish( '/jbrowse/v1/n/globalHighlightChanged', [] );
    }
},

setHighlightAndRedraw: function( location ) {
    location = this.regularizeLocation( location );

    var oldHighlight = this.getHighlight();
    if( oldHighlight )
        this.view.hideRegion( oldHighlight );
    this.view.hideRegion( location );
    this.setHighlight( location );
    this.view.showVisibleBlocks( false );
},

/**
 * Shows a region that has been searched for someplace else in the UI.
 * Highlights it if this.config.highlightSearchedRegions is true.
 */
showRegionAfterSearch: function( location ) {
    location = this.regularizeLocation( location );

    if( this.config.highlightSearchedRegions ) {
        var oldHighlight = this.getHighlight();
        if( oldHighlight )
            this.view.hideRegion( oldHighlight );
        this.view.hideRegion( location );
        this.setHighlight( location );
    }
    this.showRegion( location );
},
showRegionWithHighlight: function() { // backcompat
    return this.showRegionAfterSearch.apply( this, arguments );
}

});
});


/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
