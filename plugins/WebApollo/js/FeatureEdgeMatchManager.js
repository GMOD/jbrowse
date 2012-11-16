 define( ['dojo/_base/declare',
          'jquery',
          'WebApollo/View/Track/DraggableHTMLFeatures',
          'WebApollo/View/Track/AnnotTrack'
         ],
        function( declare, $, DraggableFeatureTrack, AnnotTrack ) {

var FeatureEdgeMatchManager = declare( null,
{
    constructor: function() {
        // console.log("FeatureEdgeMatchManager constructor called");
        this.featSelectionManager = DraggableFeatureTrack.selectionManager;
        this.annotSelectionManager = AnnotTrack.selectionManager;
        this.featSelectionManager.addListener(this);
        this.annotSelectionManager.addListener(this);
        this.verbose_edges = false;
        this.unmatchableTypes = this.featSelectionManager.unselectableTypes;
        this.unedgeableTypes = { "wholeCDS" : true };
    },

    SHOW_EDGE_MATCHES: true,

    setBrowser: function( browser ) {
        browser.subscribe('/jbrowse/v1/n/redraw', dojo.hitch( this, function() {
            var selected = this.featSelectionManager;
            var annot_selected = this.annotSelectionManager;
            this.selectionCleared();
            //    for (var i in selected)  {
            for (var i = 0; i < selected.length; ++i) {
        	    this.selectionAdded(selected[i]);
            }
            //    for (var i in annot_selected)   {
            for (var i = 0; i < annot_selected.length; ++i) {
        	    this.selectionAdded(annot_selected[i]);
            }
        }));
    },

    /**
     *  since FeatureEdgeMatcher singleton is listening to both feature selection manager
     *    and annot selection manager, one of the manager clearing a selection does not
     *    mean the other selection is cleared
     *  so in edge-matcher selectionCleared(), after removing edge-match styling, rechecking
     *    selections and redoing styles for any remaining selections
     */
    selectionCleared: function(selected)  {
        if( this.SHOW_EDGE_MATCHES )  {
            $(".left-edge-match").removeClass("left-edge-match");
            $(".right-edge-match").removeClass("right-edge-match");
            var fselected = this.featSelectionManager.getSelection();
            for (var i = 0; i < fselected.length; ++i) {
                //      for (var i in fselected)  {
                var selfeat = fselected[i];
                this.selectionAdded(selfeat);
            }
            var aselected = this.annotSelectionManager.getSelection();
            //  for (var i in aselected)  {
            for (var i = 0; i < aselected.length; ++i) {
                var selannot = aselected[i];
                this.selectionAdded(selannot);
            }
        }
    },

    selectionRemoved: function(feat)  {
        // for now, brute force it -- remove all edge-match styling,
        //    then re-add current selections one at a time
        //
        //  since selectionCleared is now redoing selections after clearing styles,
        //      selectionRemoved() and selectionCleared() are now equivalent operations
        if( this.SHOW_EDGE_MATCHES ) {
            this.selectionCleared();
        }
    },

    // feat may be a feature or subfeature?
    // experimenting with highlighting edges of features that match selected features (or their subfeatures)
    // still assuming index 0 for start, index 1 for end
    // assumes all tracks have two-level features, and thus track.fields and track.subFields are populated
    selectionAdded: function( rec )  {
        var feat = rec.feature;
        if ( ! this.SHOW_EDGE_MATCHES ) {
            return;
        }
        var source_feat = feat;
        var verbose_edges = this.verbose_edges;
        if (verbose_edges)  { console.log("EdgeMatcher.selectionAdded called"); }

        var source_subfeats = source_feat.get('subfeatures');
        if (! source_subfeats || source_subfeats.length === 0) {
            source_subfeats = [ source_feat ];
        }
        /*
            var source_subfeats = null;
            if (source_feat.parent)  {  // selection is a subfeature
                source_subfeats = [ source_feat ];
            }
            else if (!source_subfields)  { // track features don't have subfeatures
                source_subfeats = [ source_feat ];
                source_subfields = source_fields;
                // WARNING!  currently assumes min/max fields are same index in track.fields and track.subFields
            }
            else if (source_subfields && source_fields["subfeatures"])  {
                source_subfeats = source_feat[source_fields["subfeatures"]];
            }
            else { // no way of munging subfeatures, so give up
                return;
            }
        */

        if( verbose_edges ) {
            console.dir(source_subfeats);
        }

        var sourceid = source_feat.id();

        var qmin = source_feat.get('start');
        var qmax = source_feat.get("end");
        // var smindex = source_attrs.get(source_subfields["start"];
        // var smaxdex = source_subfields["end"];

        if (verbose_edges)  { console.log("qmin = " + qmin + ", qmax = " + qmax); }
        var unmatchableTypes = this.unmatchableTypes;
        var unedgeableTypes = this.unedgeableTypes;

        var ftracks = $("div.track").each( function(index, trackdiv)  {
            var target_track = trackdiv.track;
    //      if (target_track && target_track.features)  {
    // TEMPORARY FIX for error when dragging track into main view --
    //     if something selected, edge matching attempted on new track, which throws an error:
    //             "target_subfields is undefined"
    //             at "var tmindex = target_subfields["start"];" line below
    //     error possibly due to track's trackData not yet being fully loaded, so check track load fiel
            if (target_track && target_track.store && target_track.loaded)  {
                if (verbose_edges)  {
                    console.log("edge matching for: " + target_track.name);
                }

                var featureStore = target_track.store;
                var target_attrs = featureStore.attrs;

                // var target_fields = target_track.fields;
                // var target_subfields = target_track.subFields;
               //  var tmindex = target_subfields["start"];
               //  var tmaxdex = target_subfields["end"];

                // only look at features that overlap source_feat min/max
                // NCList.iterate only calls function for features that overlap qmin/qmax coords
                featureStore.iterate(qmin, qmax, function(target_feat, path) {

                    if (verbose_edges)  {  console.log("========="); console.log("checking feature: "); console.log(target_feat); }
                    var target_subfeats = target_attrs.get(target_feat, "Subfeatures");
                    if (! target_subfeats) {
                        target_subfeats = [ target_feat ];
                    }
                    if (verbose_edges)  { console.log(target_subfeats); }

                    if (source_subfeats instanceof Array &&
                        target_subfeats instanceof Array && target_subfeats[0] instanceof Array)  {
                        var tid = target_feat.id();
                        if (verbose_edges)  {  console.log("found overlap"); console.log(target_feat); }
                        if (tid)  {
                            var tdiv = target_track.getFeatDiv(target_feat);
                            if (verbose_edges)  { console.log(tdiv); }
                            if (tdiv)  {  // only keep going if target feature.uid already populated
                                // console.log(rsubdivs);
                                for (var i in source_subfeats)  {
                                    var ssfeat = source_subfeats[i];
                                    var sstype = ssfeat.get('type');
                                    // don't do matching for source features of type registered as unmatchable
                                    if (unmatchableTypes[sstype] || unedgeableTypes[sstype]) {
                                        continue;
                                    }

                                    var ssmin = ssfeat.get('start');
                                    var ssmax = ssfeat.get('end');
                                    for (var j in target_subfeats)  {
                                        var tsfeat = target_subfeats[j];
                                        var tstype = tsfeat.get('type');
                                        // don't do matching for target features of type registered as unmatchable
                                        if (unmatchableTypes[tstype] || unedgeableTypes[tstype]) {
                                            continue;
                                        }
                                        var tsmin = target_attrs.get(tsfeat, "Start");
                                        var tsmax = target_attrs.get(tsfeat, "End");
                                        if (ssmin === tsmin || ssmax === tsmax)  {
                                            var tsid = tsfeat.id();
                                            if (tsid)   {
                                                var tsubdiv = target_track.getFeatDiv(tsfeat);
                                                if (tsubdiv)  {
                                                    var $tsubdiv = $(tsubdiv);
                                                    if (ssmin === tsmin)  {
                                                        $(tsubdiv).addClass("left-edge-match");
                                                    }
                                                    if (ssmax === tsmax)  {
                                                        $(tsubdiv).addClass("right-edge-match");
                                                    }
                                                }
                                            }
                                        }

                                    }
                                }
                            }
                        }
                    }
                }, function() {} );  // empty function for no-op on finishing
            }
        } );
    }
});

// NOTE: this is a singleton
return new FeatureEdgeMatchManager();
});




