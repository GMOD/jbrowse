define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/json',
            'dojo/aspect',
            'dojo/dom-construct',
            'dojo/dom-geometry',
            'dojo/dom-class',
            'dojo/query',
            'dojo/on',
            'dijit/Destroyable',
            'JBrowse/View/InfoDialog',
            'dijit/Dialog',
            'dijit/Menu',
            'dijit/PopupMenuItem',
            'dijit/MenuItem',
            'dijit/CheckedMenuItem',
            'dijit/MenuSeparator',
            'JBrowse/Util',
            'JBrowse/Component',
            'JBrowse/Errors',
            'JBrowse/View/TrackConfigEditor',
            'JBrowse/View/ConfirmDialog',
            'JBrowse/View/Track/BlockBased/Block',
            'dojo/store/Memory',
            'dgrid/OnDemandGrid',
            'dgrid/extensions/DijitRegistry'
        ],
        function( declare,
                  lang,
                  array,
                  JSON,
                  aspect,
                  domConstruct,
                  domGeom,
                  domClass,
                  query,
                  on,
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
                  Errors,
                  TrackConfigEditor,
                  ConfirmDialog,
                  Block,
                  MemoryStore,
                  DGrid,
                  DGridDijitRegistry
                ) {

// make a DGrid that registers itself as a dijit widget
var Grid = declare([DGrid,DGridDijitRegistry]);

// we get `own` and `destroy` from Destroyable, see dijit/Destroyable docs

return declare( [Component,Destroyable],
/**
 * @lends JBrowse.View.Track.BlockBased.prototype
 */
{
    /**
     * Base class for all JBrowse tracks.
     * @constructs
     */
    constructor: function( args ) {
        args = args || {};

        this.refSeq = args.refSeq;
        this.name = args.label || this.config.label;
        this.key = args.key || this.config.key || this.name;

        this._changedCallback = args.changeCallback || function(){};
        this.height = 0;
        this.shown = true;
        this.empty = false;
        this.browser = args.browser;
        this.store = args.store;
    },

    /**
     * Returns object holding the default configuration for this track
     * type.  Might want to override in subclasses.
     * @private
     */
    _defaultConfig: function() {
        return {};
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

    setViewInfo: function( genomeView, heightUpdate, numBlocks,
                           trackDiv,
                           widthPct, widthPx, scale) {
        this.genomeView = genomeView;
        this.heightUpdateCallback = heightUpdate;
        this.div = trackDiv;
        this.widthPct = widthPct;
        this.widthPx = widthPx;

        this.leftBlank = document.createElement("div");
        this.leftBlank.className = "blank-block";
        this.rightBlank = document.createElement("div");
        this.rightBlank.className = "blank-block";
        this.div.appendChild(this.rightBlank);
        this.div.appendChild(this.leftBlank);

        this.sizeInit(numBlocks, widthPct);
        this.labelHTML = "";
        this.labelHeight = 0;

        if( ! this.label ) {
            this.makeTrackLabel();
        }
        this.setLabel( this.key );
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

        if ( ( this.config.style || {} ).trackLabelCss){
            labelDiv.style.cssText += ";" + trackConfig.style.trackLabelCss;
        }

        var closeButton = dojo.create('div',{
            className: 'track-close-button'
        },labelDiv);
        this.own( on( closeButton, 'click', dojo.hitch(this,function(evt){
                this.browser.view.suppressDoubleClick( 100 );
                this.browser.publish( '/jbrowse/v1/v/tracks/hide', [this.config]);
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
        dojo.query('.track-label-text',this.label)
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

        // this might make more sense in setViewInfo, but the label element
        // isn't in the DOM tree yet at that point
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
            if( this.blocks[i] && location.ref == this.refSeq.name && !(  this.blocks[i].leftBase > location.end || this.blocks[i].rightBase < location.start ) )
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
        dojo.query( '.block', this.div )
            .concat( dojo.query( '.blank-block', this.div ) )
            .concat( dojo.query( '.error', this.div ) )
            .orphan();
        this.blocks = [];
        this.blockHeights = [];

        this.fatalErrorMessageElement = this._renderErrorMessage( error || this.fatalError, this.div );
        this.heightUpdate( domGeom.position( this.fatalErrorMessageElement ).h );
        this.updateStaticElements( this.genomeView.getPosition() );
    },

    // generic handler for all types of errors
    _handleError: function( error ) {
        console.error( ''+error, error.stack, error );
        var isObject = typeof error == 'object';

        if( isObject && error instanceof Errors.TrackBlockTimeout )
            this.fillBlockTimeout( error.blockIndex, error.block, error );
        else if( isObject && error instanceof Errors.TrackBlockError )
            this.fillBlockError( error.blockIndex, error.block, error );
        else {
            this.fatalError = error;
            this.showFatalError( error );
        }
    },


    fillBlockError: function( blockIndex, block, error ) {
        error = error || this.fatalError || this.error;

        domConstruct.empty( block.domNode );
        var msgDiv = this._renderErrorMessage( error, block.domNode );
        this.heightUpdate( dojo.position(msgDiv).h, blockIndex );
    },

    _renderErrorMessage: function( message, parent ) {
        return domConstruct.create(
            'div', {
                className: 'error',
                innerHTML: '<h2>Error</h2><div class="text">An error was encountered when displaying this track.</div>'
                    +( message ? '<div class="codecaption">Diagnostic message</div><code>'+message+'</code>' : '' ),
                title: 'An error occurred'
            }, parent );
    },

    fillTooManyFeaturesMessage: function( blockIndex, block, scale ) {
        this.fillMessage(
            blockIndex,
            block,
            'Too much data to show'
                + (scale >= this.browser.view.maxPxPerBp ? '': '; zoom in to see detail')
                + '.'
        );
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

        var args = [blockIndex,
                    block,
                    this.blocks[blockIndex - 1],
                    this.blocks[blockIndex + 1],
                    startBase,
                    endBase,
                    scale,
                    this.widthPx,
                    containerStart,
                    containerEnd];

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

        try {
            this.fillBlock({
                blockIndex: blockIndex,
                block:      block,
                leftBlock:  this.blocks[blockIndex - 1],
                rightBlock: this.blocks[blockIndex + 1],
                leftBase:   startBase,
                rightBase:  endBase,
                scale:      scale,
                stripeWidth:    this.widthPx,
                containerStart: containerStart,
                containerEnd:   containerEnd,
                finishCallback: finish
            });
        } catch( e ) {
            console.error( e, e.stack );
            this.fillBlockError( blockIndex, block, e );
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
        var msgDiv = dojo.create(
            'div', {
                className: class_ || 'message',
                innerHTML: message
            }, block.domNode );
        this.heightUpdate( dojo.position(msgDiv).h, blockIndex );
    },

    /**
     * Called by GenomeView when the view is scrolled: communicates the
     * new x, y, width, and height of the view.  This is needed by tracks
     * for positioning stationary things like axis labels.
     */
    updateStaticElements: function( /**Object*/ coords ) {
        this.window_info = dojo.mixin( this.window_info || {}, coords );
        if( this.fatalErrorMessageElement )
            dojo.style( this.fatalErrorMessageElement, {
                            left: coords.x+this.window_info.width * 0.2 +'px',
                            width: this.window_info.width * 0.6 + 'px'
                        });
        if( this.label )
            this.label.style.left = coords.x+'px';
    },

    /**
     * Render a dijit menu from a specification object.
     *
     * @param menuTemplate definition of the menu's structure
     * @param context {Object} optional object containing the context
     *   in which any click handlers defined in the menu should be
     *   invoked, containing thing like what feature is being operated
     *   upon, the track object that is involved, etc.
     * @param parent {dijit.Menu|...} parent menu, if this is a submenu
     */
    _renderContextMenu: function( /**Object*/ menuStructure, /** Object */ context, /** dijit.Menu */ parent ) {
        if ( !parent ) {
            parent = new dijitMenu();
            this.own( parent );
        }

        for ( key in menuStructure ) {
            var spec = menuStructure [ key ];
            try {
                if ( spec.children ) {
                    var child = new dijitMenu();
                    parent.addChild( child );
                    parent.addChild( new dijitPopupMenuItem(
                                         {
                                             popup : child,
                                             label : spec.label
                                         }));
                    this._renderContextMenu( spec.children, context, child );
                }
                else {
                    var menuConf = dojo.clone( spec );
                    if( menuConf.action || menuConf.url || menuConf.href ) {
                        menuConf.onClick = this._makeClickHandler( spec, context );
                    }
                    // only draw other menu items if they do something when clicked.
                    // drawing menu items that do nothing when clicked
                    // would frustrate users.
                    if( menuConf.label && !menuConf.onClick )
                        menuConf.disabled = true;

                    // currently can only use preloaded types
                    var class_ = {
                        'dijit/MenuItem':        dijitMenuItem,
                        'dijit/CheckedMenuItem': dijitCheckedMenuItem,
                        'dijit/MenuSeparator':   dijitMenuSeparator
                    }[spec.type] || dijitMenuItem;

                    parent.addChild( new class_( menuConf ) );
                }
            } catch(e) {
                console.error('failed to render menu item: '+e);
            }
        }
        return parent;
    },

    _makeClickHandler: function( inputSpec, context ) {
        var track  = this;

        if( typeof inputSpec == 'function' ) {
            inputSpec = { action: inputSpec };
        }
        else if( typeof inputSpec == 'undefined' ) {
            console.error("Undefined click specification, cannot make click handler");
            return function() {};
        }

        var handler = function ( evt ) {
            if( track.genomeView.dragging )
                return;

            var ctx = context || this;
            var spec = track._processMenuSpec( dojo.clone( inputSpec ), ctx );
            var url = spec.url || spec.href;
            spec.url = url;
            var style = dojo.clone( spec.style || {} );

            // try to understand the `action` setting
            spec.action = spec.action ||
                ( url          ? 'iframeDialog'  :
                  spec.content ? 'contentDialog' :
                                 false
                );
            spec.title = spec.title || spec.label;

            if( typeof spec.action == 'string' ) {
                // treat `action` case-insensitively
                spec.action = {
                    iframedialog:   'iframeDialog',
                    iframe:         'iframeDialog',
                    contentdialog:  'contentDialog',
                    content:        'contentDialog',
                    baredialog:     'bareDialog',
                    bare:           'bareDialog',
                    xhrdialog:      'xhrDialog',
                    xhr:            'xhrDialog',
                    newwindow:      'newWindow',
                    "_blank":       'newWindow'
                }[(''+spec.action).toLowerCase()];

                if( spec.action == 'newWindow' )
                    window.open( url, '_blank' );
                else if( spec.action in { iframeDialog:1, contentDialog:1, xhrDialog:1, bareDialog: 1} )
                    track._openDialog( spec, evt, ctx );
            }
            else if( typeof spec.action == 'function' ) {
                spec.action.call( ctx, evt );
            }
            else {
                return;
            }
        };

        // if there is a label, set it on the handler so that it's
        // accessible for tooltips or whatever.
        if( inputSpec.label )
            handler.label = inputSpec.label;

        return handler;
    },

    /**
     * @returns {Object} DOM element containing a rendering of the
     *                   detailed metadata about this track
     */
    _trackDetailsContent: function() {
        var details = domConstruct.create('div', { className: 'detail' });
        var fmt = dojo.hitch(this, '_fmtDetailField', details );
        fmt( 'Name', this.key || this.name );
        var metadata = dojo.clone( this.getMetadata() );
        delete metadata.key;
        delete metadata.label;
        if( typeof metadata.conf == 'object' )
            delete metadata.conf;

        var md_keys = [];
        for( var k in metadata )
            md_keys.push(k);
        // TODO: maybe do some intelligent sorting of the keys here?
        dojo.forEach( md_keys, function(key) {
                          fmt( Util.ucFirst(key), metadata[key] );
                      });
        return details;
    },

    getMetadata: function() {
        return this.browser && this.browser.trackMetaDataStore ? this.browser.trackMetaDataStore.getItem(this.name) :
                                          this.config.metadata ? this.config.metadata :
                                                                 {};
    },

    _fmtDetailField: function( parent, title, val, class_ ) {
        if( val === null || val === undefined )
            return '';

        // if this object has a 'fmtDetailFooField' function, delegate to that
        var fieldSpecificFormatter;
        if(( fieldSpecificFormatter = this['fmtDetail'+Util.ucFirst(title)+'Field'] ))
            return fieldSpecificFormatter.apply( this, arguments );

        // otherwise, use default formatting

        class_ = class_ || title.replace(/\s+/g,'_').toLowerCase();

        // special case for values that include metadata about their
        // meaning, which are formed like { values: [], meta:
        // {description: }.  break it out, putting the meta description in a `title`
        // attr on the field name so that it shows on mouseover, and
        // using the values as the new field value.
        var fieldMeta;
        if( typeof val == 'object' && ('values' in val) ) {
            fieldMeta = (val.meta||{}).description;
            // join the description if it is an array
            if( dojo.isArray( fieldMeta ) )
                fieldMeta = fieldMeta.join(', ');

            val = val.values;
        }

        var titleAttr = fieldMeta ? ' title="'+fieldMeta+'"' : '';
        var fieldContainer = domConstruct.create(
            'div',
            { className: 'field_container',
              innerHTML: '<h2 class="field '+class_+'"'+titleAttr+'>'+title+'</h2>'
            }, parent );
        var valueContainer = domConstruct.create(
            'div',
            { className: 'value_container '
                         + class_
            }, fieldContainer );

        this._fmtDetailValue( valueContainer, title, val, class_);

        return fieldContainer;
    },

    _fmtDetailValue: function( parent, title, val, class_ ) {
        var thisB = this;

        // if this object has a 'fmtDetailFooValue' function, delegate to that
        var fieldSpecificFormatter;
        if(( fieldSpecificFormatter = this['fmtDetail'+Util.ucFirst(title)+'Value'] ))
            return fieldSpecificFormatter.apply( this, arguments );

        // otherwise, use default formatting

        var valType = typeof val;
        if( typeof val.toHTML == 'function' )
            val = val.toHTML();
        if( valType == 'boolean' )
            val = val ? 'yes' : 'no';
        else if( valType == 'undefined' || val === null )
            return '';
        else if( lang.isArray( val ) ) {
            var vals = array.map( val, function(v) {
                       return this._fmtDetailValue( parent, title, v, class_ );
                   }, this );
            if( vals.length > 10 )
                domClass.addClass( parent, 'big' );
            return vals;
        } else if( valType == 'object' ) {
            var keys = Util.dojof.keys( val ).sort();
            if( keys.length > 5 ) {
                return this._fmtDetailValueGrid(
                    parent,
                    title,
                    // iterator
                    function() {
                        if( ! keys.length )
                            return null;
                        var k = keys.shift();
                        var value = val[k];
                        var item = { id: k };
                        for( var field in value ) {
                            item[field] = thisB._valToString( value[field] );
                        }
                        return item;
                    },
                    // descriptions object
                    (function() {
                         if( ! keys.length )
                             return {};

                         var subValue = val[keys[0]];
                         var descriptions = {};
                         for( var k in subValue ) {
                             descriptions[k] = subValue[k].meta && subValue[k].meta.description || null;
                         }
                         return descriptions;
                     })()
                );
            }
            else {
                return array.map( keys, function( k ) {
                                      return this._fmtDetailField( parent, k, val[k], class_ );
                                  }, this );
            }
        }

        return domConstruct.create('div', { className: 'value '+class_, innerHTML: val }, parent );
    },

    _valToString: function( val ) {
        if( dojo.isArray( val ) ) {
            return array.map( val, dojo.hitch( this,'_valToString') ).join(' ');
        }
        else if( typeof val == 'object' ) {
            if( 'values' in val )
                return this._valToString( val.values );
            else
                return JSON.stringify( val );
        }
        return ''+val;
    },

    _valuesWithDescription: function( val ) {
        var fieldMeta;
        if( typeof val == 'object' && ('values' in val) ) {
            fieldMeta = (val.meta||{}).description;
            // join the description if it is an array
            if( dojo.isArray( fieldMeta ) )
                fieldMeta = fieldMeta.join(', ');

            val = val.values;
        }
        return { values: val, description: fieldMeta };
    },

    _fmtDetailValueGrid: function( parent, title, iterator, descriptions ) {
        var thisB = this;
        console.log( descriptions );
        var rows = [];
        var item;
        while(( item = iterator() ))
            rows.push( item );

        if( ! rows.length )
            return document.createElement('span');

        var columns = [];
        for( var field in rows[0] ) {
            (function(field) {
                var column = {
                    label: { id: 'Name'}[field] || Util.ucFirst( field ),
                    field: field
                };
                column.renderHeaderCell = function( contentNode ) {
                    if( descriptions[field] )
                        contentNode.title = descriptions[field];
                    contentNode.appendChild( document.createTextNode( column.label || column.field));
                };
                columns.push( column );
            })(field);
        }

        // create the grid
        parent.style.overflow = 'hidden';
        parent.style.width = '90%';
        var grid = new Grid({
            columns: columns,
            store: new MemoryStore({ data: rows })
        }, parent );

        return container;
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
                  new ConfirmDialog({ title: 'Delete track?', message: 'Really delete this track?' })
                     .show( function( confirmed ) {
                          if( confirmed )
                              that.browser.publish( '/jbrowse/v1/v/tracks/delete', [that.config] );
                      });
              }
            }
        ];
    },


    _processMenuSpec: function( spec, context ) {
        for( var x in spec ) {
            if( typeof spec[x] == 'object' )
                spec[x] = this._processMenuSpec( spec[x], context );
            else
                spec[x] = this.template( context.feature, this._evalConf( context, spec[x], x ) );
        }
        return spec;
    },

    /**
     * Get the value of a conf variable, evaluating it if it is a
     * function.  Note: does not template it, that is a separate step.
     *
     * @private
     */
    _evalConf: function( context, confVal, confKey ) {

        // list of conf vals that should not be run immediately on the
        // feature data if they are functions
        var dontRunImmediately = {
            action: 1,
            click: 1,
            content: 1
        };

        return typeof confVal == 'function' && !dontRunImmediately[confKey]
            ? confVal.apply( context, context.callbackArgs || [] )
            : confVal;
    },

    /**
     * Like getConf, but get a conf value that explicitly can vary
     * feature by feature.  Provides a uniform function signature for
     * user-defined callbacks.
     */
    getConfForFeature: function( path, feature ) {
        return this.getConf( path, [feature, path, null, null, this ] );
    },

    isFeatureHighlighted: function( feature, name ) {
        var highlight = this.browser.getHighlight();
        return highlight
            && ( highlight.objectName && highlight.objectName == name )
            && highlight.ref == this.refSeq.name
            && !( feature.get('start') > highlight.end || feature.get('end') < highlight.start );
    },

    _openDialog: function( spec, evt, context ) {
        context = context || {};
        var type = spec.action;
        type = type.replace(/Dialog/,'');
        var featureName = context.feature && (context.feature.get('name')||context.feature.get('id'));
        var dialogOpts = {
            "class": "popup-dialog popup-dialog-"+type,
            title: spec.title || spec.label || ( featureName ? featureName +' details' : "Details"),
            style: dojo.clone( spec.style || {} )
        };
        if( spec.dialog )
            declare.safeMixin( dialogOpts, spec.dialog );

        var dialog;

        // if dialog == xhr, open the link in a dialog
        // with the html from the URL just shoved in it
        if( type == 'xhr' || type == 'content' ) {
            if( type == 'xhr' )
                dialogOpts.href = spec.url;

            dialog = new InfoDialog( dialogOpts );
            context.dialog = dialog;

            if( type == 'content' )
                dialog.set( 'content', this._evalConf( context, spec.content, null ) );

            delete context.dialog;
        }
        else if( type == 'bare' ) {
            dialog = new Dialog( dialogOpts );
            context.dialog = dialog;
            dialog.set( 'content', this._evalConf( context, spec.content, null ) );
            delete context.dialog;
        }
        // open the link in a dialog with an iframe
        else if( type == 'iframe' ) {
            var iframeDims = function() {
                var d = domGeom.position( this.browser.container );
                return { h: Math.round(d.h * 0.8), w: Math.round( d.w * 0.8 ) };
            }.call(this);

            dialog = new Dialog( dialogOpts );

            var iframe = dojo.create(
                'iframe', {
                    tabindex: "0",
                    width: iframeDims.w,
                    height: iframeDims.h,
                    style: { border: 'none' },
                    src: spec.url
                });

            dialog.set( 'content', iframe );
            dojo.create( 'a', {
                             href: spec.url,
                             target: '_blank',
                             className: 'dialog-new-window',
                             title: 'open in new window',
                             onclick: dojo.hitch(dialog,'hide'),
                             innerHTML: spec.url
                         }, dialog.titleBar );
            var updateIframeSize = function() {
                // hitch a ride on the dialog box's
                // layout function, which is called on
                // initial display, and when the window
                // is resized, to keep the iframe
                // sized to fit exactly in it.
                var cDims = domGeom.position( dialog.containerNode );
                var width  = cDims.w;
                var height = cDims.h - domGeom.position(dialog.titleBar).h;
                iframe.width = width;
                iframe.height = height;
            };
            aspect.after( dialog, 'layout', updateIframeSize );
            aspect.after( dialog, 'show', updateIframeSize );
        }

        // destroy the dialog after it is hidden
        aspect.after( dialog, 'hide', function() {
                          setTimeout(function() {
                              dialog.destroyRecursive();
                          }, 500 );
        });

        // show the dialog
        dialog.show();
    },

    /**
     * Given a string with template callouts, interpolate them with
     * data from the given object.  For example, "{foo}" is replaced
     * with whatever is returned by obj.get('foo')
     */
    template: function( /** Object */ obj, /** String */ template ) {
        if( typeof template != 'string' || !obj )
            return template;

        var valid = true;
        if ( template ) {
            return template.replace(
                    /\{([^}]+)\}/g,
                    function(match, group) {
                        var val = obj ? obj.get( group.toLowerCase() ) : undefined;
                        if (val !== undefined)
                            return val;
                        else {
                            return '';
                        }
                    });
        }
        return undefined;
    },

    /**
     * Makes and installs the dropdown menu showing operations available for this track.
     * @private
     */
    makeTrackMenu: function() {
        var options = this._trackMenuOptions();
        if( options && options.length && this.label && this.labelMenuButton ) {

            // remove our old track menu if we have one
            if( this.trackMenu )
                this.trackMenu.destroyRecursive();

            // render and bind our track menu
            var menu = this._renderContextMenu( options, { menuButton: this.labelMenuButton, track: this, browser: this.browser, refSeq: this.refSeq } );
            menu.startup();
            menu.set('leftClickToOpen', true );
            menu.bindDomNode( this.labelMenuButton );
            menu.set('leftClickToOpen',  false);
            menu.bindDomNode( this.label );
            this.trackMenu = menu;
            this.own( this.trackMenu );
        }
    },


    // display a rendering-timeout message
    fillBlockTimeout: function( blockIndex, block ) {
        domConstruct.empty( block.domNode );
        domClass.addClass( block.domNode, 'timed_out' );
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

        function toPct ( coord ) {
            return (coord - args.leftBase) / block_span * 100;
        }

        left = toPct( left );
        var width = toPct(right)-left;
        var el = domConstruct.create('div', {
                                className: 'global_highlight'
                                    + (trimLeft <= 0 ? ' left' : '')
                                    + (trimRight <= 0 ? ' right' : '' ),
                                style: {
                                    left: left+'%',
                                    width: width+'%',
                                    height: '100%'
                                }
                            }, args.block.domNode );
    }

});
});

/*

Copyright (c) 2007-2009 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
