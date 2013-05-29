define([
           'dojo/_base/declare',
           'dojo/dom-construct',
           'dojo/Deferred',
           'JBrowse/View/Track/BlockBased',
           'JBrowse/View/Track/HTMLFeatures',
           'JBrowse/Store/SeqFeature/Combination/TreeNode',
            'dojo/dnd/move',
           'dojo/dnd/Source',
           'JBrowse/Util'],
       function(
           declare,
           dom,
           Deferred,
           BlockBased,
           HTMLFeaturesTrack,
           TreeNode,
           dndMove,
           dndSource,
           Util
       ) {
return declare(BlockBased,
 /**
  * @lends JBrowse.View.Track.Combination.prototype
  */
{

    /**
     * 
     * 
     * @constructs
     */

    constructor: function( args ) {
        this.loaded = true;
        this.divClass = args.divClass || "combination";
        this.height = args.height;
        this.tracks = [];
        this.defaultOp = "AND";
        this.opTree = new TreeNode({ Value: this.defaultOp });
        this.key = "Combination track";

        this.innerTrack = undefined;
        this.innerDiv = undefined;
        this.counter = 0;
    },

    setViewInfo: function(genomeView, heightUpdate, numBlocks,
                         trackDiv,
                         widthPct, widthPx, scale) {
        this.inherited( arguments );
        this.scale = scale;

        this.dnd = new dndSource( this.div,
        {
          accept: ["track"], //Accepts only tracks
          withHandles: true,
          creator: dojo.hitch( this, function( trackConfig, hint ) {
              return {
                  data: trackConfig,
                  type: ["track"],
                  node: this.addTrack(trackConfig)
              };
          })
        });

    },

    addTrack: function(trackConfig) {
      this._addTrackStore(trackConfig.store);

      /* Returns nothing.  the dojo creator method requires a DOM node to be returned, but the use of all the promises
      /* Makes returning the actual div containing the combination track impractical.
      /* */
      var nothing = document.createTextNode("");
      return nothing;
    },

    treeIterate: function(tree) {
      //if(tree) alert(tree.get() + " " + tree.isLeaf() + " " + tree.leftChild + " " + tree.rightChild);
      if(!tree || tree === undefined){/*alert("HERE");*/ return "NULL";}
      if(tree.isLeaf()){/*alert("THERE" + tree.get());*/ return tree.get().name || tree.get();}
      //alert("EVERYWHERE");
      return "( " + this.treeIterate(tree.left()) +" "+ tree.get() +" " + this.treeIterate(tree.right()) +" )";

    },

    _addTrackStore: function(storeName) {
      var thisB = this;
      var haveStore = (function() {
        var d = new Deferred();
        thisB.browser.getStore(storeName, function(store) {
          if(store) {
            var storeNode = new TreeNode({Value: store});
            if(!thisB.opTree) { thisB.opTree = new TreeNode({Value: thisB.defaultOp});}
            if(!(thisB.opTree.add( storeNode ) ) ) {
              var opNode = new TreeNode({Value: thisB.defaultOp});
              opNode.add(thisB.opTree);
              opNode.add(storeNode);
              thisB.opTree = opNode;  
            }
            d.resolve(store,true);
          } else {
            d.reject("store " + storeName + " not found", true);
          }
        });
        return d.promise;
      })();
      haveStore.then(function(store){
        thisB._createCombinationStore();
      });
    },

    _createCombinationStore: function() {
      var d = new Deferred();
      var thisB = this;
      if(thisB.currentStore) thisB.browser.releaseStore(this.currentStore.name);
      var storeConf = {
          browser: thisB.browser,
          refSeq: thisB.browser.refSeq,
          type: 'JBrowse/Store/SeqFeature/Combination',
          opTree: thisB.opTree,
          op: thisB.defaultOp,
          storeNames: [] 
        };
      var storeName = thisB.browser._addStoreConfig(undefined, storeConf);
      storeConf.name = storeName;
      thisB.browser.getStore(storeName, function(store) {
        thisB.currentStore = store;
        d.resolve(true);
      });
      d.promise.then(function(){ thisB._renderCombinationTrack(); });
    },

    _renderCombinationTrack: function() {
      var thisB = this;
      if(thisB.currentStore) {
        // If the div for the inner track doesn't exist, create it.
        if(!this.innerDiv) {
          this.innerDiv = document.createElement("div");
          this.innerDiv.className = "track";
          this.innerDiv.id = "combination_innertrack";
          this.div.appendChild(this.innerDiv);

          // When the inner div is created, the outer menu should lose its label (so there won't be more than one label)
          if(this.label) {
            this.div.removeChild(this.label);
            this.label = undefined;
          }

        } else { // Otherwise we'll have to remove whatever track is currently in the div
          thisB.innerTrack.clear();
          thisB.innerTrack.destroy();
          while(thisB.innerDiv.firstChild) { // Use dojo.empty instead?
            thisB.innerDiv.removeChild(thisB.innerDiv.firstChild);
          }
        }
        thisB.innerTrack = new HTMLFeaturesTrack({
            label: "combination_track",
            key: this.key,
            browser: this.browser,
            refSeq: this.refSeq,
            store: thisB.currentStore,
            trackPadding: 0
        });
        thisB.innerTrack.setViewInfo (thisB.genomeView, thisB.heightUpdateCallback,
            thisB.numBlocks, thisB.innerDiv, thisB.widthPct, thisB.widthPx, thisB.scale);

        thisB.innerTrack.showRange (thisB.range.f, thisB.range.l, thisB.range.st, thisB.range.b,
          thisB.range.sc, thisB.range.cs, thisB.range.ce);

      }

    },

    showRange: function(first, last, startBase, bpPerBlock, scale,
                        containerStart, containerEnd) {
      this.range = {f: first, l: last, st: startBase, 
                    b: bpPerBlock, sc: scale, 
                    cs: containerStart, ce: containerEnd};
      this.inherited(arguments);
      if(this.innerTrack) this.innerTrack.showRange(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd);
    },

    moveBlocks: function(delta) {
        this.inherited(arguments);
        if(this.innerTrack) this.innerTrack.moveBlocks(delta);
    },

    fillBlock: function( args ) {
        var nodes = this.dnd.getAllNodes();
        var i =0;
        var msg = "";

        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;

        var blockDiv = document.createElement("div");
        blockDiv.className = this.divClass;

        var textDiv = document.createElement("div");
        textDiv.className = "combination_text";
        var text = "Add tracks here";
        textDiv.appendChild( document.createTextNode( text ) );

        block.domNode.appendChild( blockDiv );
        block.domNode.appendChild( textDiv );

        var highlight = this.browser.getHighlight();
        if( highlight && highlight.ref == this.refSeq.name )
            this.renderRegionHighlight( args, highlight );

        this.heightUpdate( this.height, blockIndex);
        args.finishCallback();
    },

    endZoom: function(destScale, destBlockBases) {
        this.clear(); // Necessary?
        if(this.innerTrack) this.innerTrack.endZoom();
    },

    msgLoop: function(list) {
      var msg = "";
      for(var item in list) msg = msg + " " + item +": " + list[item];
      alert(msg);
    }
    
});
});