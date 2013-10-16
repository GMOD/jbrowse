define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/json',
            'dojo/aspect',
            'dojo/dom-construct',
            'dojo/dom-geometry',
            'dojo/dom-class',
            'dojo/dom-style',
            'dojo/query',
            'dojo/on',
            'dojo/when',
            'dijit/Destroyable',
            'JBrowse/View/Dialog/Info',
            'JBrowse/View/Dialog',
            'dijit/Menu',
            'dijit/PopupMenuItem',
            'dijit/MenuItem',
            'dijit/CheckedMenuItem',
            'dijit/MenuSeparator',
            'JBrowse/Util',
            'JBrowse/Component',
            'JBrowse/FeatureFiltererMixin',
            'JBrowse/View/Track/_ClickHandlerMixin',
            'JBrowse/Errors',
            'JBrowse/View/TrackConfigEditor',
            'JBrowse/View/ConfirmDialog',
            'JBrowse/View/Track/BlockBased/Block',
            'JBrowse/View/DetailsMixin'
        ],
        function( declare,
                  lang,
                  array,
                  JSON,
                  aspect,
                  domConstruct,
                  domGeom,
                  domClass,
                  domStyle,
                  query,
                  on,
                  when,
                  Destroyable,
                  InfoDialog,
                  Dialog,
                  dijitMenu,
                  dijitPopupMenuItem,
                  dijitMenuItem,
                  dijitCheckedMenuItem,
                  dijitMenuSeparator,
                  Util,
                  Component,
                  FeatureFiltererMixin,
                  ClickHandlerMixin,
                  Errors,
                  TrackConfigEditor,
                  ConfirmDialog,
                  Block,
                  DetailsMixin
                ) {

// we get `own` and `destroy` from Destroyable, see dijit/Destroyable docs

return declare( [ Component, DetailsMixin, FeatureFiltererMixin, ClickHandlerMixin, Destroyable ],
{

    stripeWidth: 250,

    /**
     * Base class for all JBrowse tracks.
     * @constructs
     */
    constructor: function( args ) {
        args = args || {};

        this.refSeq = args.refSeq;
        this.name = args.label || this.getConf('label');
        this.key = this.name;

        this._changedCallback = args.changeCallback || function(){};
        this.height = 0;
        this.shown = true;
        this.empty = false;
        this.browser = args.browser;
        this.genomeView = args.genomeView;

        //width, in pixels of the "regular" (not min or max zoom) stripe
        this.regularStripe = this.stripeWidth;

        // set up feature filtering
        this.setFeatureFilterParentComponent( this.genomeView );

        this.store = args.store;

        this.genomeView = args.genomeView;
        this.heightUpdateCallback = args.heightUpdateCallback || function() {},
        this.div = args.trackDiv;
        this.widthPct = args.widthPct;
        this.scale = args.scale;

        this.leftBlank = document.createElement("div");
        this.leftBlank.className = "blank-block";
        this.rightBlank = document.createElement("div");
        this.rightBlank.className = "blank-block";
        this.div.appendChild(this.rightBlank);
        this.div.appendChild(this.leftBlank);

        this.sizeInit( args.numBlocks, args.widthPct );
        this.labelHTML = "";
        this.labelHeight = 0;

        if( this.getConf('pinned') )
            this.setPinned( true );

        if( ! this.label )
            this.makeTrackLabel();

        this.setLabel( this.key );

    },

    configSchema: {
        slots: [
            { name: 'maxFeatureSizeForUnderlyingRefSeq', type: 'integer', defaultValue: 250000 },
            { name: 'pinned', type: 'boolean', defaultValue:  false },
            { name: 'metadata', type: 'object', defaultValue: {} },
            { name: 'style.trackLabelCss', type: 'string' },
            { name: 'label', type: 'string' },
            { name: 'query', type: 'object', defaultValue: {}, shortDesc: "track-specific query variables to pass to the store" },
            { name: 'store', type: 'string|object', shortDesc: 'the name of the store to use with this track' },
            { name: 'type', type: 'string', shortDesc: 'the JavaScript type of this track' }
        ]
    },

    heightUpdate: function(height, blockIndex) {

        if (!this.shown) {
            this.heightUpdateCallback(0);
            return;
        }

        if (blockIndex !== undefined)
            this.blockHeights[blockIndex] = height;

        this.height = Math.max( this.height, height );

        if ( ! this.inShowRange ) {
            this.heightUpdateCallback( Math.max( this.labelHeight, this.height ) );

            // reposition any height-overflow markers in our blocks
            query( '.height_overflow_message', this.div )
                .style( 'top', this.height - 16 + 'px' );
        }
    },

    makeTrackLabel: function() {
        var labelDiv = dojo.create(
            'div', {
                className: "track-label dojoDndHandle",
                id: "label_" + this.name,
                style: {
                    position: 'absolute',
                    top: 0
                }
            },this.div);

        this.label = labelDiv;

        if ( this.getConf( 'style.trackLabelCss', [this] ) ) {
            labelDiv.style.cssText += ";" + trackConfig.style.trackLabelCss;
        }

        var closeButton = dojo.create('div',{
            className: 'track-close-button'
        },labelDiv);
        this.own( on( closeButton, 'click', dojo.hitch(this,function(evt){
                this.genomeView.suppressDoubleClick( 100 );
                this.genomeView.hideTracks([ this.name ]);
                evt.stopPropagation();
        })));

        var labelText = dojo.create('span', { className: 'track-label-text' }, labelDiv );
        var menuButton = dojo.create('div',{
            className: 'track-menu-button'
        },labelDiv);
        dojo.create('div', {}, menuButton ); // will be styled with an icon by CSS
        this.labelMenuButton = menuButton;

        // make the track menu with things like 'save as'
        this.makeTrackMenu();
    },


    hide: function() {
        delete this.fatalError;
        if (this.shown) {
            this.div.style.display = "none";
            this.shown = false;
        }
    },

    show: function() {
        if (!this.shown) {
            this.div.style.display = "block";
            this.shown = true;
        }
    },

    initBlocks: function() {
        this.blocks = new Array(this.numBlocks);
        this.blockHeights = new Array(this.numBlocks);
        for (var i = 0; i < this.numBlocks; i++) this.blockHeights[i] = 0;
        this.firstAttached = null;
        this.lastAttached = null;
        this._adjustBlanks();
    },

    clear: function() {
        if (this.blocks) {
            for (var i = 0; i < this.numBlocks; i++)
                this._hideBlock(i);
        }
        this.initBlocks();
        this.makeTrackMenu();
    },

    setLabel: function(newHTML) {
        if (this.label === undefined || this.labelHTML == newHTML )
            return;

        this.labelHTML = newHTML;
        query('.track-label-text',this.label)
            .forEach(function(n){ n.innerHTML = newHTML; });
        this.labelHeight = this.label.offsetHeight;
    },

    /**
     * Stub.
     */
    transfer: function() {},

    /**
     *  Stub.
     */
    startZoom: function(destScale, destStart, destEnd) {},

    /**
     * Stub.
     */
    endZoom: function(destScale, destBlockBases) {
    },


    showRange: function(first, last, startBase, bpPerBlock, scale,
                        containerStart, containerEnd) {

        if( this.fatalError ) {
            this.showFatalError( this.fatalError );
            return;
        }

        if ( this.blocks === undefined || ! this.blocks.length )
            return;

        if ((this.labelHeight == 0) && this.label)
            this.labelHeight = this.label.offsetHeight;

        this.inShowRange = true;
        this.height = this.labelHeight;

        var firstAttached = (null == this.firstAttached ? last + 1 : this.firstAttached);
        var lastAttached =  (null == this.lastAttached ? first - 1 : this.lastAttached);

        var i, leftBase;
        var maxHeight = 0;
        //fill left, including existing blocks (to get their heights)
        for (i = lastAttached; i >= first; i--) {
            leftBase = startBase + (bpPerBlock * (i - first));
            this._showBlock(i, leftBase, leftBase + bpPerBlock, scale,
                            containerStart, containerEnd);
        }
        //fill right
        for (i = lastAttached + 1; i <= last; i++) {
            leftBase = startBase + (bpPerBlock * (i - first));
            this._showBlock(i, leftBase, leftBase + bpPerBlock, scale,
                            containerStart, containerEnd);
        }

        //detach left blocks
        var destBlock = this.blocks[first];
        for (i = firstAttached; i < first; i++) {
            this.transfer(this.blocks[i], destBlock, scale,
                          containerStart, containerEnd);
            this.cleanupBlock(this.blocks[i]);
            this._hideBlock(i);
        }
        //detach right blocks
        destBlock = this.blocks[last];
        for (i = lastAttached; i > last; i--) {
            this.transfer(this.blocks[i], destBlock, scale,
                          containerStart, containerEnd);
            this.cleanupBlock(this.blocks[i]);
            this._hideBlock(i);
        }

        this.firstAttached = first;
        this.lastAttached = last;
        this._adjustBlanks();
        this.inShowRange = false;

        this.heightUpdate(this.height);
        this.updateStaticElements( this.genomeView.getPosition() );
    },

    cleanupBlock: function( block ) {
        if( block )
            block.destroy();
    },

    /**
     * Called when this track object is destroyed.  Cleans up things
     * to avoid memory leaks.
     */
    destroy: function() {
        array.forEach( this.blocks || [], function( block ) {
            this.cleanupBlock( block );
        }, this);
        delete this.blocks;
        delete this.div;
        delete this.fatalError;

        this.inherited( arguments );
    },

    _hideBlock: function(blockIndex) {
        if (this.blocks[blockIndex]) {
            this.div.removeChild( this.blocks[blockIndex].domNode );
            this.cleanupBlock( this.blocks[blockIndex] );
            this.blocks[blockIndex] = undefined;
            this.blockHeights[blockIndex] = 0;
        }
    },

    _adjustBlanks: function() {
        if ((this.firstAttached === null)
            || (this.lastAttached === null)) {
            this.leftBlank.style.left = "0px";
            this.leftBlank.style.width = "50%";
            this.rightBlank.style.left = "50%";
            this.rightBlank.style.width = "50%";
        } else {
            this.leftBlank.style.width = (this.firstAttached * this.widthPct) + "%";
            this.rightBlank.style.left = ((this.lastAttached + 1)
                                          * this.widthPct) + "%";
            this.rightBlank.style.width = ((this.numBlocks - this.lastAttached - 1)
                                           * this.widthPct) + "%";
        }
    },

    hideAll: function() {
        if (null == this.firstAttached) return;
        for (var i = this.firstAttached; i <= this.lastAttached; i++)
            this._hideBlock(i);


        this.firstAttached = null;
        this.lastAttached = null;
        this._adjustBlanks();
    },

    // hides all blocks that overlap the given region/location
    hideRegion: function( location ) {
        if (null == this.firstAttached) return;
        // hide all blocks that overlap the given region
        for (var i = this.firstAttached; i <= this.lastAttached; i++)
            if( this.blocks[i] && location.ref == this.refSeq.get('name') && !(  this.blocks[i].leftBase > location.end || this.blocks[i].rightBase < location.start ) )
                this._hideBlock(i);

        this._adjustBlanks();
    },

    /**
     *   _changeCallback invoked here is passed in constructor,
     *         and typically is GenomeView.showVisibleBlocks()
     */
    changed: function() {
        this.hideAll();
        if( this._changedCallback )
            this._changedCallback();
    },

    _makeLoadingMessage: function() {
        var msgDiv = dojo.create(
            'div', {
                className: 'loading',
                innerHTML: '<div class="text">Loading</span>',
                title: 'Loading data...',
                style: { visibility: 'hidden' }
            });
        window.setTimeout(function() { msgDiv.style.visibility = 'visible'; }, 200);
        return msgDiv;
    },

    showFatalError: function( error ) {
        query( '.block', this.div )
            .concat( query( '.blank-block', this.div ) )
            .concat( query( '.error', this.div ) )
            .orphan();
        this.blocks = [];
        this.blockHeights = [];

        error = error || this.fatalError;
        this.fatalErrorMessageElement = this._renderErrorMessage( error.stack || ''+error , this.div );
        this.heightUpdate( domGeom.position( this.fatalErrorMessageElement ).h );
        this.updateStaticElements( this.genomeView.getPosition() );
    },

    // generic handler for all types of errors
    _handleError: function( error, viewArgs ) {
        var errorContext = dojo.mixin( {}, error );
        dojo.mixin( errorContext, viewArgs );

        var isObject = typeof error == 'object';

        if( isObject && error instanceof Errors.TimeOut && errorContext.block )
            this.fillBlockTimeout( errorContext.blockIndex, errorContext.block, error );
        else if( isObject && error instanceof Errors.DataOverflow ) {
            if( errorContext.block )
                this.fillTooManyFeaturesMessage( errorContext.blockIndex, errorContext.block, viewArgs.scale, error );
            else
                array.forEach( this.blocks, function( block, blockIndex ) {
                    if( block )
                        this.fillTooManyFeaturesMessage( blockIndex, block, viewArgs.scale, error );
                },this);
        }
        else {
            console.error( error.stack || ''+error, error );
            this.fatalError = error;
            this.showFatalError( error );
        }
    },


    fillBlockError: function( blockIndex, block, error ) {
        error = error || this.fatalError || this.error;

        domConstruct.empty( block.domNode );
        var msgDiv = this._renderErrorMessage( error.stack || ''+error, block.domNode );
        this.heightUpdate( dojo.position(msgDiv).h, blockIndex );
    },

    _renderErrorMessage: function( message, parent ) {
        return domConstruct.create(
            'div', {
                className: 'error',
                innerHTML: '<h2>Oops!</h2><div class="text">There was a problem displaying this track.</div>'
                    +( message ? '<div class="codecaption">Diagnostic message</div><code>'+message+'</code>' : '' ),
                title: 'An error occurred'
            }, parent );
    },

    fillTooManyFeaturesMessage: function( blockIndex, block, scale, error ) {
        this.fillMessage(
            blockIndex,
            block,
            (error && error.message || 'Too much data to show')
                + (scale >= this.genomeView.maxPxPerBp ? '': '; zoom in to see detail')
                + '.'
        );
    },

    redraw: function() {
        this.clear();
        this.genomeView.showVisibleBlocks();
    },

    markBlockHeightOverflow: function( block ) {
        if( block.heightOverflowed )
            return;

        block.heightOverflowed  = true;
        domClass.add( block.domNode, 'height_overflow' );
        domConstruct.create( 'div', {
                                 className: 'height_overflow_message',
                                 innerHTML: 'Max height reached',
                                 style: {
                                     top: (this.height-16) + 'px',
                                     height: '16px'
                                 }
                             }, block.domNode );
    },

    _showBlock: function(blockIndex, startBase, endBase, scale,
                         containerStart, containerEnd) {
        if ( this.empty || this.fatalError ) {
            this.heightUpdate( this.labelHeight );
            return;
        }

        if (this.blocks[blockIndex]) {
            this.heightUpdate(this.blockHeights[blockIndex], blockIndex);
            return;
        }

        var block = new Block({
            startBase: startBase,
            endBase: endBase,
            scale: scale,
            node: {
                className: 'block',
                style: {
                    left:  (blockIndex * this.widthPct) + "%",
                    width: this.widthPct + "%"
                }
            }
        });
        this.blocks[blockIndex] = block;
        this.div.appendChild( block.domNode );

        if( this.fatalError ) {
            this.fillBlockError( blockIndex, block );
            return;
        }

        // loadMessage is an opaque mask div that we place over the
        // block until the fillBlock finishes
        var loadMessage = this._makeLoadingMessage();
        block.domNode.appendChild( loadMessage );

        var finish = function() {
            if( block && loadMessage.parentNode )
                block.domNode.removeChild( loadMessage );
        };

        var viewargs = {
                blockIndex: blockIndex,
                block:      block,
                leftBlock:  this.blocks[blockIndex - 1],
                rightBlock: this.blocks[blockIndex + 1],
                leftBase:   startBase,
                rightBase:  endBase,
                scale:      scale,
                containerStart: containerStart,
                containerEnd:   containerEnd,
                finishCallback: finish
            };
        try {
            this.fillBlock( viewargs );
        } catch( e ) {
            this._handleError( e, viewargs );
            finish();
        }
    },

    moveBlocks: function(delta) {
        var newBlocks = new Array(this.numBlocks);
        var newHeights = new Array(this.numBlocks);
        var i;
        for (i = 0; i < this.numBlocks; i++)
            newHeights[i] = 0;

        var destBlock;
        if ((this.lastAttached + delta < 0)
            || (this.firstAttached + delta >= this.numBlocks)) {
            this.firstAttached = null;
            this.lastAttached = null;
        } else {
            this.firstAttached = Math.max(0, Math.min(this.numBlocks - 1,
                                                      this.firstAttached + delta));
            this.lastAttached = Math.max(0, Math.min(this.numBlocks - 1,
                                                     this.lastAttached + delta));
            if (delta < 0)
                destBlock = this.blocks[this.firstAttached - delta];
            else
                destBlock = this.blocks[this.lastAttached - delta];
        }

        for (i = 0; i < this.blocks.length; i++) {
            var newIndex = i + delta;
            if ((newIndex < 0) || (newIndex >= this.numBlocks)) {
                //We're not keeping this block around, so delete
                //the old one.
                if (destBlock && this.blocks[i])
                    this.transfer(this.blocks[i], destBlock);
                this._hideBlock(i);
            } else {
                //move block
                newBlocks[newIndex] = this.blocks[i];
                if (newBlocks[newIndex])
                    newBlocks[newIndex].domNode.style.left =
                    ((newIndex) * this.widthPct) + "%";

                newHeights[newIndex] = this.blockHeights[i];
            }
        }
        this.blocks = newBlocks;
        this.blockHeights = newHeights;
        this._adjustBlanks();
    },

    sizeInit: function(numBlocks, widthPct, blockDelta) {
        var i, oldLast;
        this.numBlocks = numBlocks;
        this.widthPct = widthPct;
        if (blockDelta) this.moveBlocks(-blockDelta);
        if (this.blocks && (this.blocks.length > 0)) {
            //if we're shrinking, clear out the end blocks
            var destBlock = this.blocks[numBlocks - 1];
            for (i = numBlocks; i < this.blocks.length; i++) {
                if (destBlock && this.blocks[i])
                    this.transfer(this.blocks[i], destBlock);
                this._hideBlock(i);
            }
            oldLast = this.blocks.length;
            this.blocks.length = numBlocks;
            this.blockHeights.length = numBlocks;
            //if we're expanding, set new blocks to be not there
            for (i = oldLast; i < numBlocks; i++) {
                this.blocks[i] = undefined;
                this.blockHeights[i] = 0;
            }
            this.lastAttached = Math.min(this.lastAttached, numBlocks - 1);
            if (this.firstAttached > this.lastAttached) {
                //not sure if this can happen
                this.firstAttached = null;
                this.lastAttached = null;
            }

            if( this.blocks.length != numBlocks )
                throw new Error(
                    "block number mismatch: should be "
                        + numBlocks + "; blocks.length: "
                        + this.blocks.length
                );

            for (i = 0; i < numBlocks; i++) {
                if (this.blocks[i]) {
                    //if (!this.blocks[i].style) console.log(this.blocks);
                    this.blocks[i].domNode.style.left = (i * widthPct) + "%";
                    this.blocks[i].domNode.style.width = widthPct + "%";
                }
            }
        } else {
            this.initBlocks();
        }

        this.makeTrackMenu();
    },

    fillMessage: function( blockIndex, block, message, class_ ) {
        domConstruct.empty( block.domNode );
        var msgDiv = dojo.create(
            'div', {
                className: class_ || 'message',
                innerHTML: message
            }, block.domNode );
        this.heightUpdate( domGeom.getMarginBox(msgDiv, domStyle.getComputedStyle(msgDiv)).h, blockIndex );
    },

    /**
     * Called by GenomeView when the view is scrolled: communicates the
     * new x, y, width, and height of the view.  This is needed by tracks
     * for positioning stationary things like axis labels.
     */
    updateStaticElements: function( /**Object*/ coords ) {
        this.window_info = dojo.mixin( this.window_info || {}, coords );
        if( this.fatalErrorMessageElement ) {
            this.fatalErrorMessageElement.style.width = this.window_info.width * 0.6 + 'px';
            if( 'x' in coords )
                this.fatalErrorMessageElement.style.left = coords.x+this.window_info.width * 0.2 +'px';
        }

        if( this.label && 'x' in coords )
            this.label.style.left = coords.x+'px';
    },

    /**
     * @returns {Object} DOM element containing a rendering of the
     *                   detailed metadata about this track
     */
    _trackDetailsContent: function( additional ) {
        var details = domConstruct.create('div', { className: 'detail' });
        var fmt = lang.hitch(this, 'renderDetailField', details );
        fmt( 'Name', this.key || this.name );
        var metadata = lang.clone( this.getMetadata() );
        lang.mixin( metadata, additional );
        delete metadata.key;
        delete metadata.label;
        if( typeof metadata.conf == 'object' )
            delete metadata.conf;

        var md_keys = [];
        for( var k in metadata )
            md_keys.push(k);
        // TODO: maybe do some intelligent sorting of the keys here?
        array.forEach( md_keys, function(key) {
                          fmt( Util.ucFirst(key), metadata[key] );
                      });

        return details;
    },

    getMetadata: function() {
        return this.browser && this.browser.trackMetaDataStore
            ? this.browser.trackMetaDataStore.getItem(this.name)
            : this.getConf('metadata');
    },

    setPinned: function( p ) {
        p = this.setConf( 'pinned', !!p );

        if( p )
            domClass.add( this.div, 'pinned' );
        else
            domClass.remove( this.div, 'pinned' );

        return p;
    },
    isPinned: function() {
        return !! this.getConf('pinned');
    },

    /**
     * @returns {Array} menu options for this track's menu (usually contains save as, etc)
     */
    _trackMenuOptions: function() {
        var that = this;
        return [
            { label: 'About this track',
              title: 'About track: '+(this.key||this.name),
              iconClass: 'jbrowseIconHelp',
              action: 'contentDialog',
              content: dojo.hitch(this,'_trackDetailsContent')
            },
            { label: 'Pin to top',
              type: 'dijit/CheckedMenuItem',
              title: "make this track always visible at the top of the view",
              checked: that.isPinned(),
              //iconClass: 'dijitIconDelete',
              onClick: function() {
                  that.browser.publish( '/jbrowse/v1/v/tracks/'+( this.checked ? 'pin' : 'unpin' ), [ that.name ] );
              }
            },
            { label: 'Edit config',
              title: "edit this track's configuration",
              iconClass: 'dijitIconConfigure',
              action: function() {
                  new TrackConfigEditor( that.config )
                      .show( function( result ) {
                          // replace this track's configuration
                          that.browser.publish( '/jbrowse/v1/v/tracks/replace', [result.conf] );
                      });
              }
            },
            { label: 'Delete track',
              title: "delete this track",
              iconClass: 'dijitIconDelete',
              action: function() {
                  new ConfirmDialog({ browser: this.browser, title: 'Delete track?', message: 'Really delete this track?' })
                     .show( function( confirmed ) {
                          if( confirmed )
                              that.browser.publish( '/jbrowse/v1/v/tracks/delete', [that.config] );
                      });
              }
            }
        ];
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * feature by feature.  Provides a uniform function signature for
     * user-defined callbacks.
     */
    getConfForFeature: function( path, feature ) {
        return this.getConf( path, [feature, path, null, this ] );
    },

    isFeatureHighlighted: function( feature, name ) {
        var highlight = this.browser.getHighlight();
        return highlight
            && ( highlight.objectName && highlight.objectName == name )
            && highlight.ref == this.refSeq.get('name')
            && !( feature.get('start') > highlight.end || feature.get('end') < highlight.start );
    },

    /**
     * Makes and installs the dropdown menu showing operations available for this track.
     * @private
     */
    makeTrackMenu: function() {
        var thisB = this;
        when( this._trackMenuOptions() )
            .then( function( options ) {
                if( options && options.length && thisB.label && thisB.labelMenuButton ) {

                    // remove our old track menu if we have one
                    if( thisB.trackMenu )
                        thisB.trackMenu.destroyRecursive();

                    // render and bind our track menu
                    var menu = thisB._renderContextMenu( options, { menuButton: thisB.labelMenuButton, track: thisB, browser: thisB.browser, refSeq: thisB.refSeq } );
                    menu.startup();
                    menu.set('leftClickToOpen', true );
                    menu.bindDomNode( thisB.labelMenuButton );
                    menu.set('leftClickToOpen',  false);
                    menu.bindDomNode( thisB.label );
                    thisB.trackMenu = menu;
                    thisB.own( thisB.trackMenu );
                }
              });
    },


    // display a rendering-timeout message
    fillBlockTimeout: function( blockIndex, block ) {
        domConstruct.empty( block.domNode );
        domClass.add( block.domNode, 'timed_out' );
        this.fillMessage( blockIndex, block,
                           'This region took too long'
                           + ' to display, possibly because'
                           + ' it contains too much data.'
                           + ' Try zooming in to show a smaller region.'
                         );
    },

    renderRegionHighlight: function( args, highlight ) {
        // do nothing if the highlight does not overlap this region
        if( highlight.start > args.rightBase || highlight.end < args.leftBase )
            return;

        var block_span = args.rightBase - args.leftBase;

        var left = highlight.start;
        var right = highlight.end;

        // trim left and right to avoid making a huge element that can cause problems
        var trimLeft = args.leftBase - left;
        if( trimLeft > 0 ) {
            left += trimLeft;
        }
        var trimRight = right - args.rightBase;
        if( trimRight > 0 ) {
            right -= trimRight;
        }

        var width = (right-left)*100/block_span;
        left = (left - args.leftBase)*100/block_span;
        var el = domConstruct.create('div', {
                                className: 'global_highlight'
                                    + (trimLeft <= 0 ? ' left' : '')
                                    + (trimRight <= 0 ? ' right' : '' ),
                                style: {
                                    left: left+'%',
                                    width: width+'%',
                                    height: '100%',
                                    top: '0px'
                                }
                            }, args.block.domNode );
    },

    // prepares a query object for passing to the backend store
    makeStoreQuery: function( q ) {
        if( typeof q.get == 'function' )
            q = { ref: q.get('seq_id'), start: q.get('start'), end: q.get('end') };

        return lang.mixin( {}, this.getConf('query'), q || {} );
    }

});
});

