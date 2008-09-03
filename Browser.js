var djConfig = {
    usePlainJson: true
};

var Browser = function(containerID, trackData) {
    dojo.require("dojo.dnd.Source");
    dojo.require("dojo.dnd.Moveable");
    dojo.require("dojo.dnd.Mover");
    dojo.require("dojo.dnd.move");
    dojo.require("dijit.layout.ContentPane");
    dojo.require("dijit.layout.BorderContainer");

    this.deferredFunctions = [];
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
            var navbox = brwsr.createNavBox(topPane);

            var viewElem = document.createElement("div");
            brwsr.container.appendChild(viewElem);
            var browserWidget = new dijit.layout.ContentPane({region: "center"}, viewElem);
            viewElem.className = "dragWindow";

            brwsr.locationTrap = document.createElement("div");
            brwsr.locationTrap.className = "locationTrap";
            topPane.appendChild(brwsr.locationTrap);
            topPane.style.overflow="hidden";

            var zoomLevel = 1/200;
            var zoomCookie = dojo.cookie(containerID + "-zoom");
            if (zoomCookie) 
                zoomLevel = parseFloat(zoomCookie);
            if (isNaN(zoomLevel))
                zoomLevel = 1/200;

            var refCookie = dojo.cookie(containerID + "-refseq");
            refs = [];
            //sort ref sequences more or less how people expect
            for (var refname in trackData) refs.push(refname);
            refs.sort(function(a, b) {
                    aNum=String(a).match(/^[0-9]+/);
                    bNum=String(b).match(/^[0-9]+/);
                    if (aNum && !bNum) return -1;
                    if (!aNum && bNum) return 1;
                    if (aNum && bNum && (aNum[0] != bNum[0]))
                        return aNum[0] - bNum[0];
                    if (a < b)
                        return -1;
                    else if (a == b)
                        return 0;
                    else
                        return 1;
                });

            for (var i = 0; i < refs.length; i++)
                brwsr.chromList.options[i] = new Option(refs[i], refs[i]);

            brwsr.refSeq = trackData[refs[0]];
            var trackList = brwsr.refSeq["trackList"];
            brwsr.chromList.selectedIndex = 0;
            dojo.connect(brwsr.chromList, "onchange", function(event) {
                    var curTracks = dojo.map(brwsr.view.trackList(),
                                             function(track) {return track.name;});
                    var selected = brwsr.chromList.selectedIndex;
                    brwsr.refSeq = trackData[refs[selected]];
                    trackList = brwsr.refSeq["trackList"];
                    brwsr.view.setLocation(trackData[refs[selected]]);
                    brwsr.trackListWidget.forInItems(function(obj, id, map) {
                            var node = dojo.byId(id);
                            node.parentNode.removeChild(node);
                        });
                    brwsr.trackListWidget.clearItems();
                    brwsr.trackListWidget.insertNodes(false, trackList);

                    brwsr.showTracks(curTracks.join(","));
                        });

            var location;
            var locCookie = dojo.cookie(containerID + "-location");
            if (locCookie)
                location = parseInt(locCookie);
            if (isNaN(location))
                location = ((brwsr.refSeq.end + brwsr.refSeq.start) / 2) | 0;

            var gv = new GenomeView(viewElem, 250, brwsr.refSeq, zoomLevel);
            brwsr.view = gv;
            brwsr.viewElem = viewElem;
            gv.setY(0);
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
            gv.showFine();
            gv.showCoarse();
            
            dojo.connect(gv, "zoomUpdate", function() {
                    dojo.cookie(containerID + "-zoom",
                                brwsr.view.pxPerBp, {expires: 60});
                });

            var trackListDiv = brwsr.createTrackList(brwsr.container, trackList);
            containerWidget.startup();

	    brwsr.view.centerAtBase(location, true);

	    brwsr.isInitialized = true;
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
    var locationTrapStyle =
    "top: " + this.view.overviewBox.t + "px;"
    + "height: " + this.view.overviewBox.h + "px;"
    + "left: " + this.view.overviewBox.l + "px;"
    + "width: " + (trapRight - trapLeft) + "px;"
    + "border-width: " + "0px "
    + (this.view.overviewBox.w - trapRight) + "px "
    + this.view.locationTrapHeight + "px " + trapLeft + "px;";

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
        node.appendChild(document.createTextNode(track.key));
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
            node = brwsr.view.addTrack(new SimpleFeatureTrack(track, brwsr.refSeq, changeCallback, brwsr.view.trackPadding));
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

    this.location.value = Util.addCommas(startbp | 0)
    + " .. "
    + Util.addCommas(endbp | 0);
                    
    dojo.cookie(this.container.id + "-location", Math.round((startbp + endbp) / 2), {expires: 60});
}

Browser.prototype.createNavBox = function(parent) {
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
    this.location.size=27;
    this.location.type="text";
    this.location.id="location";
    navbox.appendChild(this.location);

    return navbox;
}

//     gv.addOverviewTrack(new SimpleFeatureTrack(trackList[0], 
// 					       brwsr.refSeq,
// 					       function() {
// 						   gv.updateOverviewHeight();
// 						   dijit.byId("mainSplit").resize();
// 					       },
// 					       0));
//     gv.addTrack(new ImageTrack("Gene_Image", "Gene Image", brwsr.refSeq, 1000, 
//                                [
//                                 {basesPerTile: 100, height: 68, urlPrefix: "tiles/3R/Genes/100bp/"},
//                                 {basesPerTile: 200, height: 64, urlPrefix: "tiles/3R/Genes/200bp/"},
//                                 {basesPerTile: 500, height: 68, urlPrefix: "tiles/3R/Genes/500bp/"},
//                                 {basesPerTile: 1000, height: 68, urlPrefix: "tiles/3R/Genes/1kbp/"},
//                                 {basesPerTile: 2000, height: 68, urlPrefix: "tiles/3R/Genes/2kbp/"},
//                                 {basesPerTile: 5000, height: 68, urlPrefix: "tiles/3R/Genes/5kbp/"},
//                                 {basesPerTile: 10000, height: 80, urlPrefix: "tiles/3R/Genes/10kbp/"},
//                                 {basesPerTile: 20000, height: 100, urlPrefix: "tiles/3R/Genes/20kbp/"},
//                                 {basesPerTile: 50000, height: 140, urlPrefix: "tiles/3R/Genes/50kbp/"},
//                                 {basesPerTile: 100000, height: 180, urlPrefix: "tiles/3R/Genes/100kbp/"},
//                                 {basesPerTile: 200000, height: 240, urlPrefix: "tiles/3R/Genes/200kbp/"},
//                                 {basesPerTile: 500000, height: 47, urlPrefix: "tiles/3R/Genes/500kbp/"},
//                                 {basesPerTile: 1000000, height: 55, urlPrefix: "tiles/3R/Genes/1Mbp/"},
//                                 {basesPerTile: 2000000, height: 71, urlPrefix: "tiles/3R/Genes/2Mbp/"},
//                                 {basesPerTile: 5000000, height: 208.5, urlPrefix: "tiles/3R/Genes/5Mbp/"},
//                                 {basesPerTile: 10000000, height: 208.5, urlPrefix: "tiles/3R/Genes/10Mbp/"}
//                                 ]));
