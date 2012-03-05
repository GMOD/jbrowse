/**
 * Construct a new Browser object.
 * @class This class is the main interface between JBrowse and embedders
 * @constructor
 * @param params an object with the following properties:<br>
 * <ul>
 * <li><code>containerID</code> - ID of the HTML element that contains the browser</li>
 * <li><code>refSeqs</code> - object with "url" property that is the URL to list of reference sequence information items</li>
 * <li><code>tracklists</code> - list of objects with "url" property that points to a track list JSON file</li>
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

    this.params = params;
    var brwsr = this;

    this.deferredFunctions = [];

    if (params.nameUrl)
        this.names = new LazyTrie(params.nameUrl, "lazy-{Chunk}.json");
    this.tracks = [];
    brwsr.isInitialized = false;
    dojo.addOnLoad(
        function() {
            //set up top nav/overview pane and main GenomeView pane
            dojo.addClass(document.body, "tundra");
            brwsr.container = dojo.byId(params.containerID);
            brwsr.container.genomeBrowser = brwsr;
            var topPane = document.createElement("div");
            brwsr.container.appendChild(topPane);

            var overview = document.createElement("div");
            overview.className = "overview";
            overview.id = "overview";
            // overview=0 hides the overview, but we still need it to exist
            if( params.show_overview == 0 ) overview.style.cssText = "display: none";
            topPane.appendChild(overview);

            //try to come up with a good estimate of how big the location box
            //actually has to be
            brwsr.navbox = brwsr.createNavBox( topPane, 25, params );

            var viewElem = document.createElement("div");
            brwsr.viewElem = viewElem;
            brwsr.container.appendChild(viewElem);
            viewElem.className = "dragWindow";

            brwsr.containerWidget = new dijit.layout.BorderContainer({
                liveSplitters: false,
                design: "sidebar",
                gutters: false
            }, brwsr.container);
            var contentWidget =
                new dijit.layout.ContentPane({region: "top"}, topPane);
            brwsr.browserWidget =
                new dijit.layout.ContentPane({region: "center"}, viewElem);

            //create location trapezoid
            brwsr.locationTrap = document.createElement("div");
            brwsr.locationTrap.className = "locationTrap";
            topPane.appendChild(brwsr.locationTrap);
            topPane.style.overflow="hidden";

            var cookieTracks = dojo.cookie(brwsr.container.id + "-tracks");
            if (params.tracks) {
                brwsr.origTracklist = params.tracks;
            } else if (cookieTracks) {
                brwsr.origTracklist = cookieTracks;
            } else if (params.defaultTracks) {
                brwsr.origTracklist = params.defaultTracks;
            }

            Util.maybeLoad(params.refSeqs.url, params.refSeqs,
                           function(o) {
                               brwsr.addRefseqs(o);
                           });

            for (var i = 0; i < params.tracklists.length; i++) {
                (function(tracklist) {
                     Util.maybeLoad(tracklist.url,
                                    tracklist,
                                    function(o) {
                                        brwsr.addDeferred(
                                            function() {
                                                brwsr.addTracklist(tracklist.url, o);
                                            });
                                    });
                 })(params.tracklists[i]);
            }
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

Browser.prototype.addTracklist = function(url, trackList) {
    if (1 == trackList.formatVersion) {
        for (var i = 0; i < trackList.tracks.length; i++)
            trackList.tracks[i].sourceUrl = url;
        this.trackListWidget.insertNodes(false, trackList.tracks);
        this.showTracks(this.origTracklist);
    } else {
        throw "track list format " + trackList.formatVersion + " not supported";
    }
};

Browser.prototype.addRefseqs = function(refSeqs) {
    //currently only meant to be called once

    this.allRefs = {};
    for (var i = 0; i < refSeqs.length; i++)
        this.allRefs[refSeqs[i].name] = refSeqs[i];

    var refCookie = dojo.cookie(this.params.containerID + "-refseq");
    this.refSeq = refSeqs[0];
    for (var i = 0; i < refSeqs.length; i++) {
        this.chromList.options[i] = new Option(refSeqs[i].name,
                                               refSeqs[i].name);
        if (refSeqs[i].name.toUpperCase() == String(refCookie).toUpperCase()) {
            this.refSeq = this.allRefs[refSeqs[i].name];
            this.chromList.selectedIndex = i;
        }
    }

    //hook up GenomeView
    var gv = new GenomeView(this.viewElem, 250, this.refSeq, 1/200,
                            this.params.browserRoot);
    this.view = gv;
    //gv.setY(0);
    this.viewElem.view = gv;

    //set up track list
    var trackListDiv = this.createTrackList(this.container, this.params);
    this.containerWidget.startup();

    var brwsr = this;
    this.resizeCallback = function() {
        gv.sizeInit();

        brwsr.view.locationTrapHeight = dojo.marginBox(brwsr.navbox).h;
        gv.showVisibleBlocks();
        gv.showFine();
        gv.showCoarse();
    };
    dojo.connect(this.browserWidget, "resize", this.resizeCallback);
    this.resizeCallback();

    dojo.connect(gv, "onFineMove", brwsr, "onFineMove");
    dojo.connect(gv, "onCoarseMove", brwsr, "onCoarseMove");

    //set initial location
    var oldLocMap = dojo.fromJson(dojo.cookie(brwsr.container.id + "-location")) || {};
    if (this.params.location) {
        this.navigateTo(this.params.location);
    } else if (oldLocMap[this.refSeq.name]) {
        this.navigateTo( oldLocMap[this.refSeq.name] );
    } else if (this.params.defaultLocation){
        this.navigateTo(this.params.defaultLocation);
    } else {
        this.navigateTo( Util.assembleLocString({
                             ref:   this.refSeq.name,
                             start: 0.4 * ( this.refSeq.start + this.refSeq.end ),
                             end:   0.6 * ( this.refSeq.start + this.refSeq.end )
                         })
                       );
    }

    dojo.connect(this.chromList, "onchange", function(event) {
        var newRef = brwsr.allRefs[brwsr.chromList.options[brwsr.chromList.selectedIndex].value];
        brwsr.navigateTo( newRef.name );
    });

    this.isInitialized = true;

    //if someone calls methods on this browser object
    //before it's fully initialized, then we defer
    //those functions until now
    for (var i = 0; i < brwsr.deferredFunctions.length; i++)
        brwsr.deferredFunctions[i]();
    brwsr.deferredFunctions = [];
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

/**
 * @private
 */


Browser.prototype.createTrackList = function(parent, params) {
    var leftPane = document.createElement("div");
    leftPane.id = "trackPane";
    leftPane.style.cssText= params.show_tracklist == 0 ? "width: 0": "width: 10em";
    parent.appendChild(leftPane);
    //splitter on left side
    var leftWidget = new dijit.layout.ContentPane({region: "left", splitter: true}, leftPane);
    var trackListDiv = document.createElement("div");
    trackListDiv.id = "tracksAvail";
    trackListDiv.className = "container handles";
    trackListDiv.style.cssText =
        "width: 100%; height: 100%; overflow-x: hidden; overflow-y: auto;";
    trackListDiv.innerHTML =
        "Available Tracks:<br/>(Drag <img src=\""
        + (params.browserRoot ? params.browserRoot : "")
        + "img/right_arrow.png\"/> to view)<br/><br/>";
    leftPane.appendChild(trackListDiv);

    var brwsr = this;

    var changeCallback = function() {
       brwsr.view.showVisibleBlocks(true);
    };

    var trackListCreate = function(track, hint) {
        var node = document.createElement("div");
        node.className = "tracklist-label";
        node.innerHTML = track.key;
        //in the list, wrap the list item in a container for
        //border drag-insertion-point monkeying
        if ("avatar" != hint) {
            var container = document.createElement("div");
            container.className = "tracklist-container";
            container.appendChild(node);
            node = container;
        }
        node.id = dojo.dnd.getUniqueId();
        return {node: node, data: track, type: ["track"]};
    };
    this.trackListWidget = new dojo.dnd.Source(trackListDiv,
                                               {creator: trackListCreate,
                                                accept: ["track"], // accepts tracks into left div
                                                withHandles: false});

    var trackCreate = function(track, hint) {
        var node;
        if ("avatar" == hint) {
            return trackListCreate(track, hint);
        } else {
            var klass = eval(track.type);
            var newTrack = new klass(track, brwsr.refSeq,
                                     {
                                         changeCallback: changeCallback,
                                         trackPadding: brwsr.view.trackPadding,
                                         charWidth: brwsr.view.charWidth,
                                         seqHeight: brwsr.view.seqHeight
                                     });
            node = brwsr.view.addTrack(newTrack);
        }
        return {node: node, data: track, type: ["track"]};
    };


    this.viewDndWidget = new dojo.dnd.Source(this.view.zoomContainer,
                                       {
                                           creator: trackCreate,
                                           accept: ["track"], //accepts tracks into the viewing field
                                           withHandles: true
                                       });
    dojo.subscribe("/dnd/drop", function(source,nodes,iscopy){
                       brwsr.onVisibleTracksChanged();
                       //multi-select too confusing?
                       //brwsr.viewDndWidget.selectNone();
                   });

    return trackListDiv;
};

/**
 * @private
 */


Browser.prototype.onVisibleTracksChanged = function() {
    this.view.updateTrackList();
    var trackLabels = dojo.map(this.view.tracks,
                               function(track) { return track.name; });
    dojo.cookie(this.container.id + "-tracks",
                trackLabels.join(","),
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
        var brwsr = this;
        this.deferredFunctions.push(function() { brwsr.navigateTo(loc); });
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
        // record open tracks and re-open on new refseq
        var curTracks = [];
        this.viewDndWidget.forInItems(function(obj, id, map) {
            curTracks.push(obj.data);
        });

        for (var i = 0; i < this.chromList.options.length; i++)
            if (this.chromList.options[i].text == location.ref )
                this.chromList.selectedIndex = i;

        this.refSeq = this.allRefs[location.ref];

        this.view.setLocation( this.refSeq,
                               location.start,
                               location.end );

        this.viewDndWidget.insertNodes( false, curTracks );
        this.onVisibleTracksChanged();
    }

    return;
    //this.view.centerAtBase( location.end );
}

// given a string name, search for matching feature names and set the
// view location to any that match
Browser.prototype.searchNames = function( loc ) {
    var brwsr = this;
    this.names.exactMatch( loc, function(nameMatches) {
            var goingTo;
            //first check for exact case match
            for (var i = 0; i < nameMatches.length; i++) {
                if (nameMatches[i][1] == loc)
                    goingTo = nameMatches[i];
            }
            //if no exact case match, try a case-insentitive match
            if (!goingTo) {
                for (var i = 0; i < nameMatches.length; i++) {
                    if (nameMatches[i][1].toLowerCase() == loc.toLowerCase())
                        goingTo = nameMatches[i];
                }
            }
            //else just pick a match
            if (!goingTo) goingTo = nameMatches[0];
            var startbp = goingTo[3];
            var endbp = goingTo[4];
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
 * gb.showTracks("DNA,gene,mRNA,noncodingRNA")
 * @param trackNameList {String} comma-delimited string containing track names,
 * each of which should correspond to the "label" element of the track
 * information dictionaries
 */

Browser.prototype.showTracks = function(trackNameList) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(
            function() { brwsr.showTracks(trackNameList); }
        );
        return;
    }

    var trackNames = trackNameList.split(",");
    var removeFromList = [];
    var brwsr = this;
    for (var n = 0; n < trackNames.length; n++) {
        this.trackListWidget.forInItems(function(obj, id, map) {
                if (trackNames[n] == obj.data.label) {
                    brwsr.viewDndWidget.insertNodes(false, [obj.data]);
                    removeFromList.push(id);
                }

            });
    }
    var movedNode;
    for (var i = 0; i < removeFromList.length; i++) {
        this.trackListWidget.delItem(removeFromList[i]);
        movedNode = dojo.byId(removeFromList[i]);
        movedNode.parentNode.removeChild(movedNode);
    }
    this.onVisibleTracksChanged();
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
 * @returns {String} containing comma-separated list of currently-viewed tracks<br>
 * (suitable for passing to showTracks)
 */

Browser.prototype.visibleTracks = function() {
    var trackLabels = dojo.map(this.view.tracks,
                               function(track) { return track.name; });
    return trackLabels.join(",");
};

Browser.prototype.makeBookmarkLink = function (area) {
    // don't make the link if we were explicitly passed a 'bookmark'
    // param of 'false'
    if( typeof this.params.bookmark != 'undefined' && !this.params.bookmark )
        return;

    // if a function was not passed, make a default bookmarking function
    if( typeof this.params.bookmark != 'function' )
        this.params.bookmark = function( browser_obj ) {
               return "".concat(
                   window.location.protocol,
                   "//",
                   window.location.host,
                   window.location.pathname,
                   "?",
                   dojo.objectToQuery({
                       loc:    browser_obj.visibleRegion(),
                       tracks: browser_obj.visibleTracks(),
                       data:   browser_obj.params.queryParams.data
                   })
               );
        };

    // make the bookmark link
    this.link = document.createElement("a");
    this.link.href = window.location.href;
    this.link.appendChild(
        document.createTextNode(
            this.params.show_nav == 0 || this.params.show_tracklist == 0 || this.params.show_overview == 0
                ? "Full view"
                : "Link"
        )
    );
    this.link.style.cssText = "float: right; clear: both;";

    // put it in the DOM
    area.appendChild(this.link);

    // connect moving events to update it
    var update_bookmark = function() {
        this.link.href = this.params.bookmark.call( this, this );
    };
    dojo.connect( this, "onCoarseMove",           update_bookmark, this );
    dojo.connect( this, "onVisibleTracksChanged", update_bookmark, this );

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

Browser.prototype.createNavBox = function(parent, locLength, params) {
    var brwsr = this;
    var navbox = document.createElement("div");
    var browserRoot = params.browserRoot ? params.browserRoot : "";
    navbox.id = "navbox";
    parent.appendChild(navbox);
    navbox.style.cssText = "text-align: center; padding: 2px; z-index: 10;";
    brwsr.makeBookmarkLink( navbox );

    var moveLeft = document.createElement("input");
    moveLeft.type = "image";
    moveLeft.src = browserRoot + "img/slide-left.png";
    moveLeft.id = "moveLeft";
    moveLeft.className = "icon nav";
    moveLeft.style.height = "40px";
    if( params.show_nav != 0 ) {
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
    if( params.show_nav != 0 ) {
        dojo.connect(moveRight, "click",
                     function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.slide(-0.9);
                 });
    };

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));

    var bigZoomOut = document.createElement("input");
    bigZoomOut.type = "image";
    bigZoomOut.src = browserRoot + "img/zoom-out-2.png";
    bigZoomOut.id = "bigZoomOut";
    bigZoomOut.className = "icon nav";
    bigZoomOut.style.height = "40px";
    if( params.show_nav != 0 ) {
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
    if( params.show_nav != 0 ) {
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
    if( params.show_nav != 0 ) {
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
    if( params.show_nav != 0 ) {
        dojo.connect(bigZoomIn, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomIn(undefined, undefined, 2);
                 });
    };

    this.chromList = document.createElement("select");
    this.chromList.id="chrom";
    this.locationBox = document.createElement("input");
    this.locationBox.size=locLength;
    this.locationBox.type="text";
    this.locationBox.id="location";
    if( params.show_nav != 0 ) {
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
    if( params.show_nav != 0 ) {
        dojo.connect(this.goButton, "click", function(event) {
            brwsr.navigateTo(brwsr.locationBox.value);
            //brwsr.locationBox.blur();
            brwsr.goButton.disabled = true;
            dojo.stopEvent(event);
        });
    };

    if( params.show_nav != 0 ) {
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
