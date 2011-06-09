/**
 * Construct a new Browser object.
 * @class This class is the main interface between JBrowse and embedders
 * @constructor
 * @param params a dictionary with the following keys:<br>
 * <ul>
 * <li><code>containerID</code> - ID of the HTML element that contains the browser</li>
 * <li><code>refSeqs</code> - list of reference sequence information items (usually from refSeqs.js)</li>
 * <li><code>trackData</code> - list of track data items (usually from trackInfo.js)</li>
 * <li><code>dataRoot</code> - (optional) URL prefix for the data directory</li>
 * <li><code>browserRoot</code> - (optional) URL prefix for the browser code</li>
 * <li><code>tracks</code> - (optional) comma-delimited string containing initial list of tracks to view</li>
 * <li><code>location</code> - (optional) string describing the initial location</li>
 * <li><code>defaultTracks</code> - (optional) comma-delimited string containing initial list of tracks to view if there are no cookies and no "tracks" parameter</li>
 * <li><code>defaultLocation</code> - (optional) string describing the initial location if there are no cookies and no "location" parameter</li>
 * </ul>
 */

var Browser = function(params) {
    dojo.require("dojo.dnd.Source");
    dojo.require("dojo.dnd.Moveable");
    dojo.require("dojo.dnd.Mover");
    dojo.require("dojo.dnd.move");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.layout.BorderContainer");

    var refSeqs = params.refSeqs;
    var trackData = params.trackData;
    this.deferredFunctions = [];
    this.dataRoot = params.dataRoot;
    var dataRoot;
    if ("dataRoot" in params)
        dataRoot = params.dataRoot;
    else
        dataRoot = "";

    this.names = new LazyTrie(dataRoot + "/names/lazy-",
			      dataRoot + "/names/root.json");
    this.tracks = [];
    var brwsr = this;
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
            topPane.appendChild(overview);
            //try to come up with a good estimate of how big the location box
            //actually has to be
            var maxBase = refSeqs.reduce(function(a,b) {return a.end > b.end ? a : b;}).end;
            var navbox = brwsr.createNavBox(topPane, (2 * (String(maxBase).length + (((String(maxBase).length / 3) | 0) / 2))) + 2, params);

            var viewElem = document.createElement("div");
            brwsr.container.appendChild(viewElem);
            viewElem.className = "dragWindow";

            var containerWidget = new dijit.layout.BorderContainer({
                liveSplitters: false,
                design: "sidebar",
                gutters: false
            }, brwsr.container);
            var contentWidget = new dijit.layout.ContentPane({region: "top"}, topPane);
            var browserWidget = new dijit.layout.ContentPane({region: "center"}, viewElem);

            //create location trapezoid
            brwsr.locationTrap = document.createElement("div");
            brwsr.locationTrap.className = "locationTrap";
            topPane.appendChild(brwsr.locationTrap);
            topPane.style.overflow="hidden";

            //set up ref seqs
            brwsr.allRefs = {};
            for (var i = 0; i < refSeqs.length; i++)
                brwsr.allRefs[refSeqs[i].name] = refSeqs[i];

            var refCookie = dojo.cookie(params.containerID + "-refseq");
            brwsr.refSeq = refSeqs[0];
            for (var i = 0; i < refSeqs.length; i++) {
                brwsr.chromList.options[i] = new Option(refSeqs[i].name,
                                                        refSeqs[i].name);
                if (refSeqs[i].name.toUpperCase() == String(refCookie).toUpperCase()) {
                    brwsr.refSeq = brwsr.allRefs[refSeqs[i].name];
                    brwsr.chromList.selectedIndex = i;
                }
            }

            dojo.connect(brwsr.chromList, "onchange", function(event) {
                    var oldLocMap = dojo.fromJson(dojo.cookie(brwsr.container.id + "-location")) || {};
                    var newRef = brwsr.allRefs[brwsr.chromList.options[brwsr.chromList.selectedIndex].value];

                    if (oldLocMap[newRef.name])
                        brwsr.navigateTo(newRef.name + ":"
                                         + oldLocMap[newRef.name]);
                    else
                        brwsr.navigateTo(newRef.name + ":"
                                         + (((newRef.start + newRef.end) * 0.4) | 0)
                                         + " .. "
                                         + (((newRef.start + newRef.end) * 0.6) | 0));
                        });

            //hook up GenomeView
            var gv = new GenomeView(viewElem, 250, brwsr.refSeq, 1/200);
            brwsr.view = gv;
            brwsr.viewElem = viewElem;
            //gv.setY(0);
            viewElem.view = gv;

            dojo.connect(browserWidget, "resize", function() {
                    gv.sizeInit();

                    brwsr.view.locationTrapHeight = dojo.marginBox(navbox).h;
                    gv.showVisibleBlocks();
                    gv.showFine();
                    gv.showCoarse();
                });
            brwsr.view.locationTrapHeight = dojo.marginBox(navbox).h;

            dojo.connect(gv, "onFineMove", brwsr, "onFineMove");
            dojo.connect(gv, "onCoarseMove", brwsr, "onCoarseMove");

            //set up track list
            brwsr.createTrackList(brwsr.container, params);
            containerWidget.startup();

	    brwsr.isInitialized = true;

            //set initial location
            var oldLocMap = dojo.fromJson(dojo.cookie(brwsr.container.id + "-location")) || {};

            if (params.location) {
                brwsr.navigateTo(params.location);
            } else if (oldLocMap[brwsr.refSeq.name]) {
                brwsr.navigateTo(brwsr.refSeq.name
                                 + ":"
                                 + oldLocMap[brwsr.refSeq.name]);
            } else if (params.defaultLocation){
                brwsr.navigateTo(params.defaultLocation);
            } else {
                brwsr.navigateTo(brwsr.refSeq.name
                                 + ":"
                                 + ((((brwsr.refSeq.start + brwsr.refSeq.end)
                                      * 0.4) | 0)
                                    + " .. "
                                    + (((brwsr.refSeq.start + brwsr.refSeq.end)
                                        * 0.6) | 0)));
            }

	    //if someone calls methods on this browser object
	    //before it's fully initialized, then we defer
	    //those functions until now
	    for (var i = 0; i < brwsr.deferredFunctions.length; i++)
		brwsr.deferredFunctions[i]();
	    brwsr.deferredFunctions = [];
        });
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
    dojo.require("dojo.data.ItemFileWriteStore");
    dojo.require("dijit.tree.ForestStoreModel");
    dojo.require("dijit.tree.dndSource");
    dojo.require("dojo.cache");
    dojo.require("dijit.Tree");
    dojo.require("dijit.form.TextBox");
    dojo.require("dijit.form.Button");

    var leftPane = document.createElement("div");
    leftPane.style.cssText="width: 20em; overflow: auto;";
    parent.appendChild(leftPane);
    var leftWidget = new dijit.layout.ContentPane({region: "left", splitter: true}, leftPane);

    var searchMessage = document.createElement("div");
    searchMessage.innerHTML = "Enter text to search track list:";
    leftPane.appendChild(searchMessage);

    var searchBox = document.createElement("input");
    searchBox.id = "search";
    leftPane.appendChild(searchBox);

    var searchClearBtn = new dijit.form.Button({ label: "clear"});
    searchClearBtn.domNode.style.cssText = 'display: inline';
    leftPane.appendChild(searchClearBtn.domNode);

    var dragMessage = document.createElement("div");
    dragMessage.innerHTML =
        "Available Tracks:<br/>(Drag <img src=\""
        + (params.browserRoot ? params.browserRoot : "")
        + "img/right_arrow.png\"/> to view)<br/><br/>";
    leftPane.appendChild(dragMessage);

    var treeSection = document.createElement("div");
    treeSection.id = "treeList";
    treeSection.style.cssText =
        "width: 100%; height: 100%; overflow-x: hidden; overflow-y: auto;";
    leftPane.appendChild(treeSection);

    var brwsr = this;

    var changeCallback = function() {
        brwsr.view.showVisibleBlocks(true);
    };

    var trackListCreate = function(track, hint) {
        if(track != '[object Object]') {
            track = {'url' : String(store.getValue(track.item, 'url')),
                     'label' : track.label,
                     'key' : track.key,
                     'args_chunkSize': String(store.getValue(track.item, 'args_chunkSize')),
                     'type' : String(store.getValue(track.item, 'type'))};
        }
        var node = document.createElement("div");
        node.className = "tracklist-label";
        node.innerHTML = track.label;
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

    var DropFromOutside = function(source, nodes, copy) {
        var reviewed_nodes = [];
        var j = 0;
        for(var i = 0; i < nodes.length; i++) {
            if(source.getItem(nodes[i].id).data.item.type[0] == 'TrackGroup') {
                tree._expandNode(source.getItem(nodes[i].id).data);
                var children = source.getItem(nodes[i].id).data.getChildren();
                for(var n = 0; n < children.length; n++) {
                    var child = children[n];
                    if((child.domNode.style.display != "none")&&(child.item.type[0] != 'TrackGroup')) {
                        var selectedNodes = source.getSelectedTreeNodes();
                        selectedNodes.push(child);
                        source.setSelection(selectedNodes);
                        reviewed_nodes[j] = child.domNode;
                        j++;
                    }
                }
            }
            else if(nodes[i].style.display != "none") {
                reviewed_nodes[j] = nodes[i];
                j++;
            }
        }
        nodes = reviewed_nodes;

        var oldCreator = this._normalizedCreator;
        // transferring nodes from the source to the target
        if(this.creator){
            // use defined creator
            this._normalizedCreator = function(node, hint){
                return oldCreator.call(this, source.getItem(node.id).data, hint);
            };
        }else{
            // we have no creator defined => move/clone nodes
            if(copy){
                // clone nodes
                this._normalizedCreator = function(node, hint){
                    var t = source.getItem(node.id);
                    var n = node.cloneNode(true);
                    n.id = dojo.dnd.getUniqueId();
                    return {node: n, data: t.data, type: t.type};
                };
            }else{
                // move nodes
                this._normalizedCreator = function(node, hint){
                    var t = source.getItem(node.id);
                    source.delItem(node.id);
                    return {node: node, data: t.data, type: t.type};
                };
            }
        }
        this.selectNone();
        if(!copy && !this.creator){
            source.selectNone();
        }
        this.insertNodes(true, nodes, this.before, this.current);
        if(!copy && this.creator && (source instanceof dojo.dnd.Source)){
            source.deleteSelectedNodes();
        }
        if(!copy && this.creator && source instanceof dijit.tree.dndSource) {
            for(var i = 0; i < nodes.length; i++) {
                nodes[i].style.cssText = "display: none";
            }
        }
        this._normalizedCreator = oldCreator;
    };

    var trackCreate = function(track, hint) {
        var node;
        if ("avatar" == hint) {
            return trackListCreate(track, hint);
        } else {
            if(track != '[object Object]') {
                track = {'url' : String(store.getValue(track.item, 'url')),
                         'label' : track.label,
                         'key' : track.label,
                         'args_chunkSize': String(store.getValue(track.item, 'args_chunkSize')),
                         'type' : String(store.getValue(track.item, 'type'))};
            }
            var replaceData = {refseq: brwsr.refSeq.name};
            var url = track.url.replace(/\{([^}]+)\}/g, function(match, group) {return replaceData[group];});
            var klass = eval(track.type);
            var newTrack = new klass(track, url, brwsr.refSeq,
                                     {
                                         changeCallback: changeCallback,
                                         trackPadding: brwsr.view.trackPadding,
                                         baseUrl: brwsr.dataRoot,
                                         charWidth: brwsr.view.charWidth,
                                         seqHeight: brwsr.view.seqHeight
                                     });
            node = brwsr.view.addTrack(newTrack);
            var btn = new dijit.form.Button(
                            { label: "close" , 
                              showLabel: false,
                              iconClass: "dijitTabCloseButton",
                              onClick: function() {
                                  brwsr.viewDndWidget.delItem(node.id);
                                  node.parentNode.removeChild(node);
                                  brwsr.onVisibleTracksChanged();
                                  var map = brwsr.mapLabelToNode(dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).getChildren(), {});
                                  map[track.label].style.cssText = "display: block";
                            }});
            btn.domNode.firstChild.style.cssText = 'background: none; border-style: none; border-width: 0px; padding: 0em;';
            newTrack.label.insertBefore(btn.domNode, newTrack.deleteButtonContainer);
        }
        return {node: node, data: track, type: ["track"]};
    };

    this.viewDndWidget = new dojo.dnd.Source(this.view.zoomContainer,
                                       {
                                           creator: trackCreate,
                                           onDropExternal: DropFromOutside,
                                           accept: ["treeNode"],
                                           withHandles: true
                                       });

    var externalSourceCreator = function(nodes, target, source) {
        return dojo.map(nodes, function(node){
            var dataObj = brwsr.viewDndWidget.getItem(node.id);
            brwsr.viewDndWidget.delItem(node.id);
            node.parentNode.removeChild(node);
            brwsr.onVisibleTracksChanged();
            return {
                'key' : node.id,
                'label' : dataObj.data.label, 
                'type' : dataObj.data.type,
                'url' : dataObj.data.url,
                'args_chunkSize': dataObj.data.args_chunkSize
            };
        });
    };

    var nodePlacementAcceptance = function(target, source, position) {
        var item = dijit.getEnclosingWidget(target).item;
        var target_group = dijit.getEnclosingWidget(target).getParent().item.label? dijit.getEnclosingWidget(target).getParent().item.label[0] : undefined;
        var source_group, source_node;
        if(source instanceof dojo.dnd.Source) {
             return false;
        }
        else if(source instanceof dijit.tree.dndSource){
             source_node = source.getSelectedTreeNodes()[0].item;
             source_group = source.getSelectedTreeNodes()[0].getParent().item.label? source.getSelectedTreeNodes()[0].getParent().item.label[0] : undefined;
        }
        
        if(item == null) {
            console.log("the target is undefined");
            return false;
        }
        if(source_node != undefined) {
            if((source_node.type[0] == "TrackGroup") && ((position == 'before' || (position == 'after')))) {
                return true;
            }
            if((item.type[0] == "TrackGroup") && (position == 'over') && (source_group == item.label[0])) {
                return true;
            } 
            if(((position == 'before') || (position == 'after')) && (source_group == target_group)) {
                return true;
            }
        }
        return false;
    };

    var store = new dojo.data.ItemFileWriteStore({
        data: {
                identifier: 'key',
                label: 'label',
                items: params.trackData
              }
    });

    this.store = store;
    store.save();

    var treeModel = new dijit.tree.TreeStoreModel({
        store: store,
        query: {
            "label": "ROOT"
        },
        childrenAttrs: ["children"]
    });

    var tree = new dijit.Tree({
        dragThreshold: 0,
        model: treeModel,
        dndController: "dijit.tree.dndSource",
        showRoot: false,
        itemCreator: externalSourceCreator,
        betweenThreshold: 5,
        openOnDblClick: true,
        checkItemAcceptance: nodePlacementAcceptance
    },
    "treeList");

    this.tree = tree;

    dojo.subscribe("/dnd/drop", function(source,nodes,iscopy){
                       brwsr.onVisibleTracksChanged();
                       //multi-select too confusing?
                       //brwsr.viewDndWidget.selectNone();
                   });

    var oldTrackList = dojo.cookie(this.container.id + "-tracks");
    if (params.tracks) {
        this.showTracks(params.tracks);
    } else if (oldTrackList) {
        this.showTracks(oldTrackList);
    } else if (params.defaultTracks) {
        this.showTracks(params.defaultTracks);
    }

    var treeSearch = new dijit.form.TextBox({
        name: "search",
        value: ""
    },
    "search");

    function searchTrackList(searchTerm) {
        var map = brwsr.mapLabelToNode(dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).getChildren(), {});

        var MovedTrackList = dojo.cookie(brwsr.container.id + "-tracks").split(",");
        var toDelete = {};
        var idx;
        for(idx = 0; idx < MovedTrackList.length; idx++) {
            toDelete[MovedTrackList[idx]] = true;
        }

        function fetchFailed(error, request) {
            alert("lookup failed");
            alert(error);
        };

        function gotItems(items, request) {
            var i;
            var pattern = new RegExp("");
            pattern = new RegExp(searchTerm.toLowerCase());
            for(i = 0; i < items.length; i++) {
                if(map[items[i].label]) {
                    if(toDelete[String(items[i].label)] || (!pattern.test(String(items[i].label).toLowerCase()) && String(items[i].type) != 'TrackGroup')) {
                        map[items[i].label].style.cssText = "display: none";
                    }
                    else {
                        map[items[i].label].style.cssText = "display: block";
                    }
               }
            }
        };

        store.fetch({
            onComplete: gotItems,
            onError: fetchFailed
        });
    }
    dojo.connect(treeSearch, "onKeyUp", function() {
        var searchTerm = treeSearch.attr("value");
        searchTrackList(searchTerm);
    });
    dojo.connect(searchClearBtn, "onClick", function() {
        searchTrackList("");
        treeSearch.attr("value", "");
    });
};

Browser.prototype.showTrackListNode = function(label) {
        var map = brwsr.mapLabelToNode(dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).getChildren(), {});
        map[label].style.cssText = "display: none";
}

Browser.prototype.hideTrackListNode = function(label) {
        var map = brwsr.mapLabelToNode(dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).getChildren(), {});
        map[label].style.cssText = "display: block";
}

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
 * @private
 * add new tracks to the track list
 * @param trackList list of track information items
 * @param replace true if this list of tracks should replace any existing
 * tracks, false to merge with the existing list of tracks
 */

Browser.prototype.addTracks = function(trackList, replace) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(
            function() {brwsr.addTracks(trackList, show); }
        );
	return;
    }

    this.tracks.concat(trackList);
    if (show || (show === undefined)) {
        this.showTracks(dojo.map(trackList,
                                 function(t) {return t.label;}).join(","));
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
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(function() { brwsr.navigateTo(loc); });
	return;
    }

    loc = dojo.trim(loc);
    //                                (chromosome)    (    start      )   (  sep     )     (    end   )
    var matches = String(loc).match(/^(((\S*)\s*:)?\s*(-?[0-9,.]*[0-9])\s*(\.\.|-|\s+))?\s*(-?[0-9,.]+)$/i);
    //matches potentially contains location components:
    //matches[3] = chromosome (optional)
    //matches[4] = start base (optional)
    //matches[6] = end base (or center base, if it's the only one)
    if (matches) {
	if (matches[3]) {
	    var refName;
	    for (ref in this.allRefs) {
		if ((matches[3].toUpperCase() == ref.toUpperCase())
                    ||
                    ("CHR" + matches[3].toUpperCase() == ref.toUpperCase())
                    ||
                    (matches[3].toUpperCase() == "CHR" + ref.toUpperCase())) {

		    refName = ref;
                }
            }
	    if (refName) {
		dojo.cookie(this.container.id + "-refseq", refName, {expires: 60});
		if (refName == this.refSeq.name) {
		    //go to given start, end on current refSeq
		    this.view.setLocation(this.refSeq,
					  parseInt(matches[4].replace(/[,.]/g, "")),
					  parseInt(matches[6].replace(/[,.]/g, "")));
		} else {
		    //new refseq, record open tracks and re-open on new refseq
                    var curTracks = [];
                    this.viewDndWidget.forInItems(function(obj, id, map) {
                            curTracks.push(obj.data);
                        });

		    for (var i = 0; i < this.chromList.options.length; i++)
			if (this.chromList.options[i].text == refName)
			    this.chromList.selectedIndex = i;
		    this.refSeq = this.allRefs[refName];
		    //go to given refseq, start, end
		    this.view.setLocation(this.refSeq,
					  parseInt(matches[4].replace(/[,.]/g, "")),
					  parseInt(matches[6].replace(/[,.]/g, "")));

                    this.viewDndWidget.insertNodes(false, curTracks);
                    this.onVisibleTracksChanged();
		}
		return;
	    }
	} else if (matches[4]) {
	    //go to start, end on this refseq
	    this.view.setLocation(this.refSeq,
				  parseInt(matches[4].replace(/[,.]/g, "")),
				  parseInt(matches[6].replace(/[,.]/g, "")));
	    return;
	} else if (matches[6]) {
	    //center at given base
	    this.view.centerAtBase(parseInt(matches[6].replace(/[,.]/g, "")));
	    return;
	}
    }
    //if we get here, we didn't match any expected location format

    var brwsr = this;
    this.names.exactMatch(loc, function(nameMatches) {
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

Browser.prototype.mapLabelToNode = function(tree, map) {
    for( var i = 0; i < tree.length; i++) {
        map[tree[i].label] = tree[i].domNode;
        if(tree[i].getChildren()[0] != undefined) {
            this.mapLabelToNode(tree[i].getChildren(), map);
        }
    } 
    return map;
}

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
    var trackInput = [];
    var brwsr = this;
    var store = this.store;
    var tree = this.tree;

    var map = brwsr.mapLabelToNode(dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).getChildren(), {});

    for (var n = 0; n < trackNames.length; n++) {
        if(map[trackNames[n]]) {
            map[trackNames[n]].style.cssText = "display: none";
        }
        function fetchFailed(error, request) {
            alert("lookup failed");
            alert(error);
        }
    
        function gotItems(items, request) {
            var i;
            for(i = 0; i < items.length; i++) {
                var dataObj = {'url' : items[i].url[0],
                               'label' : items[i].label[0],
                               'type' : items[i].type[0],
                               'key' : items[i].key[0],
                               'args_chunkSize': (items[i].args_chunkSize? items[i].args_chunkSize[0] :  2000)};
                brwsr.viewDndWidget.insertNodes(false, [dataObj]);
            }
            brwsr.onVisibleTracksChanged();
        }

        store.fetch({
            query: { "label" : trackNames[n]},
            queryOptions : { "ignoreCase" : true },
            onComplete: gotItems,
            onError: fetchFailed
        });
    }
};

/**
 * @returns {String} string representation of the current location<br>
 * (suitable for passing to navigateTo)
 */
Browser.prototype.visibleRegion = function() {
    return this.view.ref.name + ":" + Math.round(this.view.minVisible()) + ".." + Math.round(this.view.maxVisible());
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
    var locString = Util.addCommas(Math.round(startbp)) + " .. " + Util.addCommas(Math.round(endbp));
    this.locationBox.value = locString;
    this.goButton.disabled = true;
    this.locationBox.blur();
    var oldLocMap = dojo.fromJson(dojo.cookie(this.container.id + "-location"));
    if ((typeof oldLocMap) != "object") oldLocMap = {};
    oldLocMap[this.refSeq.name] = locString;
    dojo.cookie(this.container.id + "-location",
                dojo.toJson(oldLocMap),
                {expires: 60});

    document.title = this.refSeq.name + ":" + locString;
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

    if (params.bookmark) {
        this.link = document.createElement("a");
        this.link.appendChild(document.createTextNode("Link"));
        this.link.href = window.location.href;
        dojo.connect(this, "onCoarseMove", function() {
                         brwsr.link.href = params.bookmark(brwsr);
                     });
        dojo.connect(this, "onVisibleTracksChanged", function() {
                         brwsr.link.href = params.bookmark(brwsr);
                     });
        this.link.style.cssText = "float: right; clear";
        navbox.appendChild(this.link);
    }

    var moveLeft = document.createElement("input");
    moveLeft.type = "image";
    moveLeft.src = browserRoot + "img/slide-left.png";
    moveLeft.id = "moveLeft";
    moveLeft.className = "icon nav";
    moveLeft.style.height = "40px";
    dojo.connect(moveLeft, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.slide(0.9);
                 });
    navbox.appendChild(moveLeft);

    var moveRight = document.createElement("input");
    moveRight.type = "image";
    moveRight.src = browserRoot + "img/slide-right.png";
    moveRight.id="moveRight";
    moveRight.className = "icon nav";
    moveRight.style.height = "40px";
    dojo.connect(moveRight, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.slide(-0.9);
                 });
    navbox.appendChild(moveRight);

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));

    var bigZoomOut = document.createElement("input");
    bigZoomOut.type = "image";
    bigZoomOut.src = browserRoot + "img/zoom-out-2.png";
    bigZoomOut.id = "bigZoomOut";
    bigZoomOut.className = "icon nav";
    bigZoomOut.style.height = "40px";
    navbox.appendChild(bigZoomOut);
    dojo.connect(bigZoomOut, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomOut(undefined, undefined, 2);
                 });

    var zoomOut = document.createElement("input");
    zoomOut.type = "image";
    zoomOut.src = browserRoot + "img/zoom-out-1.png";
    zoomOut.id = "zoomOut";
    zoomOut.className = "icon nav";
    zoomOut.style.height = "40px";
    dojo.connect(zoomOut, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomOut();
                 });
    navbox.appendChild(zoomOut);

    var zoomIn = document.createElement("input");
    zoomIn.type = "image";
    zoomIn.src = browserRoot + "img/zoom-in-1.png";
    zoomIn.id = "zoomIn";
    zoomIn.className = "icon nav";
    zoomIn.style.height = "40px";
    dojo.connect(zoomIn, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomIn();
                 });
    navbox.appendChild(zoomIn);

    var bigZoomIn = document.createElement("input");
    bigZoomIn.type = "image";
    bigZoomIn.src = browserRoot + "img/zoom-in-2.png";
    bigZoomIn.id = "bigZoomIn";
    bigZoomIn.className = "icon nav";
    bigZoomIn.style.height = "40px";
    dojo.connect(bigZoomIn, "click",
                 function(event) {
                     dojo.stopEvent(event);
                     brwsr.view.zoomIn(undefined, undefined, 2);
                 });
    navbox.appendChild(bigZoomIn);

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));
    this.chromList = document.createElement("select");
    this.chromList.id="chrom";
    navbox.appendChild(this.chromList);
    this.locationBox = document.createElement("input");
    this.locationBox.size=locLength;
    this.locationBox.type="text";
    this.locationBox.id="location";
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
    navbox.appendChild(this.locationBox);

    this.goButton = document.createElement("button");
    this.goButton.appendChild(document.createTextNode("Go"));
    this.goButton.disabled = true;
    dojo.connect(this.goButton, "click", function(event) {
            brwsr.navigateTo(brwsr.locationBox.value);
            //brwsr.locationBox.blur();
            brwsr.goButton.disabled = true;
            dojo.stopEvent(event);
        });
    navbox.appendChild(this.goButton);

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
