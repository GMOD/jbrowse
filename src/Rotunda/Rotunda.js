define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/event',
    'dojo/query',
    'dojo/on',
    'dojo/dnd/Source',
    'dojo/aspect',
    'dojo/Deferred',
    'dojo/dom-construct',
    'dijit/layout/ContentPane',
    'dijit/RadioMenuItem',
    'dijit/MenuSeparator',
    'd3/d3',
    'Rotunda/util',
    'Rotunda/View/Animation/Zoomer',
    'Rotunda/View/Animation/Slider',
    'Rotunda/View/Animation/SpinZoom',
    'Rotunda/View/Track/Arc',
    'Rotunda/View/Track/Ruler',
    'Rotunda/View/Track/Stacked',
    'Rotunda/View/Track/Histogram/FeatureDensity',
    'Rotunda/View/Track/Histogram/Wiggle',
    'Rotunda/detect-element-resize'
],

       function(
           declare,
           lang,
	   event,
           query,
	   on,
           dndSource,
           aspect,
	   Deferred,
	   domConstruct,
           dijitContentPane,
           dijitRadioMenuItem,
           dijitMenuSeparator,
           libd3,
           util,
           Zoomer,
           Slider,
           SpinZoom,
           ArcTrack,
           RulerTrack,
           StackedTrack,
	   DensityTrack,
	   WiggleTrack
       ) {

return declare( null, {

    constructor: function(config) {

        var rot = this

	this.config = config
	this.browser = config.browser

	if (this.browser)
	    this.initMilestone = this.browser._milestoneFunction('initRotunda', function( deferred ) {
		rot.initialize (config)
	    })
	else
	    rot.initialize (config)
    },

    initialize: function (config) {

        var rot = this

	var defaultID = "rotunda"
        if (this.browser) {

            var rotViewElem = document.createElement("div");
            rotViewElem.className = "dragWindow";
            dojo.place (rotViewElem, this.browser.viewElem, "before");

            this.rotundaWidget =
                new dijitContentPane({region: "center"}, rotViewElem);

            var rotundaElem = document.createElement("div");
            rotViewElem.appendChild(rotundaElem);

	    this.container = rotundaElem

            this.refSeqName = this.browser.refSeqOrder
            this.refSeqLen = this.browser.refSeqOrder.map (function(n) { return rot.browser.allRefs[n].length })

            var refSeqFeatures = this.refSeqName.map (function (n, i) {
                var l = rot.refSeqLen[i]
                return { seq: n,
                         start: 0,
                         end: l,
                         id: n,
                         type: n }
            })

            var refSeqTrack = new ArcTrack ({ id: "ref_seqs",
					      label: "Reference sequence",
					      features: refSeqFeatures })

	    var rulerTrack = new RulerTrack ({ id: "ruler_ticks",
					       label: "Ruler",
					       displayedName: function (refSeqName) {
					           return refSeqName.replace("chr","")
					       }
					     })

            var stackedTrack = new StackedTrack ({ id: "ruler",
                                                   label: "Ruler",
                                                   tracks: [ refSeqTrack, rulerTrack ] })

            this.tracks = [stackedTrack]
            this.links = []

/*
	    this.browser.config.tracks.forEach (function (trackConfig) {
		var rotTrack = rot.createTrack (trackConfig)
		if (rotTrack)
		    rot.tracks.push (rotTrack)
	    })
*/

	    this.browser.subscribe( '/jbrowse/v1/c/tracks/show',    dojo.hitch( this, 'showTracks' ));
	    this.browser.subscribe( '/jbrowse/v1/c/tracks/hide',    dojo.hitch( this, 'hideTracks' ));

            this.ignoreNavigateEvents = 0
	    this.browser.subscribe( '/jbrowse/v1/n/navigate',       dojo.hitch( this, 'handleNavigate' ));

            this.browser.addGlobalMenuItem( 'view', new dijitMenuSeparator() )

            this.browser.addGlobalMenuItem( 'view', new dijitRadioMenuItem({
                id: 'menubar_linearView',
                label: 'Linear view',
//                iconClass: 'dijitIconApplication',
                group: 'viewType',
                checked: false,
                onClick: function() {
                    rot.showGenomeView()
                }
            }));

            this.browser.addGlobalMenuItem( 'view', new dijitRadioMenuItem({
                id: 'menubar_circularView',
                label: 'Circular view',
//                iconClass: 'dijitIconConfigure',
                group: 'viewType',
                checked: true,
                onClick: function() {
                    rot.showRotunda()
                }
            }));

        } else {
            this.container = config.container || query("#"+(config.id || defaultID))[0]

            tracks = config.tracks
            this.refSeqLen = config.refSeqLen || [360]
            this.refSeqName = config.refSeqName || config.refSeqLen.map (function(n,i) { return "seq" + (i+1) })

            this.tracks = config.tracks.filter (function (track) { return !track.isLinkTrack })
            this.links = config.tracks.filter (function (track) { return track.isLinkTrack })
        }

        this.id = this.container.id || defaultID

	// find dimensions
	this.defaultTrackRadius = config.defaultTrackRadius || 10
	this.minInnerRadius = config.minInnerRadius || 100

        var dim = this.windowDim()
        this.width = config.width || dim[0]
        this.height = config.height || dim[1]

        // config for animations
	this.useCanvasForAnimations = 'useCanvasForAnimations' in config ? config.useCanvasForAnimations : dojo.isFF
	this.hideLabelsDuringAnimation = config.hideLabelsDuringAnimation

	// set up angular coordinate system
        this.totalSpacerFraction = config.spacer || .1  // total fraction of circle used as spacer
        this.spacerRads = this.totalSpacerFraction * 2 * Math.PI / this.refSeqLen.length

        var totalLen = this.refSeqLen.reduce (function (tot,len) { return tot + len })
        this.radsPerBase = 2 * Math.PI * (1 - this.totalSpacerFraction) / totalLen
        this.refSeqStartAngle = this.refSeqLen.reduce (function (list,len) { return list.concat (list[list.length-1] + rot.spacerRads + rot.radsPerBase*len) }, [0])
        this.refSeqStartAngle.pop()

        this.refSeqStartAngleByName = util.keyValListToObj (this.refSeqName.map (function (n,i) { return [n, rot.refSeqStartAngle[i]] }))
        this.refSeqLenByName = util.keyValListToObj (this.refSeqName.map (function (n,i) { return [n, rot.refSeqLen[i]] }))

	// initialize view coords
        this.rotate = 0

        // build view
        dojo.addClass( document.body, this.config.theme || "tundra")  // tundra dijit theme

        // slightly funky mixture of dojo/d3 here... probably need to sort this out
        // use dojo to create navbox and track list
        this.container.setAttribute("class", "rotunda-container")

	if (this.browser)
	    this.navButtons = this.browser.navButtons
        else
            this.createNavBox (this.container)

        this.viewContainer = dojo.create( 'div', { id: this.id+'-view',
					           class: 'rotunda-view' },
				          this.container );
        
        // use d3 to create the SVG
        var d3view = d3.select("#"+this.id+"-view")  // d3 selection
        this.svg_wrapper = d3view
	    .append("div")
            .attr("id", this.id+"-svg-wrapper")
            .attr("class", "rotunda-svg-wrapper")

	if (config.resizable)
	    this.svg_wrapper.attr("style", "resize:both;")

        // use dojo for drag pan
        rot.dragHandlers = []
        on (rot.svg_wrapper[0][0],
            'mousedown',
            lang.hitch (rot, rot.dragStart))

        // use dojo for mouse-wheel pan
        var wheelevent = "onwheel" in document.createElement("div") ? "wheel"      :
            document.onmousewheel !== undefined ? "mousewheel" :
            "DOMMouseScroll"

	on (this.svg_wrapper[0][0],
	    wheelevent,
            lang.hitch (rot, rot.wheelScroll))

        // use dojo for double-click zoom
        on (this.svg_wrapper[0][0],
            "dblclick",
	    lang.hitch (rot, rot.doubleClickZoom))

        // elements that need wait cursors
	this.waitElems = dojo.filter( [ dojo.byId("moveLeft"), dojo.byId("moveRight"),
					dojo.byId("zoomIn"), dojo.byId("zoomOut"),
					dojo.byId("bigZoomIn"), dojo.byId("bigZoomOut"),
					document.body, this.svg_wrapper[0][0], ],
                                      function(e) { return e; }
                                    )
	this.prevCursors = []

        // create track list
        this.createTrackList()

        // show
        this.showRotunda()
        
	// initialize scales and draw
	this.initScales()

	// add resize handlers
	addResizeListener (this.svg_wrapper[0][0], dojo.hitch (this, this.manualResizeCallback))
        addEventListener ("resize", dojo.hitch (this, this.windowResizeCallback))
    },

    initScales: function() {
	if (this.width == 0 || this.height == 0)
	    return

        this.container.setAttribute("style", "width: " + this.width + "px")
        this.svg_wrapper.attr("style", "height: " + this.height + "px")

        var dim = this.windowDim()
	this.calculateTrackSizes(1,1)
        this.radius = Math.max (this.config.radius || Math.min(dim[0]/2,dim[1]/2),
                                this.totalTrackRadius + this.minInnerRadius)

	var maxPixelsPerBase = 20
        this.minScale = Math.min (1, this.width / (2 * this.radius))
        this.maxScale = this.minScale * Math.pow (2, Math.floor (Math.log (Math.max (1, maxPixelsPerBase / this.pixelsPerBase(1))) / Math.log(2)))

// Alternative way of calculating maxScale based on minimum number of visible bases:
// minBasesPerView = width / (pixelsPerBase * scale)
// 	var minBasesPerView = Math.min (1e6, Math.min.apply (this, this.refSeqLen))
//        this.maxScale = this.minScale * Math.pow (2, Math.floor (Math.log (Math.max (1, this.width / (this.pixelsPerBase(1) * minBasesPerView))) / Math.log(2)))

        var maxTrackScale = this.config.maxTrackScale || (this.maxScale > 1 ? (Math.log(this.maxScale) / Math.log(2)) : 1)

	var verticalCurvatureDropThreshold = .99
	this.animationStretchScaleThreshold = Math.pow (4, Math.ceil (Math.log (this.width / (this.radius * Math.acos (verticalCurvatureDropThreshold))) / Math.log(4)))
	this.trackRadiusNonlinearScaleThreshold = Math.pow (4, Math.floor (Math.log (maxTrackScale) / Math.log(4)))
        this.trackRadiusScaleExponent = this.maxScale > 1 ? (Math.log(maxTrackScale/this.trackRadiusNonlinearScaleThreshold) / Math.log(this.maxScale/this.trackRadiusNonlinearScaleThreshold)) : 1

	// initialize view coords
	if (this.scale)
            this.scale = Math.max (this.minScale, Math.min (this.maxScale, this.scale))
	else
	    this.scale = this.minScale
        
        // draw
        this.calculateTrackSizes()
        this.draw()

	// at this point we can do stuff that depends on the dimensions being intialized
	this.initMilestone.resolve ( { success: true } )
    },

    windowDim: function() {
	var w = Math.max (0, this.container.parentElement.offsetWidth)
	var h = Math.max (0, this.container.parentElement.offsetHeight)
        return [w, h]
    },

    dragStart: function(evt) {
        var rot = this
        if (rot.animation) return true;
        rot.dragDeltaRadians = 0
        rot.dragHandlers.push
        (on (rot.svg_wrapper[0][0],
            'mousemove',
             lang.hitch (rot, rot.dragMove)),
         on (rot.svg_wrapper[0][0],
             'mouseup',
             lang.hitch (rot, rot.dragEnd)),
         on (rot.svg_wrapper[0][0],
             'mouseout',
             lang.hitch (rot, rot.checkDragOut)))
        
        if (!rot.dragging) {
	    if (rot.hideLabelsDuringAnimation)
		rot.hideLabels()
            var xDragStart = evt.layerX
            var yDragStart = evt.layerY + rot.svg_wrapper[0][0].scrollTop
            rot.dragInitRadians = rot.xyAngle (xDragStart, yDragStart)
            rot.dragging = true
        }

        return true
    },

    dragMove: function(evt) {
        var rot = this
        if (rot.animation) return true;
	var x = evt.layerX
	var y = evt.layerY + rot.svg_wrapper[0][0].scrollTop
        rot.dragDeltaRadians = rot.xyAngle (x, y) - rot.dragInitRadians
        var dragRotate = function (spriteImage) {
            rot.gTransformRotate (spriteImage, rot.dragDeltaRadians * 180 / Math.PI)
        }
        if (rot.useCanvasForAnimations)
            rot.spritePromise.then (dragRotate)
        else
            dragRotate()
        return true
    },
    
    dragEnd: function(evt) {
        var rot = this
	if (rot.useCanvasForAnimations)
	    rot.destroyAnimationCanvas()
        if (rot.dragDeltaRadians != 0)
            rot.rotateTo (rot.rotate + rot.dragDeltaRadians)
        rot.dragging = false
        rot.dragHandlers.forEach (function (signal) { signal.remove() })
        rot.dragHandlers = []
	rot.updateBrowserLocation()
        return true
    },

    checkDragOut: function( event ) {
        var htmlNode = document.body.parentNode;
        var bodyNode = document.body;

        if (!(event.relatedTarget || event.toElement)
            || (htmlNode === (event.relatedTarget || event.toElement))
            || (bodyNode === (event.relatedTarget || event.toElement))
           ) {
            this.dragEnd(event);
        }
    },

    wheelScroll: function(evt) {
        var rot = this
        if (rot.animation || rot.dragging) return;
	var dx = evt.deltaX
        if (!rot.scrolling) {
	    if (rot.hideLabelsDuringAnimation)
		rot.hideLabels()
	    rot.radiansPerPixelScrolled = rot.angularViewWidth() / rot.width
	    rot.cumulativePixelsScrolled = 0
	    rot.scrolling = true
        }
	rot.cumulativePixelsScrolled += dx
	rot.cumulativeRadiansScrolled = -rot.cumulativePixelsScrolled * rot.radiansPerPixelScrolled

	// 100 milliseconds since the last scroll event is an arbitrary
	// cutoff for deciding when the user is done scrolling
	// (copied from JBrowse)
	// Delay a bit longer when using drawImage->Canvas for animations (this sucks on Firefox)
	var wheelTimeoutDelay = rot.useCanvasForAnimations ? 500 : 100

	if ( rot.wheelScrollTimeout ) {
	    window.clearTimeout( rot.wheelScrollTimeout )
	    rot.wheelScrollTimeout = null
	}

	rot.wheelScrollTimeout = setTimeout( dojo.hitch( rot, function() {
            //		    console.log("wheelScrollTimeout")
	    if (rot.useCanvasForAnimations)
		rot.destroyAnimationCanvas()
	    rot.rotateTo (rot.rotate + rot.cumulativeRadiansScrolled)
	    rot.wheelScrollTimeout = null
	    rot.scrolling = false
	    rot.updateBrowserLocation()
	}, wheelTimeoutDelay));

	var wheelRotate = function (spriteImage) {
            //		    console.log("wheelRotate")
	    if (rot.scrolling)
		rot.gTransformRotate (spriteImage, rot.cumulativeRadiansScrolled * 180 / Math.PI)
	}

	if (rot.useCanvasForAnimations)
	    rot.spritePromise.then (wheelRotate)
	else
	    wheelRotate()

        if (dx)
	    event.stop(evt)
    },

    doubleClickZoom: function (evt) {
        var rot = this

	var x = evt.layerX
	var y = evt.layerY + rot.svg_wrapper[0][0].scrollTop
        var deltaRadians = rot.xyAngle (x, y)
        var radians = this.rotate - deltaRadians

        if (evt.shiftKey)
            rot.bigZoomOut(radians)
        else
            rot.bigZoomIn(radians)

        rot.clearSelection()
    },

    clearSelection: function() {
        if(document.selection && document.selection.empty) {
            document.selection.empty();
        } else if(window.getSelection) {
            var sel = window.getSelection();
            sel.removeAllRanges();
        }
    },
    
    manualResizeCallback: function() {
	if (this.resizeTimeout)
	    clearTimeout (this.resizeTimeout)
	this.resizeTimeout = setTimeout (dojo.hitch (this, this.manualResize), 200)
    },

    manualResize: function() {
	delete this.resizeTimeout
        var dim = this.windowDim()
	this.width = dim[0]
	this.height = Math.min (this.width, dim[1])
	this.clear()
	this.initScales()
    },

    windowResizeCallback: function() {
	if (this.resizeTimeout)
	    clearTimeout (this.resizeTimeout)
	this.resizeTimeout = setTimeout (dojo.hitch (this, this.windowResize), 200)
    },

    windowResize: function() {
	delete this.resizeTimeout
        var dim = this.windowDim()
	this.width = dim[0]
	this.height = dim[1]
	this.clear()
	this.initScales()
    },
    
    xyAngle: function(x,y) {
        var dx = x - this.width/2
        var dy = this.outerRadius() - y
        return Math.atan2(dx,dy)
    },

    xPos: function(r,theta) {
        return Math.sin(theta) * r
    },

    yPos: function(r,theta) {
        return -Math.cos(theta) * r
    },
    
    // createNavBox mostly lifted from JBrowse Browser.js
    createNavBox: function( parent ) {
        var align = 'left';
        var navbox = dojo.create( 'div', { id: this.id+'-navbox',
					   class: 'rotunda-navbox',
					   style: { 'text-align': align } },
				  parent );

        var four_nbsp = String.fromCharCode(160); four_nbsp = four_nbsp + four_nbsp + four_nbsp + four_nbsp;
        navbox.appendChild(document.createTextNode( four_nbsp ));

        var moveLeft = document.createElement("img");
        //moveLeft.type = "image";
        moveLeft.src = this.resolveUrl( "img/Empty.png" );
        moveLeft.id = "moveLeft";
        moveLeft.className = "icon nav";
        navbox.appendChild(moveLeft);

        var moveRight = document.createElement("img");
        //moveRight.type = "image";
        moveRight.src = this.resolveUrl( "img/Empty.png" );
        moveRight.id="moveRight";
        moveRight.className = "icon nav";
        navbox.appendChild(moveRight);

        navbox.appendChild(document.createTextNode( four_nbsp ));

        var bigZoomOut = document.createElement("img");
        //bigZoomOut.type = "image";
        bigZoomOut.src = this.resolveUrl( "img/Empty.png" );
        bigZoomOut.id = "bigZoomOut";
        bigZoomOut.className = "icon nav";
        navbox.appendChild(bigZoomOut);

        var zoomOut = document.createElement("img");
        //zoomOut.type = "image";
        zoomOut.src = this.resolveUrl("img/Empty.png");
        zoomOut.id = "zoomOut";
        zoomOut.className = "icon nav";
        navbox.appendChild(zoomOut);

        var zoomIn = document.createElement("img");
        //zoomIn.type = "image";
        zoomIn.src = this.resolveUrl( "img/Empty.png" );
        zoomIn.id = "zoomIn";
        zoomIn.className = "icon nav";
        navbox.appendChild(zoomIn);
        dojo.connect( zoomIn, "click", this,
                      function(event) {
                          dojo.stopEvent(event);
                          this.zoomIn();
                      });

        var bigZoomIn = document.createElement("img");
        //bigZoomIn.type = "image";
        bigZoomIn.src = this.resolveUrl( "img/Empty.png" );
        bigZoomIn.id = "bigZoomIn";
        bigZoomIn.className = "icon nav";
        navbox.appendChild(bigZoomIn);

	this.navButtons = { moveLeft: moveLeft,
			    moveRight: moveRight,
			    zoomIn: zoomIn,
			    zoomOut: zoomOut,
			    bigZoomIn: bigZoomIn,
			    bigZoomOut: bigZoomOut }

	this.connectNavButtons()
    },

    connectNavButtons: function() {
	var rot = this
	var nb = this.navButtons
	nb.signals = [
            on( nb.moveLeft, "click",
                function(event) {
                    dojo.stopEvent(event);
                    rot.slide(0.9);
                }),
            on( nb.moveRight, "click",
                function(event) {
                    dojo.stopEvent(event);
                    rot.slide(-0.9);
                }),
            on( nb.bigZoomOut, "click",
                function(event) {
                    dojo.stopEvent(event);
                    rot.bigZoomOut();
                }),
            on( nb.zoomOut, "click",
                function(event) {
                    dojo.stopEvent(event);
                    rot.zoomOut();
                }),
            on( nb.zoomIn, "click",
                function(event) {
                    dojo.stopEvent(event);
                    rot.zoomIn();
                }),
            on( nb.bigZoomIn, "click",
                function(event) {
                    dojo.stopEvent(event);
                    rot.bigZoomIn();
                })
	]
    },

    disconnectNavButtons: function() {
	if (this.navButtons.signals)
	    this.navButtons.signals.forEach (function (signal) {
		signal.remove()
	    })
	delete this.navButtons.signals
    },

    // resolveUrl is placeholder for JBrowse equivalent
    resolveUrl: function(url) { return url },

    rotateTo: function(newRads) {
        if (newRads > 2*Math.PI)
            newRads -= 2*Math.PI
        else if (newRads < -2*Math.PI)
            newRads += 2*Math.PI
        this.rotate = newRads
        this.redraw()
    },

    createTrackList: function() {
        var rot = this
	var parent = this.viewContainer

        var trackListContainer = dojo.create( 'div', { id: this.id+'-tracklist-container',
					               class: 'rotunda-tracklist-container',
					               title: 'Drag tracks and links to reorder' },
	                                      parent )

        dojo.create( 'br', { }, trackListContainer)
//        dojo.create( 'span', { innerHTML: '<i>Tracks</i>' }, trackListContainer)
        
        var trackList = dojo.create( 'div', { id: this.id+'-tracklist',
					      class: 'rotunda-tracklist',
					      title: 'Drag tracks to reorder' },
	                             trackListContainer )

        dojo.create( 'br', { }, trackListContainer)
//        dojo.create( 'span', { innerHTML: '<i>Links</i>' }, trackListContainer)

        var linkList = dojo.create( 'div', { id: this.id+'-linklist',
					     class: 'rotunda-tracklist',
					     title: 'Drag links to reorder' },
	                            trackListContainer )

	this.trackListContainer = trackListContainer
        this.trackList = trackList
        this.linkList = linkList

        this.trackListDnd = this.createDnd ('tracks', trackList)
        this.linkListDnd = this.createDnd ('links', linkList)
    },

    updateTrackList: function() {
	if (this.trackListContainer)
	    domConstruct.destroy (this.trackListContainer)
	this.createTrackList()
    },

    createDnd: function (tracksVar, container) {
        var rot = this
        var tracks = rot[tracksVar]
        var trackListDnd =
            new dndSource (
                container,
                {
                    accept: [tracksVar],
                    creator: dojo.hitch( this, function( track, hint ) {
                        return {
                            data: track,
                            type: [tracksVar],
                            node: dojo.create('div', { innerHTML: track.label,
                                                       id: track.trackListID(this),
                                                       className: 'rotunda-track-label' + (hint == 'avatar' ? ' dragging' : '') })
                        };
                    }),
                })

        aspect.after (trackListDnd,
                      'onDrop',
                      dojo.hitch (this, function (source, nodes, copy, target) {
                          var idToTrack = {}
                          tracks.forEach (function (track) { idToTrack[track.trackListID(rot)] = track })
                          var newTrackOrder = []
                          for (var i = 0; i < container.children.length; ++i)
                              newTrackOrder.push (idToTrack[container.children[i].id])
                          rot[tracksVar] = newTrackOrder
			  rot.calculateTrackSizes()
                          rot.redraw()
                      }))

        trackListDnd.insertNodes (false, tracks)
        return trackListDnd
    },
    
    slide: function(distance) {
        var rotunda = this
        if (this.animation || this.dragging) return;
        var deltaRads = 2 * distance * Math.atan (.5 * this.width / (this.outerRadius()))
        var newRads = this.rotate + deltaRads
        new Slider (rotunda,
                    function() {
			rotunda.rotateTo(newRads)
		    	rotunda.updateBrowserLocation()
		    },
                    700,
                    newRads)
    },

    bigZoomIn: function(newRotate) {
        this.zoomIn(undefined,newRotate,2)
    },

    bigZoomOut: function(newRotate) {
        this.zoomOut(undefined,newRotate,2)
    },

    zoomIn: function(e, newRotate, steps) {
        if (typeof(newRotate) === 'undefined')
            newRotate = this.rotate
        if (this.animation) return;
        if (steps === undefined) steps = 1;
        var newScale = this.scale
        while (steps-- > 0)
            newScale *= 2
        newScale = Math.min (this.maxScale, newScale)
        this.zoomTo (newScale, newRotate)
    },

    zoomOut: function(e, newRotate, steps) {
        if (typeof(newRotate) === 'undefined')
            newRotate = this.rotate
        if (this.animation) return;
        if (steps === undefined) steps = 1;
        var newScale = this.scale
        while (steps-- > 0)
            newScale /= 2
        newScale = Math.max (this.minScale, newScale)
        this.zoomTo (newScale, newRotate)
    },

    zoomTo: function (newScale, newRotate, noBrowserUpdate) {
        var rot = this
	if (newScale != rot.scale || newRotate != rot.rotate)
            new SpinZoom (rot,
			  function() { rot.navigateTo (newScale, newRotate, noBrowserUpdate) },
			  700,
                          newRotate,
                          newScale)
    },

    navigateTo: function (newScale, newRotate, noBrowserUpdate) {
	var rot = this
        rot.rotate = newRotate
        rot.scale = newScale
	rot.calculateTrackSizes()
        rot.redraw()
	if (!noBrowserUpdate)
	    rot.updateBrowserLocation()
    },

    showWait: function() {
	var oldCursors = [];
	for (var i = 0; i < this.waitElems.length; i++) {
            oldCursors[i] = this.waitElems[i].style.cursor;
            this.waitElems[i].style.cursor = "wait";
	}
	this.prevCursors.push(oldCursors);
    },

    showDone: function() {
	var oldCursors = this.prevCursors.pop();
	for (var i = 0; i < this.waitElems.length; i++) {
            this.waitElems[i].style.cursor = oldCursors[i];
	}
    },

    hideLabels: function() {
	this.svgInfo.labels.attr ('style', 'visibility:hidden;')
    },

    gTransformRotateAndScale: function (spriteImage, degrees, xfactor, yfactor) {
	var rot = this
        degrees = degrees || 0
        xfactor = xfactor || 1
	yfactor = yfactor || xfactor
	if (this.useCanvasForAnimations) {
	    rot.createAnimationCanvas()
	    var context = rot.animationCanvas.getContext("2d")
	    var r = rot.outerRadius()
	    context.translate (rot.width/2, 0)
	    context.scale (xfactor, yfactor)
	    context.translate (0, r)
	    context.rotate (degrees * Math.PI / 180)
	    context.translate (-rot.width/2, -r)
	    context.drawImage (spriteImage, 0, 0)

	} else {
            this.g.attr("transform",
			"scale(" + xfactor + "," + yfactor + ")"
                        + " translate(" + (this.width/2) / xfactor + "," + this.outerRadius() + ")"
                        + " rotate(" + degrees + ")")
	    if (!this.hideLabelsDuringAnimation)
		this.svgInfo.labels
		.attr("transform",
                      "scale(" + (1/xfactor) + "," + (1/yfactor) + ")"
                      + " rotate(" + (-degrees) + ")")
	}
    },
    
    gTransformRotate: function (spriteImage, degrees) {
	var rot = this
	if (this.useCanvasForAnimations) {
	    rot.createAnimationCanvas()
	    var context = rot.animationCanvas.getContext("2d")
	    var r = rot.outerRadius()
	    context.translate (rot.width/2, r)
	    context.rotate (degrees * Math.PI / 180)
	    context.translate (-rot.width/2, -r)
	    context.drawImage (spriteImage, 0, 0)

	} else {
            this.g.attr("transform",
			"translate(" + this.width/2 + "," + this.outerRadius() + ") rotate(" + degrees + ")")
	    if (!this.hideLabelsDuringAnimation)
		this.svgInfo.labels
		.attr("transform", "rotate(" + (-degrees) + ")")
	}
    },

    gTransformScale: function (spriteImage, xfactor, yfactor) {
	yfactor = yfactor || xfactor
	var rot = this
	if (this.useCanvasForAnimations) {
	    rot.createAnimationCanvas()
	    var context = rot.animationCanvas.getContext("2d")
	    context.translate (rot.width/2, 0)
	    context.scale (xfactor, yfactor)
	    context.translate (-rot.width/2, 0)
	    context.drawImage (spriteImage, 0, 0)

	} else {
            this.g.attr("transform",
			"scale(" + xfactor + "," + yfactor + ") translate(" + (this.width/2) / xfactor + "," + this.outerRadius() + ")")
	    if (!this.hideLabelsDuringAnimation)
		this.svgInfo.labels
		.attr("transform", "scale(" + (1/xfactor) + "," + (1/yfactor) + ")")
	}
    },

    drawCircle: function (radius, stroke) {
        this.g.append("circle")
            .attr("r", radius)
            .style("fill", "none")
            .style("stroke", stroke)
            .attr("cx",0)
            .attr("cy",0)
    },

    clear: function() {
	d3.selectAll('.rotunda-tooltip').remove()
	if (this.svg)
            this.svg.remove()
	delete this.svg
    },

    redraw: function() {
	this.clear()
        this.draw()
    },
    
    draw: function() {
        var rot = this
	if (this.width == 0 || this.height == 0)
	    return

        this.svg = this.svg_wrapper
            .append("svg")
            .attr("id", this.id+"-svg")
            .attr("class", "rotunda-svg")
            .attr("width", this.width)
            .attr("height", Math.max (this.height, this.totalTrackRadius))

        this.g = this.svg
            .append("g")
            .attr("id", this.id+"-g")
            .attr("transform", "translate(" + this.width/2 + "," + this.outerRadius() + ")")

        var svgInfo = rot.svgInfo = {}
	if (rot.useCanvasForAnimations)
            rot.promiseSprite()

        var updateSpriteImage = rot.updateSpriteImage
        var updateSvgInfo = function() {
            svgInfo.labels = d3.selectAll(".rotundaLabel")
            if (updateSpriteImage)
                updateSpriteImage()
        }
        
        // draw tracks in reverse order, so higher-ranked tracks appear on top
        for (var trackNum = this.tracks.length - 1; trackNum >= 0; --trackNum) {
	    var ar = this.angularViewRange (this.minRadius (trackNum))
	    var amin = ar[0], amax = ar[1]
            this.drawTrack (this.tracks[trackNum], trackNum, amin, amax,
                            updateSvgInfo)
        }
        this.drawLinks (updateSvgInfo)
    },

    drawTrack: function (track, trackNum, minAngle, maxAngle, callback) {
        var rot = this
        var maxRadius = this.maxRadius (trackNum)
        var minRadius = this.minRadius (trackNum)
	track.draw (this, minRadius, maxRadius, minAngle, maxAngle, callback)
    },

    drawLinks: function (callback) {
        var innerRadius = this.innerRadius(), outerRadius = this.outerRadius()
        if (this.height > outerRadius - innerRadius) {
            var lr = this.angularViewRange (this.innerRadius())
            var lmin = lr[0], lmax = lr[1]
            // draw link tracks in reverse order, so higher-ranked tracks appear on top
            for (var i = this.links.length - 1; i >= 0; --i)
                this.links[i].draw (this, 0, innerRadius, lmin, lmax, callback)
        }
    },

    // This rather kludgy method returns a promise, yielding an Image,
    // onto which the view, without text labels, has been painted.
    // This can be used to implement animations via image-painting operations
    // that may sometimes run smoother than SVG transforms on Firefox (o Moz, why u hate SVGs?).
    // Other possibilites to deal with Firefox jerkiness:
    //  - use open-source SVG rendering library such as canvg: https://github.com/gabelerner/canvg
    //  - do everything in Canvas to begin with (but then mouseover element detection is hard, esp. Bezier curves)
    promiseSprite: function() {
	var rot = this
	var deferred = new Deferred()

        var img = new Image()
	var ser = new XMLSerializer()

        if (!rot.svg) {
            console.log ("rot.svg undefined in promiseSprite!")
        }

        var svg = rot.svg[0][0]
        var svgInfo = rot.svgInfo

        var updateImage = function() {
	    svgInfo.labels.attr('style','display:none;')
	    var xml = ser.serializeToString( svg )
	    svgInfo.labels.attr('style','')

	    var blob = new Blob([xml], {type: 'image/svg+xml;charset=utf-8'})

	    var DOMURL = window.URL || window.webkitURL || window
	    var url = DOMURL.createObjectURL(blob)

	    img.onload = function () {
	        if (rot.spriteUrl)
		    DOMURL.revokeObjectURL(rot.spriteUrl)
	        rot.spriteUrl = url

	        deferred.resolve (img)
	    }
	    img.src = url
        }

        rot.updateSpriteImage = updateImage
	rot.spritePromise = deferred
    },
    
    createAnimationCanvas: function() {
	this.destroyAnimationCanvas()
	this.clear()
        this.animationCanvas = dojo.create( 'canvas',
					    { id: this.id+'-canvas',
					      class: 'rotunda-canvas',
					      width: this.width,
					      height: this.height },
				            query('#'+this.id+'-svg-wrapper')[0]);

    },

    destroyAnimationCanvas: function() {
	if (this.animationCanvas) {
	    this.animationCanvas.remove()
	    delete this.animationCanvas
	}
    },

    // various dimensions
    pixelsPerBase: function (scale, radius) {
	return (radius || this.radius) * this.radsPerBase * (scale || this.scale || 1)
    },

    basesPerPixel: function (scale, radius) {
	return 1 / this.pixelsPerBase(scale,radius)
    },

    basesPerView: function (scale, radius) {
	return this.width / this.pixelsPerBase(scale,radius)
    },

    radiansPerView: function (scale, radius) {
	// width / (radius * scale)
	return this.radsPerBase * this.basesPerView(scale,radius)
    },

    trackRadiusScale: function (scale) {
	return (scale <= this.trackRadiusNonlinearScaleThreshold
		? scale
		: this.trackRadiusNonlinearScaleThreshold * Math.pow (scale / this.trackRadiusNonlinearScaleThreshold, this.trackRadiusScaleExponent))
    },

    calculateTrackSize: function (track, scale, trackRadiusScale) {
	scale = scale || this.scale
	trackRadiusScale = trackRadiusScale || this.trackRadiusScale(scale)
        return track.getRadius (scale, trackRadiusScale, this.defaultTrackRadius)
    },

    calculateTotalTrackSize: function (scale) {
	var rot = this
	return this.tracks.reduce (function (tot, track) {
	    return tot + rot.calculateTrackSize (track, scale)
	}, 0)
    },

    calculateOuterTrackSize: function (scale) {
	return this.tracks.length ? this.calculateTrackSize(this.tracks[0],scale) : 0
    },

    calculateTrackSizes: function (scale, trackRadiusScale) {
	var rot = this
	scale = scale || this.scale
	trackRadiusScale = trackRadiusScale || this.trackRadiusScale(scale)

        this.trackRadius = this.tracks.map (function (track) {
	    return rot.calculateTrackSize (track, scale, trackRadiusScale)
        })

        var r = 0
        this.trackDistanceFromEdge = []
        for (var n = 0; n < this.tracks.length; ++n) {
            this.trackDistanceFromEdge.push (r)
            r += this.trackRadius[n]
        }
        this.totalTrackRadius = r
    },

    minRadius: function (trackNum) {
        return this.outerRadius() - this.trackDistanceFromEdge[trackNum] - this.trackRadius[trackNum] + 1
    },

    maxRadius: function (trackNum) {
        return this.outerRadius() - this.trackDistanceFromEdge[trackNum]
    },

    innerRadius: function() {
        return this.minRadius (this.tracks.length-1) - 1
    },
    
    outerRadius: function() {
        return this.radius * this.scale
    },
    
    coordToAngle: function (seqName, pos) {
        return this.refSeqStartAngleByName[seqName] + pos * this.radsPerBase + this.rotate
    },

    refSeqAngularRange: function (seqName) {
        var amin, amax
	amin = this.refSeqStartAngleByName[seqName]
	amax = amin + this.radsPerBase * this.refSeqLenByName[seqName]
	return [amin, amax]
    },

    refSeqAngularRangeOverlap: function (amin, amax, seqName) {
	var sr = this.refSeqAngularRange (seqName)
	var smin = sr[0], smax = sr[1]
	var pi2 = 2 * Math.PI
	while (amax < smin) {
	    amin += pi2
	    amax += pi2
	}
	return amin <= smax ? [amin, amax] : false
    },

    canonicalAngle: function (angle) {
	var pi2 = 2 * Math.PI
	while (angle < 0) angle += pi2
	while (angle > pi2) angle -= pi2
	return angle
    },

    angleToSeqName: function (angle) {
	angle = this.canonicalAngle(angle)
	for (var i = 1; i < this.refSeqStartAngle.length; ++i)
	    if (this.refSeqStartAngle[i] - this.spacerRads/2 > angle)
		return this.refSeqName[i-1]
	return this.refSeqName[this.refSeqName.length-1]
    },

    angleToUnboundedCoord: function (angle, seqName) {
        return Math.round ((angle - this.refSeqStartAngleByName[seqName]) / this.radsPerBase)
    },

    angleToCoord: function (angle, seqName) {
	if (typeof(seqName) === 'undefined')
	    seqName = this.angleToSeqName (angle)
        var pos = this.angleToUnboundedCoord (angle, seqName)
	return Math.max (0, Math.min (this.refSeqLenByName[seqName], pos))
    },

    angularViewWidth: function (radius) {
	radius = radius || this.innerRadius()
        return this.width/2 > radius ? Math.PI : 2*Math.asin ((this.width / 2) / radius)
    },

    angularViewRange: function (radius) {
	radius = radius || this.innerRadius()
        var amin, amax
        if (this.width >= radius * 2) {
            amin = 0
            amax = 2*Math.PI
        } else {
            var aw = this.angularViewWidth (radius)
            amin = -this.rotate - aw/2
            amax = -this.rotate + aw/2
        }
	return [amin, amax]
    },

    intervalsInView: function (radius) {
	var rot = this
	radius = radius || this.innerRadius()
	var ar = this.angularViewRange (radius)
	var amin = ar[0], amax = ar[1]
	var features = []
	this.refSeqName.forEach (function (seqName) {
	    var overlap = rot.refSeqAngularRangeOverlap (amin, amax, seqName)
	    if (overlap)
		features.push ({ seq: seqName,
				 start: rot.angleToCoord (overlap[0], seqName),
				 end: rot.angleToCoord (overlap[1], seqName) })
	})
	return features
    },

    showTracks: function( trackConfigs ) {
	this.browser.afterMilestone('initView', dojo.hitch( this, function() {
	    var rot = this
	    trackConfigs.forEach (function (trackConfig) {
		if (rot.tracks.filter (function (track) {
		    return track.id == trackConfig.label
		}).length == 0) {
		    var rotTrack = rot.createTrack (trackConfig)
		    if (rotTrack)
			rot.tracks.push (rotTrack)
		}
	    })
            this.calculateTrackSizes()
	    this.redraw()
	    this.updateTrackList()
	}))
    },

    hideTracks: function( trackConfigs ) {
	var rot = this
	var hide = {}
	trackConfigs.forEach (function (trackConfig) {
	    hide[trackConfig.label] = true
	})
	this.tracks = this.tracks.filter (function (track) {
	    return !hide[track.id]
	})
        this.calculateTrackSizes()
	this.redraw()
	this.updateTrackList()
    },

    createTrack: function (track) {
	if (track.type == 'JBrowse/View/Track/Alignments'
	    || track.type == 'JBrowse/View/Track/CanvasFeatures'
	    || track.type == 'JBrowse/View/Track/CanvasVariants'
	    || track.type == 'JBrowse/View/Track/FeatureCoverage'
	    || track.type == 'JBrowse/View/Track/HTMLFeatures'
	    || track.type == 'JBrowse/View/Track/HTMLVariants'
	    || track.type == 'JBrowse/View/Track/SNPCoverage'
/*
	    || track.storeClass == 'JBrowse/Store/SeqFeature/BAM'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/BED'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/BEDTabix'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/FromConfig'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/GFF3'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/GFF3Tabix'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/GTF'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/NCList'
	    || track.storeClass == 'JBrowse/Store/SeqFeature/SNPCoverage'
*/
	    ) {
	    var config = { id: track.label,
			   label: track.label,
			   storeName: track.store,
			   trackConfig: track }
	    return new DensityTrack (config)
	} else if (track.type == 'JBrowse/View/Track/Wiggle'
		   || track.type == 'JBrowse/View/Track/Wiggle/XYPlot'
		   || track.type == 'JBrowse/View/Track/Wiggle/Density') {
	    var config = { id: track.label,
			   label: track.label,
			   storeName: track.store,
			   trackConfig: track }
	    return new WiggleTrack (config)
	}
	return null
    },

    updateBrowserLocation: function() {
	if (this.browser) {
	    var w = this.angularViewWidth()
	    var seq = this.angleToSeqName (-this.rotate)
	    var ar = this.angularViewRange (this.outerRadius())
	    ar = this.refSeqAngularRangeOverlap (ar[0], ar[1], seq)
	    if (ar) {
		var bmin = Math.max (1, this.angleToCoord (ar[0], seq))
		var bmax = this.angleToCoord (ar[1], seq)
		var loc = seq + ":" + bmin + ".." + bmax
                ++this.ignoreNavigateEvents  // kludge to prevent issues when Browser rounds coords (eg when overhanging sequence ends)
		this.browser.navigateToLocation ({ ref: seq,
                                                   start: Math.round(bmin),
                                                   end: Math.round(bmax) })
	    }
	}
    },

    handleNavigate: function (region) {
        if (this.ignoreNavigateEvents)
            --this.ignoreNavigateEvents
        else
	    this.browser.afterMilestone('initRotunda', dojo.hitch( this, function() {
	        var amin = this.coordToAngle (region.ref, region.start)
	        var amax = this.coordToAngle (region.ref, region.end)
	        if (amax < amin)
		    amax += 2*Math.PI
	        var newScale = Math.max (1, (this.width/2) / (this.radius * Math.sin((amax-amin)/2)))
	        var newRotate = this.rotate - (amin + amax) / 2
	        // only move if the change in angle or scale is over .5%
	        var scaleDelta = Math.abs ((newScale - this.scale) / this.scale)
	        var rotateDelta = Math.abs ((this.canonicalAngle(newRotate) - this.canonicalAngle(this.rotate)) / this.canonicalAngle(this.rotate))
	        if (scaleDelta > .005 || rotateDelta > .005) {
                    //		console.log("scale="+this.scale+" newScale="+newScale+" rotate="+this.rotate+" newRotate="+newRotate)
		    this.navigateTo (newScale, newRotate, true)
	        }
	    }))
    },

    showRotunda: function() {
        if (this.browser) {
	    dojo.setStyle(this.browser.viewElem,'visibility','hidden')
            dojo.setStyle(this.browser.navboxButtonContainer,'visibility','hidden')
            this.browser.view.disableSlide = true  // while Rotunda is visible, we are still using GenomeView's navbar, so disable GenomeView Slider animations
	    this.browser.disconnectNavButtons()
        }
	dojo.setStyle(this.viewContainer,'visibility','visible')
	this.connectNavButtons()
    },

    showGenomeView: function() {
	dojo.setStyle(this.viewContainer,'visibility','hidden')
	this.disconnectNavButtons()
        if (this.browser) {
	    dojo.setStyle(this.browser.viewElem,'visibility','visible')
            dojo.setStyle(this.browser.navboxButtonContainer,'visibility','visible')
            this.browser.view.disableSlide = false
	    this.browser.connectNavButtons()
        }
    },

})

       })
