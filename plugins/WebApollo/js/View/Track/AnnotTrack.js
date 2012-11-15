define( [
            'dojo/_base/declare',
            'jquery',
            'dijit/Menu',
            'dijit/MenuItem',
            'dijit/Dialog',
            'WebApollo/View/Track/DraggableHTMLFeatures',
            'WebApollo/FeatureSelectionManager',
            'WebApollo/JSONUtils',
            'WebApollo/BioFeatureUtils',
            'WebApollo/Permission'
        ],
        function( declare, $, dijitMenu, dijitMenuItem, dijitDialog, DraggableFeatureTrack, FeatureSelectionManager, JSONUtils, BioFeatureUtils, Permission ) {

var listeners = [];

/**
 *  only set USE_COMET true if server supports Servlet 3.0
 *  comet-style long-polling, and web app is propertly set up
 *  for async otherwise if USE_COMET is set to true, will cause
 *  server-breaking errors
 */
var USE_COMET = true;

var creation_count = 0;

var annot_context_menu;
var contextMenuItems;

var context_path = "..";

var non_annot_context_menu;

var AnnotTrack = declare( DraggableFeatureTrack,
{
    constructor: function( args ) {
                //function AnnotTrack(trackMeta, url, refSeq, browserParams) {
        //trackMeta: object with:
        //            key:   display text track name
        //            label: internal track name (no spaces, odd characters)
        //            sourceUrl: replaces previous url arg to FetureTrack constructors
        //refSeq: object with:
        //         start: refseq start
        //         end:   refseq end
        //browserParams: object with:
        //                changeCallback: function to call once JSON is loaded
        //                trackPadding: distance in px between tracks
        //                baseUrl: base URL for the URL in trackMeta
        this.has_custom_context_menu = true;

        // this.selectionManager = this.setSelectionManager(new FeatureSelectionManager());
        // this.selectionManager = this.setSelectionManager(DraggableFeatureTrack.selectionManager);
        this.selectionManager = this.setSelectionManager( AnnotTrack.selectionManager );
        //    this.selectionManager.setClearOnAdd(new Array(DraggableFeatureTrack.selectionManager));
        //    DraggableFeatureTrack.selectionManager.setClearOnAdd(new Array(this.selectionManager)); 

        this.selectionClass = "selected-annotation";
        this.annot_under_mouse = null;

        /**
         * only show residues overlay if "pointer-events" CSS property is supported
         *   (otherwise will interfere with passing of events to features beneath the overlay)
         */
        this.useResiduesOverlay = 'pointerEvents' in document.body.style;
        this.FADEIN_RESIDUES = false;

        /**
         *   map keeping track of set of y positions for top-level feature divs of selected features
         *   (for better residue-overlay to be implemented TBD)
         */
    //    this.selectionYPosition = null;

        var thisObj = this;
        /*
          this.subfeatureCallback = function(i, val, param) {
          thisObj.renderSubfeature(param.feature, param.featDiv, val);
          };
        */
        // define fields meta data
    //    this.fields = AnnotTrack.fields;
        this.comet_working = true;
    //     this.remote_edit_working = false;

        this.annotMouseDown = function(event)  {
            thisObj.onAnnotMouseDown(event);
        };

        this.verbose_create = false;
        this.verbose_add = false;
        this.verbose_delete = false;
        this.verbose_drop = true;
        this.verbose_click = false;
        this.verbose_resize = false;
        this.verbose_mousedown = false;
        this.verbose_mouseenter = false;
        this.verbose_mouseleave = false;
        this.verbose_render = false;

//        this.inherited( arguments );

        var track = this;
        // for AnnotTrack, features currently MUST be an NCList
    //    var features = this.features;
//        this.features = this.featureStore.nclist;
//        var features = this.features;

//        this.initAnnotContextMenu();
//        this.initNonAnnotContextMenu();
//        this.initPopupDialog();

            dojo.xhrPost( {
                postData: '{ "track": "' + track.getUniqueTrackName() + '", "operation": "get_features" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5 * 1000, // Time in milliseconds
                // The LOAD function will be called on a successful response.
                load: function(response, ioArgs) { //
                    var responseFeatures = response.features;
                    for (var i = 0; i < responseFeatures.length; i++) {
                        // var jfeat = JSONUtils.createJBrowseFeature(track.attrs, responseFeatures[i]);
                        // var jfeat = JSONUtils.createJBrowseFeature(features.attrs, responseFeatures[i]);
                        store.insert(jfeat, responseFeatures[i].uniquename);
                        // console.log("responseFeatures[0].uniquename: " + responseFeatures[0].uniquename);
                    }
                    track.hideAll();
                    track.changed();
                    //              features.verbose = true;  // turn on diagnostics reporting for track's NCList
                    features.verbose = false;  // turn on diagnostics reporting for track's NCList

                    if ( USE_COMET )  {
                        track.createAnnotationChangeListener();
                    }

                    track.getSequenceTrack().loadSequenceAlterations();
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) { //
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status); //
                    track.handleError(response);
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //
                    // track.remote_edit_working = false;
                    return response; //
                }
            });

  /*
      this.makeTrackDroppable();
        this.hide();
        this.show();

        dojo.addOnUnload(this, function() {
            var track = this;
            if( listeners[track.getUniqueTrackName()] ) {
                if( listeners[track.getUniqueTrackName()].fired == -1 ) {
                    listeners[track.getUniqueTrackName()].cancel();
                }
            }
        });
*/
    },

    createAnnotationChangeListener: function() {
        var track = this;
        var features = this.features;

        if (listeners[track.getUniqueTrackName()]) {
            if (listeners[track.getUniqueTrackName()].fired == -1) {
                    listeners[track.getUniqueTrackName()].cancel();
            }
        }

        var listener = dojo.xhrGet( {
            url: context_path + "/AnnotationChangeNotificationService",
            content: {
                track: track.getUniqueTrackName()
            },
            handleAs: "json",
    //      timeout: 1000 * 1000, // Time in milliseconds
            timeout: 0,
            // The LOAD function will be called on a successful response.
            load: function(response, ioArgs) {
                    if (response == null) {
                            track.createAnnotationChangeListener();
                    }
                    else if (response.error) {
                            track.handleError({ responseText: JSON.stringify(response) });
                    }
                    else {
                            for (var i in response) {
                                    var changeData = response[i];
                                    if (changeData.operation == "ADD") {
                                            console.log("ADD command from server: ");
                                            console.log(changeData);
                                            if (changeData.sequenceAlterationEvent) {
                                                    track.getSequenceTrack().addSequenceAlterations(changeData.features);
                                            }
                                            else {
                                                    track.addFeatures(changeData.features);
                                            }
                                    }
                                    else if (changeData.operation == "DELETE") {
                                            console.log("DELETE command from server: ");
                                            console.log(changeData);
                                            if (changeData.sequenceAlterationEvent) {
                                                    track.getSequenceTrack().removeSequenceAlterations(changeData.features);
                                            }
                                            else {
                                                    track.deleteFeatures(changeData.features);
                                            }
                                    }
                                    else if (changeData.operation == "UPDATE") {
                                            console.log("UPDATE command from server: ");
                                            console.log(changeData);
                                            if (changeData.sequenceAlterationEvent) {
                                                    track.getSequenceTrack().removeSequenceAlterations(changeData.features);
                                                    track.getSequenceTrack().addSequenceAlterations(changeData.features);
                                            }
                                            else {
                                                    track.deleteFeatures(changeData.features);
                                                    track.addFeatures(changeData.features);
                                            }
                                    }
                                    else  {
                                            console.log("UNKNOWN command from server: ");
                                            console.log(response);
                                    }
                            }
                            track.hideAll();
                            track.changed();
                            track.createAnnotationChangeListener();
                    }
            },
            // The ERROR function will be called in an error case.
            error: function(response, ioArgs) { //
                    if (response.dojoType == "cancel") {
                            return;
                    }
    //              track.handleError(response);
                    if (response.responseText) {
                            track.handleError(response);
                    }
                    else {
                            track.handleError({responseText: '{ error: "Server connection error" }'});
                    }
                console.error("HTTP status code: ", ioArgs.xhr.status); //
                track.comet_working = false;
                return response;
            },
            failOk: true
        });
        listeners[track.getUniqueTrackName()] = listener;

    },

    addFeatures: function(responseFeatures) {
            for (var i = 0; i < responseFeatures.length; ++i) {
    //          var featureArray = JSONUtils.createJBrowseFeature(responseFeatures[i], this.fields, this.subFields);
                var featureArray = JSONUtils.createJBrowseFeature(this.attrs, responseFeatures[i]);
                var id = responseFeatures[i].uniquename;
               // if (this.features.featIdMap[id] == null) {
               if (! this.features.contains(id))  {
                    // note that proper handling of subfeatures requires annotation trackData.json resource to
                    //    set sublistIndex one past last feature array index used by other fields
                    //    (currently Annotations always have 6 fields (0-5), so sublistIndex = 6
                    this.features.add(featureArray, id);
                }
            }

    },

    deleteFeatures: function(responseFeatures) {
        for (var i = 0; i < responseFeatures.length; ++i) {
            var id_to_delete = responseFeatures[i].uniquename;
            this.features.deleteEntry(id_to_delete);
        }
    },

    /**
     *  overriding renderFeature to add event handling right-click context menu
     */
    renderFeature:  function( feature, uniqueId, block, scale,
                              containerStart, containerEnd ) {
        //  if (uniqueId.length > 20)  {
        //    feature.short_id = uniqueId;
        //  }
        var track = this;
        var featDiv = this.inherited( arguments );

        if (featDiv && featDiv != null)  {
            annot_context_menu.bindDomNode(featDiv);
            $(featDiv).droppable(  {
                accept: ".selected-feature",   // only accept draggables that are selected feature divs
                tolerance: "pointer",
                hoverClass: "annot-drop-hover",
                over: function(event, ui)  {
                    track.annot_under_mouse = event.target;
                },
                out: function(event, ui)  {
                    track.annot_under_mouse = null;
                },
                drop: function(event, ui)  {
                    // ideally in the drop() on annot div is where would handle adding feature(s) to annot,
                    //   but JQueryUI droppable doesn't actually call drop unless draggable helper div is actually
                    //   over the droppable -- even if tolerance is set to pointer
                    //      tolerance=pointer will trigger hover styling when over droppable,
                    //           as well as call to over method (and out when leave droppable)
                    //      BUT location of pointer still does not influence actual dropping and drop() call
                    // therefore getting around this by handling hover styling here based on pointer over annot,
                    //      but drop-to-add part is handled by whole-track droppable, and uses annot_under_mouse
                    //      tracking variable to determine if drop was actually on top of an annot instead of
                    //      track whitespace
                    if (track.verbose_drop)  {
                        console.log("dropped feature on annot:");
                        console.log(featDiv);
                    }
                }
            } );
        }
        return featDiv;
    },

    renderSubfeature: function( feature, featDiv, subfeature,
                                displayStart, displayEnd, block) {
        var subdiv = this.inherited( arguments );

        /**
         *  setting up annotation resizing via pulling of left/right edges
         *      but if subfeature is not selectable, do not bind mouse down
         */
        if (subdiv && subdiv != null && (! this.selectionManager.unselectableTypes[subfeature.get('type')]) )  {
            $(subdiv).bind("mousedown", this.annotMouseDown);
        }
        return subdiv;
    },

    /**
     *  get the GenomeView's sequence track -- maybe move this to GenomeView?
     *  WebApollo assumes there is only one SequenceTrack
     *     if there are multiple SequenceTracks, getSequenceTrack returns first one found
     *         iterating through tracks list
     */
    getSequenceTrack: function()  {
        if (this.seqTrack)  {
             return this.seqTrack;
        }
        else  {
            var tracks = this.gview.tracks;
            for (var i = 0; i < tracks.length; i++)  {
                if (tracks[i] instanceof SequenceTrack)  {
                    this.seqTrack = tracks[i];
                    tracks[i].setAnnotTrack(this);
                    break;
                }
            }
            return this.seqTrack;
        }
    },

    onFeatureMouseDown: function(event) {

        // _not_ calling DraggableFeatureTrack.prototyp.onFeatureMouseDown --
        //     don't want to allow dragging (at least not yet)
        // event.stopPropagation();
        this.last_mousedown_event = event;
        var ftrack = this;
        if (ftrack.verbose_selection || ftrack.verbose_drag)  {
            console.log("AnnotTrack.onFeatureMouseDown called");
        }

        // checking for whether this is part of drag setup retrigger of mousedown --
        //     if so then don't do selection or re-setup draggability)
        //     this keeps selection from getting confused,
        //     and keeps trigger(event) in draggable setup from causing infinite recursion
        //     in event handling calls to featMouseDown
    /*    if (ftrack.drag_create)  {
            if (ftrack.verbose_selection || ftrack.verbose_drag)  {
                console.log("DFT.featMouseDown re-triggered event for drag initiation, drag_create: " + ftrack.drag_create);
                console.log(ftrack);
            }
            ftrack.drag_create = null;
        }
        else  {
            this.handleFeatureSelection(event);
            // this.handleFeatureDragSetup(event);
        }
    */
        this.handleFeatureSelection(event);
    },

    /**
     *   handles mouse down on an annotation
     *   to make the annotation resizable by pulling the left/right edges
     */
    onAnnotMouseDown: function(event)  {
        var track = this;
    //    track.last_mousedown_event = event;
        var verbose_resize = track.verbose_resize;
        if (verbose_resize || track.verbose_mousedown)  { console.log("AnnotTrack.onAnnotMouseDown called"); }
        event = event || window.event;
        var elem = (event.currentTarget || event.srcElement);
        var featdiv = DraggableFeatureTrack.prototype.getLowestFeatureDiv(elem);
        if (featdiv && (featdiv != null))  {
            if (dojo.hasClass(featdiv, "ui-resizable"))  {
                if (verbose_resize)  {
                    console.log("already resizable");
                    console.log(featdiv);
                }
            }
            else {
                if (verbose_resize)  {
                    console.log("making annotation resizable");
                    console.log(featdiv);
                }
                var scale = track.gview.bpToPx(1);
                // if zoomed int to showing sequence residues, then make edge-dragging snap to interbase pixels
                if (scale === track.browserParams.charWidth) { var gridvals = [track.browserParams.charWidth, 1]; }
                else  { var gridvals = false; }
                $(featdiv).resizable( {
                    handles: "e, w",
                    helper: "ui-resizable-helper",
                    autohide: false,
                    grid: gridvals,

                    stop: function(event, ui)  {
                        if( verbose_resize ) {
                            console.log("resizable.stop() called, event:");
                            console.dir(event);
                            console.log("ui:");
                            console.dir(ui);
                        }
                        var gview = track.gview;
                        var oldPos = ui.originalPosition;
                        var newPos = ui.position;
                        var oldSize = ui.originalSize;
                        var newSize = ui.size;
                        var leftDeltaPixels = newPos.left - oldPos.left;
                        var leftDeltaBases = Math.round(gview.pxToBp(leftDeltaPixels));
                        var oldRightEdge = oldPos.left + oldSize.width;
                        var newRightEdge = newPos.left + newSize.width;
                        var rightDeltaPixels = newRightEdge - oldRightEdge;
                        var rightDeltaBases = Math.round(gview.pxToBp(rightDeltaPixels));
                        if (verbose_resize)  {
                            console.log("left edge delta pixels: " + leftDeltaPixels);
                            console.log("left edge delta bases: " + leftDeltaBases);
                            console.log("right edge delta pixels: " + rightDeltaPixels);
                            console.log("right edge delta bases: " + rightDeltaBases);
                        }
                        var subfeat = ui.originalElement[0].subfeature;
                        console.log(subfeat);

                        if ( ! USE_COMET || !track.comet_working) {
                            track.attrs.set(subfeat, "Start", (track.attrs.get(subfeat, "Start") + leftDeltaBases));
                            track.attrs.set(subfeat, "End", (track.attrs.get(subfeat, "End") + rightDeltaBases));
                            // subfeat[track.subFields["start"]] += leftDeltaBases;
                            // subfeat[track.subFields["end"]] += rightDeltaBases;
                        }
                        else {
                            var fmin = track.attrs.get(subfeat, "Start") + leftDeltaBases;
                            var fmax = track.attrs.get(subfeat, "End") + rightDeltaBases;
                            // var fmin = subfeat[track.subFields["start"]] + leftDeltaBases;
                            // var fmax = subfeat[track.subFields["end"]] + rightDeltaBases;
                            dojo.xhrPost( {
                                postData: '{ "track": "' + track.getUniqueTrackName() + '", "features": [ { "uniquename": ' + subfeat.uid + ', "location": { "fmin": ' + fmin + ', "fmax": ' + fmax + ' } } ], "operation": "set_exon_boundaries" }',
                                url: context_path + "/AnnotationEditorService",
                                handleAs: "json",
                                timeout: 1000 * 1000, // Time in milliseconds
                                // The LOAD function will be called on a successful response.
                                load: function(response, ioArgs) { //
                                    if ( ! USE_COMET || !track.comet_working)  {
                                        //TODO
                                    }
                                },
                                // The ERROR function will be called in an error case.
                                error: function(response, ioArgs) { //
                                    console.log("Error creating annotation--maybe you forgot to log into the server?");
                                    console.error("HTTP status code: ", ioArgs.xhr.status); //
                                    track.handleError(response);
                                    //dojo.byId("replace").innerHTML = 'Loading the ressource from the server did not work'; //
                                    return response;
                                }
                            });
                        }
                        console.log(subfeat);
                        track.hideAll();
                        track.changed();
                    }
                } );
            }
        }
        event.stopPropagation();
    },

    /**
     *  feature click no-op (to override FeatureTrack.onFeatureClick, which conflicts with mouse-down selection
     */
    onFeatureClick: function(event) {

        if (this.verbose_click)  { console.log("in AnnotTrack.onFeatureClick"); }
        event = event || window.event;
        var elem = (event.currentTarget || event.srcElement);
        var featdiv = this.getLowestFeatureDiv( elem );
        if (featdiv && (featdiv != null))  {
            if (this.verbose_click)  { console.log(featdiv); }
        }
        // do nothing
        //   event.stopPropagation();
    },

    addToAnnotation: function(annot, feats_to_add)  {
        var target_track = this;
        var tatts = target_track.attrs;
        var nclist = target_track.features;

                var subfeats = new Array();
                var allSameStrand = 1;
                for (var i = 0; i < feats_to_add.length; ++i)  { 
                        var feat = feats_to_add[i];
                        var isSubfeature = (!!feat.parent);  // !! is shorthand for returning true if value is defined and non-null
                        var annotStrand = tatts.get(annot, "Strand");
                        if (isSubfeature)  {
                                var featStrand = tatts.get(feat, "Strand");
                                var featToAdd = feat;
                                if (featStrand != annotStrand) {
                                        allSameStrand = 0;
                                        featToAdd = new Array();
                                        $.extend(featToAdd, feat);
                                        tatts.set(featToAdd, "Strand", annotStrand);
                                }
                                subfeats.push(featToAdd);
                        }
                        else  {
                                var source_track = feat.track;
                                var satts = source_track.attrs;
                                // if (source_track.fields["subfeatures"])  {
                                if (satts.hasDefinedAttribute(feat, "Subfeatures")) {
                                    // var subs = feat[source_track.fields["subfeatures"]];
                                    var subs = satts.get(feat, "Subfeatures");
                                    for (var i = 0; i < subs.length; ++i) {
                                        var feat = subs[i];
                                                var featStrand = tatts.get(feat, "Strand");
                                        var featToAdd = feat;
                                                if (featStrand != annotStrand) {
                                                        allSameStrand = 0;
                                                        featToAdd = new Array();
                                                        $.extend(featToAdd, feat);
                                                        tatts.set(featToAdd, "Strand", annotStrand);
                                                }
                                                subfeats.push(featToAdd);
                                    }
//                                  $.merge(subfeats, subs);
                                }
                        }
                }

                if (!allSameStrand && !confirm("Adding features of opposite strand.  Continue?")) {
                        return;
                }

                var featuresString = "";
                for (var i = 0; i < subfeats.length; ++i) {
                        var subfeat = subfeats[i];
                        // if (subfeat[target_track.subFields["type"]] != "wholeCDS") {
                        var source_track = subfeat.track;
                        var satts = source_track.attrs;
                        if (satts.get(subfeat, "Type") != "wholeCDS") {
                                var jsonFeature = JSONUtils.createApolloFeature(tatts, subfeats[i], "exon");
                                featuresString += ", " + JSON.stringify( jsonFeature );
                        }
                }
//              var parent = JSONUtils.createApolloFeature(annot, target_track.fields, target_track.subfields);
//              parent.uniquename = annot[target_track.fields["name"]];
                dojo.xhrPost( {
                        postData: '{ "track": "' + target_track.getUniqueTrackName() + '", "features": [ {"uniquename": "' + annot.uid + '"}' + featuresString + '], "operation": "add_exon" }',
                        url: context_path + "/AnnotationEditorService",
                        handleAs: "json",
                        timeout: 5000, // Time in milliseconds
                        // The LOAD function will be called on a successful response.
                        load: function(response, ioArgs) { //
                                if ( ! USE_COMET || !target_track.comet_working)  {
                                        //TODO
                                }
                        },
                        error: function(response, ioArgs) {
                                target_track.handleError(response);
                                console.log("Annotation server error--maybe you forgot to login to the server?");
                                console.error("HTTP status code: ", ioArgs.xhr.status);
                                return response;
                        }
                });
    },

    makeTrackDroppable: function() {
        var target_track = this;
        var target_trackdiv = target_track.div;
        if (target_track.verbose_drop)  {
            console.log("making track a droppable target: ");
            console.log(this);
            console.log(target_trackdiv);
        }
        $(target_trackdiv).droppable(  {
            // only accept draggables that are selected feature divs
          //  accept: ".selected-feature",

            // switched to using deactivate() rather than drop() for drop handling
            // this fixes bug where drop targets within track (feature divs) were lighting up as drop target,
            //    but dropping didn't actually call track.droppable.drop()
            //    (see explanation in feature droppable for why we catch drop at track div rather than feature div child)
            //    cause is possible bug in JQuery droppable where droppable over(), drop() and hoverclass
            //       collision calcs may be off (at least when tolerance=pointer)?
            //
            // Update 3/2012
            // deactivate behavior changed?  Now getting called every time dragged features are release,
            //     regardless of whether they are over this track or not
            // so added another hack to get around drop problem
            // combination of deactivate and keeping track via over()/out() of whether drag is above this track when released
            // really need to look into actual drop calc fix -- maybe fixed in new JQuery releases?
            //
            // drop: function(event, ui)  {
            over: function(event, ui) {
                target_track.track_under_mouse_drag = true;
		if (target_track.verbose_drop) { console.log("droppable entered AnnotTrack") };
            },
            out: function(event, ui) {
                target_track.track_under_mouse_drag = false;
		if (target_track.verbose_drop) { console.log("droppable exited AnnotTrack") };

            },
            deactivate: function(event, ui)  {x
                // console.log("trackdiv droppable detected: draggable deactivated");
                // "this" is the div being dropped on, so same as target_trackdiv
                if (target_track.verbose_drop)  { console.log("draggable deactivated"); }

                var dropped_feats = DraggableFeatureTrack.selectionManager.getSelection();
                // problem with making individual annotations droppable, so checking for "drop" on annotation here,
                //    and if so re-routing to add to existing annotation
                if (target_track.annot_under_mouse != null)  {
                    if (target_track.verbose_drop)  {
                        console.log("draggable dropped onto annot: ");
                        console.log(target_track.annot_under_mouse.feature);
                    }
                    target_track.addToAnnotation(target_track.annot_under_mouse.feature, dropped_feats);
                }
                else if (target_track.track_under_mouse_drag) {
                    if (target_track.verbose_drop)  { console.log("draggable dropped on AnnotTrack"); }
                    target_track.createAnnotations(dropped_feats);
                }
                // making sure annot_under_mouse is cleared
                //   (should do this in the drop?  but need to make sure _not_ null when
                target_track.annot_under_mouse = null;
                target_track.track_under_mouse_drag = false;
            }
        } );
        if( target_track.verbose_drop) { console.log("finished making droppable target"); }
    },

    createAnnotations: function(feats)  {
            var target_track = this;
            var features_nclist = target_track.features;
            var featuresToAdd = new Array();
            var parentFeatures = new Object();
            for (var i in feats)  {
                    var dragfeat = feats[i];
                    var is_subfeature = (!!dragfeat.parent);  // !! is shorthand for returning true if value is defined and non-null
                    var parentId = is_subfeature ? dragfeat.parent.uid : dragfeat.uid;
                    if (parentFeatures[parentId] === undefined) {
                            parentFeatures[parentId] = new Array();
                            parentFeatures[parentId].isSubfeature = is_subfeature;
                    }
                    parentFeatures[parentId].push(dragfeat);
            }

            for (var i in parentFeatures) {
                    var featArray = parentFeatures[i];
                    if (featArray.isSubfeature) {
                            var parentFeature = featArray[0].parent;
                            var parentSourceTrack = parentFeature.track;
                            var fmin = undefined;
                            var fmax = undefined;
                            var featureToAdd = $.extend({}, parentFeature);
                            parentSourceTrack.attrs.set(featureToAdd, "Subfeatures", new Array());
                            for (var k = 0; k < featArray.length; ++k) {
                                    var dragfeat = featArray[k];
                                    var source_track = dragfeat.track;
                                    var childFmin = source_track.attrs.get(dragfeat, "Start");
                                    var childFmax = source_track.attrs.get(dragfeat, "End");
                                    if (fmin === undefined || childFmin < fmin) {
                                            fmin = childFmin;
                                    }
                                    if (fmax === undefined || childFmax > fmax) {
                                            fmax = childFmax;
                                    }
                                    parentSourceTrack.attrs.get(featureToAdd, "Subfeatures").push(dragfeat);
                            }
                            parentSourceTrack.attrs.set(featureToAdd, "Start", fmin);
                            parentSourceTrack.attrs.set(featureToAdd, "End", fmax);
                            var afeat = JSONUtils.createApolloFeature(parentSourceTrack.attrs, featureToAdd, "transcript");
                            featuresToAdd.push(afeat);
                    }
                    else {
                            for (var k = 0; k < featArray.length; ++k) {
                                    var dragfeat = featArray[k];
                                    var source_track = dragfeat.track;
                                    var afeat = JSONUtils.createApolloFeature(source_track.attrs, dragfeat, "transcript");
                                    featuresToAdd.push(afeat);
                            }
                    }
            }

            /*
            {
                    
                    var source_track = dragfeat.track;
                    if (this.verbose_create)  {
                            console.log("creating annotation based on feature: ");
                            console.log(dragfeat);
                    }
                    var dragdiv = source_track.getFeatDiv(dragfeat);


                    var newfeat = JSONUtils.convertToTrack(dragfeat, source_track, target_track);
                    var source_fields = source_track.fields;
                    var source_subFields = source_track.subFields;
                    var target_fields = target_track.fields;
                    var target_subFields = target_track.subFields;
                    if (this.verbose_create)  {
                            console.log("local feat conversion: " );
                            console.log(newfeat);
                    }
                    var afeat = JSONUtils.createApolloFeature(source_track.attrs, dragfeat, "transcript");
                    featuresToAdd.push(afeat);

            }
            */

            dojo.xhrPost( {
                    postData: '{ "track": "' + target_track.getUniqueTrackName() + '", "features": ' + JSON.stringify(featuresToAdd) + ', "operation": "add_transcript" }',
                    url: context_path + "/AnnotationEditorService",
                    handleAs: "json",
                    timeout: 5000, // Time in milliseconds
                    // The LOAD function will be called on a successful response.
                    load: function(response, ioArgs) { //
                            if (this.verbose_create)  { console.log("Successfully created annotation object: " + response); }
                            // response processing is now handled by the long poll thread (when using servlet 3.0)
                            //  if comet-style long pollling is not working, then create annotations based on
                            //     AnnotationEditorResponse
                            if ( ! USE_COMET || !target_track.comet_working)  {
                                    var responseFeatures = response.features;
                                    for (var rindex in responseFeatures)  {
                                            var rfeat = responseFeatures[rindex];
                                            if (this.verbose_create)  { console.log("AnnotationEditorService annot object: ");
                                            console.log(rfeat); }
                                            var jfeat = JSONUtils.createJBrowseFeature(target_track.attrs, rfeat);
                                            if (this.verbose_create)  { console.log("Converted annot object to JBrowse feature array: " + jfeat.uid);
                                            console.log(jfeat); }
                                            features_nclist.add(jfeat, jfeat.uid);
                                    }
                                    target_track.hideAll();
                                    target_track.changed();
                            }
                    },
                    // The ERROR function will be called in an error case.
                    error: function(response, ioArgs) { //
                            target_track.handleError(response);
                            console.log("Error creating annotation--maybe you forgot to log into the server?");
                            console.error("HTTP status code: ", ioArgs.xhr.status); //
                            //dojo.byId("replace").innerHTML = 'Loading the ressource from the server did not work'; //
                            return response;
                    }
            });
    },

    duplicateSelectedFeatures: function() {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.duplicateAnnotations(selected);
    },

    duplicateAnnotations: function(feats)  {
            var track = this;
            var attrs = track.attrs;
            var featuresToAdd = new Array();
            var subfeaturesToAdd = new Array();
            var parentFeature;
            for (var i in feats)  {
                    var feat = feats[i];
                    var is_subfeature = (!!feat.parent);  // !! is shorthand for returning true if value is defined and non-null
                    if (is_subfeature) {
                            subfeaturesToAdd.push(feat);
                    }
                    else {
                            featuresToAdd.push(JSONUtils.createApolloFeature(attrs, feat, "transcript"));
                    }
            }
            if (subfeaturesToAdd.length > 0) {
                    var feature = new Array();
                    var subfeatures = new Array();
                    feature[0] = 0;
                    attrs.set(feature, "Subfeatures", subfeatures);
                    var fmin = undefined;
                    var fmax = undefined;
                    var strand = undefined;
                    for (var i = 0; i < subfeaturesToAdd.length; ++i) {
                            var subfeature = subfeaturesToAdd[i];
                            if (fmin === undefined || attrs.get(subfeature, "Start") < fmin) {
                                    fmin = attrs.get(subfeature, "Start");
                            }
                            if (fmax === undefined || attrs.get(subfeature, "End") > fmax) {
                                    fmax = attrs.get(subfeature, "End");
                            }
                            if (strand === undefined) {
                                    strand = attrs.get(subfeature, "Strand");
                            }
                            subfeatures.push(subfeature);
                    }
                    attrs.set(feature, "Start", fmin);
                    attrs.set(feature, "End", fmax);
                    attrs.set(feature, "Strand", strand);
                    featuresToAdd.push(JSONUtils.createApolloFeature(attrs, feature, "transcript"));
            }

            dojo.xhrPost( {
                    postData: '{ "track": "' + track.getUniqueTrackName() + '", "features": ' + JSON.stringify(featuresToAdd) + ', "operation": "add_transcript" }',
                    url: context_path + "/AnnotationEditorService",
                    handleAs: "json",
                    timeout: 5000, // Time in milliseconds
                    // The LOAD function will be called on a successful response.
                    load: function(response, ioArgs) { //
                    },
                    // The ERROR function will be called in an error case.
                    error: function(response, ioArgs) { //
                            target_track.handleError(response);
                            console.log("Error creating annotation--maybe you forgot to log into the server?");
                            console.error("HTTP status code: ", ioArgs.xhr.status); //
                            //dojo.byId("replace").innerHTML = 'Loading the ressource from the server did not work'; //
                            return response;
                    }
            });
    },

    /**
     *  If there are multiple AnnotTracks, each has a separate FeatureSelectionManager
     *    (contrasted with DraggableFeatureTracks, which all share the same selection and selection manager
     */
    deleteSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.deleteAnnotations(selected);
    },

    deleteAnnotations: function(annots) {
        var track = this;
        var features_nclist = track.features;
        var features = '"features": [';
        var uniqueNames = [];
        for (var i in annots)  {
            var annot = annots[i];
            var uniqueName = annot.uid;
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (annot.track === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
                uniqueNames.push(uniqueName);
            }
        }
        features += ']';
        if (this.verbose_delete)  {
            console.log("annotations to delete:");
            console.log(features);
        }

            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "delete_feature" }',
                // postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "delete_exon" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    if (! USE_COMET || !track.comet_working)  {
                        var responseFeatures = response.features;
                        if (!responseFeatures || responseFeatures.length == 0)  {
                            // if not using comet, or comet not working
                            // and no features are returned, then they were successfully deleted?
                            for (var j in uniqueNames)  {
                                var id_to_delete = uniqueNames[j];
                                if (this.verbose_delete)  { console.log("server deleted: " + id_to_delete); }
                                features_nclist.deleteEntry(id_to_delete);
                            }
                            track.hideAll();
                            track.changed();
                        }
                    }
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) { //
                    track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status); //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //
                    return response;
                }
            });

    }, 

    mergeSelectedFeatures: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.mergeAnnotations(selected);
    },

    mergeAnnotations: function(annots) {
        var track = this;

        var sortedAnnots = track.sortAnnotationsByLocation(annots);
        var leftAnnot = sortedAnnots[0];
        var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
        var trackName = this.getUniqueTrackName();

        /*
        for (var i in annots)  {
            var annot = annots[i];
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (annot.track === track)  {
                var trackName = track.getUniqueTrackName();
                if (leftAnnot == null || annot[track.fields["start"]] < leftAnnot[track.fields["start"]]) {
                    leftAnnot = annot;
                }
                if (rightAnnot == null || annot[track.fields["end"]] > rightAnnot[track.fields["end"]]) {
                    rightAnnot = annot;
                }
            }
        }
        */

        var features;
        var operation;
        // merge exons
        if (leftAnnot.parent && rightAnnot.parent && leftAnnot.parent == rightAnnot.parent) {
            features = '"features": [ { "uniquename": "' + leftAnnot.uid + '" }, { "uniquename": "' + rightAnnot.uid + '" } ]';
            operation = "merge_exons";
        }
        // merge transcripts
        else {
            var leftTranscriptId = leftAnnot.parent ? leftAnnot.parent.uid : leftAnnot.uid;
            var rightTranscriptId = rightAnnot.parent ? rightAnnot.parent.uid : rightAnnot.uid;
            features = '"features": [ { "uniquename": "' + leftTranscriptId + '" }, { "uniquename": "' + rightTranscriptId + '" } ]';
            operation = "merge_transcripts";
        }
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    // TODO
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                    track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }

            });
    },

    splitSelectedFeatures: function(event)  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.splitAnnotations(selected, event);
    },

    splitAnnotations: function(annots, event) {
        // can only split on max two elements
        if( annots.length > 2 ) {
            return;
        }
        var track = this;
        var sortedAnnots = track.sortAnnotationsByLocation(annots);
        var leftAnnot = sortedAnnots[0];
        var rightAnnot = sortedAnnots[sortedAnnots.length - 1];
        var trackName = track.getUniqueTrackName();

        /*
        for (var i in annots)  {
            var annot = annots[i];
            // just checking to ensure that all features in selection are from this track --
            //   if not, then don't try and delete them
            if (annot.track === track)  {
                var trackName = track.getUniqueTrackName();
                if (leftAnnot == null || annot[track.fields["start"]] < leftAnnot[track.fields["start"]]) {
                    leftAnnot = annot;
                }
                if (rightAnnot == null || annot[track.fields["end"]] > rightAnnot[track.fields["end"]]) {
                    rightAnnot = annot;
                }
            }
        }
        */
        var features;
        var operation;
        // split exon
        if (leftAnnot == rightAnnot) {
            var coordinate = this.gview.getGenomeCoord(event);
            features = '"features": [ { "uniquename": "' + leftAnnot.uid + '", "location": { "fmax": ' + (coordinate - 1) + ', "fmin": ' + (coordinate + 1) + ' } } ]';
            operation = "split_exon";
        }
        // split transcript
        else if (leftAnnot.parent == rightAnnot.parent) {
            features = '"features": [ { "uniquename": "' + leftAnnot.uid + '" }, { "uniquename": "' + rightAnnot.uid + '" } ]';
            operation = "split_transcript";
        }
        else {
            return;
        }
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    // TODO
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }

            });
    },

    makeIntron: function(event)  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.makeIntronInExon(selected, event);
    },

    makeIntronInExon: function(annots, event) {
        if (annots.length > 1) {
            return;
        }
        var track = this;
        var annot = annots[0];
            var coordinate = this.gview.getGenomeCoord(event);
        var features = '"features": [ { "uniquename": "' + annot.uid + '", "location": { "fmin": ' + coordinate + ' } } ]';
        var operation = "make_intron";
        var trackName = track.getUniqueTrackName();
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    // TODO
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }

            });
    },

    setTranslationStart: function(event)  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.setTranslationStartInCDS(selected, event);
    },

    setTranslationStartInCDS: function(annots, event) {
        if (annots.length > 1) {
            return;
        }
        var track = this;
        var annot = annots[0];
            var coordinate = this.gview.getGenomeCoord(event);
            var uid = annot.parent ? annot.parent.uid : annot.uid;
        var features = '"features": [ { "uniquename": "' + uid + '", "location": { "fmin": ' + coordinate + ' } } ]';
        var operation = "set_translation_start";
        var trackName = track.getUniqueTrackName();
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    // TODO
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }
            });
    },

    flipStrand: function()  {
        var selected = this.selectionManager.getSelection();
        this.flipStrandForSelectedFeatures(selected);
    },

    flipStrandForSelectedFeatures: function(annots) {
        var track = this;
        var uniqueNames = new Object();
        for (var i in annots)  {
            var annot = AnnotTrack.getTopLevelAnnotation(annots[i]);
            var uniqueName = annot.uid;
            // just checking to ensure that all features in selection are from this track
            if (annot.track === track)  {
                    uniqueNames[uniqueName] = 1;
            }
        }
        var features = '"features": [';
        var i = 0;
        for (var uniqueName in uniqueNames) {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
                ++i;
        }
        features += ']';
        var operation = "flip_strand";
        var trackName = track.getUniqueTrackName();
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }

            });
    },

    setLongestORF: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.setLongestORFForSelectedFeatures(selected);
    },

    setLongestORFForSelectedFeatures: function(annots) {
        var track = this;
        var features = '"features": [';
        for (var i in annots)  {
            var annot = AnnotTrack.getTopLevelAnnotation(annots[i]);
            var uniqueName = annot.uid;
            // just checking to ensure that all features in selection are from this track
            if (annot.track === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
            }
        }
        features += ']';
        var operation = "set_longest_orf";
        var trackName = track.getUniqueTrackName();
            var information = "";
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }

            });
    },

    editComments: function()  {
        var selected = this.selectionManager.getSelection();
        this.editCommentsForSelectedFeatures(selected);
    },

    editCommentsForSelectedFeatures: function(annots) {
            var track = this;
            var annot = AnnotTrack.getTopLevelAnnotation(annots[0]);
            // just checking to ensure that all features in selection are from this track
            if (annot.track !== track)  {
                    return;
            }
            var content = dojo.create("div");
            // if annotation has parent, get comments for parent
            if (track.attrs.hasDefinedAttribute(annot, "parent_id")) {
                    var parentContent = this.createEditCommentsPanelForFeature(track.attrs.get(annot, "parent_id"), track.getUniqueTrackName());
                    dojo.attr(parentContent, "class", "parent_comments_div");
                    dojo.place(parentContent, content);
            }
            var annotContent = this.createEditCommentsPanelForFeature(annot.uid, track.getUniqueTrackName());
            dojo.place(annotContent, content);
            track.openDialog("Comments for " + track.attrs.get(annot, "Name"), content);
    },

    createEditCommentsPanelForFeature: function(uniqueName, trackName) {
        var track = this;
            var content = dojo.create("div");
            var header = dojo.create("div", { className: "comment_header" }, content);
            var table = dojo.create("table", { className: "comments" }, content);
            var addButtonDiv = dojo.create("div", { className: "comment_add_button_div" }, content);
            var addButton = dojo.create("button", { className: "comment_button", innerHTML: "Add comment" }, addButtonDiv);
            var cannedCommentsDiv = dojo.create("div", { }, content);
            var cannedCommentsComboBox = dojo.create("select", { }, cannedCommentsDiv);
            var comments;
            var commentTextFields;
            var cannedComments;
            var showCannedComments = false;

            var getComments = function() {
                var features = '"features": [ { "uniquename": "' + uniqueName + '" } ]';
                var operation = "get_comments";
                var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
                dojo.xhrPost( {
                                  postData: postData,
                                  url: context_path + "/AnnotationEditorService",
                                  handleAs: "json",
                                  sync: true,
                                  timeout: 5000 * 1000, // Time in milliseconds
                                  load: function(response, ioArgs) {
                                      var feature = response.features[0];
                                      comments = feature.comments;
                                      header.innerHTML = "Comments for " + feature.type.name;
                                  },
                                  // The ERROR function will be called in an error case.
                                  error: function(response, ioArgs) {
                                      track.handleError(response);
                                      console.error("HTTP status code: ", ioArgs.xhr.status);
                                      return response;
                                  }

                              });
            };

            var addComment = function(comment) {
                var features = '"features": [ { "uniquename": "' + uniqueName + '", "comments": [ "' + comment + '" ] } ]';
                var operation = "add_comments";
                var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
                dojo.xhrPost( {
                                  postData: postData,
                                  url: context_path + "/AnnotationEditorService",
                                  handleAs: "json",
                                  timeout: 5000 * 1000, // Time in milliseconds
                                  load: function(response, ioArgs) {
                                  },
                                  // The ERROR function will be called in an error case.
                                  error: function(response, ioArgs) {
                                      track.handleError(response);
                                      console.error("HTTP status code: ", ioArgs.xhr.status);
                                      return response;
                                  }

                              });
            };

            var deleteComment = function(comment) {
                var features = '"features": [ { "uniquename": "' + uniqueName + '", "comments": [ "' + comment + '" ] } ]';
                var operation = "delete_comments";
                var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
                dojo.xhrPost( {
                                  postData: postData,
                                  url: context_path + "/AnnotationEditorService",
                                  handleAs: "json",
                                  timeout: 5000 * 1000, // Time in milliseconds
                                  load: function(response, ioArgs) {
                                  },
                                  // The ERROR function will be called in an error case.
                                  error: function(response, ioArgs) {
                                      track.handleError(response);
                                      console.error("HTTP status code: ", ioArgs.xhr.status);
                                      return response;
                                  }

                              });
            };

        var updateComment = function(oldComment, newComment) {
            var features = '"features": [ { "uniquename": "' + uniqueName + '", "old_comments": [ "' + oldComment + '" ], "new_comments": [ "' + newComment + '"] } ]';
            var operation = "update_comments";
            var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
            dojo.xhrPost( {
                              postData: postData,
                              url: context_path + "/AnnotationEditorService",
                              handleAs: "json",
                              timeout: 5000 * 1000, // Time in milliseconds
                              load: function(response, ioArgs) {
                              },
                              // The ERROR function will be called in an error case.
                              error: function(response, ioArgs) {
                                  track.handleError(response);
                                  console.error("HTTP status code: ", ioArgs.xhr.status);
                                  return response;
                              }

                          });
        };

        var updateTable = function() {
            while (table.hasChildNodes()) {
                table.removeChild(table.lastChild);
            }
            commentTextFields = new Array();
            for (var i = 0; i < comments.length; ++i) {
                var row = dojo.create("tr", { }, table);
                var col1 = dojo.create("td", { }, row);
                var comment = dojo.create("textarea", { rows: 1, innerHTML: comments[i], readonly: true, className: "comment_area" }, col1);
                commentTextFields.push(comment);
                dojo.connect(comment, "onclick", comment, function() {
                                 if (!showCannedComments) {
                                     dojo.style(cannedCommentsDiv, { display: "none" } );
                                 }
                             });
                dojo.connect(comment, "onblur", comment, function(index) {
                                 return function() {
                                     showCannedComments = false;
                                     var newComment = dojo.attr(this, "value");
                                     var oldComment = comments[index];
                                     comments[index] = newComment;
                                     dojo.attr(this, "readonly", true);
                                     if (newComment && newComment.length > 0) {
                                         if (oldComment.length == 0) {
                                             addComment(newComment);
                                         }
                                         else {
                                             updateComment(oldComment, newComment);
                                         }
                                         dojo.style(cannedCommentsDiv, { display: "none" } );
                                     }
                                 };
                             }(i));
                dojo.connect(comment, "onkeyup", comment, function() {
                                 var newComment = dojo.attr(this, "value");
                                 if (newComment && newComment.length > 0) {
                                     dojo.style(cannedCommentsDiv, { display: "none" } );
                                 }
                                 else if (showCannedComments) {
                                     dojo.style(cannedCommentsDiv, { display: "block" } );
                                 }
                             });
                var col2 = dojo.create("td", { }, row);
                var delButton = dojo.create("button", { className: "comment_button", innerHTML: "Delete" /* "<img class='table_icon' src='img/trash.png' />" */}, col2);
                dojo.connect(delButton, "onfocus", delButton, function() {
                                 showCannedComments = false;
                                 dojo.style(cannedCommentsDiv, { display: "none" } );
                             });
                dojo.connect(delButton, "onclick", delButton, function(index) {
                                 return function() {
                                     showCannedComments = false;
                                     dojo.style(cannedCommentsDiv, { display: "none" } );
                                     var oldComment = comments[index];
                                     comments.splice(index, 1);
                                     updateTable();
                                     deleteComment(oldComment);
                                 };
                             }(i));
                var col3 = dojo.create("td", { }, row);
                var editButton = dojo.create("button", { className: "comment_button", innerHTML: "Edit" /*"<img class='table_icon' src='img/pencil.png' />*/}, col3);
                dojo.connect(editButton, "onfocus", editButton, function() {
                                 showCannedComments = false;
                                 dojo.style(cannedCommentsDiv, { display: "none" } );
                             });
                dojo.connect(editButton, "onclick", editButton, function(index) {
                                 return function() {
                                     showCannedComments = false;
                                     dojo.style(cannedCommentsDiv, { display: "none" } );
                                     dojo.attr(commentTextFields[index], "readonly", false);
                                     commentTextFields[index].focus();
                                 };
                             }(i));
            }
        };

        var getCannedComments = function() {
            dojo.style(cannedCommentsDiv, { display: "none"} );

            var features = '"features": [ { "uniquename": "' + uniqueName + '" } ]';
            var operation = "get_canned_comments";
            var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
            dojo.xhrPost( {
                              postData: postData,
                              url: context_path + "/AnnotationEditorService",
                              handleAs: "json",
                              sync: true,
                              timeout: 5000 * 1000, // Time in milliseconds
                              load: function(response, ioArgs) {
                                  var feature = response.features[0];
                                  cannedComments = feature.comments;
                                  cannedComments.unshift("Choose a comment");
                              },
                              // The ERROR function will be called in an error case.
                              error: function(response, ioArgs) {
                                  track.handleError(response);
                                  console.error("HTTP status code: ", ioArgs.xhr.status);
                                  return response;
                              }
                          });

            for (var i = 0; i < cannedComments.length; ++i) {
                dojo.create("option", { value: cannedComments[i], innerHTML: cannedComments[i] }, cannedCommentsComboBox);
            }
            dojo.connect(cannedCommentsComboBox, "onchange", cannedCommentsComboBox, function() {
                             var commentTextField = commentTextFields[commentTextFields.length - 1];
                             if (this.selectedIndex > 0) {
                                 dojo.attr(commentTextField, "value", dojo.attr(this, "value"));
                                 commentTextField.focus();
                                 dojo.style(cannedCommentsDiv, { display : "none" });
                             }
                         });
        };

        dojo.connect(addButton, "onclick", null, function() {
                         showCannedComments = true;
                         comments.push("");
                         updateTable();
                         var comment = commentTextFields[commentTextFields.length - 1];
                         dojo.attr(comment, "readonly", false);
                         dojo.style(cannedCommentsDiv, { display: "block" });
                         cannedCommentsComboBox.selectedIndex = 0;
                         comment.focus();
                     });

        getComments();
        getCannedComments();
        updateTable();
        return content;

    },

    editDbxrefs: function()  {
        var selected = this.selectionManager.getSelection();
        this.editDbxrefsForSelectedFeatures(selected);
    },

    editDbxrefsForSelectedFeatures: function(annots) {
        var track = this;
        var annot = AnnotTrack.getTopLevelAnnotation(annots[0]);
        // just checking to ensure that all features in selection are from this track
        if ( annot.track !== track )  {
            return;
        }
        var content = dojo.create("div");
        // if annotation has parent, get comments for parent
        if (track.attrs.hasDefinedAttribute(annot, "parent_id")) {
            var parentContent = this.createEditDbxrefsPanelForFeature(track.attrs.get(annot, "parent_id"), track.getUniqueTrackName());
            dojo.attr(parentContent, "class", "parent_dbxrefs_div");
            dojo.place(parentContent, content);
        }
        var annotContent = this.createEditDbxrefsPanelForFeature(annot.uid, track.getUniqueTrackName());
        dojo.place(annotContent, content);
        track.openDialog("Dbxrefs for " + track.attrs.get(annot, "Name"), content);
    },

    createEditDbxrefsPanelForFeature: function(uniqueName, trackName) {
        var track = this;
        var content = dojo.create("div");
        var header = dojo.create("div", { className: "dbxref_header" }, content);
        var tableHeader = dojo.create("div", { className: "dbxref_header", innerHTML: "<span class='dbxref_table_header_field'>Database</span><span class='dbxref_table_header_field'>Accession</span>" }, content);
        var table = dojo.create("div", { className: "dbxrefs" }, content);
        var addButtonDiv = dojo.create("div", { className: "dbxref_add_button_div" }, content);
        var addButton = dojo.create("button", { className: "dbxref_button", innerHTML: "Add DBXref" }, addButtonDiv);
        var dbxrefs;
        var dbxrefTextFields;
        
        var getDbxrefs = function() {
            var features = '"features": [ { "uniquename": "' + uniqueName + '" } ]';
            var operation = "get_non_primary_dbxrefs";
            var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
            dojo.xhrPost( {
                              postData: postData,
                              url: context_path + "/AnnotationEditorService",
                              handleAs: "json",
                              sync: true,
                              timeout: 5000 * 1000, // Time in milliseconds
                              load: function(response, ioArgs) {
                                  var feature = response.features[0];
                                  dbxrefs = feature.dbxrefs;
                                  header.innerHTML = "DBXRefs for " + feature.type.name;
                              },
                              // The ERROR function will be called in an error case.
                              error: function(response, ioArgs) {
                                  track.handleError(response);
                                  console.error("HTTP status code: ", ioArgs.xhr.status);
                                  return response;
                              }

                          });

        };

        var addDbxref = function(db, accession) {
            var features = '"features": [ { "uniquename": "' + uniqueName + '", "dbxrefs": [ { "db": "' + db + '", "accession": "' + accession + '" } ] } ]';
            var operation = "add_non_primary_dbxrefs";
            var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
            dojo.xhrPost( {
                              postData: postData,
                              url: context_path + "/AnnotationEditorService",
                              handleAs: "json",
                              timeout: 5000 * 1000, // Time in milliseconds
                              load: function(response, ioArgs) {
                              },
                              // The ERROR function will be called in an error case.
                              error: function(response, ioArgs) {
                                  track.handleError(response);
                                  console.error("HTTP status code: ", ioArgs.xhr.status);
                                  return response;
                              }

                          });
        };

        var deleteDbxref = function(db, accession) {
            var features = '"features": [ { "uniquename": "' + uniqueName + '", "dbxrefs": [ { "db": "' + db + '", "accession": "' + accession + '" } ] } ]';
            var operation = "delete_non_primary_dbxrefs";
            var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
            dojo.xhrPost( {
                              postData: postData,
                              url: context_path + "/AnnotationEditorService",
                              handleAs: "json",
                              timeout: 5000 * 1000, // Time in milliseconds
                              load: function(response, ioArgs) {
                              },
                              // The ERROR function will be called in an error case.
                              error: function(response, ioArgs) {
                                  track.handleError(response);
                                  console.error("HTTP status code: ", ioArgs.xhr.status);
                                  return response;
                              }

                          });
        };

        var updateDbxref = function(oldDb, oldAccession, newDb, newAccession) {
            var features = '"features": [ { "uniquename": "' + uniqueName + '", "old_dbxrefs": [ { "db": "' + oldDb + '", "accession": "' + oldAccession + '" } ], "new_dbxrefs": [ { "db": "' + newDb + '", "accession": "' + newAccession + '" } ] } ]';
            var operation = "update_non_primary_dbxrefs";
            var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }';
            dojo.xhrPost( {
                              postData: postData,
                              url: context_path + "/AnnotationEditorService",
                              handleAs: "json",
                              timeout: 5000 * 1000, // Time in milliseconds
                              load: function(response, ioArgs) {
                              },
                              // The ERROR function will be called in an error case.
                              error: function(response, ioArgs) {
                                  track.handleError(response);
                                  console.error("HTTP status code: ", ioArgs.xhr.status);
                                  return response;
                              }

                          });
        };

        var handleDbxrefUpdate = function(index) {
            var newDb = dojo.attr(dbxrefTextFields[index][0], "value");
            var oldDb = dbxrefs[index].db;
            var newAccession = dojo.attr(dbxrefTextFields[index][1], "value");
            var oldAccession = dbxrefs[index].accession;
            if (oldDb != newDb || oldAccession != newAccession) {
                dbxrefs[index].db = newDb;
                dbxrefs[index].accession = newAccession;
                if (newDb && newDb.length > 0 && newAccession && newAccession.length > 0) {
                    if (oldDb.length == 0 || oldAccession.length == 0) {
                        addDbxref(newDb, newAccession);
                    }
                    else {
                        updateDbxref(oldDb, oldAccession, newDb, newAccession);
                    }
                }
            }
        };

        var updateTable = function() {
            while (table.hasChildNodes()) {
                table.removeChild(table.lastChild);
            }
            dbxrefTextFields = new Array();
            for (var i = 0; i < dbxrefs.length; ++i) {
                var dbxref = dbxrefs[i];
                var row = dojo.create("div", { }, table);
                var col1 = dojo.create("span", { }, row);
                var db = dojo.create("input", { type: "text", rows: 1, value: dbxref.db, readonly: true, className: "dbxref_field" }, col1);
                var col2 = dojo.create("span", { }, row);
                var accession = dojo.create("input", { type: "text", rows: 1, value: dbxref.accession, readonly: true, className: "dbxref_field" }, col2);
                dbxrefTextFields.push([db, accession]);
                dojo.connect(db, "onblur", db, function(index) {
                                 return function() {
                                     handleDbxrefUpdate(index);
                                 };
                             }(i));
                dojo.connect(accession, "onblur", accession, function(index) {
                                 return function() {
                                     handleDbxrefUpdate(index);
                                 };
                             }(i));
                var col3 = dojo.create("span", { }, row);
                var delButton = dojo.create("button", { className: "dbxref_button", innerHTML: "Delete" }, col3);
                dojo.connect(delButton, "onclick", delButton, function(index) {
                                 return function() {
                                     var oldDbxref = dbxrefs[index];
                                     dbxrefs.splice(index, 1);
                                     updateTable();
                                     deleteDbxref(oldDbxref.db, oldDbxref.accession);
                                 };
                             }(i));
                var col4 = dojo.create("span", { }, row);
                var editButton = dojo.create("button", { className: "dbxref_button", innerHTML: "Edit" }, col4);
                dojo.connect(editButton, "onclick", editButton, function(index) {
                                 return function() {
                                     dojo.attr(dbxrefTextFields[index][0], "readonly", false);
                                     dojo.attr(dbxrefTextFields[index][1], "readonly", false);
                                     dbxrefTextFields[index][0].focus();
                                 };
                             }(i));
            }
        };
        dojo.connect(addButton, "onclick", null, function() {
                         dbxrefs.push( { db: "", accession: "" } );
                         updateTable();
                         var dbxref = dbxrefTextFields[dbxrefTextFields.length - 1];
                         dojo.attr(dbxref[0], "readonly", false);
                         dojo.attr(dbxref[1], "readonly", false);
                         dbxref[0].focus();
                     });

        getDbxrefs();
        updateTable();
        return content;

    },

    undo: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.undoSelectedFeatures(selected);
    },

    undoSelectedFeatures: function(annots) {
        var track = this;
        var features_nclist = track.features;
        var features = '"features": [';
        for (var i in annots)  {
            var annot = AnnotTrack.getTopLevelAnnotation(annots[i]);
            var uniqueName = annot.uid;
            // just checking to ensure that all features in selection are from this track
            if (annot.track === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
            }
        }
        features += ']';
        var operation = "undo";
        var trackName = track.getUniqueTrackName();
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    if (response && response.confirm) {
                            if (track.handleConfirm(response.confirm)) {
                                    dojo.xhrPost( {
                                            sync: true,
                                        postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '", "confirm": true }',
                                        url: context_path + "/AnnotationEditorService",
                                        handleAs: "json",
                                        timeout: 5000 * 1000, // Time in milliseconds
                                        load: function(response, ioArgs) {
                                            // TODO
                                        },
                                        error: function(response, ioArgs) {
                                            track.handleError(response);
                                            return response;
                                        }
                                    });
                            }
                    }
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                    track.handleError(response);
                    return response;
                }

            });
    },

    redo: function()  {
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.redoSelectedFeatures(selected);
    },

    redoSelectedFeatures: function(annots) {
        var track = this;
        var features_nclist = track.features;
        var features = '"features": [';
        for (var i in annots)  {
            var annot = AnnotTrack.getTopLevelAnnotation(annots[i]);
            var uniqueName = annot.uid;
            // just checking to ensure that all features in selection are from this track
            if (annot.track === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
            }
        }
        features += ']';
        var operation = "redo";
        var trackName = track.getUniqueTrackName();
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    // TODO
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) { // 
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status); 
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work'; //  
                    return response; // 
                }

            });
    },

    getAnnotationInformation: function()  {
        var selected = this.selectionManager.getSelection();
        this.getInformationForSelectedAnnotations(selected);
    },

    getInformationForSelectedAnnotations: function(annots) {
        var track = this;
        var features = '"features": [';
        for (var i in annots)  {
            var annot = AnnotTrack.getTopLevelAnnotation(annots[i]);
            var uniqueName = annot.uid;
            // just checking to ensure that all features in selection are from this track
            if (annot.track === track)  {
                var trackdiv = track.div;
                var trackName = track.getUniqueTrackName();

                if (i > 0) {
                    features += ',';
                }
                features += ' { "uniquename": "' + uniqueName + '" } ';
            }
        }
        features += ']';
        var operation = "get_information";
        var trackName = track.getUniqueTrackName();
            var information = "";
            dojo.xhrPost( {
                postData: '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '" }',
                url: context_path + "/AnnotationEditorService",
                handleAs: "json",
                timeout: 5000 * 1000, // Time in milliseconds
                load: function(response, ioArgs) {
                    for (var i = 0; i < response.features.length; ++i) {
                            var feature = response.features[i];
                            if (i > 0) {
                                    information += "<hr/>";
                            }
                            information += "Uniquename: " + feature.uniquename + "<br/>";
                            information += "Date of creation: " + feature.time_accessioned + "<br/>";
                            information += "Owner: " + feature.owner + "<br/>";
                            information += "Parent ids: " + feature.parent_ids + "<br/>";
                    }
                    track.openDialog("Annotation information", information);
                },
                // The ERROR function will be called in an error case.
                error: function(response, ioArgs) {
                            track.handleError(response);
                    console.log("Annotation server error--maybe you forgot to login to the server?");
                    console.error("HTTP status code: ", ioArgs.xhr.status);
                    //
                    //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                    return response;
                }
            });
    },

    getSequence: function()  {
        var selected = this.selectionManager.getSelection();
        this.getSequenceForSelectedFeatures(selected);
    },

    getSequenceForSelectedFeatures: function(annots) {
        var track = this;

        var content = dojo.create("div");
        var textArea = dojo.create("textarea", { className: "sequence_area", readonly: true }, content);
        var form = dojo.create("form", { }, content);
        var peptideButtonDiv = dojo.create("div", { className: "first_button_div" }, form);
        var peptideButton = dojo.create("input", { type: "radio", name: "type", checked: true }, peptideButtonDiv);
        var peptideButtonLabel = dojo.create("label", { innerHTML: "Peptide sequence", className: "button_label" }, peptideButtonDiv);
        var cdnaButtonDiv = dojo.create("div", { className: "button_div" }, form);
        var cdnaButton = dojo.create("input", { type: "radio", name: "type" }, cdnaButtonDiv);
        var cdnaButtonLabel = dojo.create("label", { innerHTML: "cDNA sequence", className: "button_label" }, cdnaButtonDiv);
        var cdsButtonDiv = dojo.create("div", { className: "button_div" }, form);
        var cdsButton = dojo.create("input", { type: "radio", name: "type" }, cdsButtonDiv);
        var cdsButtonLabel = dojo.create("label", { innerHTML: "CDS sequence", className: "button_label" }, cdsButtonDiv);
        var genomicButtonDiv = dojo.create("div", { className: "button_div" }, form);
        var genomicButton = dojo.create("input", { type: "radio", name: "type" }, genomicButtonDiv);
        var genomicButtonLabel = dojo.create("label", { innerHTML: "Genomic sequence", className: "button_label" }, genomicButtonDiv);
        var genomicWithFlankButtonDiv = dojo.create("div", { className: "button_div" }, form);
        var genomicWithFlankButton = dojo.create("input", { type: "radio", name: "type" }, genomicWithFlankButtonDiv);
        var genomicWithFlankButtonLabel = dojo.create("label", { innerHTML: "Genomic sequence +/-", className: "button_label" }, genomicWithFlankButtonDiv);
        var genomicWithFlankField = dojo.create("input", { type: "text", size: 5, className: "button_field", value: "500" }, genomicWithFlankButtonDiv);
        var genomicWithFlankFieldLabel = dojo.create("label", { innerHTML: "bases", className: "button_label" }, genomicWithFlankButtonDiv);

        var fetchSequence = function(type) {
            var features = '"features": [';
            for (var i = 0; i < annots.length; ++i)  {
                var annot = annots[i];
                var uniqueName = annot.uid;
                // just checking to ensure that all features in selection are from this track
                if (annot.track === track)  {
                    var trackdiv = track.div;
                    var trackName = track.getUniqueTrackName();

                    if (i > 0) {
                        features += ',';
                    }
                    features += ' { "uniquename": "' + uniqueName + '" } ';
                }
            }
            features += ']';
            var operation = "get_sequence";
            var trackName = track.getUniqueTrackName();
                var postData = '{ "track": "' + trackName + '", ' + features + ', "operation": "' + operation + '"';
                var flank = 0;
                if (type == "genomic_with_flank") {
                        flank = dojo.attr(genomicWithFlankField, "value");
                        postData += ', "flank": ' + flank;
                        type = "genomic";
                }
                postData += ', "type": "' + type + '" }';
                dojo.xhrPost( {
                    postData: postData,
                    url: context_path + "/AnnotationEditorService",
                    handleAs: "json",
                    timeout: 5000 * 1000, // Time in milliseconds
                    load: function(response, ioArgs) {
                        var textAreaContent = "";
                        for (var i = 0; i < response.features.length; ++i) {
                                var feature = response.features[i];
                                var cvterm = feature.type;
                                var residues = feature.residues;
                                textAreaContent += "&gt;" + feature.uniquename + " (" + cvterm.cv.name + ":" + cvterm.name + ") " + residues.length + " residues [" + type + (flank > 0 ? " +/- " + flank + " bases" : "") + "]\n";
                                var lineLength = 70;
                                for (var j = 0; j < residues.length; j += lineLength) {
                                        textAreaContent += residues.substr(j, lineLength) + "\n";
                                }
                        }
                        dojo.attr(textArea, "innerHTML", textAreaContent);
                    },
                    // The ERROR function will be called in an error case.
                    error: function(response, ioArgs) {
                                track.handleError(response);
                        console.log("Annotation server error--maybe you forgot to login to the server?");
                        console.error("HTTP status code: ", ioArgs.xhr.status);
                        //
                        //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                        return response;
                    }

                });
        };
        var callback = function(event) {
                var type;
                var target = event.target || event.srcElement;
                if (target == peptideButton || target == peptideButtonLabel) {
                        dojo.attr(peptideButton, "checked", true);
                        type = "peptide";
                }
                else if (target == cdnaButton || target == cdnaButtonLabel) {
                        dojo.attr(cdnaButton, "checked", true);
                        type = "cdna";
                }
                else if (target == cdsButton || target == cdsButtonLabel) {
                        dojo.attr(cdsButton, "checked", true);
                        type = "cds";
                }
                else if (target == genomicButton || target == genomicButtonLabel) {
                        dojo.attr(genomicButton, "checked", true);
                        type = "genomic";
                }
                else if (target == genomicWithFlankButton || target == genomicWithFlankButtonLabel) {
                        dojo.attr(genomicWithFlankButton, "checked", true);
                        type = "genomic_with_flank";
                }
                fetchSequence(type);
        };

        dojo.connect(peptideButton, "onchange", null, callback);
        dojo.connect(peptideButtonLabel, "onclick", null, callback);
        dojo.connect(cdnaButton, "onchange", null, callback);
        dojo.connect(cdnaButtonLabel, "onclick", null, callback);
        dojo.connect(cdsButton, "onchange", null, callback);
        dojo.connect(cdsButtonLabel, "onclick", null, callback);
        dojo.connect(genomicButton, "onchange", null, callback);
        dojo.connect(genomicButtonLabel, "onclick", null, callback);
        dojo.connect(genomicWithFlankButton, "onchange", null, callback);
        dojo.connect(genomicWithFlankButtonLabel, "onclick", null, callback);

        fetchSequence("peptide");
        this.openDialog("Sequence", content);
    },

    searchSequence: function() {
        var track = this;
        var operation = "search_sequence";
        var trackName = track.getUniqueTrackName();

        var content = dojo.create("div");
        var sequenceToolsDiv = dojo.create("div", { className: "search_sequence_tools" }, content);
        var sequenceToolsSelect = dojo.create("select", { className: "search_sequence_tools_select" }, sequenceToolsDiv);
        var sequenceDiv = dojo.create("div", { className: "search_sequence_area" }, content);
        var sequenceLabel = dojo.create("div", { className: "search_sequence_label", innerHTML: "Enter sequence" }, sequenceDiv);
        var sequenceFieldDiv = dojo.create("div", { }, sequenceDiv);
        var sequenceField = dojo.create("textarea", { className: "search_sequence_input" }, sequenceFieldDiv);
        var searchAllRefSeqsDiv = dojo.create("div", { className: "search_all_ref_seqs_area" }, sequenceDiv);
        var searchAllRefSeqsCheckbox = dojo.create("input", { className: "search_all_ref_seqs_checkbox", type: "checkbox" }, searchAllRefSeqsDiv);
        var searchAllRefSeqsLabel = dojo.create("span", { className: "search_all_ref_seqs_label", innerHTML: "Search all genomic sequences" }, searchAllRefSeqsDiv);
        var sequenceButtonDiv = dojo.create("div", { }, sequenceDiv);
        var sequenceButton = dojo.create("button", { innerHTML: "Search" }, sequenceButtonDiv);
        var messageDiv = dojo.create("div", { className: "search_sequence_message", innerHTML: "No matches found" }, content);
        var headerDiv = dojo.create("div", { className: "search_sequence_matches_header" }, content);
        dojo.create("span", { innerHTML: "ID", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
        dojo.create("span", { innerHTML: "Start", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
        dojo.create("span", { innerHTML: "End", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
        dojo.create("span", { innerHTML: "Score", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
        dojo.create("span", { innerHTML: "Significance", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
        dojo.create("span", { innerHTML: "Identity", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
        var matchDiv = dojo.create("div", { className: "search_sequence_matches" }, content);
        var matches = dojo.create("div", { }, matchDiv);

        dojo.style( messageDiv, { display: "none" });
        dojo.style( matchDiv, { display: "none" });
        dojo.style( headerDiv, { display: "none" });

        var getSequenceSearchTools = function() {
            var ok = false;
            var operation = "get_sequence_search_tools";
            dojo.xhrPost( {
                    postData: '{ "track": "' + trackName + '", "operation": "' + operation + '" }',
                    url: context_path + "/AnnotationEditorService",
                    sync: true,
                    handleAs: "json",
                    timeout: 5000 * 1000, // Time in milliseconds
                    load: function(response, ioArgs) {
                            if (response.sequence_search_tools.length == 0) {
                                    ok = false;
                                    return;
                            }
                            for (var i = 0; i < response.sequence_search_tools.length; ++i) {
                                    dojo.create("option", { innerHTML: response.sequence_search_tools[i] }, sequenceToolsSelect);
                            }
                            ok = true;
                    },
                    error: function(response, ioArgs) {
                                    track.handleError(response);
                                    console.error("HTTP status code: ", ioArgs.xhr.status);
                                    return response;
                    }
            });
            return ok;
        };

        var search = function() {
            var residues = dojo.attr(sequenceField, "value").toUpperCase();
            var ok = true;
            if (residues.length == 0) {
                    alert("No sequence entered");
                    ok = false;
            }
            else if (residues.match(/[^ACDEFGHIKLMNPQRSTVWXY\n]/)) {
                    alert("The sequence should only contain non redundant IUPAC nucleotide or amino acid codes (except for N/X)");
                    ok = false;
            }
            var searchAllRefSeqs = dojo.attr(searchAllRefSeqsCheckbox, "checked");
            if (ok) {
                    if (AnnotTrack.USE_LOCAL_EDITS)  {
                            // TODO
                            track.hideAll();
                            track.changed();
                    }
                    else  {
                            dojo.xhrPost( {
                                    postData: '{ "track": "' + trackName + '", "search": { "key": "' + sequenceToolsSelect.value + '", "residues": "' + residues + (!searchAllRefSeqs ? '", "database_id": "' + track.refSeq.name : '') + '"}, "operation": "' + operation + '" }', 
                                    url: context_path + "/AnnotationEditorService",
                                    sync: true,
                                    handleAs: "json",
                                    timeout: 5000 * 1000, // Time in milliseconds
                                    load: function(response, ioArgs) {
                                            while (matches.hasChildNodes()) {
                                                    matches.removeChild(matches.lastChild);
                                            }
                                            if (response.matches.length == 0) {
                                                dojo.style(messageDiv, { display: "block" });
                                                dojo.style(matchDiv, { display: "none" });
                                                dojo.style(headerDiv, { display: "none" });
                                                    return;
                                            }
                                                dojo.style(messageDiv, { display: "none" });
                                            dojo.style(headerDiv, { display: "block"} );
                                            dojo.style(matchDiv, { display: "block"} );
                                            for (var i = 0; i < response.matches.length; ++i) {
                                                    var match = response.matches[i];
                                                    var query = match.query;
                                                    var subject = match.subject;
                                                    subject.location.fmin += track.refSeq.start;
                                                    subject.location.fmax += track.refSeq.start;
                                                    var subjectStart = subject.location.fmin + 1;
                                                    var subjectEnd = subject.location.fmax + 1;
                                                    if (subject.location.strand == -1) {
                                                            var tmp = subjectStart;
                                                            subjectStart = subjectEnd;
                                                            subjectEnd = tmp;
                                                    }
                                                    var rawscore = match.rawscore;
                                                    var significance = match.significance;
                                                    var identity = match.identity;
                                                    var row = dojo.create("div", { className: "search_sequence_matches_row" + (dojo.isFF ? " search_sequence_matches_row-firefox" : "") }, matches);
                                                    var subjectIdColumn = dojo.create("span", { innerHTML: subject.feature.uniquename, className: "search_sequence_matches_field search_sequence_matches_generic_field", title: subject.feature.uniquename }, row);
                                                    var subjectStartColumn = dojo.create("span", { innerHTML: subjectStart, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                                                    var subjectEndColumn = dojo.create("span", { innerHTML: subjectEnd, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                                                    var scoreColumn = dojo.create("span", { innerHTML: match.rawscore, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                                                    var significanceColumn = dojo.create("span", { innerHTML: match.significance, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                                                    var identityColumn = dojo.create("span", { innerHTML : match.identity, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
                                                    dojo.connect(row, "onclick", function(id, fmin, fmax) {
                                                            return function() {
                                                                    var loc = id + ":" + fmin + "-" + fmax;
    //                                                              listeners[track.getUniqueTrackName()].cancel();
    //                                                              track.gview.browser.navigateTo(loc);
                                                                    if (id == track.refSeq.name) {
                                                                            track.gview.browser.navigateTo(loc);
                                                                            track.popupDialog.hide();
                                                                    }
                                                                    else {
                                                                            var url = window.location.toString().replace(/loc=.+/, "loc=" + loc);
                                                                            window.location.replace(url);
                                                                    }
                                                            };
                                                    }(subject.feature.uniquename, subject.location.fmin, subject.location.fmax));
                                            }
                                    },
                                    // The ERROR function will be called in an error case.
                                    error: function(response, ioArgs) {
                                            track.handleError(response);
                                            console.log("Annotation server error--maybe you forgot to login to the server?");
                                            console.error("HTTP status code: ", ioArgs.xhr.status); 
                                            //
                                            //dojo.byId("replace").innerHTML = 'Loading the resource from the server did not work';
                                            return response;
                                    }

                            });
                    }
            }
        };

        dojo.connect(sequenceField, "onkeypress", function(event) {
            if (event.keyCode == dojo.keys.ENTER) {
                    event.preventDefault();
                    search();
            }
        });
        dojo.connect(sequenceButton, "onclick", search);
        dojo.connect(searchAllRefSeqsLabel, "onclick", function() {
            dojo.attr(searchAllRefSeqsCheckbox, "checked", !searchAllRefSeqsCheckbox.checked);
        });

        if( getSequenceSearchTools() ) {
            this.openDialog("Search sequence", content);
        }
        else {
            alert("No search plugins setup");
        }

    },

    zoomToBaseLevel: function(event) {
        var coordinate = this.gview.getGenomeCoord(event);
        this.gview.zoomToBaseLevel(event, coordinate);
    },

    zoomBackOut: function(event) {
        this.gview.zoomBackOut(event);
    },

    createAnnotation: function()  {

    },

    // AnnotTrack.prototype.addToAnnotation
    // AnnotTrack.prototype.deleteFromAnnotation = function()  { }
    // handle potential effect on parent?
    deleteAnnotation: function()  {
    },

    changeAnnotationLocation: function()  {
    },

    handleError: function(response) {
        console.log("ERROR: ");
        console.log(response);  // in Firebug, allows retrieval of stack trace, jump to code, etc.
        var error = eval('(' + response.responseText + ')');
        //      var error = response.error ? response : eval('(' + response.responseText + ')');
        if (error && error.error) {
            alert(error.error);
            return;
        }
    },

    handleConfirm: function(response) {
            return confirm(response);
    },

    initAnnotContextMenu: function() {
        var thisObj = this;

        contextMenuItems = new Array();
        annot_context_menu = new dijitMenu({});
            dojo.xhrPost( {
                    sync: true,
                    postData: '{ "track": "' + thisObj.getUniqueTrackName() + '", "operation": "get_user_permission" }',
                    url: context_path + "/AnnotationEditorService",
                    handleAs: "json",
                    timeout: 5 * 1000, // Time in milliseconds
                    // The LOAD function will be called on a successful response.
                    load: function(response, ioArgs) { //
                            var permission = response.permission;
                            thisObj.permission = permission;
                            var index = 0;
                            if (permission & Permission.WRITE) {
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Delete",
                                            onClick: function() {
                                                    thisObj.deleteSelectedFeatures();
                                            }
                                    } ));
                                    contextMenuItems["delete"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Merge",
                                            onClick: function() {
                                                    thisObj.mergeSelectedFeatures();
                                            }
                                    } ));
                                    contextMenuItems["merge"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Split",
                                            onClick: function(event) {
                                                    // use annot_context_mousedown instead of current event, since want to split 
                                                    //    at mouse position of event that triggered annot_context_menu popup
                                                    thisObj.splitSelectedFeatures(thisObj.annot_context_mousedown);
                                            }
                                    } ));
                                    contextMenuItems["split"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Duplicate",
                                            onClick: function(event) {
                                                    // use annot_context_mousedown instead of current event, since want to split 
                                                    //    at mouse position of event that triggered annot_context_menu popup
                                                    thisObj.duplicateSelectedFeatures(thisObj.annot_context_mousedown);
                                            }
                                    } ));
                                    contextMenuItems["duplicate"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Make intron",
                                            // use annot_context_mousedown instead of current event, since want to split 
                                            //    at mouse position of event that triggered annot_context_menu popup
                                            onClick: function(event) {
                                                    thisObj.makeIntron(thisObj.annot_context_mousedown);
                                            }
                                    } ));
                                    contextMenuItems["make_intron"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Set translation start",
                                            // use annot_context_mousedown instead of current event, since want to split 
                                            //    at mouse position of event that triggered annot_context_menu popup
                                            onClick: function(event) {
                                                    if (thisObj.getMenuItem("set_translation_start").get("label") == "Set translation start") {
                                                            thisObj.setTranslationStart(thisObj.annot_context_mousedown);
                                                    }
                                                    else {
                                                            thisObj.setLongestORF();
                                                    }
                                            }
                                    } ));
                                    contextMenuItems["set_translation_start"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Flip strand",
                                            onClick: function(event) {
                                                    thisObj.flipStrand();
                                            }
                                    } ));
                                    contextMenuItems["flip_strand"] = index++;
                                    annot_context_menu.addChild(new dijitMenuSeparator());
                                    index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Comments",
                                            onClick: function(event) {
                                                    thisObj.editComments();
                                            }
                                    } ));
                                    contextMenuItems["edit_comments"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "DBXRefs",
                                            onClick: function(event) {
                                                    thisObj.editDbxrefs();
                                            }
                                    } ));
                                    contextMenuItems["edit_dbxrefs"] = index++;
                                    annot_context_menu.addChild(new dijitMenuSeparator());
                                    index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Undo",
                                            onClick: function(event) {
                                                    thisObj.undo();
                                            }
                                    } ));
                                    contextMenuItems["undo"] = index++;
                                    annot_context_menu.addChild(new dijitMenuItem( {
                                            label: "Redo",
                                            onClick: function(event) {
                                                    thisObj.redo();
                                            }
                                    } ));
                                    contextMenuItems["redo"] = index++;
                                    annot_context_menu.addChild(new dijitMenuSeparator());
                                    index++;
                            }
                            annot_context_menu.addChild(new dijitMenuItem( {
                                    label: "Information",
                                    onClick: function(event) {
                                            thisObj.getAnnotationInformation();
                                    }
                            } ));
                            contextMenuItems["information"] = index++;
                            annot_context_menu.addChild(new dijitMenuItem( {
                                    label: "Get sequence",
                                    onClick: function(event) {
                                            thisObj.getSequence();
                                    }
                            } ));
                            contextMenuItems["get_sequence"] = index++;
                            annot_context_menu.addChild(new dijitMenuItem( {
                                    label: "Zoom to base level",
                                    onClick: function(event) {
                                            if (thisObj.getMenuItem("zoom_to_base_level").get("label") == "Zoom to base level") {
                                                    thisObj.zoomToBaseLevel(thisObj.annot_context_mousedown);
                                            }
                                            else {
                                                    thisObj.zoomBackOut(thisObj.annot_context_mousedown);
                                            }
                                    }
                            } ));
                            contextMenuItems["zoom_to_base_level"] = index++;
                            annot_context_menu.addChild(new dijitMenuItem( {
                                    label: "..."
                            } ));
                    },
                    // The ERROR function will be called in an error case.
                    error: function(response, ioArgs) { //
    //                  thisObj.handleError(response);
                    }
            });

            annot_context_menu.onOpen = function(event) {
                    // keeping track of mousedown event that triggered annot_context_menu popup,
                    //   because need mouse position of that event for some actions
                    thisObj.annot_context_mousedown = thisObj.last_mousedown_event;
                    if (thisObj.permission & Permission.WRITE) {
                            thisObj.updateMenu();
                    }
                    dojo.forEach(this.getChildren(), function(item, idx, arr) {
                            if (item instanceof dijitMenuItem) {
                                    item._setSelected(false);
                                    item._onUnhover();
                            }
                    });
            };

        annot_context_menu.startup();
    },

    initNonAnnotContextMenu: function() {
        var thisObj = this;

        non_annot_context_menu = new dijitMenu({});
            non_annot_context_menu.addChild(new dijitMenuItem( {
                    label: "Search sequence",
                    onClick: function() {
                            thisObj.searchSequence();
                    }
            } ));
            non_annot_context_menu.bindDomNode(thisObj.div);
            non_annot_context_menu.onOpen = function(event) {
                    dojo.forEach(this.getChildren(), function(item, idx, arr) {
                            if (item instanceof dijitMenuItem) {
                                    item._setSelected(false);
                                    item._onUnhover();
                            }
                    });
            };

        non_annot_context_menu.startup();
    },

    initPopupDialog: function() {
        var track = this;
        var id = "popup_dialog";

        // deregister widget (needed if changing refseq without reloading page)
        var widget = dijit.registry.byId(id);
        if (widget) {
            widget.destroy();
        }
        track.popupDialog = new dijitDialog({
                                                preventCache: true,
                                                id: id
                                            });
        dojo.connect(track.popupDialog, "onHide", null, function() {
                         track.selectionManager.clearSelection();
                         track.getSequenceTrack().clearHighlightedBases();
                     });
        track.popupDialog.startup();

    },

    getUniqueTrackName: function() {
        return this.name + "-" + this.refSeq.name;
    },

    openDialog: function(title, data) {
        this.popupDialog.set("title", title);
        this.popupDialog.set("content", data);
        this.popupDialog.show();
        this.popupDialog.placeAt("GenomeBrowser", "first");
    },

    updateMenu: function() {
        this.updateSetTranslationStartMenuItem();
        this.updateMergeMenuItem();
        this.updateSplitMenuItem();
        this.updateMakeIntronMenuItem();
        this.updateFlipStrandMenuItem();
        this.updateEditCommentsMenuItem();
        this.updateEditDbxrefsMenuItem();
        this.updateUndoMenuItem();
        this.updateRedoMenuItem();
        this.updateZoomToBaseLevelMenuItem();
        this.updateDuplicateMenuItem();
    },

    updateSetTranslationStartMenuItem: function() {
        var menuItem = this.getMenuItem("set_translation_start");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
        var selectedFeat = selected[0];
        if (selectedFeat.parent) {
            selectedFeat = selectedFeat.parent;
        }
        if (selectedFeat.manuallySetTranslationStart) {
            menuItem.set("label", "Unset translation start");
        }
        else {
            menuItem.set("label", "Set translation start");
        }
    },

    updateMergeMenuItem: function() {
        var menuItem = this.getMenuItem("merge");
        var selected = this.selectionManager.getSelection();
        if (selected.length < 2) {
            menuItem.set("disabled", true);
            return;
        }
        var strand = this.getStrand(selected[0]);
        for (var i = 1; i < selected.length; ++i) {
            if (this.getStrand(selected[i]) != strand) {
                    menuItem.set("disabled", true);
                    return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateSplitMenuItem: function() {
        var menuItem = this.getMenuItem("split");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 2) {
            menuItem.set("disabled", true);
            return;
        }
        var parent = selected[0].parent;
        for (var i = 1; i < selected.length; ++i) {
            if (selected[i].parent != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateMakeIntronMenuItem: function() {
        var menuItem = this.getMenuItem("make_intron");
        var selected = this.selectionManager.getSelection();
        if( selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
    },

    updateFlipStrandMenuItem: function() {
        var menuItem = this.getMenuItem("flip_strand");
    },

    updateEditCommentsMenuItem: function() {
        var menuItem = this.getMenuItem("edit_comments");
        var selected = this.selectionManager.getSelection();
        var parent = AnnotTrack.getTopLevelAnnotation(selected[0]);
        for (var i = 1; i < selected.length; ++i) {
            if (AnnotTrack.getTopLevelAnnotation(selected[i]) != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateEditDbxrefsMenuItem: function() {
        var menuItem = this.getMenuItem("edit_dbxrefs");
        var selected = this.selectionManager.getSelection();
        var parent = AnnotTrack.getTopLevelAnnotation(selected[0]);
        for (var i = 1; i < selected.length; ++i) {
            if (AnnotTrack.getTopLevelAnnotation(selected[i]) != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    updateUndoMenuItem: function() {
        var menuItem = this.getMenuItem("undo");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
    },

    updateRedoMenuItem: function() {
        var menuItem = this.getMenuItem("redo");
        var selected = this.selectionManager.getSelection();
        if (selected.length > 1) {
            menuItem.set("disabled", true);
            return;
        }
        menuItem.set("disabled", false);
    },

    updateZoomToBaseLevelMenuItem: function() {
        var menuItem = this.getMenuItem("zoom_to_base_level");
        if( !this.gview.isZoomedToBase() ) {
            menuItem.set("label", "Zoom to base level");
        }
        else {
            menuItem.set("label", "Zoom back out");
        }
    },

    updateDuplicateMenuItem: function() {
        var menuItem = this.getMenuItem("duplicate");
        var selected = this.selectionManager.getSelection();
        var parent = AnnotTrack.getTopLevelAnnotation(selected[0]);
        for (var i = 1; i < selected.length; ++i) {
            if (AnnotTrack.getTopLevelAnnotation(selected[i]) != parent) {
                menuItem.set("disabled", true);
                return;
            }
        }
        menuItem.set("disabled", false);
    },

    getMenuItem: function(operation) {
        return annot_context_menu.getChildren()[contextMenuItems[operation]];
    },

    getStrand: function(feature) {
    //      if (feature.parent) {
    //              return feature[this.subFields["strand"]];
    //      }
    //      return feature[this.fields["strand"]];
        return this.attrs.get(feature, "Strand");
    },

    sortAnnotationsByLocation: function(annots) {
        var track = this;
        var atts = track.attrs;
        return annots.sort(function(annot1, annot2) {
                               var start1 = atts.get(annot1, "Start");
                               var end1 = atts.get(annot1, "End");
                               var start2 = atts.get(annot2, "Start");
                               var end2 = atts.get(annot2, "End");

                               if (start1 != start2)  { return start1 - start2; }
                               else if (end1 != end2) { return end1 - end2; }
                               else { return 0; }
                               /*
                                if (annot1[track.fields["start"]] != annot2[track.fields["start"]]) {
                                return annot1[track.fields["start"]] - annot2[track.fields["start"]];
                                }
                                if (annot1[track.fields["end"]] != annot2[track.fields["end"]]) {
                                return annot1[track.fields["end"]] - annot2[track.fields["end"]];
                                }
                                return 0;
                                */
                           });
    },

    showRange: function(first, last, startBase, bpPerBlock, scale,
                        containerStart, containerEnd) {
        // console.log("called AnnotTrack.showRange()");
        this.inherited( arguments );

        //    console.log("after calling annot track.showRange(), block range: " + 
        //          this.firstAttached + "--" + this.lastAttached + ",  " + (this.lastAttached - this.firstAttached));

        // handle showing base residues for selected here?
        // selected feats 
        //   ==> selected feat divs 
        //            ==> selected "rows" 
        //                  ==> (A) float SequenceTrack-like residues layer (with blocks) on each selected row?
        //                   OR (B) just get all residues needed and float simple div (no blocks)
        //                            but set up so that callback for actual render happens once all needed residues 
        //                            are available
        //                            can do this way while still using SequenceTrack.getRange function
        //                   
        // update:
        //                  OR (C), hybrid of A and B, block-based AND leveraging SequenceTrack.getRange()
        //    originally tried (B), but after struggling a bit with SequenceTrack.getRange() etc., now leaning 
        //       trying (C)
    /*
         var track = this;
        if (scale === track.browserParams.charWidth)  {
            // need to float sequence residues over selected row(s)
            var seqTrack = this.getSequenceTrack();
            seqTrack.getRange(containerStart, containerEnd, 
                  // see 
                  // callback, gets called for every block that overlaps with containerStart->containerEnd range
                  //   start = genome coord of first bp of block
                  //   end = genome coord of 
                  function(start, end, seq) {
                      
                  }
            );
        }
    */
    },

    /**
     * handles adding overlay of sequence residues to "row" of selected feature
     *   (also handled in similar manner in fillBlock());
     * WARNING:
     *    this _requires_ browser support for pointer-events CSS property,
     *    (currently supported by Firefox 3.6+, Chrome 4.0+, Safari 4.0+)
     *    (Exploring possible workarounds for IE, for example see:
     *        http://www.vinylfox.com/forwarding-mouse-events-through-layers/
     *        http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
     *            [ see section on CSS conditional statement workaround for IE ]
     *    )
     *    and must set "pointer-events: none" in CSS rule for div.annot-sequence
     *    otherwise, since sequence overlay is rendered on top of selected features
     *        (and is a sibling of feature divs), events intended for feature divs will
     *        get caught by overlay and not make it to the feature divs
     */
    selectionAdded: function( rec, smanager)  {
        var feat = rec.feature;
        this.inherited( arguments );

        var track = this;
        // want to get child of block, since want position relative to block
        // so get top-level feature div (assumes top level feature is always rendered...)
        var topfeat = feat;
        while (topfeat.parent)  {
            topfeat = topfeat.parent;
        }
        var featdiv = track.getFeatDiv(topfeat);
        if (featdiv)  {
            //          track.selectionYPosition = $(featdiv).position().top;
            var selectionYPosition = $(featdiv).position().top;
            var scale = track.gview.bpToPx(1);
            if (scale === track.browserParams.charWidth && track.useResiduesOverlay)  {
                var seqTrack = this.getSequenceTrack();
                for (var bindex = this.firstAttached; bindex <= this.lastAttached; bindex++)  {
                    var block = this.blocks[bindex];
    //              seqTrack.getRange(block.startBase, block.endBase,
                    seqTrack.sequenceStore.getRange(this.refSeq, block.startBase, block.endBase,
                        function(start, end, seq) {
                            // var ypos = $(topfeat).position().top;
                            // +2 hardwired adjustment to center (should be calc'd based on feature div dims?
                            var ypos = selectionYPosition + 2;
                            // checking to see if residues for this "row" of the block are already present
                            //    ( either from another selection in same row, or previous rendering
                            //        of same selection [which often happens when scrolling] )
                            // trying to avoid duplication both for efficiency and because re-rendering of text can
                            //    be slighly off from previous rendering, leading to bold / blurry text when overlaid

                            var $seqdivs = $("div.annot-sequence", block);
                            var sindex = $seqdivs.length;
                            var add_residues = true;
                            if ($seqdivs && sindex > 0)  {
                                for (var i=0; i<sindex; i++) {
                                    var sdiv = $seqdivs[i];
                                    if ($(sdiv).position().top === ypos)  {
                                        // console.log("residues already present in block: " + bindex);
                                        add_residues = false;
                                    }
                                }
                            }
                            if (add_residues)  {
                                var seqNode = document.createElement("div");
                                seqNode.className = "annot-sequence";
                                seqNode.appendChild(document.createTextNode(seq));


                                // console.log("ypos: " + ypos);
                                seqNode.style.cssText = "top: " + ypos + "px;";
                                block.appendChild(seqNode);
                                if (track.FADEIN_RESIDUES)  {
                                    $(seqNode).hide();
                                    $(seqNode).fadeIn(1500);
                                }
                            }
                        } );

                }
            }
        }
    },

    selectionRemoved: function(rec, smanager)  {
        // console.log("AnnotTrack.selectionRemoved() called");
        this.inherited( arguments );

        var track = this;
        if (rec.track === track)  {
            var featdiv = track.getFeatDiv(rec.feature);
            // remove sequence text nodes
            // console.log("removing base residued text from selected annot");
            $("div.annot-sequence", track.div).remove();
            track.selectionYPosition = null;
        }
    },

    startZoom: function(destScale, destStart, destEnd) {
        // would prefer to only try and hide dna residues on zoom if previous scale was at base pair resolution
        //   (otherwise there are no residues to hide), but by time startZoom is called, pxPerBp is already set to destScale,
        //    so would require keeping prevScale var around, or passing in prevScale as additional parameter to startZoom()
        // so for now just always trying to hide residues on a zoom, whether they're present or not

        this.inherited( arguments );

        // console.log("AnnotTrack.startZoom() called");
        var selected = this.selectionManager.getSelection();
        if( selected.length > 0 ) {
            // if selected annotations, then hide residues overlay
            //     (in case zoomed in to base pair resolution and the residues overlay is being displayed)
            $(".annot-sequence", this.div).css('display', 'none');
        }
    },

    // endZoom: function(destScale, destBlockBases) {
    //     DraggableFeatureTrack.prototype.endZoom.call(this, destScale, destBlockBases);
    // };

    getTopLevelAnnotation: function(annotation) {
        while( annotation.parent ) {
            annotation = annotation.parent;
        }
        return annotation;
    }
});

// setting up selection exclusiveOr --
//    if selection is made in annot track, any selection in other tracks is deselected, and vice versa,
//    regardless of multi-select mode etc.
AnnotTrack.selectionManager = new FeatureSelectionManager();
AnnotTrack.selectionManager.addMutualExclusion( DraggableFeatureTrack.selectionManager );
DraggableFeatureTrack.selectionManager.addMutualExclusion( AnnotTrack.selectionManager );

return AnnotTrack;
});

/*
  Copyright (c) 2010-2011 Berkeley Bioinformatics Open Projects (BBOP)

  This package and its accompanying libraries are free software; you can
  redistribute it and/or modify it under the terms of the LGPL (either
  version 2.1, or at your option, any later version) or the Artistic
  License 2.0.  Refer to LICENSE for the full license text.

*/
