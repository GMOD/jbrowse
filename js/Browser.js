// CONTROLLER

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
    dojo.require("dojo.dnd.Source");
    dojo.require("dojo.dnd.Moveable");
    dojo.require("dojo.dnd.Mover");
    dojo.require("dojo.dnd.move");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.layout.BorderContainer");
    dojo.require("dijit.Dialog");

    this.deferredFunctions = [];
    this.tracks = [];
    this.isInitialized = false;

    this.config = params;

    // load our touch device support
    // TODO: refactor this
    this.deferredFunctions.push(function() { loadTouch(); });

    // schedule the config load, the first step in the initialization
    // process, to happen when the page is done loading
    var browser = this;
    dojo.addOnLoad( function() { browser.loadConfig(); } );

    dojo.connect( this, 'onConfigLoaded',  this, 'loadRefSeqs' );
    dojo.connect( this, 'onConfigLoaded',  this, 'loadNames'   );
    dojo.connect( this, 'onRefSeqsLoaded', this, 'initView'   );
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
    var topPane = document.createElement("div");
    this.container.appendChild(topPane);

    var overview = document.createElement("div");
    overview.className = "overview";
    overview.id = "overview";
    // overview=0 hides the overview, but we still need it to exist
    if( this.config.show_overview == 0 ) overview.style.cssText = "display: none";
    topPane.appendChild(overview);

    this.navbox = this.createNavBox( topPane, 25 );

    this.viewElem = document.createElement("div");
    this.viewElem.className = "dragWindow";
    this.container.appendChild( this.viewElem);

    this.containerWidget = new dijit.layout.BorderContainer({
        liveSplitters: false,
        design: "sidebar",
        gutters: false
    }, this.container);
    var contentWidget =
        new dijit.layout.ContentPane({region: "top"}, topPane);
    this.browserWidget =
        new dijit.layout.ContentPane({region: "center"}, this.viewElem);

    //create location trapezoid
    this.locationTrap = document.createElement("div");
    this.locationTrap.className = "locationTrap";
    topPane.appendChild(this.locationTrap);
    topPane.style.overflow="hidden";


    // hook up GenomeView
    this.view = this.viewElem.view =
        new GenomeView(this.viewElem, 250, this.refSeq, 1/200,
                       this.config.browserRoot);
    dojo.connect( this.view, "onFineMove",   this, "onFineMove"   );
    dojo.connect( this.view, "onCoarseMove", this, "onCoarseMove" );

    //set up track list
    var trackListDiv = this.createTrackList( this.container );
    this.containerWidget.startup();
    dojo.connect( this.browserWidget, "resize", this,      'onResize' );
    dojo.connect( this.browserWidget, "resize", this.view, 'onResize' );
    this.onResize();
    this.view.onResize();

    //set initial location
    var oldLocMap = dojo.fromJson(dojo.cookie(this.container.id + "-location")) || {};
    if (this.config.location) {
        this.navigateTo(this.config.location);
    } else if (oldLocMap[this.refSeq.name]) {
        this.navigateTo( oldLocMap[this.refSeq.name] );
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

    dojo.connect(this.chromList, "onchange", this, function(event) {
        var newRef = this.allRefs[this.chromList.options[this.chromList.selectedIndex].value];
        this.navigateTo( newRef.name );
    });

    this.isInitialized = true;

    //if someone calls methods on this browser object
    //before it's fully initialized, then we defer
    //those functions until now
    dojo.forEach( this.deferredFunctions, function(f) {
        f.call(this);
    },this );

    this.deferredFunctions = [];
};

Browser.prototype.onResize = function() {
    this.view.locationTrapHeight = dojo.marginBox( this.navbox ).h;
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
        var adaptor = this.getConfigAdaptor( config );
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
 * @returns {Object} the right configuration adaptor to use, or
 * undefined if one could not be found
 */

Browser.prototype.getConfigAdaptor = function( config_def ) {
    var adaptor_name = "ConfigAdaptor." + config_def.format;
    if( 'version' in config_def )
        adaptor_name += '_v'+config_def.version;
    adaptor_name.replace( /\W/g,'' );
    var adaptor_class = eval( adaptor_name );
    if( ! adaptor_class )
        return undefined;

    return new adaptor_class( config_def );
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
    this.refSeq  = this.refSeq  || refSeqs[0];
    dojo.forEach( refSeqs, function(r) {
        this.allRefs[r.name] = r;
    },this);
};

/**
 * @private
 */


Browser.prototype.onFineMove = function(startbp, endbp) {
    var length = this.view.ref.end - this.view.ref.start;
    var trapLeft = Math.round((((startbp - this.view.ref.start) / length)
                               * this.view.overviewBox.w) + this.view.overviewBox.l);
    var trapRight = Math.round((((endbp - this.view.ref.start) / length)
                                * this.view.overviewBox.w) + this.view.overviewBox.l);
    var locationTrapStyle;
    if (dojo.isIE) {
        //IE apparently doesn't like borders thicker than 1024px
        locationTrapStyle =
            "top: " + this.view.overviewBox.t + "px;"
            + "height: " + this.view.overviewBox.h + "px;"
            + "left: " + trapLeft + "px;"
            + "width: " + (trapRight - trapLeft) + "px;"
            + "border-width: 0px";
    } else {
        locationTrapStyle =
            "top: " + this.view.overviewBox.t + "px;"
            + "height: " + this.view.overviewBox.h + "px;"
            + "left: " + this.view.overviewBox.l + "px;"
            + "width: " + (trapRight - trapLeft) + "px;"
            + "border-width: " + "0px "
            + (this.view.overviewBox.w - trapRight) + "px "
            + this.view.locationTrapHeight + "px " + trapLeft + "px;";
    }

    this.locationTrap.style.cssText = locationTrapStyle;
};

// /**
//  * Get a track object, given a track's uniquename.
//  */
// Browser.prototype.getTrack = function( /**String*/ trackName ) {
//     if( this.tracks[trackName] )
//         return this.tracks[trackName];
//     else {
//         var trackConfig = this.config.tracks[ 'track_'+trackName ];
//         if( ! trackConfig )
//             return null;

//         this.tracks[ 'track_' + trackName] = track;
//         return track;
//     }
// };

/**
 * @private
 */

Browser.prototype.createTrackList = function( /**Element*/ parent ) {

    if( ! this.config.tracks )
        this.config.tracks = [];

    // set a default baseUrl in each of the track confs if needed
    if( this.config.sourceUrl ) {
        dojo.forEach( this.config.tracks, function(t) {
            if( ! t.baseUrl )
                t.baseUrl = this.config.baseUrl;
        },this);
    }

    // instantiate all our tracks, indexing them by name, but also
    // having a trackOrder property that remembers their ordering.
    // note: tracks don't load their data until actually displayed
    this.tracks = { trackOrder: [] };
    dojo.forEach( this.config.tracks, function(trackConfig) {
        var class_ = eval( trackConfig.type );
        var track = new class_(
            trackConfig,
            {
                changeCallback: dojo.hitch( this.view, 'showVisibleBlocks', true ),
                trackPadding: this.view.trackPadding,
                charWidth: this.view.charWidth,
                seqHeight: this.view.seqHeight
            });
        this.tracks[ track.name ] = track;
        this.tracks.trackOrder.push( track.name );
    },this);

    // make a tracklist of the right type
    this.trackListView = new JBrowse.View.TrackList[ this.config.show_tracklist == 0 ? 'Null' : 'Simple' ]( {
        tracks: this.tracks,
        renderTo: parent
    });

    // listen for track-visibility-changing messages from views
    dojo.subscribe( '/jbrowse/v1/v/tracks/hide', this, 'onVisibleTracksChanged' );
    dojo.subscribe( '/jbrowse/v1/v/tracks/show', this, 'onVisibleTracksChanged' );

    // figure out what initial track list we will use:
    //    from a param passed to our instance, or from a cookie, or
    //    the passed defaults, or the last-resort default of "DNA"?
    var origTracklist =
           this.config.forceTracks
        || dojo.cookie( this.container.id + "-tracks" )
        || this.config.defaultTracks
        || "DNA";

    this.showTracks( origTracklist );
};



/**
 * @private
 */


Browser.prototype.onVisibleTracksChanged = function() {
    this.view.updateTrackList();
    dojo.cookie( this.container.id + "-tracks",
                 this.visibleTracks().join(','),
                 {expires: 60});
    this.view.showVisibleBlocks();
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
            try {
                var oldLoc = Util.parseLocString(
                    dojo.fromJson(
                        dojo.cookie(brwsr.container.id + "-location")
                    )[ref.name]
                );
                oldLoc.ref = ref.name; // force the refseq name; older cookies don't have it
                this.navigateToLocation( oldLoc );
            }
            // if we don't just go to the middle 80% of that refseq
            catch(x) {
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

        for (var i = 0; i < this.chromList.options.length; i++)
            if (this.chromList.options[i].text == location.ref )
                this.chromList.selectedIndex = i;

        this.refSeq = this.allRefs[location.ref];

        this.view.setLocation( this.refSeq,
                               location.start,
                               location.end );
        this.showTracks( curTracks );
    }

    return;
};

// given a string name, search for matching feature names and set the
// view location to any that match
Browser.prototype.searchNames = function( loc ) {
    var brwsr = this;
    this.names.exactMatch( loc, function(nameMatches) {
            var goingTo,
                i;

            //first check for exact case match
            for (i = 0; i < nameMatches.length; i++) {
                if (nameMatches[i][1] == loc)
                    goingTo = nameMatches[i];
            }
            //if no exact case match, try a case-insentitive match
            if (!goingTo) {
                for (i = 0; i < nameMatches.length; i++) {
                    if (nameMatches[i][1].toLowerCase() == loc.toLowerCase())
                        goingTo = nameMatches[i];
                }
            }
            //else just pick a match
            if (!goingTo) goingTo = nameMatches[0];
            var startbp = parseInt(goingTo[3]);
            var endbp = parseInt(goingTo[4]);
            var flank = Math.round((endbp - startbp) * .2);
            //go to location, with some flanking region
            brwsr.navigateTo(goingTo[2]
                             + ":" + (startbp - flank)
                             + ".." + (endbp + flank));
            brwsr.showTracks(brwsr.names.extra[nameMatches[0][0]]);
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

    // get all the tracks from their names with this.getTrack(name),
    // filtering for only tracks that exist
    var tracks =
        dojo.filter( dojo.map( trackNames,
                               dojo.hitch( this, function(n){ return this.tracks[ n ]; } )),
                     function(t) { return t; }
                   );

    // publish some events with the tracks to instruct the views to show them.
    dojo.publish( '/jbrowse/v1/c/tracks/show', [tracks] );
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
        + '<div class="main" style="float: left">'

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

        + '<div class="main" style="float: right">'
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

    var dialog = new dijit.Dialog({
        id: "help_dialog",
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
    dojo.connect(document.body,  'onkeydown', function( evt ) {
        if( evt.keyCode != dojo.keys.SHIFT && evt.keyCode != dojo.keys.CTRL && evt.keyCode != dojo.keys.ALT )
            dialog.hide();
    });
    dojo.connect(document.body,  'onkeypress', function( evt ) {
        if( evt.keyChar == '?' )
            dialog.show();
        else if( evt.keyCode != dojo.keys.SHIFT && evt.keyCode != dojo.keys.CTRL && evt.keyCode != dojo.keys.ALT )
            dialog.hide();
    });

    return helplink;
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
    this.locationBox.value = locString;
    this.goButton.disabled = true;
    this.locationBox.blur();

    // update the location cookie
    var ckname = this.container.id + "-location";
    var oldLocMap = dojo.fromJson( dojo.cookie(ckname ) ) || {};
    oldLocMap[this.refSeq.name] = locString;
    dojo.cookie( ckname, dojo.toJson(oldLocMap), {expires: 60});

    document.title = locString;
};



/**
 * @private
 */

Browser.prototype.createNavBox = function( parent, locLength ) {
    var brwsr = this;
    var navbox = document.createElement("div");
    var browserRoot = this.config.browserRoot ? this.config.browserRoot : "";
    navbox.id = "navbox";
    parent.appendChild(navbox);
    navbox.style.cssText = "text-align: center; z-index: 10;";

    var linkContainer = document.createElement('div');
    dojo.create('a', {
        className: 'powered_by',
        innerHTML: 'JBrowse',
        href: 'http://jbrowse.org',
        title: 'powered by JBrowse'
     }, linkContainer );
    linkContainer.className = 'topLink';
    linkContainer.appendChild( this.makeBookmarkLink() );
    if( this.config.show_nav != 0 )
        linkContainer.appendChild( this.makeHelpDialog()   );

    this.container.appendChild( linkContainer );

    var moveLeft = document.createElement("input");
    moveLeft.type = "image";
    moveLeft.src = browserRoot + "img/slide-left.png";
    moveLeft.id = "moveLeft";
    moveLeft.className = "icon nav";
    moveLeft.style.height = "40px";
    if( this.config.show_nav != 0 ) {
        dojo.connect(moveLeft, "click",
                function(event) {
                dojo.stopEvent(event);
                brwsr.view.slide(0.9);
        });
    }

    var moveRight = document.createElement("input");
    moveRight.type = "image";
    moveRight.src = browserRoot + "img/slide-right.png";
    moveRight.id="moveRight";
    moveRight.className = "icon nav";
    moveRight.style.height = "40px";
    if( this.config.show_nav != 0 ) {
        dojo.connect(moveRight, "click",
                     function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.slide(-0.9);
                 });
    };

    var bigZoomOut = document.createElement("input");
    bigZoomOut.type = "image";
    bigZoomOut.src = browserRoot + "img/zoom-out-2.png";
    bigZoomOut.id = "bigZoomOut";
    bigZoomOut.className = "icon nav";
    bigZoomOut.style.height = "40px";
    if( this.config.show_nav != 0 ) {
        dojo.connect(bigZoomOut, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomOut(undefined, undefined, 2);
                 });
    }

    var zoomOut = document.createElement("input");
    zoomOut.type = "image";
    zoomOut.src = browserRoot + "img/zoom-out-1.png";
    zoomOut.id = "zoomOut";
    zoomOut.className = "icon nav";
    zoomOut.style.height = "40px";
    if( this.config.show_nav != 0 ) {
        dojo.connect(zoomOut, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomOut();
                 });
    }

    var zoomIn = document.createElement("input");
    zoomIn.type = "image";
    zoomIn.src = browserRoot + "img/zoom-in-1.png";
    zoomIn.id = "zoomIn";
    zoomIn.className = "icon nav";
    zoomIn.style.height = "40px";
    if( this.config.show_nav != 0 ) {
        dojo.connect(zoomIn, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomIn();
                 });
    }

    var bigZoomIn = document.createElement("input");
    bigZoomIn.type = "image";
    bigZoomIn.src = browserRoot + "img/zoom-in-2.png";
    bigZoomIn.id = "bigZoomIn";
    bigZoomIn.className = "icon nav";
    bigZoomIn.style.height = "40px";
    if( this.config.show_nav != 0 ) {
        dojo.connect(bigZoomIn, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomIn(undefined, undefined, 2);
                 });
    };

    this.chromList = document.createElement("select");
    this.chromList.id="chrom";
    var refCookie = dojo.cookie(this.config.containerID + "-refseq");
    var i = 0;
    var refnames = [];
    for ( var name in this.allRefs ) {
        if( this.allRefs.hasOwnProperty(name) )
            refnames.push( name );
    }
    refnames = refnames.sort();
    dojo.forEach( refnames, function(name) {
        this.chromList.add( new Option( name, name) );
        if ( name.toUpperCase() == String(refCookie).toUpperCase()) {
            this.refSeq = this.allRefs[name];
            this.chromList.selectedIndex = i;
        }
        i++;
    }, this );

    this.locationBox = document.createElement("input");
    this.locationBox.size=locLength;
    this.locationBox.type="text";
    this.locationBox.id="location";
    if( this.config.show_nav != 0 ) {
        dojo.connect(this.locationBox, "keydown", function(event) {
            if (event.keyCode == dojo.keys.ENTER) {
                brwsr.navigateTo(brwsr.locationBox.value);
                //brwsr.locationBox.blur();
                brwsr.goButton.disabled = true;
                dojo.stopEvent(event);
            } else {
                brwsr.goButton.disabled = false;
            }
        });
    }

    this.goButton = document.createElement("button");
    this.goButton.appendChild(document.createTextNode("Go"));
    this.goButton.disabled = true;
    if( this.config.show_nav != 0 ) {
        dojo.connect(this.goButton, "click", function(event) {
            brwsr.navigateTo(brwsr.locationBox.value);
            //brwsr.locationBox.blur();
            brwsr.goButton.disabled = true;
            dojo.stopEvent(event);
        });
    };

    if( this.config.show_nav != 0 ) {
        navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));
        navbox.appendChild(moveLeft);
        navbox.appendChild(moveRight);
        navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));
        navbox.appendChild(bigZoomOut);
        navbox.appendChild(zoomOut);
        navbox.appendChild(zoomIn);
        navbox.appendChild(bigZoomIn);
        navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));
        navbox.appendChild(this.chromList);
        navbox.appendChild(this.locationBox);
        navbox.appendChild(this.goButton);
    };

    return navbox;
};

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
