 define( ['dojo/_base/declare',
          'jquery',
          'WebApollo/View/Track/DraggableHTMLFeatures',
          'WebApollo/View/Track/AnnotTrack'
         ],
        function( declare, $, DraggableFeatureTrack, AnnotTrack ) {

var FeatureEdgeMatchManager = declare( null,
				       
{

    constructor: function() {
	this.SHOW_EDGE_MATCHES = true,
	this.selection_managers = [];
	this.unmatchableTypes = {};

        this.verbose_edges = false;
        this.unedgeableTypes = { "wholeCDS" : true };
    },

    addSelectionManager: function( manager )  {
	if ( dojo.indexOf( this.selection_managers, manager ) < 0 ) {
	    this.selection_managers.push( manager );
	    manager.addListener(this);
	    dojo.mixin( this.unmatchableTypes, manager.unselectableTypes );
	}

    }, 

    setBrowser: function( browser ) {
        browser.subscribe('/jbrowse/v1/n/tracks/redraw', dojo.hitch( this, function() {
            this.selectionCleared();
	    for (var k=0; k < this.selection_managers.length; k++)  {
		var selected = this.selection_managers[k].getSelection();    
		for (var i = 0; i < selected.length; ++i) {
        	    this.selectionAdded(selected[i]);
		}
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
	    for (var k=0; k < this.selection_managers.length; k++)  {
		var selected = this.selection_managers[k].getSelection();
		for (var i = 0; i < selected.length; ++i) {
		    var selection_record = selected[i];
		    this.selectionAdded(selection_record);
		}
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

        if( verbose_edges ) {
            console.dir(source_subfeats);
        }

        var sourceid = source_feat.id();

        var qmin = source_feat.get('start');
        var qmax = source_feat.get("end");

        if (verbose_edges)  { console.log("qmin = " + qmin + ", qmax = " + qmax); }
        var unmatchableTypes = this.unmatchableTypes;
        var unedgeableTypes = this.unedgeableTypes;

        var ftracks = $("div.track").each( function(index, trackdiv)  {
            var target_track = trackdiv.track;
	    // only DraggableHTMLFeatures and descendants should have track.edge_matchin_enabled
            if (target_track && target_track.store && target_track.edge_matching_enabled)  {
                if (verbose_edges)  {
                    console.log("edge matching for: " + target_track.name);
                }

                var featureStore = target_track.store;

                // only look at features that overlap source_feat min/max
                // NCList.iterate only calls function for features that overlap qmin/qmax coords
		var query =  { ref: target_track.refSeq.name, start: qmin, end: qmax };
                featureStore.getFeatures(query, function(target_feat, path) {
		    // some stores invoke the callback (with target_feat = undefined) even if no features meet query, so catching this case
		    if (! target_feat)  { return; }  
                    if (verbose_edges)  {  console.log("========="); console.log("checking feature: "); console.log(target_feat); }
                    var target_subfeats = target_feat.get('subfeatures');
                    if (! target_subfeats) {
                        target_subfeats = [ target_feat ];
                    }
                    if (verbose_edges)  { console.log(target_subfeats); }

                    if (source_subfeats instanceof Array &&
                        target_subfeats instanceof Array)  {
                        var tid = target_feat.id();
                        if (verbose_edges)  {  console.log("found overlap"); console.log(target_feat); }
                        if (tid)  {
                            var tdiv = target_track.getFeatDiv(target_feat);
                            if (verbose_edges)  { console.log(tdiv); }
                            if (tdiv)  {  // only keep going if target feature.uid already populated
                                // console.log(rsubdivs);
                                for (var i=0; i < source_subfeats.length; i++)  {
                                    var ssfeat = source_subfeats[i];
                                    var sstype = ssfeat.get('type');
                                    // don't do matching for source features of type registered as unmatchable
                                    if (unmatchableTypes[sstype] || unedgeableTypes[sstype]) {
                                        continue;
                                    }

                                    var ssmin = ssfeat.get('start');
                                    var ssmax = ssfeat.get('end');
                                    for (var k=0; k < target_subfeats.length; k++)  {
                                        var tsfeat = target_subfeats[k];
                                        var tstype = tsfeat.get('type');
                                        // don't do matching for target features of type registered as unmatchable
                                        if (unmatchableTypes[tstype] || unedgeableTypes[tstype]) {
                                            continue;
                                        }
                                        var tsmin = tsfeat.get('start');
                                        var tsmax = tsfeat.get('end');
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




