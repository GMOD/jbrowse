define( [
    'dojo/_base/declare',
    'JBrowse/Store/Sequence/StaticChunked', 
    'WebApollo/View/Track/DraggableHTMLFeatures',
    'WebApollo/JSONUtils',
    'WebApollo/Permission',
    'JBrowse/CodonTable'
     ],
function( declare, StaticChunked, DraggableFeatureTrack, JSONUtils, Permission, CodonTable ) {

    var SequenceTrack = declare( "SequenceTrack", DraggableFeatureTrack,

{

/**
 * Track to display the underlying reference sequence, when zoomed in
 * far enough.
 * @class
 * @constructor
 */
    constructor: function( args ) {
	this.isWebApolloSequenceTrack = true;
	var track = this;

        /**
         * DraggableFeatureTrack now has its own context menu for divs,
         * and adding this flag provides a quick way to short-circuit it's
         * initialization
         */
        this.has_custom_context_menu = true;
	//        this.use_standard_context_menu = false;
        this.show_reverse_strand = true;
        this.show_protein_translation = true;
        this.context_path = "..";

        this.residues_context_menu = new dijit.Menu({});  // placeholder till setAnnotTrack() triggers real menu init
        this.annot_context_menu = new dijit.Menu({});     // placeholder till setAnnotTrack() triggers real menu init

        this.residuesMouseDown = function(event) {
            track.onResiduesMouseDown(event);
        };

	this.charSize = this.gview.getSequenceCharacterSize();
	this.charWidth = this.charSize.charWidth;
	this.seqHeight = this.charSize.seqHeight;

	// splitting seqHeight into residuesHeight and translationHeight, so future iteration may be possible 
	//    for DNA residues and protein translation to be different styles
	this.dnaHeight = this.seqHeight;
	this.proteinHeight = this.seqHeight;

	// this.refSeq = refSeq;  already assigned in BlockBased superclass

	var seqStoreConfig = dojo.clone(this.config);
	seqStoreConfig.urlTemplate = this.config.residuesUrlTemplate;
	seqStoreConfig.browser = this.browser;
	seqStoreConfig.refSeq = this.refSeq;

	this.sequenceStore = new StaticChunked(seqStoreConfig);

        this.trackPadding = 10;
        this.SHOW_IF_FEATURES = true;
        // this.setLoaded();
	//	this.initContextMenu();

	var atrack = this.getAnnotTrack();
	console.log("in SequenceTrack constructor, annotation track = ", atrack);
	if (atrack)  { 
	    console.log("in SequenceTrack constructor, found AnnotTrack: ", atrack);
	    this.setAnnotTrack(atrack); 
	}  
    },

// annotSelectionManager is class variable (shared by all AnnotTrack instances)
// SequenceTrack.seqSelectionManager = new FeatureSelectionManager();

// setting up selection exclusiveOr --
//    if selection is made in annot track, any selection in other tracks is deselected, and vice versa,
//    regardless of multi-select mode etc.
// SequenceTrack.seqSelectionManager.addMutualExclusion(DraggableFeatureTrack.selectionManager);
// SequenceTrack.seqSelectionManager.addMutualExclusion(AnnotTrack.annotSelectionManager);
//DraggableFeatureTrack.selectionManager.addMutualExclusion(SequenceTrack.seqSelectionManager);

//    loadSuccess: function(trackInfo)  { }  // loadSuccess no longer called by track initialization/loading
    _defaultConfig: function() {
	var thisConfig = this.inherited(arguments);
	// nulling out menuTemplate to suppress default JBrowse feature contextual menu
	thisConfig.menuTemplate = null;
	thisConfig.maxFeatureScreenDensity = 100000; // set rediculously high, ensures will never show "zoomed too far out" placeholder
	thisConfig.style.renderClassName = null;
	thisConfig.style.arrowheadClass = null;
	thisConfig.style.centerChildrenVertically = false;
	return thisConfig;
    },


    /**
     * called by AnnotTrack to initiate sequence alterations load
     */
    loadSequenceAlterations: function() {
        var track = this;

        /**
         *    now do XHR to WebApollo AnnotationEditorService for "get_sequence_alterations"
         */
        dojo.xhrPost( {
    	                  postData: '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "operation": "get_sequence_alterations" }',
    	                  url: track.context_path + "/AnnotationEditorService",
    	                  handleAs: "json",
    	                  timeout: 5 * 1000, // Time in milliseconds
    	                  // The LOAD function will be called on a successful response.
    	                  load: function(response, ioArgs) { //
			      console.log("SequenceTrack get_sequence_alterations response: ");
			      console.log(response);
    		              var responseFeatures = response.features;
    		              for (var i = 0; i < responseFeatures.length; i++) {
    			          var jfeat = JSONUtils.createJBrowseSequenceAlteration(responseFeatures[i]);
    			          track.store.insert(jfeat);
    		              }
    	                      track.featureCount = track.storedFeatureCount();
    	                      if (track.SHOW_IF_FEATURES && track.featureCount > 0) {
    	    	                  track.show();
    	                      }
    	                      else {
    	    	                  track.hide();
    	                      }
    		              // track.hideAll();  shouldn't need to call hideAll() before changed() anymore
    		              track.changed();
    	                  },
    	                  // The ERROR function will be called in an error case.
    	                  error: function(response, ioArgs) { //
			      
    		              return response; //
    	                  }
                      });
    },

    startZoom: function(destScale, destStart, destEnd) {
        // would prefer to only try and hide dna residues on zoom if previous scale was at base pair resolution
        //   (otherwise there are no residues to hide), but by time startZoom is called, pxPerBp is already set to destScale,
        //    so would require keeping prevScale var around, or passing in prevScale as additional parameter to startZoom()
        // so for now just always trying to hide residues on a zoom, whether they're present or not

        // if (prevScale == this.charWidth) {

        $(".dna-residues", this.div).css('display', 'none');
        $(".block-seq-container", this.div).css('height', '20px');
        // }
        this.heightUpdate(20);
        this.gview.trackHeightUpdate(this.name, Math.max(this.labelHeight, 20));
    },

    endZoom: function(destScale, destBlockBases) {
        var charSize = this.getCharacterMeasurements();

        if( ( destScale == charSize.w ) ||
	    (this.SHOW_IF_FEATURES && this.featureCount > 0) ) {
	    this.show();
        }
        else  {
	    this.hide();
        }
        this.clear();
        //    this.prevScale = destScale;
    },

    /*
     * SequenceTrack.prototype.showRange = function(first, last, startBase, bpPerBlock, scale,
     containerStart, containerEnd) {
     console.log("called SequenceTrack.showRange():");
     console.log({ first: first, last: last, startBase: startBase, bpPerBloc: bpPerBlock, scale: scale,
     containerStart: containerStart, containerEnd: containerEnd });
     DraggableFeatureTrack.prototype.showRange.apply(this, arguments);
     };
     */

    setViewInfo: function( genomeView, numBlocks,
                           trackDiv, labelDiv,
                           widthPct, widthPx, scale ) {

        this.inherited( arguments );

        var charSize = this.getCharacterMeasurements();

        if ( (scale == charSize.w ) ||
	    (this.SHOW_IF_FEATURES && this.featureCount > 0) ) {
            this.show();
        } else {
            this.hide();
            this.heightUpdate(0);
        }
        this.setLabel( this.key );
    },

    /**
     * @returns {Object} containing <code>h</code> and <code>w</code>,
     *      in pixels, of the characters being used for sequences
     */
    getCharacterMeasurements: function() {
        if( !this._measurements )
            this._measurements = this._measureSequenceCharacterSize( this.div );
        return this._measurements;
    },

    /**
     * Conducts a test with DOM elements to measure sequence text width
     * and height.
     */
    _measureSequenceCharacterSize: function( containerElement ) {
        var widthTest = document.createElement("div");
        widthTest.className = "wa-sequence";
        widthTest.style.visibility = "hidden";
        var widthText = "12345678901234567890123456789012345678901234567890";
        widthTest.appendChild(document.createTextNode(widthText));
        containerElement.appendChild(widthTest);
        var result = {
            w:  widthTest.clientWidth / widthText.length,
            h: widthTest.clientHeight
        };
        containerElement.removeChild(widthTest);
        return result;
  },


    /**
     *   GAH
     *   not entirely sure, but I think this strategy of calling getRange() only works as long as
     *   seq chunk sizes are a multiple of block sizes
     *   or in other words for a given block there is only one chunk that overlaps it
     *      (otherwise in the callback would need to fiddle with horizontal position of seqNode within the block) ???
     */
    fillBlock: function( args ) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;
        var containerStart = args.containerStart;
        var containerEnd = args.containerEnd;

        var verbose = false;
        // test block for diagnostics
        // var verbose = (leftBase === 245524);

        var fillArgs = arguments;
        var track = this;
        var charSize = this.getCharacterMeasurements();
        if ((scale == charSize.w) ||
    	(this.SHOW_IF_FEATURES && this.featureCount > 0) ) {
            this.show();
        } else {
            this.hide();
            this.heightUpdate(0);
        }
        var blockHeight = 0;

        if (this.shown) {
            // make a div to contain the sequences
            var seqNode = document.createElement("div");
            seqNode.className = "wa-sequence";
    	    // seq_block_container style sets width = 100%, so seqNode fills the block width
    	    //    regardless of whether holding residue divs or not
    	    $(seqNode).addClass("block-seq-container");
    	    block.appendChild(seqNode);

    	    var slength = rightBase - leftBase;

    	    // just always add two base pairs to front and end,
    	    //    to make sure can do three-frame translation across for every base position in (leftBase..rightBase),
    	    //    both forward (need tw pairs on end) and reverse (need 2 extra bases at start)
    	    var leftExtended = leftBase - 2;
    	    var rightExtended = rightBase + 2;

            var dnaHeight     = charSize.h;
            var proteinHeight = charSize.h;

    	    if ( scale == charSize.w ) {
                // this.sequenceStore.getRange( this.refSeq, leftBase, rightBase,
                //  this.sequenceStore.getRange( this.refSeq, leftBase, endBase,
            //    this.store.getFeatures(
		this.sequenceStore.getFeatures(
                    { ref: this.refSeq.name, start: leftExtended, end: rightExtended },
    		    function( feat ) {
                        var start = feat.get('start');
                        var end   = feat.get('end');
                        var seq   = feat.get('seq');

    		        // fill with leading blanks if the
    		        // sequence does not extend all the way
    		        // across our range
    		        for( ; start < 0; start++ ) {
    			    seq = SequenceTrack.nbsp + seq; //nbsp is an "&nbsp;" entity
    		        }

    		        var blockStart = start + 2;
    		        var blockEnd = end - 2;
    		        var blockResidues = seq.substring(2, seq.length-2);
    		        var blockLength = blockResidues.length;
    		        var extendedStart = start;
    		        var extendedEnd = end;
    		        var extendedStartResidues = seq.substring(0, seq.length-2);
    		        var extendedEndResidues = seq.substring(2);

    		        if (verbose)  {
    			    console.log("seq: " + seq + ", length: " + seq.length);
    			    console.log("blockResidues: " + blockResidues + ", length: " + blockResidues.length);
    			    console.log("extendedStartResidues: " + extendedStartResidues + ", length: " + extendedStartResidues.length);
    			    console.log("extendedEndResidues: " + extendedEndResidues + ", length: " + extendedEndResidues.length);
    		        }

    		        if (track.show_protein_translation) {
    			    var framedivs = [];
    			    for (var i=0; i<3; i++) {
    			        // var tstart = start + i;
    			        var tstart = blockStart + i;
    			        var frame = tstart % 3;
     			        if (verbose) { console.log("  forward translating: offset = " + i + ", frame = " + frame); }
    			        var transProtein = track.renderTranslation( extendedEndResidues, i, blockLength);
    			        // if coloring CDS in feature tracks by frame, use same "cds-frame" styling,
    			        //    otherwise use more muted "frame" styling
    			        if (track.webapollo.colorCdsByFrame) {
    			            $(transProtein).addClass("cds-frame" + frame);
    			        }
    			        else  {
    			            $(transProtein).addClass("frame" + frame);
    			        }
    			        framedivs[frame] = transProtein;
    			    }
    			    for (var i=2; i>=0; i--) {
    			        var transProtein = framedivs[i];
    			        seqNode.appendChild(transProtein);
    			        $(transProtein).bind("mousedown", track.residuesMouseDown);
    			        blockHeight += proteinHeight;
    			    }
    		        }

    		        /*
      		         var dnaContainer = document.createElement("div");
    		         $(dnaContainer).addClass("dna-container");
    		         seqNode.appendChild(dnaContainer);
    		         */

    		        // add a div for the forward strand
    		        var forwardDNA = track.renderResidues( blockResidues );
    		        $(forwardDNA).addClass("forward-strand");
    		        seqNode.appendChild( forwardDNA );


                        /*                     could force highlighting on mouseenter in additona to mousemove,
                         but mousemove seems to always be fired anyway when there's a mouseenter
      		         $(forwardDNA).bind("mouseenter", function(event) {
    			 track.removeTextHighlight(element);
    	                 } );
                         */


    		        // dnaContainer.appendChild(forwardDNA);
    		        track.residues_context_menu.bindDomNode(forwardDNA);
    		        $(forwardDNA).bind("mousedown", track.residuesMouseDown);
    		        blockHeight += dnaHeight;

    		        if (track.show_reverse_strand) {
    			    // and one for the reverse strand
    			    // var reverseDNA = track.renderResidues( start, end, track.complement(seq) );
    			    var reverseDNA = track.renderResidues( track.complement(blockResidues) );
    			    $(reverseDNA).addClass("reverse-strand");
    			    seqNode.appendChild( reverseDNA );
    			    // dnaContainer.appendChild(reverseDNA);
    			    track.residues_context_menu.bindDomNode(reverseDNA);
    			    $(reverseDNA).bind("mousedown", track.residuesMouseDown);
    			    blockHeight += dnaHeight;
    		        }

    		        // set up highlighting of base pair underneath mouse
    		        $(forwardDNA).bind("mouseleave", function(event) {
    			                       track.removeTextHighlight(forwardDNA);
    			                       if (reverseDNA) { track.removeTextHighlight(reverseDNA); }
    			                       track.last_dna_coord = undefined;
    		                           } );
    		        $(forwardDNA).bind("mousemove", function(event) {
    	                                       var gcoord = track.getGenomeCoord(event);
    			                       if ((!track.last_dna_coord) || (gcoord !== track.last_dna_coord)) {
    			                           var blockCoord = gcoord - leftBase;
    			                           track.last_dna_coord = gcoord;
    			                           track.setTextHighlight(forwardDNA, blockCoord, blockCoord, "dna-highlighted");
    			                           if (!track.freezeHighlightedBases) {
    			                               track.lastHighlightedForwardDNA = forwardDNA;
    			                           }
    			                           if (reverseDNA)  {
    			                               track.setTextHighlight(reverseDNA, blockCoord, blockCoord, "dna-highlighted");
    			                               if (!track.freezeHighlightedBases) {
    			                                   track.lastHighlightedReverseDNA = reverseDNA;
    			                               }
    			                           }
    			                       }
    		                           } );
    		        if (reverseDNA) {
    			    $(reverseDNA).bind("mouseleave", function(event) {
    			                           track.removeTextHighlight(forwardDNA);
    			                           track.removeTextHighlight(reverseDNA);
    			                           track.last_dna_coord = undefined;
    		                               } );
    			    $(reverseDNA).bind("mousemove", function(event) {
    			                           var gcoord = track.getGenomeCoord(event);
    			                           if ((!track.last_dna_coord) || (gcoord !== track.last_dna_coord)) {
    			                               var blockCoord = gcoord - leftBase;
    			                               track.last_dna_coord = gcoord;
    			                               track.setTextHighlight(forwardDNA, blockCoord, blockCoord, "dna-highlighted");
    			                               track.setTextHighlight(reverseDNA, blockCoord, blockCoord, "dna-highlighted");
    			                               if (!track.freezeHighlightedBases) {
    			                                   track.lastHighlightedForwardDNA = forwardDNA;
    			                                   track.lastHighlightedReverseDNA = reverseDNA;
    			                               }
    			                           }
    		                               } );
    		        }

    		        if (track.show_protein_translation && track.show_reverse_strand) {
    			    var extendedReverseComp = track.reverseComplement(extendedStartResidues);
    			    if (verbose)  { console.log("extendedReverseComp: " + extendedReverseComp); }
    			    var framedivs = [];
    			    for (var i=0; i<3; i++) {
    			        var tstart = blockStart + i;
    			        // var frame = tstart % 3;
    			        var frame = (track.refSeq.length - blockEnd + i) % 3;
    			        // frame = (frame + (3 - (track.refSeq.length % 3))) % 3;
    			        frame = (Math.abs(frame - 2) + (track.refSeq.length % 3)) % 3;
    			        var transProtein = track.renderTranslation( extendedStartResidues, i, blockLength, true);
    			        if (track.webapollo.colorCdsByFrame) {
    			            $(transProtein).addClass("cds-frame" + frame);
    			        }
    			        else  {
    			            $(transProtein).addClass("frame" + frame);
    			        }
    			        framedivs[frame] = transProtein;
    			    }
    			    // for (var i=2; i>=0; i--) {
    			    for (var i=0; i<3; i++) {
    			        var transProtein = framedivs[i];
    			        seqNode.appendChild(transProtein);
    			        $(transProtein).bind("mousedown", track.residuesMouseDown);
    			        blockHeight += proteinHeight;
    			    }
    		        }
//    	                DraggableFeatureTrack.prototype.fillBlock.apply(track, fillArgs);
//			dojo.hitch ???
			track.inherited("fillBlock", fillArgs);
    		        blockHeight += 5;  // a little extra padding below (track.trackPadding used for top padding)
    	                // this.blockHeights[blockIndex] = blockHeight;  // shouldn't be necessary, done in track.heightUpdate();
    		        track.heightUpdate(blockHeight, blockIndex);
    		    },
                    function() {}
    	        );
    	    }
    	    else  {
    	        blockHeight = 20;  // default dna track height if not zoomed to base level
    	        seqNode.style.height = "20px";

    	        // DraggableFeatureTrack.prototype.fillBlock.apply(track, arguments);
		track.inherited("fillBlock", arguments);
		// this.inherited("fillBlock", arguments);

    	        // this.blockHeights[blockIndex] = blockHeight;  // shouldn't be necessary, done in track.heightUpdate();
    	        track.heightUpdate(blockHeight, blockIndex);
    	    }
        } else {
            this.heightUpdate(0, blockIndex);
        }
                         },

    // heightUpdate: function(height, blockIndex)  {
    //     // console.log("SequenceTrack.heightUpdate: height = " + height + ", bindex = " + blockIndex);
    //     DraggableFeatureTrack.prototype.heightUpdate.call(this, height, blockIndex);
    // };

    addFeatureToBlock: function( feature, uniqueId, block, scale, labelScale, descriptionScale, 
                                 containerStart, containerEnd ) {
        var featDiv =
            this.renderFeature(feature, uniqueId, block, scale, labelScale, descriptionScale, containerStart, containerEnd);
        $(featDiv).addClass("sequence-alteration");

        var charSize = this.getCharacterMeasurements();

        var seqNode = $("div.wa-sequence", block).get(0);
        // var seqNode = $("div.dna-container", block).get(0);
        featDiv.style.top = "0px";
        var ftype = feature.get("type");
        if (ftype) {
    	if (ftype == "deletion") {

    	}
    	else if (ftype == "insertion") {
    	    if ( scale == charSize.w ) {
    		var container  = document.createElement("div");
    		var residues = feature.get("residues");
    		$(container).addClass("dna-residues");
    		container.appendChild( document.createTextNode( residues ) );
    		container.style.position = "absolute";
    		container.style.top = "-16px";
    		container.style.border = "2px solid #00CC00";
    		container.style.backgroundColor = "#AAFFAA";
    		featDiv.appendChild(container);
    	    }
    	    else  {
    		//
    	    }
    	}
    	else if ((ftype == "substitution")) {
    	    if ( scale == charSize.w ) {
    		var container  = document.createElement("div");
    		var residues = feature.get("residues");
    		$(container).addClass("dna-residues");
    		container.appendChild( document.createTextNode( residues ) );
    		container.style.position = "absolute";
    		container.style.top = "-16px";
    		container.style.border = "1px solid black";
    		container.style.backgroundColor = "#FFF506";
    		featDiv.appendChild(container);
    	    }
    	    else  {

    	    }
    	}
        }
        seqNode.appendChild(featDiv);
	return featDiv;
    },

    /**
     *  overriding renderFeature to add event handling right-click context menu
     */
    renderFeature: function( feature, uniqueId, block, scale, labelScale, descriptionScale, 
			     containerStart, containerEnd ) {
        // var track = this;
       // var featDiv = DraggableFeatureTrack.prototype.renderFeature.call(this, feature, uniqueId, block, scale,

	var featDiv = this.inherited( arguments );

        if (featDiv && featDiv != null)  {
    	    this.annot_context_menu.bindDomNode(featDiv);
        }
        return featDiv;
    },

    reverseComplement: function(seq) {
        return this.reverse(this.complement(seq));
    },

    reverse: function(seq) {
        return seq.split("").reverse().join("");
    },

    complement: (function() {
		     var compl_rx   = /[ACGT]/gi;

		     // from bioperl: tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/
		     // generated with:
		     // perl -MJSON -E '@l = split "","acgtrymkswhbvdnxACGTRYMKSWHBVDNX"; print to_json({ map { my $in = $_; tr/acgtrymkswhbvdnxACGTRYMKSWHBVDNX/tgcayrkmswdvbhnxTGCAYRKMSWDVBHNX/; $in => $_ } @l})'
		     var compl_tbl  = {"S":"S","w":"w","T":"A","r":"y","a":"t","N":"N","K":"M","x":"x","d":"h","Y":"R","V":"B","y":"r","M":"K","h":"d","k":"m","C":"G","g":"c","t":"a","A":"T","n":"n","W":"W","X":"X","m":"k","v":"b","B":"V","s":"s","H":"D","c":"g","D":"H","b":"v","R":"Y","G":"C"};

		     var compl_func = function(m) { return compl_tbl[m] || SequenceTrack.nbsp; };
		     return function( seq ) {
			 return seq.replace( compl_rx, compl_func );
		     };
		 })(),

    //given the start and end coordinates, and the sequence bases, makes a
    //div containing the sequence
    // SequenceTrack.prototype.renderResidues = function ( start, end, seq ) {
    renderResidues: function ( seq ) {
        var container  = document.createElement("div");
        $(container).addClass("dna-residues");
        container.appendChild( document.createTextNode( seq ) );
        return container;
    },

    /** end is ignored, assume all of seq is translated (except any extra bases at end) */
    renderTranslation: function ( input_seq, offset, blockLength, reverse) {
        var verbose = false;
        // sequence of diagnostic block
        //    var verbose = (input_seq === "GTATATTTTGTACGTTAAAAATAAAAA" || input_seq === "GCGTATATTTTGTACGTTAAAAATAAA" );
        var seq;
        if (reverse) {
	    seq = this.reverseComplement(input_seq);
	    if (verbose) { console.log("revcomped, input: " + input_seq + ", output: " + seq); }
        }
        else  {
	    seq = input_seq;
        }
        var container  = document.createElement("div");
        $(container).addClass("dna-residues");
        $(container).addClass("aa-residues");
        $(container).addClass("offset" + offset);
        var prefix = "";
        var suffix = "";
        for (var i=0; i<offset; i++) { prefix += SequenceTrack.nbsp; }
        for (var i=0; i<(2-offset); i++) { suffix += SequenceTrack.nbsp; }

        var extra_bases = (seq.length - offset) % 3;
        var dnaRes = seq.substring(offset, seq.length - extra_bases);
        if (verbose)  { console.log("to translate: " + dnaRes + ", length = " + dnaRes.length); }
        var aaResidues = dnaRes.replace(/(...)/gi,  function(codon) {
				            var aa = CodonTable[codon];
			                    // if no mapping and blank in codon, return blank
				            // if no mapping and no blank in codon,  return "?"
				            if (!aa) {
					        if (codon.indexOf(SequenceTrack.nbsp) >= 0) { aa = SequenceTrack.nbsp; }
					        else  { aa = "?"; }
				            }
				            return prefix + aa + suffix;
				            // return aa;
				        } );
        var trimmedAaResidues = aaResidues.substring(0, blockLength);
        if (verbose)  { console.log("AaLength: " + aaResidues.length + ", trimmedAaLength = " + trimmedAaResidues.length); }
        aaResidues = trimmedAaResidues;
        if (reverse) {
	    var revAaResidues = this.reverse(aaResidues);
	    if (verbose) { console.log("reversing aa string, input: \"" + aaResidues + "\", output: \"" + revAaResidues + "\""); }
	    aaResidues = revAaResidues;
	    while (aaResidues.length < blockLength)  {
	        aaResidues = SequenceTrack.nbsp + aaResidues;
	    }
        }
        container.appendChild( document.createTextNode( aaResidues ) );
        return container;
    },

    onResiduesMouseDown: function(event)  {
        this.last_mousedown_event = event;
    },

    onFeatureMouseDown: function(event) {
        // _not_ calling DraggableFeatureTrack.prototyp.onFeatureMouseDown --
        //     don't want to allow dragging (at least not yet)
        // event.stopPropagation();
        this.last_mousedown_event = event;
        var ftrack = this;
        if (ftrack.verbose_selection || ftrack.verbose_drag)  {
	    console.log("SequenceTrack.onFeatureMouseDown called");
        }
        this.handleFeatureSelection(event);
    },

    initContextMenu: function() {
        var thisObj = this;
        thisObj.contextMenuItems = new Array();
        thisObj.annot_context_menu = new dijit.Menu({});

         var index = 0;
        if (this.annotTrack.permission & Permission.WRITE) {
        	thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
        		label: "Delete",
        		onClick: function() {
        			thisObj.deleteSelectedFeatures();
        		}
        	} ));
        	thisObj.contextMenuItems["delete"] = index++;
        }
        thisObj.annot_context_menu.addChild(new dijit.MenuItem( {
        	label: "Information",
        	onClick: function(event) {
        		thisObj.getInformation();
        	}
        } ));

        thisObj.contextMenuItems["information"] = index++;

        thisObj.annot_context_menu.onOpen = function(event) {
        	// keeping track of mousedown event that triggered annot_context_menu popup,
        	//   because need mouse position of that event for some actions
        	thisObj.annot_context_mousedown = thisObj.last_mousedown_event;
        	// if (thisObj.permission & Permission.WRITE) { thisObj.updateMenu(); }
    		dojo.forEach(this.getChildren(), function(item, idx, arr) {
    			if (item._setSelected)  { item._setSelected(false); }  // test for function existence first
    			if (item._onUnhover)  { item._onUnhover(); }  // test for function existence first
    		});
        };

        /**
         *   context menu for right click on sequence residues
         */
        thisObj.residuesMenuItems = new Array();
        thisObj.residues_context_menu = new dijit.Menu({});
        index = 0;

        thisObj.residuesMenuItems["toggle_reverse_strand"] = index++;
        thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
        		label: "Toggle Reverse Strand",
        		onClick: function(event) {
    		    thisObj.show_reverse_strand = ! thisObj.show_reverse_strand;
    		    thisObj.clearHighlightedBases();
    		    // thisObj.hideAll();  shouldn't need to call hideAll() before changed() anymore
    		    thisObj.changed();
        		    // thisObj.toggleReverseStrand();
        		}
        	} ));

        thisObj.residuesMenuItems["toggle_protein_translation"] = index++;
        thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
        		label: "Toggle Protein Translation",
        		onClick: function(event) {
    		    thisObj.show_protein_translation = ! thisObj.show_protein_translation;
    		    thisObj.clearHighlightedBases();
    		    // thisObj.hideAll();  shouldn't need to call hideAll() before changed() anymore
    		    thisObj.changed();
        		    // thisObj.toggleProteinTranslation();
        		}
        	} ));


        if (this.annotTrack.permission & Permission.WRITE) {

    	thisObj.residues_context_menu.addChild(new dijit.MenuSeparator());
        	thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
        		label: "Create Genomic Insertion",
        		onClick: function() {
        			thisObj.freezeHighlightedBases = true;
        			thisObj.createGenomicInsertion();
        		}
        	} ));
        	thisObj.residuesMenuItems["create_insertion"] = index++;
        	thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
        		label: "Create Genomic Deletion",
        		onClick: function(event) {
        			thisObj.freezeHighlightedBases = true;
        			thisObj.createGenomicDeletion();
        		}
        	} ));
        	thisObj.residuesMenuItems["create_deletion"] = index++;

        	thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
        		label: "Create Genomic Substitution",
        		onClick: function(event) {
        			thisObj.freezeHighlightedBases = true;
        			thisObj.createGenomicSubstitution();
        		}
        	} ));
        	thisObj.residuesMenuItems["create_substitution"] = index++;
        }
        /*
    	thisObj.residues_context_menu.addChild(new dijit.MenuItem( {
    		label: "..."
    	}
    	));
    	*/

    	thisObj.residues_context_menu.onOpen = function(event) {
    		// keeping track of mousedown event that triggered residues_context_menu popup,
    		//   because need mouse position of that event for some actions
    		thisObj.residues_context_mousedown = thisObj.last_mousedown_event;
    		// if (thisObj.permission & Permission.WRITE) { thisObj.updateMenu() }
    		dojo.forEach(this.getChildren(), function(item, idx, arr) {
    		     if (item._setSelected) { item._setSelected(false); }
    	             if (item._onUnhover) { item._onUnhover(); }
    		});

    		thisObj.freezeHighlightedBases = true;

    	};

    	thisObj.residues_context_menu.onBlur = function() {
    		thisObj.freezeHighlightedBases = false;
    	};

    	thisObj.residues_context_menu.onClose = function(event) {
    		if (!thisObj.freezeHighlightedBases) {
    			thisObj.clearHighlightedBases();
    		}
    	};

        thisObj.annot_context_menu.startup();
        thisObj.residues_context_menu.startup();
    },

    getUniqueTrackName: function() {
        return this.name + "-" + this.refSeq.name;
    },

    createGenomicInsertion: function()  {
        var gcoord = this.getGenomeCoord(this.residues_context_mousedown);
        console.log("SequenceTrack.createGenomicInsertion() called at genome position: " + gcoord);

        var content = this.createAddSequenceAlterationPanel("insertion", gcoord);
        this.annotTrack.openDialog("Add Insertion", content);

    /*
    var track = this;
    var features = '[ { "uniquename": "insertion-' + gcoord + '","location": { "fmin": ' + gcoord + ', "fmax": ' + gcoord + ', "strand": 1 }, "residues": "A", "type": {"name": "insertion", "cv": { "name":"SO" } } } ]';
	dojo.xhrPost( {
		postData: '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "features": ' + features + ', "operation": "add_sequence_alteration" }',
		url: context_path + "/AnnotationEditorService",
		handleAs: "json",
		timeout: 5000, // Time in milliseconds
		// The LOAD function will be called on a successful response.
		load: function(response, ioArgs) {
		},
		// The ERROR function will be called in an error case.
		error: function(response, ioArgs) { //
			return response;
		}
	});
	*/

    },

    createGenomicDeletion: function()  {
        var gcoord = this.getGenomeCoord(this.residues_context_mousedown);
        console.log("SequenceTrack.createGenomicDeletion() called at genome position: " + gcoord);

        var content = this.createAddSequenceAlterationPanel("deletion", gcoord);
        this.annotTrack.openDialog("Add Deletion", content);

    },

    createGenomicSubstitution: function()  {
        var gcoord = this.getGenomeCoord(this.residues_context_mousedown);
        console.log("SequenceTrack.createGenomicSubstitution() called at genome position: " + gcoord);
        var content = this.createAddSequenceAlterationPanel("substitution", gcoord);
        this.annotTrack.openDialog("Add Substitution", content);
    },

    deleteSelectedFeatures: function()  {
        console.log("SequenceTrack.deleteSelectedFeatures() called");
        var selected = this.selectionManager.getSelection();
        this.selectionManager.clearSelection();
        this.requestDeletion(selected);
    },

    requestDeletion: function(selected)  {
        console.log("SequenceTrack.requestDeletion called");
        console.log(selected);
        var track = this;
        var features = "[ ";
        for (var i = 0; i < selected.length; ++i) {
    	    var annot = selected[i].feature;
    	    if (i > 0) {
    		features += ", ";
    	    }
    	    features += '{ "uniquename": "' + annot.id() + '" }';
        }
        features += "]";
        var postData = '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "features": ' + features + ', "operation": "delete_sequence_alteration" }';
        track.annotTrack.executeUpdateOperation(postData);
    },

    getInformation: function()  {
        console.log("SequenceTrack.getInformation() called");
    },

    /**
     * sequence alteration annotation ADD command received by a ChangeNotificationListener,
     *      so telling SequenceTrack to add to it's SeqFeatureStore
     */
    annotationsAddedNotification: function(responseFeatures)  {
        console.log("SequenceTrack.annotationsAddedNotification() called");
        var track = this;
        // add to store
        for (var i = 0; i < responseFeatures.length; ++i) {
            var feat = JSONUtils.createJBrowseSequenceAlteration( responseFeatures[i] );
            var id = responseFeatures[i].uniquename;
	    if (! this.store.getFeatureById(id))  {
                this.store.insert(feat);
            }
        }
        track.featureCount = track.storedFeatureCount();
        if (this.SHOW_IF_FEATURES && this.featureCount > 0) {
    	    this.show();
        }
        else {
    	    this.hide();
        }
        // track.hideAll();   shouldn't need to call hideAll() before changed() anymore
        track.changed();
    },

    /**
     * sequence alteration annotation DELETE command received by a ChangeNotificationListener,
     *      so telling SequenceTrack to remove from it's SeqFeatureStore
     */
    annotationsDeletedNotification: function(annots)  {
        console.log("SequenceTrack.removeSequenceAlterations() called");
        var track = this;
        // remove from SeqFeatureStore
        for (var i = 0; i < annots.length; ++i) {
	    var id_to_delete = annots[i].uniquename;
            this.store.deleteFeatureById(id_to_delete);
        }
        track.featureCount = track.storedFeatureCount();
        if (this.SHOW_IF_FEATURES && this.featureCount > 0) {
    	    this.show();
        }
        else {
    	    this.hide();
        }
        // track.hideAll();   shouldn't need to call hideAll() before changed() anymore
        track.changed();
    },

    /*
     *  sequence alteration UPDATE command received by a ChangeNotificationListener
     *  currently handled as if receiving DELETE followed by ADD command
     */
    annotationsUpdatedNotification: function(annots)  {
	this.annotationsDeletedNotification(annots);
	this.annotationAddedNotification(annots);
    },
    
    storedFeatureCount: function(start, end)  {
        // get accurate count of features loaded (should do this within the XHR.load() function
        var track = this;
        if (start == undefined) {
            //    	start = 0;
    	    start = track.refSeq.start;
        }
        if (end == undefined) {
            //    	end = track.refSeq.length;
    	    end = track.refSeq.end;
        }
        var count = 0;
        track.store.getFeatures({ ref: track.refSeq.name, start: start, end: end}, function() { count++; });
        return count;
    },

    createAddSequenceAlterationPanel: function(type, gcoord) {
	var track = this;
	var content = dojo.create("div");
	var inputDiv = dojo.create("div", { }, content);
	var inputLabel = dojo.create("label", { innerHTML: type == "deletion" ? "Length" : "Sequence", className: "sequence_alteration_input_label" }, inputDiv);
	var inputField = dojo.create("input", { type: "text", size: 10, className: "sequence_alteration_input_field" }, inputDiv);
	var buttonDiv = dojo.create("div", { className: "sequence_alteration_button_div" }, content);
	var addButton = dojo.create("button", { innerHTML: "Add", className: "sequence_alteration_button" }, buttonDiv);

	var addSequenceAlteration = function() {
	    var ok = true;
	    if (inputField.value.length == 0) {
	    	alert("Input cannot be empty for " + type);
	    	ok = false;
	    }
	    if (ok) {
	    	var input = inputField.value.toUpperCase();
	    	if (type == "deletion") {
	    		if (input.match(/\D/)) {
	    			alert("The length must be a number");
	    			ok = false;
	    		}
	    		else {
	    			input = parseInt(input);
	    			if (input <= 0) {
	    				alert("The length must be a positive number");
	    				ok = false;
	    			}
	    		}
	    	}
	    	else {
	    		if (input.match(/[^ACGT]/)) {
	    			alert("The sequence should only containg A, C, G, T");
	    			ok = false;
	    		}
	    	}
	    }
	    if (ok) {
	    	var fmin = gcoord;
	    	var fmax;
	    	if (type == "insertion") {
	    		fmax = gcoord;
	    	}
	    	else if (type == "deletion") {
	    		fmax = gcoord + parseInt(input);
	    	}
	    	else if (type == "substitution") {
	    		fmax = gcoord + input.length;;
	    	}
	    	if (track.storedFeatureCount(fmin, fmax == fmin ? fmin + 1 : fmax) > 0) {
	    		alert("Cannot create overlapping sequence alterations");
	    	}
	    	else {
	    		var feature = '"location": { "fmin": ' + fmin + ', "fmax": ' + fmax + ', "strand": 1 }, "type": {"name": "' + type + '", "cv": { "name":"sequence" } }';
	    		if (type != "deletion") {
	    			feature += ', "residues": "' + input + '"';
	    		}
	    		var features = '[ { ' + feature + ' } ]';
	    		var postData = '{ "track": "' + track.annotTrack.getUniqueTrackName() + '", "features": ' + features + ', "operation": "add_sequence_alteration" }';
	    		track.annotTrack.executeUpdateOperation(postData);
	    		track.annotTrack.popupDialog.hide();
	    	}
	    }
	};

	dojo.connect(inputField, "keypress", null, function(e) {
		var unicode = e.keyCode ? e.keyCode : e.charCode;
		if (unicode == 13) {
			addSequenceAlteration();
		}
	});

	dojo.connect(addButton, "onclick", null, function() {
		addSequenceAlteration();
	});

	return content;
    },

    handleError: function(response) {
	console.log("ERROR: ");
	console.log(response);  // in Firebug, allows retrieval of stack trace, jump to code, etc.
	console.log(response.stack);
	var error = eval('(' + response.responseText + ')');
	if (error && error.error) {
		alert(error.error);
		return;
	}
    },

    setAnnotTrack: function(annotTrack) {
	if (this.annotTrack)  { console.log("WARNING: SequenceTrack.setAnnotTrack called but annoTrack already set"); }
	this.annotTrack = annotTrack;
	this.initContextMenu();
	this.loadSequenceAlterations();
    },

    /*
     * Given an element that contains text, highlights a given range of the text
     * If called repeatedly, removes highlighting from previous call first
     *
     * Assumes there is no additional markup within element, just a text node
     *    (would like to eventually rewrite to remove this restriction?  Possibly could use HTML Range manipulation,
     *        i.e. range.surroundContents() etc. )
     *
     * optionally specify what class to use to indicate highlighting (defaults to "text-highlight")
     *
     * adapted from http://stackoverflow.com/questions/9051369/highlight-substring-in-element
     */
    setTextHighlight: function (element, start, end, classname) {
	if (this.freezeHighlightedBases) {
		return;
	}
        if (! classname) { classname = "text-highlight"; }
        var item = $(element);
        var str = item.data("origHTML");
        if (!str) {
            str = item.html();
            item.data("origHTML", str);
        }
        str = str.substr(0, start) +
            '<span class="' + classname + '">' +
            str.substr(start, end - start + 1) +
            '</span>' +
            str.substr(end + 1);
        item.html(str);
    },

    /*
     *  remove highlighting added with setTextHighlight
     */
    removeTextHighlight: function(element) {
	if (this.freezeHighlightedBases) {
	    return;
	}
        var item = $(element);
        var str = item.data("origHTML");
        if (str) {
	    item.html(str);
        }
    },

    clearHighlightedBases: function() {
	this.freezeHighlightedBases = false;
	this.removeTextHighlight(this.lastHighlightedForwardDNA);
	if (this.lastHighlightedReverseDNA) {
		this.removeTextHighlight(this.lastHighlightedReverseDNA);
	}
    }, 

    getAnnotTrack: function()  {
        if (this.annotTrack)  {
             return this.annotTrack;
        }
        else  {
            var tracks = this.gview.tracks;
            for (var i = 0; i < tracks.length; i++)  {
		// should be doing instanceof here, but class setup is not being cooperative
                if (tracks[i].isWebApolloAnnotTrack)  {
                    this.annotTrack = tracks[i];
		    console.log("In SequenceTrack, found WebApollo annotation track: ", this.annotTrack);
                    this.annotTrack.seqTrack = this;
                    break;
                }
            }
	}
	return this.annotTrack;
    }

});

    SequenceTrack.nbsp = String.fromCharCode(160);
    return SequenceTrack;
});

/*
 * highlightText is nice,
 * what would be _really_ good is a residue highlighter that works in genome coords, and
 *     does highlights across all blocks that overlap genome coord range
 * NOT YET IMPLEMENTED
 */
 /*SequenceTrack.prototype.highlightResidues = function(genomeStart, genomeEnd) {
}
*/

/*
 *  More efficient form
 *  residues_class is CSS class of residues:  forward, reverse, frame0, frame1, frame2, frameMinus1, frameMinus2, frameMinus3
 *  highlight_class is CSS class for the highlighted span
 *  ranges is an ordered array (min to max) of ranges, each range is itself an array of form [start, end] in genome coords
 *  ranges MUST NOT overlap
 *
 * assumes:
 *     ranges do not overlap
 *     any previous highlighting is removed (revert to raw residues before applying new highlighting)
 *
 *
 *  In implementation can insert span elements in reverse order, so that indexing into string is always accurate (not tripped up by span elements inserted farther upstream)
 *     will need to clamp to bounds of each block
 */
/*SequenceTrack.prototype.highlightResidues = function(highlight_class, residues_class, ranges) */
