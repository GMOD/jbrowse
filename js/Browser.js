var djConfig = {
    usePlainJson: true
};

var Browser = function(containerID, refSeqs, trackData, dataRoot) {
    dojo.require("dojo.dnd.Source");
    dojo.require("dojo.dnd.Moveable");
    dojo.require("dojo.dnd.Mover");
    dojo.require("dojo.dnd.move");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.layout.BorderContainer");

    this.deferredFunctions = [];
    this.dataRoot = dataRoot;
    if (!dataRoot) dataRoot = "";
    this.names = new LazyTrie(dataRoot + "names/lazy-",
			      dataRoot + "names/root.json");
    this.tracks = [];
    var brwsr = this;
    brwsr.isInitialized = false;
    dojo.addOnLoad(function() {
            dojo.addClass(document.body, "tundra");
            brwsr.container = dojo.byId(containerID);
            brwsr.container.genomeBrowser = brwsr;
            var containerWidget = new dijit.layout.BorderContainer({
                    liveSplitters: false,
                    design: "sidebar"
                }, brwsr.container);
            var topPane = document.createElement("div");
            brwsr.container.appendChild(topPane);
            var contentWidget = new dijit.layout.ContentPane({region: "top"}, topPane);
            var overview = document.createElement("div");
            overview.className = "overview";
            overview.id = "overview";
            topPane.appendChild(overview);
            //try to come up with a good estimate of how big the location box
            //actually has to be
            var maxBase = refSeqs.reduce(function(a,b) {return a.end > b.end ? a : b;}).end;
            var navbox = brwsr.createNavBox(topPane, (2 * (String(maxBase).length + (((String(maxBase).length / 3) | 0) / 2))) + 2);

            var viewElem = document.createElement("div");
            brwsr.container.appendChild(viewElem);
            var browserWidget = new dijit.layout.ContentPane({region: "center"}, viewElem);
            viewElem.className = "dragWindow";

            brwsr.locationTrap = document.createElement("div");
            brwsr.locationTrap.className = "locationTrap";
            topPane.appendChild(brwsr.locationTrap);
            topPane.style.overflow="hidden";

            brwsr.allRefs = {};
            for (var i = 0; i < refSeqs.length; i++)
                brwsr.allRefs[refSeqs[i].name] = refSeqs[i];

            var refCookie = dojo.cookie(containerID + "-refseq");
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

            var gv = new GenomeView(viewElem, 250, brwsr.refSeq, 1/200);
            brwsr.view = gv;
            brwsr.viewElem = viewElem;
            //gv.setY(0);
            viewElem.view = gv;

            dojo.connect(browserWidget, "resize", function() {
                    gv.sizeInit();

                    brwsr.view.locationTrapHeight = dojo.marginBox(navbox).h;
                    gv.showFine();
                    gv.showCoarse();
                });
            brwsr.view.locationTrapHeight = dojo.marginBox(navbox).h;

            dojo.connect(gv, "onFineMove", brwsr, "onFineMove");
            dojo.connect(gv, "onCoarseMove", brwsr, "onCoarseMove");

            var trackListDiv = brwsr.createTrackList(brwsr.container,
                                                     trackData);
            containerWidget.startup();

	    brwsr.isInitialized = true;

            var oldLocMap = dojo.fromJson(dojo.cookie(brwsr.container.id + "-location")) || {};
            var basePos = (oldLocMap[brwsr.refSeq.name]
                           || ((((brwsr.refSeq.start + brwsr.refSeq.end) * 0.4) | 0)
                               + " .. "
                               + (((brwsr.refSeq.start + brwsr.refSeq.end) * 0.6) | 0)));
            brwsr.navigateTo(brwsr.refSeq.name + ":" + basePos);

	    //if someone calls methods on this browser object
	    //before it's fully initialized, then we defer
	    //those functions until now
	    for (var i = 0; i < brwsr.deferredFunctions.length; i++)
		brwsr.deferredFunctions[i]();
	    brwsr.deferredFunctions = [];
        });
}

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
}

Browser.prototype.createTrackList = function(parent, trackList) {
    var leftPane = document.createElement("div");
    leftPane.style.cssText="width: 10em";
    parent.appendChild(leftPane);
    var leftWidget = new dijit.layout.ContentPane({region: "left", splitter: true}, leftPane);
    var trackListDiv = document.createElement("div");
    trackListDiv.id = "tracksAvail";
    trackListDiv.className = "container handles";
    trackListDiv.style.cssText = "width: 100%; height: 100%;";
    trackListDiv.innerHTML = "Available Tracks:<br/>(Drag <img src=\"img/right_arrow.png\"/> to view)<br/><br/>";
    leftPane.appendChild(trackListDiv);

    var brwsr = this;

    var changeCallback = function() {
        brwsr.view.showVisibleBlocks(true);
    }

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
    }
    this.trackListWidget = new dojo.dnd.Source(trackListDiv,
                                               {creator: trackListCreate,
						accept: ["track"],
						withHandles: false});

    var trackCreate = function(track, hint) {
        var node;
        if ("avatar" == hint) {
            return trackListCreate(track, hint);
        } else {
            var replaceData = {refseq: brwsr.refSeq.name};
            var url = track.url.replace(/\{([^}]+)\}/g, function(match, group) {return replaceData[group];});
            var klass = eval(track.type);
            node = brwsr.view.addTrack(new klass(track, url, brwsr.refSeq, {changeCallback: changeCallback, trackPadding: brwsr.view.trackPadding, baseUrl: brwsr.dataRoot}));
        }
        return {node: node, data: track, type: ["track"]};
    }
    this.viewDndWidget = new dojo.dnd.Source(this.view.container,
                                       {
                                           creator: trackCreate,
                                           accept: ["track"],
                                           withHandles: true
                                       });
    dojo.subscribe("/dnd/drop", function(source,nodes,iscopy){
            var trackLabels = dojo.map(brwsr.view.trackList(),
                                       function(track) { return track.name; });
            dojo.cookie(brwsr.container.id + "-tracks",
                        trackLabels.join(","),
                        {expires: 60});
            brwsr.view.showVisibleBlocks();
            //multi-select too confusing?
            //brwsr.viewDndWidget.selectNone();
        });

    this.trackListWidget.insertNodes(false, trackList);
    var oldTrackList = dojo.cookie(this.container.id + "-tracks");
    if (oldTrackList) this.showTracks(oldTrackList);

    return trackListDiv;
}

Browser.prototype.addTracks = function(trackList, show) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(function() {
                brwsr.addTracks(trackList, show);
                    });
	return;
    }

    this.tracks.concat(trackList);
    if (show || (show === undefined)) {
        this.showTracks(dojo.map(trackList,
                                 function(t) {return t.label}).join(","));
    }
}

Browser.prototype.navigateTo = function(loc) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(function() {
                brwsr.navigateTo(loc);
                    });
	return;
    }

    loc = dojo.trim(loc);
    //                             (  chromosome   )    (    start      )   (  sep     )     (    end   )
    matches = String(loc).match(/^(((chr)?(\S*)\s*:)?\s*(-?[0-9,.]*[0-9])\s*(\.\.|-|\s+))?\s*(-?[0-9,.]+)$/i);
    //matches potentially contains location components:
    //matches[4] = chromosome (optional, with any leading "chr" stripped)
    //matches[5] = start base (optional)
    //matches[7] = end base (or center base, if it's the only one)
    if (matches) {
	if (matches[4]) {
	    var refName;
	    for (ref in this.allRefs)
		if (matches[4].toUpperCase() == ref.toUpperCase())
		    refName = ref;
	    if (refName) {
		dojo.cookie(this.container.id + "-refseq", refName, {expires: 60});
		if (refName == this.refSeq.name) {
		    //go to given start, end on current refSeq
		    this.view.setLocation(this.refSeq,
					  parseInt(matches[5].replace(/[,.]/g, "")),
					  parseInt(matches[7].replace(/[,.]/g, "")));
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
					  parseInt(matches[5].replace(/[,.]/g, "")),
					  parseInt(matches[7].replace(/[,.]/g, "")));

                    this.viewDndWidget.insertNodes(false, curTracks);
		}
		return;
	    }
	} else if (matches[5]) {
	    //go to start, end on this refseq
	    this.view.setLocation(this.refSeq,
				  parseInt(matches[5].replace(/[,.]/g, "")),
				  parseInt(matches[7].replace(/[,.]/g, "")));
	    return;
	} else if (matches[7]) {
	    //center at given base
	    this.view.centerAtBase(parseInt(matches[7].replace(/[,.]/g, "")));
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
}

Browser.prototype.showTracks = function(trackNameList) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(function() {
                brwsr.showTracks(trackNameList);
                    });
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
}

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
    this.location.value = locString;
    this.goButton.disabled = true;
    var oldLocMap = dojo.fromJson(dojo.cookie(this.container.id + "-location"));
    if ((typeof oldLocMap) != "object") oldLocMap = {};
    oldLocMap[this.refSeq.name] = locString;
    dojo.cookie(this.container.id + "-location",
                dojo.toJson(oldLocMap),
                {expires: 60});

    document.title = this.refSeq.name + ":" + locString;
}

Browser.prototype.createNavBox = function(parent, locLength) {
    var brwsr = this;
    var navbox = document.createElement("div");
    navbox.id = "navbox";
    parent.appendChild(navbox);
    navbox.style.cssText = "text-align: center; padding: 10px; z-index: 10;";

    var moveLeft = document.createElement("button");
    moveLeft.appendChild(document.createTextNode("<<"));
    moveLeft.id = "moveLeft";
    moveLeft.className = "nav";
    dojo.connect(moveLeft, "click", function(event) {
            dojo.stopEvent(event);
            brwsr.view.slide(0.9)
        });
    navbox.appendChild(moveLeft);

    var moveRight = document.createElement("button");
    moveRight.appendChild(document.createTextNode(">>"));
    moveRight.id="moveRight";
    moveRight.className = "nav";
    dojo.connect(moveRight, "click", function(event) {
            dojo.stopEvent(event);
            brwsr.view.slide(-0.9)
        });
    navbox.appendChild(moveRight);

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));

    var bigZoomIn = document.createElement("button");
    bigZoomIn.appendChild(document.createTextNode("++"));
    bigZoomIn.id="bigZoomIn";
    bigZoomIn.className = "nav";
    dojo.connect(bigZoomIn, "click", function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomIn(undefined, undefined, 2);
        });
    navbox.appendChild(bigZoomIn);

    var zoomIn = document.createElement("button");
    zoomIn.appendChild(document.createTextNode("+"));
    zoomIn.id="zoomIn";
    zoomIn.className = "nav";
    dojo.connect(zoomIn, "click", function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomIn();
        });
    navbox.appendChild(zoomIn);

    var zoomOut = document.createElement("button");
    zoomOut.appendChild(document.createTextNode("-"));
    zoomOut.id="zoomOut";
    zoomOut.className = "nav";
    dojo.connect(zoomOut, "click", function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomOut();
        });
    navbox.appendChild(zoomOut);

    var bigZoomOut = document.createElement("button");
    bigZoomOut.appendChild(document.createTextNode("--"));
    bigZoomOut.id="bigZoomOut";
    bigZoomOut.className = "nav";
    navbox.appendChild(bigZoomOut);
    dojo.connect(bigZoomOut, "click", function(event) {
            dojo.stopEvent(event);
            brwsr.view.zoomOut(undefined, undefined, 2);
        });

    navbox.appendChild(document.createTextNode("\u00a0\u00a0\u00a0\u00a0"));
    this.chromList = document.createElement("select");
    this.chromList.id="chrom";
    navbox.appendChild(this.chromList);
    this.location = document.createElement("input");
    this.location.size=locLength;
    this.location.type="text";
    this.location.id="location";
    dojo.connect(this.location, "keyup", function(event) {
            if (event.keyCode == dojo.keys.ENTER) {
                brwsr.navigateTo(brwsr.location.value);
                brwsr.goButton.disabled = true;
            } else {
                brwsr.goButton.disabled = false;
            }
        });
    navbox.appendChild(this.location);

    this.goButton = document.createElement("button");
    this.goButton.appendChild(document.createTextNode("Go"));
    this.goButton.disabled = true;
    dojo.connect(this.goButton, "click", function(event) {
            brwsr.navigateTo(brwsr.location.value);
            brwsr.goButton.disabled = true;
        });
    navbox.appendChild(this.goButton);

    return navbox;
}

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
