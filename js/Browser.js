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

var disabledColor = "#9E9E9E";

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

    //create the html objects for the track list section

    var leftPane = document.createElement("div");
    leftPane.style.cssText="width: 17em; overflow: auto;";
    parent.appendChild(leftPane);
    var leftWidget = new dijit.layout.ContentPane({region: "left", splitter: true}, leftPane);

    var searchMessage = document.createElement("div");
    searchMessage.innerHTML = "Enter text to search track list:";
    leftPane.appendChild(searchMessage);

    var searchBox = document.createElement("input");
    searchBox.id = "search";
    leftPane.appendChild(searchBox);

    var searchClearBtn = new dijit.form.Button({ label: "clear search"});
    searchClearBtn.domNode.style.cssText = 'display: inline';
    leftPane.appendChild(searchClearBtn.domNode);

    var treeResetBtn = new dijit.form.Button({ label: "reset track list"});
    leftPane.appendChild(treeResetBtn.domNode);

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
        function getChildrenRecursive(node){
            if(source.getItem(node.id).data.item.type[0] == 'TrackGroup') {
                var result = [];
                var i = 0;
                tree._expandNode(source.getItem(node.id).data);
                var children = source.getItem(node.id).data.getChildren();
                for(var n = 0; n < children.length; n++) {
                    var child = children[n];
                    var selectedNodes = source.getSelectedTreeNodes();
                    selectedNodes.push(child);
                    source.setSelection(selectedNodes);
                    if((child.domNode.style.display != "none")&&(child.item.type[0] != 'TrackGroup')
                        &&((!child.domNode.firstChild.childNodes[2].childNodes[1].style.color)
                            ||(child.domNode.firstChild.childNodes[2].childNodes[1].style.color == ""))) {
                        result[i] = child.domNode;
                        i++;
                    }
                    else if(child.item.type[0] == 'TrackGroup') {
                        var nodesChildren = getChildrenRecursive(child.domNode);
                        result = result.concat(nodesChildren);
                        i += nodesChildren.length;
                    }
                }
                return result;
            }
            else if((node.style.display != "none")
                    &&((!node.firstChild.childNodes[2].childNodes[1].style.color)
                       ||(node.firstChild.childNodes[2].childNodes[1].style.color == ""))) {
                return [node];
            }
            return [];
        }
        var reviewed_nodes = [];
        var j = 0;
        for(var i = 0; i < nodes.length; i++) {
            reviewed_nodes = reviewed_nodes.concat(getChildrenRecursive(nodes[i]));
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
                nodes[i].firstChild.childNodes[2].childNodes[1].style.cssText = "color: "+disabledColor;
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
                                  var map = brwsr.mapLabelToNode(tree._itemNodesMap.ROOT[0].getChildren(), {});
                                  map[track.label].firstChild.childNodes[2].childNodes[1].style.color = "";
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

    var dropOnTrackList = function(source, nodes, copy) {
        if(source instanceof dojo.dnd.Source) {
            for(var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var dataObj = brwsr.viewDndWidget.getItem(node.id);
                brwsr.viewDndWidget.delItem(node.id);
                node.parentNode.removeChild(node);
                brwsr.onVisibleTracksChanged();

                var mapHTMLNode = brwsr.mapLabelToNode(brwsr.tree._itemNodesMap.ROOT[0].getChildren(), {});
                mapHTMLNode[dataObj.data.label].firstChild.childNodes[2].childNodes[1].style.color = "";

                var mapWidget = brwsr.mapLabelToWidget(brwsr.tree._itemNodesMap.ROOT[0].getChildren(), {});
                var sourceItem = mapWidget[dataObj.data.label];
                var childItem = sourceItem.item;
                var oldParentItem = sourceItem.getParent().item;
                var target = this.targetAnchor;
                var model = this.tree.model;
                var newParentItem = (target && target.item) || tree.item;
                var insertIndex;
                if(this.dropPosition == "Before" || this.dropPosition == "After"){
                    newParentItem = (target.getParent() && target.getParent().item) || tree.item;
                    // Compute the insert index for reordering
                    insertIndex = target.getIndexInParent();
                    if(this.dropPosition == "After"){
                        insertIndex = target.getIndexInParent() + 1;
                    }
                }else{
                    newParentItem = (target && target.item) || tree.item;
                }

                brwsr.treeModel.pasteItem(childItem, oldParentItem, newParentItem, false, insertIndex); 
            }
        }
        if((source instanceof dijit.tree.dndSource) && (this.containerState == "Over")){
            var tree = this.tree,
            model = tree.model,
            target = this.targetAnchor,
            requeryRoot = false;    // set to true iff top level items change

            this.isDragging = false;

            // Computif(this.containerState == "Over"){
            var newParentItem;
            var insertIndex;
            newParentItem = (target && target.item) || tree.item;
            if(this.dropPosition == "Before" || this.dropPosition == "After"){
                newParentItem = (target.getParent() && target.getParent().item) || tree.item;
                // Compute the insert index for reordering
                insertIndex = target.getIndexInParent();
                if(this.dropPosition == "After"){
                    insertIndex = target.getIndexInParent() + 1;
                }
            }else{
                newParentItem = (target && target.item) || tree.item;
            }

            // If necessary, use this variable to hold array of hashes to pass to model.newItem()
            // (one entry in the array for each dragged node).
            var newItemsParams;

            dojo.forEach(nodes, function(node, idx){
                // dojo.dnd.Item representing the thing being dropped.
                // Don't confuse the use of item here (meaning a DnD item) with the
                // uses below where item means dojo.data item.
                var sourceItem = source.getItem(node.id);

                // Information that's available if the source is another Tree
                // (possibly but not necessarily this tree, possibly but not
                // necessarily the same model as this Tree)
                if(dojo.indexOf(sourceItem.type, "treeNode") != -1){
                    var childTreeNode = sourceItem.data,
                    childItem = childTreeNode.item,
                    oldParentItem = childTreeNode.getParent().item;
                }

                if(source == this){
                    // This is a node from my own tree, and we are moving it, not copying.
                    // Remove item from old parent's children attribute.

                    if(typeof insertIndex == "number"){
                        if(newParentItem == oldParentItem && childTreeNode.getIndexInParent() < insertIndex){
                            insertIndex -= 1;
                        }
                    }
                    model.pasteItem(childItem, oldParentItem, newParentItem, copy, insertIndex);
                }else if(model.isItem(childItem)){
                    // Item from same model
                    // (maybe we should only do this branch if the source is a tree?)
                    model.pasteItem(childItem, oldParentItem, newParentItem, copy, insertIndex);
                }else{
                    // Get the hash to pass to model.newItem().  A single call to
                    // itemCreator() returns an array of hashes, one for each drag source node.
                    if(!newItemsParams){
                        newItemsParams = this.itemCreator(nodes, target.rowNode, source);
                    }

                    // Create new item in the tree, based on the drag source.
                    model.newItem(newItemsParams[idx], newParentItem, insertIndex);
                }
            }, this);

            // Expand the target node (if it's currently collapsed) so the user can see
            // where their node was dropped.   In particular since that node is still selected.
            this.tree._expandNode(target);
        }
        this.onDndCancel();
    };

    var nodePlacementAcceptance = function(target, source, position) {
        var item = dijit.getEnclosingWidget(target).item;
        if((item.type[0] == "TrackGroup") && (position == 'over')) {
            return true;
        }
        if((position == 'before') || (position == 'after')) {
            return true;
        }
        return false;
    };

    function deepCopy(trackData){
        if(typeof trackData == 'object') {
            if(trackData instanceof Array) {
                var newArray = [];
                for(var i = 0; i < trackData.length; i++) {
                    newArray[i] = deepCopy(trackData[i]);
                }
                return newArray;
            }
            else {
                var newObj = {}
                for(var propertyName in trackData) {
                    newObj[propertyName] = deepCopy(trackData[propertyName]);
                }
                return newObj;
            }
        }
        else {
            return trackData;
        }
    }

    // create the track list tree structure

    var originalTrackData = deepCopy(params.trackData);

    var store = new dojo.data.ItemFileWriteStore({
        clearOnClose: true,
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

    this.treeModel = treeModel;

    var tree = new dijit.Tree({
        dragThreshold: 0,
        model: treeModel,
        dndController: "dijit.tree.dndSource",
        showRoot: false,
        itemCreator: externalSourceCreator,
        onDndDrop: dropOnTrackList,
        betweenThreshold: 5,
        openOnDblClick: true,
        checkItemAcceptance: nodePlacementAcceptance
    },
    "treeList");

    this.tree = tree;

    dojo.subscribe("/dnd/drop", function(source,nodes,iscopy){
    //whenever a track is moved reset cookie values
                       brwsr.onVisibleTracksChanged();
                       brwsr.onTrackListOrderingChanged();
                   });

    // display given tracks and disable in the track list
    var oldTrackList = dojo.cookie(this.container.id + "-tracks");
    if (params.tracks) {
        this.showTracks(params.tracks);
    } else if (oldTrackList) {
        this.showTracks(oldTrackList);
    } else if (params.defaultTracks) {
        this.showTracks(params.defaultTracks);
    }

    // reorder track list
    var oldTrackListOrder = dojo.cookie(this.container.id + "-ordering");
    if(oldTrackListOrder) {
        this.reorderTracks(oldTrackListOrder);
    }

    var treeSearch = new dijit.form.TextBox({
        name: "search",
        value: ""
    },
    "search");

    function searchTrackList(searchTerm) {
        var map = brwsr.mapLabelToNode(tree._itemNodesMap.ROOT[0].getChildren(), {});

        function fetchFailed(error, request) {
            alert("lookup failed");
            alert(error);
        };

        function gotItems(items, request) {

            // returns the number of visible children of a node
            function numVisibleChildrenNodes(item){
                if(item.type[0] == 'TrackGroup') {
                    var result = 0;
                    var i = 0;
                    var children = item.children;
                    if(!children) return 0;
                    for(var n = 0; n < children.length; n++) {
                        var child = map[children[n].label];
                        if((child.style.display != "none")&&(children[n].type[0] != 'TrackGroup')) {
                            result += 1;
                        }
                        else if(children[n].type[0] == 'TrackGroup') {
                            result = result + numVisibleChildrenNodes(children[n]);
                        }
                    }
                    return result;
                }
                return 0;
            }

            var i;
            var pattern = new RegExp("");
            pattern = new RegExp(searchTerm.toLowerCase());
            for(i = 0; i < items.length; i++) {
                if(map[items[i].label]) {
                    var node = map[items[i].label];
                    if(String(items[i].type) == 'TrackGroup') {
                        node.style.cssText = "display: block";
                    }
                    if((!pattern.test(String(items[i].label).toLowerCase()) && String(items[i].type) != 'TrackGroup')) {
                        // hide the none if it doesn't match
                        node.style.cssText = "display: none";
                    }
                    else {
                        // show the node if it matches
                        node.style.cssText = "display: block";
                        if(pattern.test(String(items[i].label).toLowerCase()) && (searchTerm != "")) {
                            // highlight the matching part of the track name

                            var beginningPat = new RegExp( ".*"+searchTerm.toLowerCase());
                            var beginningText = String(beginningPat.exec(String(items[i].label).toLowerCase()));
                            beginningText = String(items[i].label).substring(0, beginningText.length - searchTerm.length);
                            var beginning = document.createElement("span");
                            beginning.innerHTML = beginningText;

                            var endingText = String(items[i].label).substring(searchTerm.length+beginningText.length);
                            var end = document.createElement("span");
                            end.innerHTML = endingText;

                            var highlight = document.createElement("b");
                            highlight.innerHTML= String(items[i].label).substring(beginningText.length, beginningText.length+searchTerm.length);

                            node.firstChild.childNodes[2].childNodes[1].innerHTML = "";
                            node.firstChild.childNodes[2].childNodes[1].appendChild(beginning);
                            node.firstChild.childNodes[2].childNodes[1].appendChild(highlight);
                            node.firstChild.childNodes[2].childNodes[1].appendChild(end);
                        }
                        else {
                            // if the search term is the empty string return the track name to not being highlighted
                            node.firstChild.childNodes[2].childNodes[1].innerHTML = items[i].label;
                        }
                    }
                }
            }
            for(i = 0; i < items.length; i++) {
                // hide the TrackGroup if it contains no matching tracks and it doesn't match
                if(map[items[i].label] && String(items[i].type) == 'TrackGroup' && !pattern.test(String(items[i].label).toLowerCase())) {
                    if(numVisibleChildrenNodes(items[i]) == 0) {
                        map[items[i].label].style.cssText = "display: none";
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
    dojo.connect(treeResetBtn, "onClick", function() {
        //detroy current tree, model and store data
        tree.destroyRecursive();
        treeModel.destroy();
        store.revert();
        store.close();

        // create new tree, model, and store data
        var data = deepCopy(originalTrackData);

        store.data = {
                identifier: 'key',
                label: 'label',
                items: data
              };

        treeModel = new dijit.tree.TreeStoreModel({
            store: store,
            query: {
                "label": "ROOT"
            },
            childrenAttrs: ["children"]
        });

        treeSection = document.createElement("div");
        treeSection.id = "treeList";
        treeSection.style.cssText =
            "width: 100%; height: 100%; overflow-x: hidden; overflow-y: auto;";
        leftPane.appendChild(treeSection);

        tree = new dijit.Tree({
            dragThreshold: 0,
            model: treeModel,
            dndController: "dijit.tree.dndSource",
            showRoot: false,
            itemCreator: externalSourceCreator,
            betweenThreshold: 5,
            openOnDblClick: true,
            autoExpand: true,
            checkItemAcceptance: nodePlacementAcceptance
        },
        "treeList");

        // load tracks to the display and disable the track in the track list
        var trackNames;
        var oldTrackList = dojo.cookie(brwsr.container.id + "-tracks");
        if (params.tracks) {
            trackNames = params.tracks;
        } else if (oldTrackList) {
            trackNames = oldTrackList;
        } else if (params.defaultTracks) {
            trackNames = params.defaultTracks;
        }

        var map = brwsr.mapLabelToNode(tree._itemNodesMap.ROOT[0].getChildren(), {});

        trackNames = trackNames.split(",");
        for (var n = 0; n < trackNames.length; n++) {
            if(map[trackNames[n]]) {
                map[trackNames[n]].firstChild.childNodes[2].childNodes[1].style.cssText = "color: "+disabledColor;
            }
        }

        // record new track list ordering
        brwsr.onTrackListOrderingChanged();
    });
};

/**
 * hides the track in the track list
 * @param label corresponds to the "label" element of the track information dictionaries
 */
Browser.prototype.hideTrackListNode = function(label) {
        var map = brwsr.mapLabelToNode(tree._itemNodesMap.ROOT[0].getChildren(), {});
        map[label].style.cssText = "display: none";
}

/**
 * shows the track in the track list
 * @param label corresponds to the "label" element of the track information dictionaries
 */
Browser.prototype.showTrackListNode = function(label) {
        var map = brwsr.mapLabelToNode(tree._itemNodesMap.ROOT[0].getChildren(), {});
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
 */
Browser.prototype.onTrackListOrderingChanged = function() {
    dojo.cookie(this.container.id+ "-ordering",
                dojo.toJson(this.makeTrackListOrdering(this.tree._itemNodesMap.ROOT[0].getChildren())),
                {expires: 60});
}

/**
 * @private
 */
Browser.prototype.makeTrackListOrdering = function(nodes) {
    var ordering = [];

    var j = 0;
    for(var i = 0; i < nodes.length; i++) {
        ordering[j] = nodes[i].label;
        j++;
        if(nodes[i].isExpandable) {
            ordering[j] = this.makeTrackListOrdering(nodes[i].getChildren());
            j++;
        }
    }
    return ordering;
}

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

/**
 * @private
 */
Browser.prototype.mapLabelToNode = function(treeRoot, map) {
    for( var i = 0; i < treeRoot.length; i++) {
        var node = treeRoot[i];
        // expand the node so the children are available
        var open = node.isExpanded;
        if(node.isExpandable) {
            this.tree._expandNode(node);
        }
        // map the html node to the label and recurse if needed
        map[node.label] = node.domNode;
        if(node.getChildren()[0] != undefined) {
            this.mapLabelToNode(node.getChildren(), map);
        }
        // close the node up if originally closed
        if(!open) {
            this.tree._collapseNode(node);
        }
    } 
    return map;
}

/**
 * @private
 */
Browser.prototype.mapLabelToWidget = function(treeRoot, map) {
    for( var i = 0; i < treeRoot.length; i++) {
        var node = treeRoot[i];
        // expand the node so the children are available
        var open = node.isExpanded;
        if(node.isExpandable) {
            this.tree._expandNode(node);
        }
        // map the node's widget to the label and recurse if needed
        map[node.label] = node;
        if(node.getChildren()[0] != undefined) {
            this.mapLabelToWidget(node.getChildren(), map);
        }
        // close the node up if originally closed
        if(!open) {
            this.tree._collapseNode(node);
        }
    }
    return map;
}

/**
 * reorder the given tracks in the specified json format
 * gb=dojo.byId("GenomeBrowser").genomeBrowser
 * gb.showTracks("[grouping1,[DNA,gene],grouping2,[mRNA, noncodingRNA]]")
 * @param trackOrderList {String} json array string containing track names,
 * each of which should correspond to the "label" element of the track
 * information dictionaries, if a element is a folder the following element is a 
 * json array of the same format as trackOrderList
 */
Browser.prototype.reorderTracks = function(trackOrderList) {
    var oldTrackListOrder = dojo.fromJson(trackOrderList);
    if(oldTrackListOrder) {
        //start reorder on the root of the tree
        this.reorderSection(oldTrackListOrder, dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).item);
    }
}

/**
 * @private
 */
Browser.prototype.reorderSection = function(trackOrder, newParent) {
    if (!this.isInitialized) {
        var brwsr = this;
        this.deferredFunctions.push(
            function() { brwsr.reorderSection(trackOrder, newParent); }
        );
        return;
    }

    var map = this.mapLabelToWidget(dijit.getEnclosingWidget(dojo.byId("dijit__TreeNode_0")).getChildren(), {});

    for(var i = 0; i < trackOrder.length; i++) {
        // get arguments and move the node to the specified order
        var sourceItem = map[trackOrder[i]];
        var childItem = sourceItem.item;
        var insertIdx = i;
        if(typeof trackOrder[i+1] == "object") {
            // TrackGroup/array of label next so recurse on group
            this.reorderSection(trackOrder[i+1], childItem);
            i++;
        }
        var oldParentItem = sourceItem.getParent().item;
        var newParentItem = newParent;
        this.treeModel.pasteItem(childItem, oldParentItem, newParentItem, false, insertIdx);
    }
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
            map[trackNames[n]].firstChild.childNodes[2].childNodes[1].style.cssText = "color: "+disabledColor;
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
