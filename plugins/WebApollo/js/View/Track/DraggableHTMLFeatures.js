define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'JBrowse/View/Track/HTMLFeatures',
            'WebApollo/FeatureSelectionManager',
            'dijit/Menu',
            'dijit/MenuItem',
            'dijit/CheckedMenuItem',
            'dijit/Dialog',
            'jquery',
            'jqueryui/draggable',
            'JBrowse/Util'
        ],
        function( declare, array, HTMLFeatureTrack, FeatureSelectionManager, dijitMenu, dijitMenuItem, dijitCheckedMenuItem, dijitDialog, $, draggable, Util ) {

/*  Subclass of FeatureTrack that allows features to be selected,
    and dragged and dropped into the annotation track to create annotations.

    WARNING:
    for selection to work for features that cross block boundaries, z-index of feature style MUST be set, and must be > 0
    otherwise what happens is:
          feature div inherits z-order from parent, so same z-order as block
          so feature div pixels may extend into next block, but next block draws ON TOP OF IT (assuming next block added
          to parent after current block).  So events over part of feature div that isn't within it's parent block will never
          reach feature div but instead be triggered on next block
    This issue will be more obvious if blocks have background color set since then not only will selection not work but
       part of feature div that extends into next block won't even be visible, since next block background will render over it
 */

var debugFrame = false;

//var DraggableFeatureTrack = declare( HTMLFeatureTrack,
var draggableTrack = declare( HTMLFeatureTrack,

{
    // so is dragging
    dragging: false,

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                style: {
                    renderClassName: 'DraggableFeatureTrack'
                },
                events: {
                    click:    dojo.hitch( this, 'onFeatureMouseDown' ),
                    dblclick: dojo.hitch( this, 'onFeatureDoubleClick' )
                }
            }
        );
    },

    constructor: function( args ) {

        console.log("DragableFeatureTrack constructor called");

        this.gview = this.browser.view;

        // DraggableFeatureTracks all share the same FeatureSelectionManager
        //    if want subclasses to have different selection manager,
        //    call this.setSelectionManager in subclass (after calling parent constructor)
        this.setSelectionManager( draggableTrack.selectionManager );

        // CSS class for selected features
        // override if want subclass to have different CSS class for selected features
        this.selectionClass = "selected-feature";

        //  DraggableFeatureTrack.selectionManager.addListener(this);

        this.last_whitespace_mousedown_loc = null;
        this.last_whitespace_mouseup_time = new Date();  // dummy timestamp
        this.prev_selection = null;

        this.verbose = false;
        this.verbose_selection = false;
        this.verbose_selection_notification = false;
        this.verbose_drag = false;

        this.feature_context_menu = null;
    },


    loadSuccess: function(trackInfo) {
        /* if subclass indicates it has custom context menu, do not initialize default feature context menu */
        if (! this.has_custom_context_menu) {
            this.initFeatureContextMenu();
            this.initFeatureDialog();
        }
        this.inherited( arguments );
    },

    setSelectionManager: function(selman)  {
        if (this.selectionManager)  {
            this.selectionManager.removeListener(this);
        }
        this.selectionManager = selman;
        // FeatureSelectionManager listeners must implement
        //     selectionAdded() and selectionRemoved() response methods
        this.selectionManager.addListener(this);
        return selman;
    },

/**
 *   only called once, during track setup ???
 *
 *   doublclick in track whitespace is used by JBrowse for zoom
 *      but WebApollo/JBrowse uses single click in whitespace to clear selection
 *
 *   so this sets up mousedown/mouseup/doubleclick
 *      kludge to restore selection after a double click to whatever selection was before
 *      initiation of doubleclick (first mousedown/mouseup)
 *
 */
    setViewInfo: function(genomeView, numBlocks,
                          trackDiv, labelDiv,
                          widthPct, widthPx, scale) {
        this.inherited( arguments );

        var $div = $(this.div);
        var track = this;

        // this.scale = scale;  // scale is in pixels per base

        // setting up mousedown and mouseup handlers to enable click-in-whitespace to clear selection
        //    (without conflicting with JBrowse drag-in-whitespace to scroll)
        $div.bind('mousedown', function(event)  {
                      var target = event.target;
                      if (! (target.feature || target.subfeature))  {
                          track.last_whitespace_mousedown_loc = [ event.pageX, event.pageY ];
                      }
                  } );
        $div.bind('mouseup', function(event)  {
                      var target = event.target;
                      if (! (target.feature || target.subfeature))  {  // event not on feature, so must be on whitespace
                          var xup = event.pageX;
                          var yup = event.pageY;
                          // if click in whitespace without dragging (no movement between mouse down and mouse up,
                          //    and no shift modifier,
                          //    then deselect all
                          if (this.verbose_selection)  { console.log("mouse up on track whitespace"); }
                          var eventModifier = event.shiftKey || event.altKey || event.metaKey || event.ctrlKey;
                          if (track.last_whitespace_mousedown_loc &&
                              xup === track.last_whitespace_mousedown_loc[0] &&
                              yup === track.last_whitespace_mousedown_loc[1] &&
                              (! eventModifier ))  {
                                  var timestamp = new Date();
                                  var prev_timestamp = track.last_whitespace_mouseup_time;
                                  track.last_whitespace_mouseup_time = timestamp;
                                  // if less than half a second, probably a doubleclick (or triple or more click...)
                                  var probably_doubleclick = ((timestamp.getTime() - prev_timestamp.getTime()) < 500);
                                  if (probably_doubleclick)  {
                                      if (this.verbose_selection)  { console.log("mouse up probably part of a doubleclick"); }
                                      // don't record selection state, want to keep prev_selection set
                                      //    to selection prior to first mouseup of doubleclick
                                  }
                                  else {
                                      track.prev_selection = track.selectionManager.getSelection();
                                      if (this.verbose_selection)  {
                                          console.log("recording prev selection");
                                          console.log(track.prev_selection);
                                      }
                                  }
                                  if (this.verbose_selection)  { console.log("clearing selection"); }
                                  track.selectionManager.clearSelection();
                              }
                          else   {
                              track.prev_selection = null;
                          }
                      }
                      // regardless of what element it's over, mouseup clears out tracking of mouse down
                      track.last_whitespace_mousedown_loc = null;
                  } );
        // kludge to restore selection after a double click to whatever selection was before
        //      initiation of doubleclick (first mousedown/mouseup)
        $div.bind('dblclick', function(event) {
                      var target = event.target;
                      // because of dblclick bound to features, will only bubble up to here on whitespace,
                      //   but doing feature check just to make sure
                      if (! (target.feature || target.subfeature))  {
                          if (this.verbose_selection)  {
                              console.log("double click on track whitespace");
                              console.log("restoring selection after double click");
                              console.log(track.prev_selection);
                          }
                          if (track.prev_selection)  {
                              var plength = track.prev_selection.length;
                              // restore selection
                              for (var i = 0; i<plength; i++)  {
                                  track.selectionManager.addToSelection(track.prev_selection[i]);
                              }
                          }
                      }
                      track.prev_selection = null;
                  } );


        /* track click diagnostic (and example of how to add additional track mouse listener?)  */
        $div.bind("click", function(event) {
                      // console.log("track click, base position: " + track.gview.getGenomeCoord(event));
                      var target = event.target;
                      if (target.feature || target.subfeature)  {
                          event.stopPropagation();
                      }
                  } );

        this.initTrackLabelContextMenu();
        this.tracklabel_context_menu.bindDomNode(labelDiv);

    },

    selectionAdded: function( rec, smanager) {
        var track = this;
        if( rec.track === track)  {
            var featdiv = track.getFeatDiv( rec.feature );
            if( track.verbose_selection_notification )  {
                console.log("DFT.selectionAdded called: ");
                console.log( rec );
                console.log( featdiv );
            }
            if( featdiv )  {
                var jq_featdiv = $(featdiv);
                if (!jq_featdiv.hasClass(track.selectionClass))  {
                    jq_featdiv.addClass(track.selectionClass);
                }

                //      track.showEdgeMatches(feat);
            }
        }
    },

    selectionCleared: function(selected, smanager) {
        var track = this;
        if (track.verbose_selection_notification)  {
            console.log("DFT.selectionCleared called");
        }

        var slength = selected.length;
        for (var i=0; i<slength; i++)  {
            var rec = selected[i];
            track.selectionRemoved( rec );
        }
    },

    selectionRemoved: function( rec, smanager)  {
        var track = this;
        if( rec.track === track )  {
            var featdiv = track.getFeatDiv( rec.feature );
            if( track.verbose_selection_notification )  {
                console.log("DFT.selectionRemoved called");
                console.log( rec );
                console.log( featdiv );
            }
            if( featdiv )  {
                var jq_featdiv = $(featdiv);
                if (jq_featdiv.hasClass(track.selectionClass))  {
                    jq_featdiv.removeClass(track.selectionClass);
                }
                if (jq_featdiv.hasClass("ui-draggable"))  {
                    jq_featdiv.draggable("destroy");
                }
                if (jq_featdiv.hasClass("ui-multidraggable"))  {
                    jq_featdiv.multidraggable("destroy");
                }
            }

        }
    },

    /**
     *  overriding renderFeature to add event handling for mouseover, mousedown, mouseup
     */
    renderFeature: function(feature, uniqueId, block, scale,
                            containerStart, containerEnd) {
        var featdiv = this.inherited( arguments );
        if( featdiv )  {  // just in case featDiv doesn't actually get created

            if (this.feature_context_menu  && (! this.has_custom_context_menu)) {
                this.feature_context_menu.bindDomNode(featdiv);
            }

            // if renderClassName field exists in trackData.json for this track, then add a child
            //    div to the featdiv with class for CSS styling set to renderClassName value
            var rclass = this.config.style.renderClassName;
            if (rclass)  {
                // console.log("in FeatureTrack.renderFeature, creating annot div");
                var rendiv = document.createElement("div");
                rendiv.className = rclass;
                if (Util.is_ie6) rendiv.appendChild(document.createComment());
                featdiv.appendChild(rendiv);
            }
        }
        return featdiv;
    },

    renderSubfeature: function( feature, featDiv, subfeature,
                                displayStart, displayEnd, block )  {

        var subfeatdiv = this.inherited( arguments );
        if (subfeatdiv)  {  // just in case subFeatDiv doesn't actually get created
            // var $subfeatdiv = $(subfeatdiv);
            // // adding pointer to track for each subfeatdiv
            // //   (could get this by DOM traversal, but shouldn't take much memory, and having it with each subfeatdiv is more convenient)
            // subfeatdiv.track = this;
            // $subfeatdiv.bind("mousedown", this.featMouseDown);
            // $subfeatdiv.bind("dblclick", this.featDoubleClick);
        }
        return subfeatdiv;
    },

    /**
     * overriding handleSubFeatures for customized handling of UTR/CDS-segment rendering within exon divs
     */
    handleSubFeatures: function( feature, featDiv,
                                    displayStart, displayEnd, block )  {
        // only way to get here is via renderFeature(parent,...),
        //   so parent guaranteed to have unique ID set by now
        var attrs = this.attrs;
        var parentId = feature.uid;
        var subfeats = attrs.get(feature, "Subfeatures");
        var slength = subfeats.length;
        var subfeat;
        var wholeCDS = null;
        var subtype;
        var i;
        for (i=0; i < slength; i++)  {
            subfeat = subfeats[i];
            subtype = attrs.get(subfeat, "Type");
            if (subtype === "wholeCDS" || subtype === "polypeptide") {
                wholeCDS = subfeat;
                break;
            }
        }

        // try to make a wholeCDS if we don't have one
        if( ! wholeCDS ) {
            wholeCDS = (function() {
                var cds = array.filter( feature.get('subfeatures'),
                                        function(s) { return s.get('type') == 'CDS'; }
                                      )
                               .sort( function( a, b ) {
                                          var as = a.get('start'),
                                              bs = b.get('start');
                                          return as == bs ?  0 :
                                              as  > bs ?  1 :
                                              as  < bs ? -1 : 0;
                                      });
                if( cds.length ) {
                    return { start: cds[0].get('start'),
                             end:   cds[cds.length-1].get('end'),
                             get:   function(n) { return this[n]; }
                           };
                }
                else {
                    return null;
                }
            }).call(this);
        }

        if (wholeCDS) {
            var cdsStart = wholeCDS.get('start');
            var cdsEnd = wholeCDS.get('end');
            //    current convention is start = min and end = max regardless of strand, but checking just in case
            var cdsMin = Math.min(cdsStart, cdsEnd);
            var cdsMax = Math.max(cdsStart, cdsEnd);
            if (this.verbose_render)  { console.log("wholeCDS:"); console.log(wholeCDS); }
        }

        var priorCdsLength = 0;
        if (debugFrame)  { console.log("====================================================="); }

        var strand = feature.get('strand');
        var reverse = false;
        if (strand === -1 || strand === '-') {
            reverse = true;
        }
        /* WARNING: currently assuming children are ordered by ascending min
         * (so if on minus strand then need to calc frame starting with the last exon)
         */
        for (var i = 0; i < slength; i++) {
            if (reverse) {
                subfeat = subfeats[slength-i-1];
            }
            else  {
                subfeat = subfeats[i];
            }
            var uid = subfeat.uid;
            if (!uid)  {
                uid = this.getSubfeatId(subfeat, i, parentId);
                subfeat.uid= uid;
            }
            subtype = attrs.get(subfeat, "Type");
            // don't render "wholeCDS" type
            // although if subfeatureClases is properly set up, wholeCDS would also be filtered out in renderFeature?
            // if (subtype == "wholeCDS")  {  continue; }
            var subDiv = this.renderSubfeature(feature, featDiv, subfeat, displayStart, displayEnd, block);
            // if subfeat is of type "exon", add CDS/UTR rendering
            // if (subDiv && wholeCDS && (subtype === "exon")) {
            // if (wholeCDS && (subtype === "exon")) {   // pass even if subDiv is null (not drawn), in order to correctly calc downstream CDS frame

            // CHANGED to call renderExonSegments even if no wholeCDS --
            //     non wholeCDS means undefined cdsMin, which will trigger creation of UTR div for entire exon
            if (subtype === "exon") {   // pass even if subDiv is null (not drawn), in order to correctly calc downstream CDS frame
                priorCdsLength = this.renderExonSegments(subfeat, subDiv, cdsMin, cdsMax, displayStart, displayEnd, priorCdsLength, reverse);
            }
            if (this.verbose_render)  {
                console.log("in DraggableFeatureTrack.handleSubFeatures, subDiv: ");
                console.log(subDiv);
            }
        }
   },

   /**
    *  TODO: still need to factor in truncation based on displayStart and displayEnd???

   From: http://mblab.wustl.edu/GTF22.html
   Frame is calculated as (3 - ((length-frame) mod 3)) mod 3.
       (length-frame) is the length of the previous feature starting at the first whole codon (and thus the frame subtracted out).
       (length-frame) mod 3 is the number of bases on the 3' end beyond the last whole codon of the previous feature.
       3-((length-frame) mod 3) is the number of bases left in the codon after removing those that are represented at the 3' end of the feature.
       (3-((length-frame) mod 3)) mod 3 changes a 3 to a 0, since three bases makes a whole codon, and 1 and 2 are left unchanged.
    */
    renderExonSegments: function( subfeature, subDiv, cdsMin, cdsMax,
                                  displayStart, displayEnd, priorCdsLength, reverse)  {
        var attrs = this.attrs;
        var subStart = attrs.get(subfeature, "Start");
        var subEnd = attrs.get(subfeature, "End");
        var subLength = subEnd - subStart;
        var UTRclass, CDSclass;

     //   if (debugFrame)  { console.log("exon: " + subStart); }

        // if the feature has been truncated to where it doesn't cover
        // this subfeature anymore, just skip this subfeature
        // GAH: was OR, but should be AND?? var render = ((subEnd > displayStart) && (subStart < displayEnd));
        var render = subDiv && (subEnd > displayStart) && (subStart < displayEnd);

        // look for UTR and CDS subfeature class mapping from trackData
        //    if can't find, then default to parent feature class + "-UTR" or "-CDS"
        if( render ) {
            UTRclass = this.config.style.subfeatureClasses["UTR"];
            CDSclass = this.config.style.subfeatureClasses["CDS"];
            if (! UTRclass)  { UTRclass = this.className + "-UTR"; }
            if (! CDSclass)  { CDSclass = this.className + "-CDS"; }
        }

    //    if ((subEnd <= displayStart) || (subStart >= displayEnd))  { return undefined; }

        var segDiv;
        // console.log("render sub frame");
        // whole exon is untranslated (falls outside wholeCDS range, or no CDS info found)
        if( (cdsMin === undefined && cdsMax === undefined) ||
            (cdsMax <= subStart || cdsMin >= subEnd))  {
            if( render )  {
                segDiv = document.createElement("div");
                // not worrying about appending "plus-"/"minus-" based on strand yet
                segDiv.className = UTRclass;
                if (Util.is_ie6) segDiv.appendChild(document.createComment());
                segDiv.style.cssText =
                    "left: " + (100 * ((subStart - subStart) / subLength)) + "%;"
                    + "top: 0px;"
                    + "width: " + (100 * ((subEnd - subStart) / subLength)) + "%;";
                subDiv.appendChild(segDiv);
            }
        }

    /*
     Frame is calculated as (3 - ((length-frame) mod 3)) mod 3.
        (length-frame) is the length of the previous feature starting at the first whole codon (and thus the frame subtracted out).
        (length-frame) mod 3 is the number of bases on the 3' end beyond the last whole codon of the previous feature.
        3-((length-frame) mod 3) is the number of bases left in the codon after removing those that are represented at the 3' end of the feature.
        (3-((length-frame) mod 3)) mod 3 changes a 3 to a 0, since three bases makes a whole codon, and 1 and 2 are left unchanged.
    */
        // whole exon is translated
        else if (cdsMin <= subStart && cdsMax >= subEnd) {
            var overhang = priorCdsLength % 3;  // number of bases overhanging from previous CDS
            var relFrame = (3 - (priorCdsLength % 3)) % 3;
            var absFrame, cdsFrame, initFrame;
            if (reverse)  {
                initFrame = (cdsMax - 1) % 3;
                absFrame = (subEnd - 1) % 3;
                cdsFrame = (3 + absFrame - relFrame) % 3;
            }
            else  {
                initFrame = cdsMin % 3;
                absFrame = (subStart % 3);
                cdsFrame = (absFrame + relFrame) % 3;
            }
            if (debugFrame)  {
                    console.log("whole exon: " + subStart + " -- ", subEnd, " initFrame: ", initFrame,
                                           ", overhang: " + overhang + ", relFrame: ", relFrame, ", absFrame: ", absFrame,
                                           ", cdsFrame: " + cdsFrame);
            }

            if (render)  {
                segDiv = document.createElement("div");
                // not worrying about appending "plus-"/"minus-" based on strand yet
                segDiv.className = CDSclass;
                if (Util.is_ie6) segDiv.appendChild(document.createComment());
                segDiv.style.cssText =
                    "left: " + (100 * ((subStart - subStart) / subLength)) + "%;"
                    + "top: 0px;"
                    + "width: " + (100 * ((subEnd - subStart) / subLength)) + "%;";
                if (this.config.style.colorCdsFrame || this.gview.colorCdsByFrame) {
                    $(segDiv).addClass("cds-frame" + cdsFrame);
                }
                subDiv.appendChild(segDiv);
            }
            priorCdsLength += subLength;
        }
        // partial translation of exon
        else  {
            // calculate 5'UTR, CDS segment, 3'UTR
            var cdsSegStart = Math.max(cdsMin, subStart);
            var cdsSegEnd = Math.min(cdsMax, subEnd);
            var overhang = priorCdsLength % 3;  // number of bases overhanging
            var absFrame, cdsFrame, initFrame;
            if (priorCdsLength > 0)  {
                var relFrame = (3 - (priorCdsLength % 3)) % 3;
                if (reverse)  {
                    //      cdsFrame = ((subEnd-1) + ((3 - (priorCdsLength % 3)) % 3)) % 3; }
                    initFrame = (cdsMax - 1) % 3;
                    absFrame = (subEnd - 1) % 3;
                    cdsFrame = (3 + absFrame - relFrame) % 3;
                }
                else  {
                    // cdsFrame = (subStart + ((3 - (priorCdsLength % 3)) % 3)) % 3;
                    initFrame = cdsMin % 3;
                    absFrame = (subStart % 3);
                    cdsFrame = (absFrame + relFrame) % 3;
                }
                if (debugFrame)  { console.log("partial exon: " + subStart + ", initFrame: " + (cdsMin % 3) +
                                               ", overhang: " + overhang + ", relFrame: " + relFrame + ", subFrame: " + (subStart % 3) +
                                               ", cdsFrame: " + cdsFrame); }
            }
            else  {  // actually shouldn't need this? -- if priorCdsLength = 0, then above conditional collapses down to same calc...
                if (reverse) {
                    cdsFrame = (cdsMax-1) % 3; // console.log("rendering reverse frame");
                }
                else  {
                    cdsFrame = cdsMin % 3;
                }
            }

            var utrStart;
            var utrEnd;
            // make left UTR (if needed)
            if (cdsMin > subStart) {
                utrStart = subStart;
                utrEnd = cdsSegStart;
                if (render)  {
                    segDiv = document.createElement("div");
                    // not worrying about appending "plus-"/"minus-" based on strand yet
                    segDiv.className = UTRclass;
                    if (Util.is_ie6) segDiv.appendChild(document.createComment());
                    segDiv.style.cssText =
                        "left: " + (100 * ((utrStart - subStart) / subLength)) + "%;"
                        + "top: 0px;"
                        + "width: " + (100 * ((utrEnd - utrStart) / subLength)) + "%;";
                    subDiv.appendChild(segDiv);
                }
            }
            if (render)  {
                // make CDS segment
                segDiv = document.createElement("div");
                // not worrying about appending "plus-"/"minus-" based on strand yet
                segDiv.className = CDSclass;
                if (Util.is_ie6) segDiv.appendChild(document.createComment());
                segDiv.style.cssText =
                    "left: " + (100 * ((cdsSegStart - subStart) / subLength)) + "%;"
                    + "top: 0px;"
                    + "width: " + (100 * ((cdsSegEnd - cdsSegStart) / subLength)) + "%;";
                if (this.config.style.colorCdsFrame || this.gview.colorCdsByFrame) {
                    $(segDiv).addClass("cds-frame" + cdsFrame);
                }
                subDiv.appendChild(segDiv);
            }
            priorCdsLength += (cdsSegEnd - cdsSegStart);

            // make right UTR  (if needed)
            if (cdsMax < subEnd)  {
                utrStart = cdsSegEnd;
                utrEnd = subEnd;
                if (render)  {
                    segDiv = document.createElement("div");
                    // not worrying about appending "plus-"/"minus-" based on strand yet
                    segDiv.className = UTRclass;
                    if (Util.is_ie6) segDiv.appendChild(document.createComment());
                    segDiv.style.cssText =
                        "left: " + (100 * ((utrStart - subStart) / subLength)) + "%;"
                        + "top: 0px;"
                        + "width: " + (100 * ((utrEnd - utrStart) / subLength)) + "%;";
                    subDiv.appendChild(segDiv);
                }
            }
        }
        return priorCdsLength;
    },


    /*
     *  selection occurs on mouse down
     *  mouse-down on unselected feature -- deselect all & select feature
     *  mouse-down on selected feature -- no change to selection (but may start drag?)
     *  mouse-down on "empty" area -- deselect all
     *        (WARNING: this is preferred behavior, but conflicts with dblclick for zoom -- zoom would also deselect)
     *         therefore have mouse-click on empty area deselect all (no conflict with dblclick)
     *  shift-mouse-down on unselected feature -- add feature to selection
     *  shift-mouse-down on selected feature -- remove feature from selection
     *  shift-mouse-down on "empty" area -- no change to selection
     *
     *   "this" should be a featdiv or subfeatdiv
     */
    onFeatureMouseDown: function(event) {
        // event.stopPropagation();
        if( this.verbose_selection || this.verbose_drag ) { console.log("DFT.onFeatureMouseDown called"); }
        var ftrack = this;

        // checking for whether this is part of drag setup retrigger of mousedown --
        //     if so then don't do selection or re-setup draggability)
        //     this keeps selection from getting confused,
        //     and keeps trigger(event) in draggable setup from causing infinite recursion
        //     in event handling calls to featMouseDown
        if (ftrack.drag_create)  {
            if (this.verbose_selection || this.verbose_drag)  {
                console.log("DFT.featMouseDown re-triggered event for drag initiation, drag_create: " + ftrack.drag_create);
                console.log(ftrack);
            }
            ftrack.drag_create = null;
        }
        else  {
            this.handleFeatureSelection(event);
            this.handleFeatureDragSetup(event);
        }

   },

   handleFeatureSelection: function( event )  {
       var ftrack = this;
       var selman = ftrack.selectionManager;
       var featdiv = (event.currentTarget || event.srcElement);
       var feat = featdiv.feature;
       if( !feat ) {
           feat = featdiv.subfeature;
       }

       if( selman.unselectableTypes[feat.get('type')] ) {
           return;
       }

       var already_selected = selman.isSelected(feat);
       var parent_selected = false;
       var parent = feat.parent;
       if (parent)  {
           parent_selected = selman.isSelected(parent);
       }
       if (this.verbose_selection)  {
           console.log("DFT.handleFeatureSelection() called, actual mouse event");
           console.log(featdiv);
           console.log(feat);
           console.log("already selected: " + already_selected + ",  parent selected: " + parent_selected +
                       ",  shift: " + (event.shiftKey));
       }
       // if parent is selected, allow propagation of event up to parent,
       //    in order to ensure parent draggable setup and triggering
       // otherwise stop propagation
       if (! parent_selected)  {
           event.stopPropagation();
       }
       if (event.shiftKey)  {
           if (already_selected) {  // if shift-mouse-down and this already selected, deselect this
               selman.removeFromSelection( { feature: feat, track: this });
           }
           else if (parent_selected)  {
               // if shift-mouse-down and parent selected, do nothing --
               //   event will get propagated up to parent, where parent will get deselected...
               // selman.removeFromSelection(parent);
           }
           else  {  // if shift-mouse-down and neither this or parent selected, select this
               // children are auto-deselected by selection manager when parent is selected
               selman.addToSelection({ feature: feat, track: this });
           }
       }
       else if (event.altKey) {
       }
       else if (event.ctrlKey) {
       }
       else if (event.metaKey) {
       }
       else  {  // no shift modifier
           if (already_selected)  {  // if this selected, do nothing (this remains selected)
               if (this.verbose_selection)  { console.log("already selected"); }
           }
           else  {
               if (parent_selected)  {
                   // if this not selected but parent selected, do nothing (parent remains selected)
                   //    event will propagate up (since parent_selected), so draggable check
                   //    will be done in bubbled parent event
               }
               else  {  // if this not selected and parent not selected, select this
                   selman.clearSelection();
                   selman.addToSelection({ track: this, feature: feat});
               }
           }
       }
    },

    handleFeatureDragSetup: function(event)  {
        var ftrack = this;
        var featdiv = (event.currentTarget || event.srcElement);
        if (this.verbose_drag)  {  console.log(featdiv); }
        var feat = featdiv.feature;
        if (!feat)  { feat = featdiv.subfeature; }
        var selected = this.selectionManager.isSelected( {track: this, feature: feat});

        // only do drag if feature is actually selected
        if (selected)  {
            /**
             *  ideally would only make $.draggable call once for each selected div
             *  but having problems with draggability disappearing from selected divs
             *       that $.draggable was already called on
             *  therefore whenever mousedown on a previously selected div also want to
             *       check that draggability and redo if missing
             */
            var $featdiv = $(featdiv);
            if (! $featdiv.hasClass("ui-draggable"))  {
                if (this.verbose_drag)  {
                    console.log("setting up dragability");
                    console.log(featdiv);
                }
                $featdiv.draggable(   // draggable() adds "ui-draggable" class to div
                    {
                        // custom helper for pseudo-multi-drag ("pseudo" because multidrag is visual only --
                        //      handling of draggable when dropped is already done through selection)
                        //    strategy for custom helper is to make a "holder" div with same dimensionsas featdiv
                        //       that's (mostly) a clone of the featdiv draggable is being called on
                        //       (since draggable seems to like that),
                        //     then add clones of all selected feature divs (including another clone of featdiv)
                        //        to holder, with dimensions of each clone recalculated as pixels and set relative to
                        //        featdiv that the drag is actually initiated on (and thus relative to the holder's
                        //        dimensions)

                        //  helper: 'clone',
                         helper: function() {
                            var $featdiv_copy = $featdiv.clone();
                            var $holder = $featdiv.clone();
                            $holder.removeClass();
                            $holder.addClass("custom-multifeature-draggable-helper");
                            var holder = $holder[0];
                            var featdiv_copy = $featdiv_copy[0];

                            var foffset = $featdiv.offset();
                            var fheight = $featdiv.height();
                            var fwidth = $featdiv.width();
                            var ftop = foffset.top;
                            var fleft = foffset.left;
                            if (this.verbose_drag)  {
                                console.log("featdiv dimensions: ");
                                console.log(foffset); console.log("height: " + fheight + ", width: " + fwidth);
                            }
                            var selection = ftrack.selectionManager.getSelection();
                            var selength = selection.length;
                            for (var i=0; i<selength; i++)  {
                                var srec = selection[i];
                                var strack = srec.track;
                                var sfeatdiv = strack.getFeatDiv( srec.feature );
                                // if (sfeatdiv && (sfeatdiv !== featdiv))  {
                                if (sfeatdiv)  {
                                    var $sfeatdiv = $(sfeatdiv);
                                    var $divclone = $sfeatdiv.clone();
                                    var soffset = $sfeatdiv.offset();
                                    var sheight = $sfeatdiv.height();
                                    var swidth =$sfeatdiv.width();
                                    var seltop = soffset.top;
                                    var sleft = soffset.left;
                                    $divclone.width(swidth);
                                    $divclone.height(sheight);
                                    var delta_top = seltop - ftop;
                                    var delta_left = sleft - fleft;
                                    if (this.verbose_drag)  {
                                        console.log(sfeatdiv);
                                        console.log("delta_left: " + delta_left + ", delta_top: " + delta_top);
                                    }
                                    //  setting left and top by pixel, based on delta relative to moused-on feature
                                    //    tried using $divclone.position( { ...., "offset": delta_left + " " + delta_top } );,
                                    //    but position() not working for negative deltas? (ends up using absolute value)
                                    //    so doing more directly with "left and "top" css calls
                                    $divclone.css("left", delta_left);
                                    $divclone.css("top", delta_top);
                                    var divclone = $divclone[0];
                                    holder.appendChild(divclone);
                                }
                            }
                            if (this.verbose_drag)  { console.log(holder); }
                            return holder;
                        },
                        opacity: 0.5,
                        axis: 'y',
                        create: function(event, ui)  {
                            // ftrack.drag_create = true;
                        }
            //      } ).trigger(event);
                // see http://bugs.jqueryui.com/ticket/3876 regarding switch from previous hacky approach using JQuery 1.5
                //       trigger(event) and ftrack.drag_create
                // to new hacky approach using JQuery 1.7:
                //       data("draggable")._mouseDown(event);
                //
                // see also http://stackoverflow.com/questions/9634639/why-does-this-break-in-jquery-1-7-x
                //     for more explanation of event handling changes in JQuery 1.7
    //              } ).data("draggable")._mouseDown(event);
                    } );
    //              if (this.verbose_drag)  { console.log($featdiv); }
            //      $featdiv.trigger(event);
                $featdiv.data("draggable")._mouseDown(event);
               //  $featdiv.draggable().data("draggable")._mouseDown(event);
            }
        }
    },


    onFeatureDoubleClick: function( event )  {
        var ftrack = this;
        var selman = ftrack.selectionManager;
        // prevent event bubbling up to genome view and triggering zoom
        event.stopPropagation();
        var featdiv = (event.currentTarget || event.srcElement);
        if (this.verbose_selection)  {
            console.log("DFT.featDoubleClick");
            console.log(ftrack);
            console.log(featdiv);
        }

        // only take action on double-click for subfeatures
        //  (but stop propagation for both features and subfeatures)
        // GAH TODO:  make this work for feature hierarchies > 2 levels deep
        var subfeat = featdiv.subfeature;
       // if (subfeat && (! unselectableTypes[subfeat.get('type')]))  {  // only allow double-click parent selection for selectable features
        if( subfeat && selman.isSelected(subfeat) ) {  // only allow double-click of child for parent selection if child is already selected
            var parent = subfeat.parent;
            // select parent feature
            // children (including subfeat double-clicked one) are auto-deselected in FeatureSelectionManager if parent is selected
            if( parent ) { selman.addToSelection({ feature: parent, track: this }); }
        }
    },


    /**
     *  returns first feature or subfeature div (including itself)
     *  found when crawling towards root from branch in
     *  feature/subfeature/descendants div hierachy
     */
    getLowestFeatureDiv: function(elem)  {
        while (!elem.feature && !elem.subfeature)  {
            elem = elem.parentNode;
            if (elem === document)  {return null;}
        }
        return elem;
    },


    /**
     * Near as I can tell, track.showRange is called every time the
     * appearance of the track changes in a way that would cause
     * feature divs to be added or deleted (or moved? -- not sure,
     * feature moves may also happen elsewhere?)  So overriding
     * showRange here to try and map selected features to selected
     * divs and make sure the divs have selection style set
     */
    showRange: function( first, last, startBase, bpPerBlock, scale,
                         containerStart, containerEnd ) {
        this.inherited( arguments );

        //    console.log("called DraggableFeatureTrack.showRange(), block range: " +
        //          this.firstAttached +  "--" + this.lastAttached + ",  " + (this.lastAttached - this.firstAttached));
        // redo selection styles for divs in case any divs for selected features were changed/added/deleted
        var srecs = this.selectionManager.getSelection();
        for (var sin in srecs)  {
            // only look for selected features in this track --
            // otherwise will be redoing (sfeats.length * tracks.length) times instead of sfeats.length times,
            // because showRange is getting called for each track
            var srec = srecs[sin];
            if (srec.track === this)  {
                // some or all feature divs are usually recreated in a showRange call
                //  therefore calling track.selectionAdded() to retrigger setting of selected-feature CSS style, etc. on new feat divs
                this.selectionAdded(srec);
            }
        }
    },

 //     DraggableFeatureTrack.prototype.endZoom = function(destScale, destBlockBases) {
 //         FeatureTrack.prototype.endZoom.call(this, destScale, destBlockBases);
 //         // this.scale = destScale;
 // };

    initTrackLabelContextMenu: function()  {
        var track = this;
        this.tracklabel_context_menu = new dijitMenu({});
        var initState = (track.config.style.showFeatureName == undefined) ? true : track.config.style.showFeatureName;
        // console.log("track: " + track.config.label + ", show label: " + initState);

        this.tracklabel_context_menu.addChild(new dijitMenuItem({ label: "Configure Single Track", disabled: true }) );

        var feature_label_toggle = new dijitCheckedMenuItem();
        feature_label_toggle.set("label", "Show Label");
        feature_label_toggle.set("checked", initState);
        feature_label_toggle.set("onClick", function(event) {
            track.config.style.showFeatureName = feature_label_toggle.checked;
            track.hideAll();
            track.changed();
        });
        this.tracklabel_context_menu.addChild(feature_label_toggle);

        this.tracklabel_context_menu.addChild( new dijitMenuItem({ label: "Configure All Tracks", disabled: true }) );
        var cds_frame_toggle = new dijitCheckedMenuItem();
        cds_frame_toggle.set("label", "Color By CDS Frame");
        cds_frame_toggle.set("checked", false);
     /*   cds_frame_toggle.set("onClick", function(event) {
            track.config.style.colorCdsFrame = cds_frame_toggle.checked;
            if (track.config.style.colorCdsFrame) {
                track.gview.cds_frame_trackcount++;
            }
            else  {
                track.gview.cds_frame_trackcount--;
            }
            var strack = track.getSequenceTrack();
            if (strack) {
                strack.hideAll();
                strack.changed();
            }
            track.hideAll();
            track.changed();
         } );
    */
        cds_frame_toggle.set("onClick", function(event) {
            track.gview.colorCdsByFrame = cds_frame_toggle.checked;
            track.gview.trackIterate(function(trk)  {
                                    trk.hideAll();
                               });
            track.gview.showVisibleBlocks(true);
         } );
        this.tracklabel_context_menu.addChild(cds_frame_toggle);

    /*    this.tracklabel_context_menu.addChild(new dijitMenuItem( {
                                                            label: "..."
                                                        } ));
    */
        this.tracklabel_context_menu.startup();
    },

    initFeatureContextMenu: function() {
        var thisObj = this;
        this.feature_context_menu = new dijitMenu({});
        this.feature_context_menu.addChild(new dijitMenuItem( {
            label: "Information",
            onClick: function(event) {
                thisObj.showFeatureInformation( array.map( thisObj.selectionManager.getSelection(), function(rec) { return rec.feature; } ));
            }
        } ));
        this.feature_context_menu.addChild(
            new dijitMenuItem({ label: "..." })
        );

        this.feature_context_menu.onOpen = function(event) {
            dojo.forEach(this.getChildren(), function(item, idx, arr) {
                             item._setSelected(false);
                             item._onUnhover();
                         });
        };
        this.feature_context_menu.startup();
    },

    showFeatureInformation: function(feats) {
        var info = "";
        for (var i=0; i<feats.length; i++) {
            var feat = feats[i];
            var attrs = this.featureStore.attrs;
            var props = attrs.getAttributeNames(feat);
            if (i > 0) {
                info += "<hr/> \n";
            }
            for (var k=0; k<props.length; k++) {
                var prop = props[k];
                var val = attrs.get(feat, prop);
                if ($.isArray(val))  {
                    val = val.length;
                }
                var tagval = prop + ": " +  val + " <br/> \n";
                info += tagval;
            }
        }
        this.openFeatureDialog("Feature information", info);
    },

    initFeatureDialog: function() {
        this.featureDialog = new dijitDialog({});
        this.featureDialog.startup();
    },

    openFeatureDialog: function(title, data) {
        this.featureDialog.set("title", title);
        this.featureDialog.set("content", data);
        this.featureDialog.show();
        this.featureDialog.placeAt("GenomeBrowser", "first");
    },

    /**
     *  get the GenomeView's sequence track -- maybe move this to GenomeView?
     *  WebApollo assumes there is only one SequenceTrack
     *     if there are multiple SequenceTracks, getSequenceTrack returns first one found
     *         iterating through tracks list
     */
    getSequenceTrack: function()  {
        if( this.seqTrack )  {
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
    }
});

    // selectionManager is class variable (shared across all DraggableFeatureTrack objects)
    draggableTrack.selectionManager = new FeatureSelectionManager();

	    return draggableTrack;
});

 /*
   Copyright (c) 2010-2011 Berkeley Bioinformatics Open-source Projects & Lawrence Berkeley National Labs

   This package and its accompanying libraries are free software; you can
   redistribute it and/or modify it under the terms of the LGPL (either
   version 2.1, or at your option, any later version) or the Artistic
   License 2.0.  Refer to LICENSE for the full license text.

 */
